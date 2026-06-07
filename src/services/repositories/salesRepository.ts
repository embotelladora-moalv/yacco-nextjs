import admin from "firebase-admin";
import { Sale, Customer, CustomerContainerBalance, SaleItem } from "@/core/entities/CRM";
import { DispatchManifest } from "@/core/entities/Dispatch";
import { SaleFormValues } from "@/core/validations/crmSchemas";
import { adminDb } from "@/services/firebase/admin";
import {
  calculateInverseContainerDeltas,
  applyContainerDeltas,
  calculateDebtToReverse,
  reverseManifestItems,
} from "@/core/use-cases/sales/saleReversal";
import {
  allocatePaymentFIFO,
  allocatePaymentDirected,
  validateDirectedAllocations,
} from "@/core/use-cases/collections/paymentAllocation";
import { serializeFirestoreData } from "@/services/firebase/serialization";
import { paginate, PaginatedResult } from "./_pagination";

const SALES_COLLECTION = "sales";
const CUSTOMERS_COLLECTION = "customers";
const DISPATCH_COLLECTION = "dispatchManifests";
const PRODUCTS_COLLECTION = "products";
const PRODUCTION_COLLECTION = "productionBatches";
const CUSTOMER_CONTAINER_LOGS_COLLECTION = "customerContainerLogs";

const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;

function getPeruNow() {
  return new Date(Date.now() - OFFSET_PERU_MS);
}

function getPeruMonthStartUtc(year: number, monthIndex: number) {
  return admin.firestore.Timestamp.fromDate(new Date(Date.UTC(year, monthIndex, 1, 5, 0, 0, 0)));
}

export const salesRepository = {
  /**
   * Registra una venta atómica.
   */
  async registerSale(
    data: SaleFormValues,
    driverId: string,
    registeredBy: string,
  ): Promise<string> {
    return await adminDb.runTransaction(async (transaction) => {
      // 1. Definir Referencias Comunes
      const customerRef = adminDb
        .collection(CUSTOMERS_COLLECTION)
        .doc(data.customerId);
      const newSaleRef = adminDb.collection(SALES_COLLECTION).doc();

      let manifestRef;
      if (data.saleType === "ROUTE" && data.manifestId) {
        manifestRef = adminDb
          .collection(DISPATCH_COLLECTION)
          .doc(data.manifestId);
      }

      // 2. Lecturas Previas Obligatorias
      const customerDoc = await transaction.get(customerRef);
      if (!customerDoc.exists)
        throw new Error("Cliente no encontrado en el CRM.");
      const customer = customerDoc.data() as Customer;

      let manifest: any = null;
      if (data.saleType === "ROUTE" && manifestRef) {
        const manifestDoc = await transaction.get(manifestRef);
        if (!manifestDoc.exists)
          throw new Error("Manifiesto de ruta no encontrado.");
        manifest = manifestDoc.data();

        if (manifest.status !== "ON_ROUTE") {
          throw new Error(
            "Seguridad: No se pueden registrar ventas en una ruta que ya fue liquidada o cancelada.",
          );
        }
      }

      // Leer productos si es venta en planta para tener los stocks previos para el Kardex y validar lotes FEFO
      const productDocsMap: Record<string, any> = {};
      const productBatchesMap: Record<string, any[]> = {};

      if (data.saleType === "PLANT") {
        const uniqueProductIds = Array.from(
          new Set([
            ...data.items.map((i) => i.productId),
            ...data.returnedEmpties.map((e) => e.productId),
          ]),
        );
        for (const pId of uniqueProductIds) {
          const pRef = adminDb.collection(PRODUCTS_COLLECTION).doc(pId);
          const pDoc = await transaction.get(pRef);
          if (!pDoc.exists) {
            throw new Error(`Producto ${pId} no encontrado en el catálogo.`);
          }
          productDocsMap[pId] = pDoc.data();
        }

        // Consultar y ordenar lotes por FEFO para los productos vendidos
        const soldProductIds = Array.from(new Set(data.items.map((i) => i.productId)));
        for (const pId of soldProductIds) {
          const batchesQuery = await transaction.get(
            adminDb
              .collection(PRODUCTION_COLLECTION)
              .where("productId", "==", pId)
              .where("currentStock", ">", 0)
              .orderBy("currentStock", "asc")
          );

          const availableBatches = batchesQuery.docs
            .map((doc) => {
              const bData = doc.data();
              return {
                id: doc.id,
                ref: doc.ref,
                currentStock: bData.currentStock || 0,
                productionDate: bData.productionDate
                  ? (bData.productionDate instanceof admin.firestore.Timestamp
                      ? bData.productionDate.toDate()
                      : new Date(bData.productionDate))
                  : new Date(0),
                expirationDate: bData.expirationDate
                  ? (bData.expirationDate instanceof admin.firestore.Timestamp
                      ? bData.expirationDate.toDate()
                      : new Date(bData.expirationDate))
                  : null,
                lotNumber: bData.lotNumber || "GENERIC",
              };
            })
            .sort((a, b) => {
              const aExp = a.expirationDate ? a.expirationDate.getTime() : Infinity;
              const bExp = b.expirationDate ? b.expirationDate.getTime() : Infinity;
              if (aExp !== bExp) {
                return aExp - bExp; // FEFO: primero en vencer
              }
              // Desempate por producción más antigua (FIFO)
              return a.productionDate.getTime() - b.productionDate.getTime();
            });

          productBatchesMap[pId] = availableBatches;
        }

        // Validar que la suma de stock vivo en lotes alcance para la venta o que el lote específico tenga stock suficiente para maquila
        for (const item of data.items) {
          const productData = productDocsMap[item.productId];
          const isMaquila = productData?.isMaquila === true;
          const isBottleOnly = item.itemSaleType === "BOTTLE";

          if (isBottleOnly) continue;

          const availableBatches = productBatchesMap[item.productId] || [];

          if (isMaquila) {
            if (!item.lotNumber) {
              throw new Error(
                `Debe seleccionar un lote para el producto de maquila: ${productData?.name || item.productId}`
              );
            }
            const matchingBatch = availableBatches.find((b) => b.lotNumber === item.lotNumber);
            if (!matchingBatch) {
              throw new Error(
                `Lote ${item.lotNumber} no encontrado o sin stock para el producto de maquila: ${productData?.name || item.productId}`
              );
            }
            if (matchingBatch.currentStock < item.quantity) {
              throw new Error(
                `Stock insuficiente en el lote ${item.lotNumber} para ${productData?.name || item.productId}. Disponible: ${matchingBatch.currentStock}, Solicitado: ${item.quantity}.`
              );
            }
          } else {
            // Producto estándar: validar suma total de lotes
            const totalAvailable = availableBatches.reduce((acc, b) => acc + b.currentStock, 0);
            if (totalAvailable < item.quantity) {
              throw new Error(
                `Stock de lotes insuficiente para ${productData?.name || item.productId}. El catálogo general dice tener ${productData?.stockFilled || 0}, pero la suma de los lotes vivos es ${totalAvailable} e intentas vender ${item.quantity}.`
              );
            }
          }
        }
      }

      const manifestLotsMap: Record<string, any[]> = {};

      if (data.saleType === "ROUTE" && manifest) {
        // Obtener los lotes cargados en este camión
        const loadedItems = manifest.items || [];
        const productIdsOnTruck: string[] = Array.from(new Set(loadedItems.map((i: any) => i.productId as string)));

        for (const pId of productIdsOnTruck) {
          const lotsForProduct = loadedItems
            .filter((i: any) => i.productId === pId)
            .map((i: any) => i.lotNumber);

          if (lotsForProduct.length > 0) {
            const batchesQuery = await transaction.get(
              adminDb
                .collection(PRODUCTION_COLLECTION)
                .where("productId", "==", pId)
                .where("lotNumber", "in", lotsForProduct.slice(0, 10))
            );

            const batchDocs = batchesQuery.docs.map((doc) => {
              const bData = doc.data();
              return {
                lotNumber: bData.lotNumber,
                expirationDate: bData.expirationDate
                  ? (bData.expirationDate instanceof admin.firestore.Timestamp
                      ? bData.expirationDate.toDate()
                      : new Date(bData.expirationDate))
                  : null,
                productionDate: bData.productionDate
                  ? (bData.productionDate instanceof admin.firestore.Timestamp
                      ? bData.productionDate.toDate()
                      : new Date(bData.productionDate))
                  : new Date(0),
              };
            });

            manifestLotsMap[pId] = batchDocs;
          }
        }
      }

      // 3. Calcular la nueva Cuenta Corriente de Envases del Cliente
      const currentBalances = customer.containerBalances || [];
      const balanceMap = new Map<string, number>();

      currentBalances.forEach((b) => balanceMap.set(b.productId, b.balance));
      data.items.forEach((item) => {
        const current = balanceMap.get(item.productId) || 0;
        balanceMap.set(item.productId, current + item.quantity);
      });
      data.returnedEmpties.forEach((empty) => {
        const current = balanceMap.get(empty.productId) || 0;
        balanceMap.set(empty.productId, current - empty.quantity);
      });

      const newContainerBalances: CustomerContainerBalance[] = Array.from(
        balanceMap.entries(),
      ).map(([productId, balance]) => ({ productId, balance }));

      // 4. Cálculos Financieros
      const totalAmount = data.items.reduce(
        (acc, item) => acc + item.quantity * item.unitPrice,
        0,
      );
      const totalPaid = data.cashReceived + data.digitalReceived;

      const newMoneyDebt =
        data.paymentMethod === "CREDIT"
          ? totalAmount
          : Math.max(0, totalAmount - totalPaid);

      const currentMoneyDebt = customer.debtAmount || 0;
      const updatedMoneyDebt = currentMoneyDebt + newMoneyDebt;

      const remainingBalance = newMoneyDebt;
      let paymentStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";

      if (remainingBalance === 0) {
        paymentStatus = "PAID";
      } else if (remainingBalance < totalAmount) {
        paymentStatus = "PARTIAL";
      } else {
        paymentStatus = "UNPAID";
      }

      // 5. Estructurar el documento de Venta (El Ticket)
      const finalSaleItems: any[] = [];
      if (data.saleType === "PLANT") {
        data.items.forEach((item) => {
          const productData = productDocsMap[item.productId];
          const isMaquila = productData?.isMaquila === true;
          const isBottleOnly = item.itemSaleType === "BOTTLE";

          if (isBottleOnly) {
            finalSaleItems.push({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              lotNumber: "",
            });
            return;
          }

          const availableBatches = productBatchesMap[item.productId] || [];

          if (isMaquila) {
            // Para maquila, consumimos exactamente del lote seleccionado
            const batch = availableBatches.find((b) => b.lotNumber === item.lotNumber);
            if (!batch) {
              throw new Error(`Error inesperado: Lote maquila ${item.lotNumber} no disponible.`);
            }
            finalSaleItems.push({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              lotNumber: batch.lotNumber,
            });
          } else {
            // Producto estándar: FEFO
            let remainingToFulfill = item.quantity;

            for (const batch of availableBatches) {
              if (remainingToFulfill <= 0) break;
              const takeFromBatch = Math.min(batch.currentStock, remainingToFulfill);
              finalSaleItems.push({
                productId: item.productId,
                quantity: takeFromBatch,
                unitPrice: item.unitPrice,
                subtotal: takeFromBatch * item.unitPrice,
                lotNumber: batch.lotNumber,
              });
              remainingToFulfill -= takeFromBatch;
            }

            if (remainingToFulfill > 0) {
              finalSaleItems.push({
                productId: item.productId,
                quantity: remainingToFulfill,
                unitPrice: item.unitPrice,
                subtotal: remainingToFulfill * item.unitPrice,
                lotNumber: "GENERIC",
              });
            }
          }
        });
      } else {
        // Venta en ruta: consumir lotes del camión por FEFO
        data.items.forEach((item) => {
          const truckLots = (manifest.items || [])
            .filter((mItem: any) => mItem.productId === item.productId)
            .map((mItem: any) => {
              const batchDetails = (manifestLotsMap[item.productId] || [])
                .find((b) => b.lotNumber === mItem.lotNumber);
              return {
                mItem,
                lotNumber: mItem.lotNumber,
                expirationDate: batchDetails?.expirationDate || null,
                productionDate: batchDetails?.productionDate || new Date(0),
                availableQty: mItem.quantityLoaded - (mItem.quantitySold || 0),
              };
            })
            .sort((a: any, b: any) => {
              const aExp = a.expirationDate ? a.expirationDate.getTime() : Infinity;
              const bExp = b.expirationDate ? b.expirationDate.getTime() : Infinity;
              if (aExp !== bExp) {
                return aExp - bExp; // FEFO
              }
              return a.productionDate.getTime() - b.productionDate.getTime(); // FIFO desempate
            });

          let remainingToFulfill = item.quantity;

          for (const tLot of truckLots) {
            if (remainingToFulfill <= 0) break;
            const takeFromTruck = Math.min(tLot.availableQty, remainingToFulfill);
            if (takeFromTruck <= 0) continue;

            tLot.mItem.quantitySold = (tLot.mItem.quantitySold || 0) + takeFromTruck;

            finalSaleItems.push({
              productId: item.productId,
              quantity: takeFromTruck,
              unitPrice: item.unitPrice,
              subtotal: takeFromTruck * item.unitPrice,
              lotNumber: tLot.lotNumber,
            });

            remainingToFulfill -= takeFromTruck;
          }

          if (remainingToFulfill > 0) {
            throw new Error(
              `Stock insuficiente en el camión para el producto ${item.productId}. Intentas vender ${item.quantity} pero solo quedan ${item.quantity - remainingToFulfill} unidades disponibles en la carga del camión.`
            );
          }
        });
      }

      const saleDoc: any = {
        id: newSaleRef.id,
        manifestId:
          data.saleType === "PLANT" ? "PLANT_SALE" : data.manifestId || "",
        driverId: data.saleType === "PLANT" ? "ADMIN_WEB" : driverId,
        registeredBy: registeredBy,
        customerId: data.customerId,
        customerName: customer.name || "Cliente Desconocido",
        customerAlias: customer.alias || "",
        items: finalSaleItems,
        returnedEmpties: data.returnedEmpties,
        totalAmount,
        paymentMethod: data.paymentMethod,
        cashReceived: data.cashReceived,
        digitalReceived: data.digitalReceived,
        notes: data.notes,
        status: "COMPLETED",
        paymentStatus: paymentStatus,
        remainingBalance: remainingBalance,

        // 🔥 CORRECCIÓN CRÍTICA: Guardamos correctamente los flags de SUNAT
        isBilled: false,
        sunatDocumentId: null,
        billingSkipped: data.requiresBilling === false, // Si no pide factura, se salta la facturación

        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      // 6. ESCRITURAS SIMULTÁNEAS
      transaction.set(newSaleRef, saleDoc);

      transaction.update(customerRef, {
        containerBalances: newContainerBalances,
        debtAmount: updatedMoneyDebt,
        lastSaleDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Calcular delta neto de envases
      const deltaMap = new Map<string, number>();
      (data.items || []).forEach((item) => {
        deltaMap.set(item.productId, (deltaMap.get(item.productId) || 0) + item.quantity);
      });
      (data.returnedEmpties || []).forEach((empty) => {
        deltaMap.set(empty.productId, (deltaMap.get(empty.productId) || 0) - empty.quantity);
      });

      const delta = Array.from(deltaMap.entries())
        .map(([productId, d]) => ({ productId, delta: d }))
        .filter((item) => item.delta !== 0);

      if (delta.length > 0) {
        const containerLogRef = adminDb.collection(CUSTOMER_CONTAINER_LOGS_COLLECTION).doc();
        transaction.set(containerLogRef, {
          id: containerLogRef.id,
          customerId: data.customerId,
          type: "SALE",
          saleId: newSaleRef.id,
          manifestId: data.saleType === "ROUTE" ? (data.manifestId || null) : null,
          delta,
          detail: {
            items: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            returnedEmpties: data.returnedEmpties.map((e) => ({ productId: e.productId, quantity: e.quantity })),
          },
          balanceAfter: newContainerBalances,
          userId: registeredBy || "SYSTEM",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // C) ACTUALIZAR INVENTARIOS SEGÚN EL TIPO DE VENTA
      if (data.saleType === "ROUTE" && manifestRef && manifest) {
        // VENTA EN RUTA: Actualizar el manifiesto con los ítems y cantidades vendidas desglosadas por lote
        transaction.update(manifestRef, {
          cashExpected: (manifest.cashExpected || 0) + data.cashReceived,
          digitalPaymentsExpected:
            (manifest.digitalPaymentsExpected || 0) + data.digitalReceived,
          items: manifest.items,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (data.saleType === "PLANT") {
        // VENTA EN PLANTA: Actualizar el almacén central directo (Descontar llenos, aumentar vacíos), descontar de lotes y registrar en Kardex
        data.items.forEach((item) => {
          const productRef = adminDb
            .collection(PRODUCTS_COLLECTION)
            .doc(item.productId);
          
          const productData = productDocsMap[item.productId];
          const previousStock = productData?.stockFilled || 0;
          const newStock = previousStock - item.quantity;

          const isMaquila = productData?.isMaquila === true;
          const isBottleOnly = item.itemSaleType === "BOTTLE";

          if (isBottleOnly) return; // Si es solo envase vacío, no descuenta stock de lote de producto lleno ni registra egreso de lleno

          transaction.update(productRef, {
            stockFilled: newStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const availableBatches = productBatchesMap[item.productId] || [];

          if (isMaquila) {
            // Descontar del lote específico para maquila
            const batch = availableBatches.find((b) => b.lotNumber === item.lotNumber);
            if (!batch) {
              throw new Error(`Error inesperado: Lote maquila ${item.lotNumber} no disponible en escritura.`);
            }

            transaction.update(batch.ref, {
              currentStock: batch.currentStock - item.quantity,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const batchNewStock = previousStock - item.quantity;

            // Registrar en Kardex para este lote específico
            const kardexRef = adminDb.collection("kardexLogs").doc();
            transaction.set(kardexRef, {
              productId: item.productId,
              type: "OUT",
              phase: "FILLED",
              quantity: item.quantity,
              lotNumber: batch.lotNumber,
              referenceId: newSaleRef.id,
              referenceType: "SALE",
              previousStock: previousStock,
              newStock: batchNewStock,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              movementType: "SALE",
              delta: -item.quantity,
              resultingBalance: batchNewStock,
              userId: registeredBy || "SYSTEM",
            });
          } else {
            // Producto estándar: FEFO
            let remainingToFulfill = item.quantity;
            let currentPreviousStock = previousStock;

            for (const batch of availableBatches) {
              if (remainingToFulfill <= 0) break;
              const takeFromBatch = Math.min(batch.currentStock, remainingToFulfill);

              transaction.update(batch.ref, {
                currentStock: batch.currentStock - takeFromBatch,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              const batchNewStock = currentPreviousStock - takeFromBatch;

              // Registrar en Kardex para este lote específico
              const kardexRef = adminDb.collection("kardexLogs").doc();
              transaction.set(kardexRef, {
                productId: item.productId,
                type: "OUT",
                phase: "FILLED",
                quantity: takeFromBatch,
                lotNumber: batch.lotNumber,
                referenceId: newSaleRef.id,
                referenceType: "SALE",
                previousStock: currentPreviousStock,
                newStock: batchNewStock,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                // Nuevos campos
                movementType: "SALE",
                delta: -takeFromBatch,
                resultingBalance: batchNewStock,
                userId: registeredBy || "SYSTEM",
              });

              currentPreviousStock = batchNewStock;
              remainingToFulfill -= takeFromBatch;
            }
          }
        });

        data.returnedEmpties.forEach((empty) => {
          if (empty.quantity <= 0) return;
          const productRef = adminDb
            .collection(PRODUCTS_COLLECTION)
            .doc(empty.productId);
          
          const productData = productDocsMap[empty.productId];
          const previousStock = productData?.stockEmpty || 0;
          const newStock = previousStock + empty.quantity;

          transaction.update(productRef, {
            stockEmpty: newStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Registrar en Kardex
          const kardexRef = adminDb.collection("kardexLogs").doc();
          transaction.set(kardexRef, {
            productId: empty.productId,
            type: "IN",
            phase: "EMPTY",
            quantity: empty.quantity,
            referenceId: newSaleRef.id,
            referenceType: "SALE",
            previousStock: previousStock,
            newStock: newStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Nuevos campos
            movementType: "SALE",
            delta: empty.quantity,
            resultingBalance: newStock,
            userId: registeredBy || "SYSTEM",
          });
        });
      }

      return newSaleRef.id;
    });
  },

  async getRecentSales(limitCount = 100): Promise<Sale[]> {
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async getPaginatedSales(
    limitCount: number,
    lastCreatedAtIso?: string,
    paymentFilter?: string,
  ): Promise<Sale[]> {
    let query: admin.firestore.Query = adminDb.collection(SALES_COLLECTION);

    if (paymentFilter && paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", paymentFilter);
    }

    query = query.orderBy("createdAt", "desc").limit(limitCount);

    if (lastCreatedAtIso) {
      const lastDate = new Date(lastCreatedAtIso);
      const lastTimestamp = admin.firestore.Timestamp.fromDate(lastDate);
      query = query.startAfter(lastTimestamp);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async registerPayment(data: any): Promise<void> {
    return await adminDb.runTransaction(async (transaction) => {
      const customerRef = adminDb.collection("customers").doc(data.customerId);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists) throw new Error("Cliente no encontrado");

      const appliedTo: { saleId: string; amountApplied: number }[] = [];

      if (data.allocationMode === "DIRECTED") {
        // 1. Validaciones y lecturas
        const allocationSaleRefs = (data.allocations || []).map((a: { saleId: string; amount: number }) =>
          adminDb.collection(SALES_COLLECTION).doc(a.saleId)
        );

        const saleDocs = allocationSaleRefs.length > 0
          ? await transaction.getAll(...allocationSaleRefs)
          : [];

        const salesList: any[] = [];

        for (let i = 0; i < (data.allocations || []).length; i++) {
          const alloc = data.allocations[i];
          const saleDoc = saleDocs[i];

          if (!saleDoc || !saleDoc.exists) {
            throw new Error(`La venta ${alloc.saleId} no existe.`);
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sale = saleDoc.data() as any;
          if (sale.customerId !== data.customerId) {
            throw new Error(`La venta ${alloc.saleId} no pertenece a este cliente.`);
          }
          if (sale.status !== "COMPLETED") {
            throw new Error(`La venta ${alloc.saleId} no está completada.`);
          }
          if (!["UNPAID", "PARTIAL"].includes(sale.paymentStatus)) {
            throw new Error(`La venta ${alloc.saleId} ya está cobrada o no está pendiente.`);
          }

          salesList.push({
            id: saleDoc.id,
            totalAmount: sale.totalAmount,
            remainingBalance: sale.remainingBalance,
          });
        }

        // Ejecutar validación pura
        const validation = validateDirectedAllocations(data.amount, data.allocations || [], salesList);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // 2. Ejecutar asignación de pago pura
        const allocationResults = allocatePaymentDirected(data.amount, data.allocations || [], salesList);

        // 3. Aplicar escrituras
        for (const res of allocationResults) {
          const saleDoc = saleDocs.find((doc) => doc.id === res.saleId);
          if (!saleDoc) continue;

          transaction.update(saleDoc.ref, {
            remainingBalance: res.newRemainingBalance,
            paymentStatus: res.newPaymentStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          appliedTo.push({
            saleId: res.saleId,
            amountApplied: res.amountApplied,
          });
        }
      } else {
        // MODO FIFO (Comportamiento actual)
        const pendingQuery = adminDb
          .collection(SALES_COLLECTION)
          .where("customerId", "==", data.customerId)
          .where("status", "==", "COMPLETED")
          .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
          .orderBy("createdAt", "asc");

        const pendingSnap = await transaction.get(pendingQuery);

        const salesList = pendingSnap.docs.map((doc) => {
          const s = doc.data();
          return {
            id: doc.id,
            totalAmount: s.totalAmount,
            remainingBalance: s.remainingBalance,
          };
        });

        const allocationResults = allocatePaymentFIFO(data.amount, salesList);

        for (const res of allocationResults) {
          const doc = pendingSnap.docs.find((d) => d.id === res.saleId);
          if (!doc) continue;

          transaction.update(doc.ref, {
            remainingBalance: res.newRemainingBalance,
            paymentStatus: res.newPaymentStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          appliedTo.push({
            saleId: res.saleId,
            amountApplied: res.amountApplied,
          });
        }
      }

      transaction.update(customerRef, {
        debtAmount: admin.firestore.FieldValue.increment(-data.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const paymentRef = adminDb.collection("debtPayments").doc();
      transaction.set(paymentRef, {
        ...data,
        bankId: data.bankId || null,
        bankName: data.bankName || null,
        appliedTo: appliedTo,
        status: "ACTIVE",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        receivedById: data.receivedById || "ADMIN_DIRECT_PAYMENT",
      });
    });
  },

  async getPendingSalesByCustomer(customerId: string): Promise<Sale[]> {
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("customerId", "==", customerId)
      .where("status", "==", "COMPLETED")
      .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        ...doc.data(),
        id: doc.id,
      });
    });
  },

  async getCustomerPaymentHistory(customerId: string): Promise<any[]> {
    const snapshot = await adminDb
      .collection("debtPayments")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async listPaymentsPaginated(options: {
    pageSize: number;
    cursor?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResult<any>> {
    let query: admin.firestore.Query = adminDb.collection("debtPayments");

    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(`${options.startDate}T00:00:00-05:00`)
      );
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(`${options.endDate}T23:59:59-05:00`)
      );
      query = query.where("createdAt", "<=", endTimestamp);
    }

    query = query
      .orderBy("createdAt", "desc")
      .orderBy("__name__", "desc");

    return await paginate<any>(
      query,
      options,
      ["createdAt", "id"],
      (doc) => {
        return serializeFirestoreData({
          id: doc.id,
          ...doc.data(),
        });
      }
    );
  },

  async getPaymentsCount(options: {
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    let query: admin.firestore.Query = adminDb.collection("debtPayments");

    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(`${options.startDate}T00:00:00-05:00`)
      );
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(`${options.endDate}T23:59:59-05:00`)
      );
      query = query.where("createdAt", "<=", endTimestamp);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  },

  async getActivePaymentsMetricsByDateRange(options: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ totalCollected: number; totalCash: number; totalTransfer: number; totalYapePlin: number }> {
    let query: admin.firestore.Query = adminDb.collection("debtPayments");

    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(`${options.startDate}T00:00:00-05:00`)
      );
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(`${options.endDate}T23:59:59-05:00`)
      );
      query = query.where("createdAt", "<=", endTimestamp);
    }

    const snapshot = await query.select("amount", "paymentMethod", "status").get();
    
    let totalCollected = 0;
    let totalCash = 0;
    let totalTransfer = 0;
    let totalYapePlin = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "ACTIVE") return;
      
      const amount = Number(data.amount || 0);
      totalCollected += amount;
      
      if (data.paymentMethod === "CASH") {
        totalCash += amount;
      } else if (data.paymentMethod === "TRANSFER") {
        totalTransfer += amount;
      } else if (data.paymentMethod === "YAPE_PLIN") {
        totalYapePlin += amount;
      }
    });

    return { totalCollected, totalCash, totalTransfer, totalYapePlin };
  },

  async cancelPayment(
    paymentId: string,
    cancelledByUid: string,
  ): Promise<void> {
    return await adminDb.runTransaction(async (transaction) => {
      const paymentRef = adminDb.collection("debtPayments").doc(paymentId);
      const paymentDoc = await transaction.get(paymentRef);

      if (!paymentDoc.exists)
        throw new Error("El comprobante de pago no existe.");

      const payment = paymentDoc.data() as any;

      if (payment.status === "CANCELLED") {
        throw new Error("Este pago ya fue anulado previamente.");
      }

      const appliedTo = payment.appliedTo || [];
      const saleRefs = appliedTo.map((item: any) =>
        adminDb.collection(SALES_COLLECTION).doc(item.saleId),
      );

      const saleDocs =
        saleRefs.length > 0 ? await transaction.getAll(...saleRefs) : [];

      const customerRef = adminDb
        .collection("customers")
        .doc(payment.customerId);
      transaction.update(customerRef, {
        debtAmount: admin.firestore.FieldValue.increment(payment.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      appliedTo.forEach((item: any, index: number) => {
        const saleDoc = saleDocs[index];

        if (saleDoc && saleDoc.exists) {
          const saleData = saleDoc.data() as any;
          const newBalance =
            (saleData.remainingBalance || 0) + item.amountApplied;
          const newStatus =
            newBalance >= saleData.totalAmount ? "UNPAID" : "PARTIAL";

          transaction.update(saleDoc.ref, {
            remainingBalance: newBalance,
            paymentStatus: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      transaction.update(paymentRef, {
        status: "CANCELLED",
        cancelledBy: cancelledByUid,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },

  // 🔥 CORRECCIÓN CRÍTICA: Filtrado en memoria para evitar errores de índice en Firebase
  async getUnbilledSales() {
    // 1. Buscamos solo por isBilled para no forzar la creación de un Índice Compuesto
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("isBilled", "==", false)
      .get();

    // 2. Mapeamos TODA la data (incluyendo items) y serializamos fechas.
    const pendingSales = snapshot.docs.map((doc) => {
      const data = doc.data();
      const serialized = serializeFirestoreData({
        ...data,
        id: doc.id,
      });

      return {
        ...serialized,
        customerId: (data.customerId ?? "") as string,
        totalAmount: (data.totalAmount ?? 0) as number,
        issueDate: data.createdAt?.toDate
          ? data.createdAt.toDate().toLocaleDateString("es-PE")
          : "Sin fecha",
      };
    });

    // 3. Filtramos en memoria los que "saltaron" facturación y ordenamos por fecha descendente
    return pendingSales
      .filter((sale: any) => sale.billingSkipped !== true)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Descendente (los más nuevos primero)
      });
  },

  async getSaleDetailFull(saleId: string) {
    const saleDoc = await adminDb
      .collection(SALES_COLLECTION)
      .doc(saleId)
      .get();
    if (!saleDoc.exists) return null;
    const saleData: any = { id: saleDoc.id, ...saleDoc.data() };

    const customerDoc = await adminDb
      .collection("customers")
      .doc(saleData.customerId)
      .get();
    const customerData: any = customerDoc.exists
      ? { id: customerDoc.id, ...customerDoc.data() }
      : null;

    let sunatData: any = null;
    if (saleData.sunatDocumentId) {
      const sunatDoc = await adminDb
        .collection("sunatDocuments")
        .doc(saleData.sunatDocumentId)
        .get();
      if (sunatDoc.exists) sunatData = { id: sunatDoc.id, ...sunatDoc.data() };
    }

    let greData: any = null;
    const greSnapshot = await adminDb
      .collection("sunatDocuments")
      .where("saleId", "==", saleId)
      .where("type", "==", "09")
      .limit(1)
      .get();

    if (!greSnapshot.empty) {
      greData = { id: greSnapshot.docs[0].id, ...greSnapshot.docs[0].data() };
    }

    const trucksSnapshot = await adminDb.collection("trucks").get();
    const trucks = trucksSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const usersSnapshot = await adminDb.collection("users").get();
    const drivers = usersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return serializeFirestoreData({
      saleData,
      customerData,
      sunatData,
      greData,
      trucks,
      drivers,
    });
  },

  async listPaginated(options: {
    pageSize: number;
    cursor?: string;
    paymentFilter?: string;
    customerId?: string;
    isBilled?: boolean;
    startDate?: string;
    endDate?: string;
    includeCancelled?: boolean;
  }) {
    let query: admin.firestore.Query = adminDb.collection(SALES_COLLECTION);

    if (!options.includeCancelled) {
      query = query.where("status", "==", "COMPLETED");
    }
    if (options.paymentFilter && options.paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", options.paymentFilter);
    }
    if (options.customerId) {
      query = query.where("customerId", "==", options.customerId);
    }
    if (options.isBilled !== undefined) {
      query = query.where("isBilled", "==", options.isBilled);
    }
    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.startDate));
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.endDate));
      query = query.where("createdAt", "<=", endTimestamp);
    }

    query = query
      .select(
        "id",
        "createdAt",
        "customerId",
        "customerName",
        "customerAlias",
        "paymentMethod",
        "totalAmount",
        "cashReceived",
        "digitalReceived",
        "remainingBalance",
        "isBilled",
        "sunatDocumentId",
        "items",
        "billingSkipped",
        "status",
        "cancellationReason",
        "cancelledAt"
      )
      .orderBy("createdAt", "desc")
      .orderBy("__name__", "desc");

    return await paginate<Sale>(
      query,
      options,
      ["createdAt", "id"],
      (doc) => {
        const data = doc.data();
        return serializeFirestoreData({
          id: doc.id,
          ...data,
          items: data.items || [],
        }) as Sale;
      }
    );
  },

  async getSalesMetrics(options: {
    paymentFilter?: string;
    customerId?: string;
    isBilled?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    let query: admin.firestore.Query = adminDb
      .collection(SALES_COLLECTION)
      .where("status", "==", "COMPLETED");

    if (options.paymentFilter && options.paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", options.paymentFilter);
    }
    if (options.customerId) {
      query = query.where("customerId", "==", options.customerId);
    }
    if (options.isBilled !== undefined) {
      query = query.where("isBilled", "==", options.isBilled);
    }
    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.startDate));
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.endDate));
      query = query.where("createdAt", "<=", endTimestamp);
    }

    let totalRevenue = 0;
    let totalCash = 0;
    let totalDigital = 0;

    try {
      const aggSnapshot = await query.aggregate({
        totalRevenue: admin.firestore.AggregateField.sum("totalAmount"),
        totalCash: admin.firestore.AggregateField.sum("cashReceived"),
        totalDigital: admin.firestore.AggregateField.sum("digitalReceived"),
      }).get();

      const aggData = aggSnapshot.data();
      totalRevenue = aggData.totalRevenue || 0;
      totalCash = aggData.totalCash || 0;
      totalDigital = aggData.totalDigital || 0;
    } catch (err) {
      console.error("Error in getSalesMetrics aggregate sum, fallback to 0:", err);
    }

    return {
      totalRevenue,
      totalCash,
      totalDigital,
    };
  },

  async getSalesCountThisMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfMonth);
    const countSnapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("createdAt", ">=", startTimestamp)
      .count()
      .get();
    return countSnapshot.data().count;
  },

  async getSalesByManifestIds(manifestIds: string[]): Promise<Sale[]> {
    if (manifestIds.length === 0) return [];

    // Firestore limit for "in" queries is 30 elements.
    // We chunk the manifestIds into groups of 30 to prevent exceptions.
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < manifestIds.length; i += CHUNK_SIZE) {
      chunks.push(manifestIds.slice(i, i + CHUNK_SIZE));
    }

    const allSales: Sale[] = [];

    for (const chunk of chunks) {
      const snapshot = await adminDb
        .collection(SALES_COLLECTION)
        .where("manifestId", "in", chunk)
        .get();

      snapshot.docs.forEach((doc) => {
        allSales.push(
          serializeFirestoreData({
            id: doc.id,
            ...doc.data(),
          }) as Sale
        );
      });
    }

    return allSales;
  },

  /**
   * Agrega ingresos mensuales (Facturado vs Cobrado) para el dashboard.
   * Excluye data legacy filtrando por status "COMPLETED".
   * Forzado a zona horaria Perú (UTC-5) sin librerías.
   */
  async getMonthlyRevenue(monthsBack = 6): Promise<Array<{ month: string; billed: number; cash: number; digital: number }>> {
    const results = [];
    
    // 1. Obtener "ahora" en Perú (UTC-5 fijo) usando helper global
    const peruNow = getPeruNow();
    const currentYear = peruNow.getUTCFullYear();
    const currentMonth = peruNow.getUTCMonth(); // 0-11

    // 3. Iterar hacia atrás
    for (let i = monthsBack - 1; i >= 0; i--) {
      // Calcular año/mes objetivo para esta iteración
      const targetDate = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const targetYear = targetDate.getUTCFullYear();
      const targetMonth = targetDate.getUTCMonth();

      const startTs = getPeruMonthStartUtc(targetYear, targetMonth);
      const endTs = getPeruMonthStartUtc(targetYear, targetMonth + 1);

      const query = adminDb.collection(SALES_COLLECTION)
        .where("status", "==", "COMPLETED")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<", endTs);

      try {
        const aggSnapshot = await query.aggregate({
          totalBilled: admin.firestore.AggregateField.sum("totalAmount"),
          totalCash: admin.firestore.AggregateField.sum("cashReceived"),
          totalDigital: admin.firestore.AggregateField.sum("digitalReceived"),
        }).get();

        const data = aggSnapshot.data();
        
        // Etiqueta alineada con los bordes usados
        const monthLabel = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;

        results.push({
          month: monthLabel,
          billed: data.totalBilled || 0,
          cash: data.totalCash || 0,
          digital: data.totalDigital || 0,
        });
      } catch (err) {
        console.error(`Error aggregating month ${targetYear}-${targetMonth + 1}:`, err);
        results.push({
          month: `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`,
          billed: 0,
          cash: 0,
          digital: 0,
        });
      }
    }

    return results;
  },

  async getProductSalesCurrentMonth(): Promise<Array<{ productId: string; productName: string; units: number; billed: number }>> {
    const peruNow = getPeruNow();
    const currentYear = peruNow.getUTCFullYear();
    const currentMonth = peruNow.getUTCMonth();

    const startTs = getPeruMonthStartUtc(currentYear, currentMonth);
    let endTs: admin.firestore.Timestamp;
    
    if (currentMonth === 11) {
      endTs = getPeruMonthStartUtc(currentYear + 1, 0);
    } else {
      endTs = getPeruMonthStartUtc(currentYear, currentMonth + 1);
    }

    // 1. Obtener todos los productos (aprox 7 docs) para cruce
    const productsSnapshot = await adminDb.collection(PRODUCTS_COLLECTION).get();
    const productsMap = new Map<string, string>();
    productsSnapshot.docs.forEach(doc => {
      productsMap.set(doc.id, doc.data().name || "Producto sin nombre");
    });

    // 2. Acumular ventas por producto
    const productStats = new Map<string, { units: number; billed: number }>();
    
    let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined = undefined;
    let hasMore = true;
    const BATCH_SIZE = 500;

    while (hasMore) {
      let query = adminDb.collection(SALES_COLLECTION)
        .where("status", "==", "COMPLETED")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<", endTs)
        .orderBy("createdAt", "desc")
        .limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      snapshot.docs.forEach(doc => {
        const saleData = doc.data();
        const items = saleData.items || [];
        
        items.forEach((item: any) => {
          if (!item.productId) return;
          const current = productStats.get(item.productId) || { units: 0, billed: 0 };
          productStats.set(item.productId, {
            units: current.units + (item.quantity || 0),
            billed: current.billed + (item.subtotal || 0)
          });
        });
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.docs.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // 3. Formatear salida con nombre y orden
    const results = Array.from(productStats.entries()).map(([productId, stats]) => {
      const productName = productsMap.get(productId) || `Producto desconocido (${productId})`;
      return {
        productId,
        productName,
        units: stats.units,
        billed: stats.billed
      };
    });

    // Ordenar por facturado descendente
    results.sort((a, b) => b.billed - a.billed);

    return results;
  },

  async cancelSale(
    saleId: string,
    cancelledByUid: string,
    reason: string,
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const saleRef = adminDb.collection(SALES_COLLECTION).doc(saleId);
      const saleDoc = await transaction.get(saleRef);

      if (!saleDoc.exists) {
        throw new Error("La venta no existe.");
      }

      interface DBRecordSale extends Sale {
        linkedOrderId?: string;
        guideDocumentId?: string | null;
        billingSkipped?: boolean;
      }

      interface SaleItemWithSaleType extends SaleItem {
        itemSaleType?: string;
      }

      const saleData = saleDoc.data() as DBRecordSale;

      if (saleData.status === "CANCELLED") {
        throw new Error("Esta venta ya ha sido anulada previamente.");
      }

      if (saleData.isBilled === true || saleData.sunatDocumentId) {
        throw new Error("Venta facturada con SUNAT, anule primero el comprobante.");
      }

      const customerRef = adminDb.collection(CUSTOMERS_COLLECTION).doc(saleData.customerId);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists) {
        throw new Error("El cliente asociado a esta venta no existe.");
      }

      const isPlant = saleData.manifestId === "PLANT_SALE";
      let manifestDoc: admin.firestore.DocumentSnapshot | null = null;
      let manifestRef: admin.firestore.DocumentReference | null = null;

      if (!isPlant && saleData.manifestId) {
        manifestRef = adminDb.collection(DISPATCH_COLLECTION).doc(saleData.manifestId);
        manifestDoc = await transaction.get(manifestRef);
        if (!manifestDoc.exists) {
          throw new Error("El manifiesto de ruta no existe.");
        }
        const manifestData = manifestDoc.data();
        if (manifestData?.status === "LIQUIDATED") {
          throw new Error("El manifiesto de ruta ya fue liquidado. No se puede anular esta venta.");
        }
      }

      let orderRef: admin.firestore.DocumentReference | null = null;
      if (saleData.linkedOrderId) {
        orderRef = adminDb.collection("orders").doc(saleData.linkedOrderId);
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
          throw new Error("El pedido asociado a esta venta no existe.");
        }
      }

      // PRE-FETCH FOR PLANT PRODUCTS AND BATCHES
      const productDocsMap: Record<string, admin.firestore.DocumentData> = {};
      const batchDocsMap: Record<string, { ref: admin.firestore.DocumentReference; currentStock: number }> = {};

      if (isPlant) {
        const uniqueProductIds = Array.from(
          new Set([
            ...saleData.items.map((i) => i.productId),
            ...saleData.returnedEmpties.map((e) => e.productId),
          ])
        );

        for (const pId of uniqueProductIds) {
          const pRef = adminDb.collection(PRODUCTS_COLLECTION).doc(pId);
          const pDoc = await transaction.get(pRef);
          productDocsMap[pId] = pDoc.exists ? (pDoc.data() || {}) : {};
        }

        for (const item of saleData.items) {
          const isBottleOnly = item.lotNumber === "" || (item as SaleItemWithSaleType).itemSaleType === "BOTTLE";
          if (isBottleOnly || item.lotNumber === "GENERIC" || !item.lotNumber) continue;

          const batchQuery = await adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", item.productId)
            .where("lotNumber", "==", item.lotNumber)
            .limit(1)
            .get();

          if (!batchQuery.empty) {
            const docRef = batchQuery.docs[0].ref;
            const batchDoc = await transaction.get(docRef);
            batchDocsMap[`${item.productId}_${item.lotNumber}`] = {
              ref: docRef,
              currentStock: batchDoc.exists ? batchDoc.data()?.currentStock || 0 : 0,
            };
          }
        }
      }

      // 1. CÁLCULO DE REVERSA DE ENVASES
      const containerDeltas = calculateInverseContainerDeltas(
        saleData.items || [],
        saleData.returnedEmpties || []
      );

      const customerData = customerDoc.data() as Customer;
      const newContainerBalances = applyContainerDeltas(
        customerData.containerBalances || [],
        containerDeltas
      );

      // 2. CÁLCULO DE REVERSA DE DEUDA
      const debtToSubtract = calculateDebtToReverse(saleData);

      // 3. ESCRITURAS COMUNES
      transaction.update(saleRef, {
        status: "CANCELLED",
        remainingBalance: 0,
        cancelledBy: cancelledByUid,
        cancellationReason: reason,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(customerRef, {
        containerBalances: newContainerBalances,
        debtAmount: admin.firestore.FieldValue.increment(-debtToSubtract),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (containerDeltas.length > 0) {
        const containerLogRef = adminDb.collection(CUSTOMER_CONTAINER_LOGS_COLLECTION).doc();
        transaction.set(containerLogRef, {
          id: containerLogRef.id,
          customerId: saleData.customerId,
          type: "REVERSAL",
          saleId: saleId,
          manifestId: saleData.manifestId !== "PLANT_SALE" ? (saleData.manifestId || null) : null,
          delta: containerDeltas,
          detail: {
            items: saleData.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            returnedEmpties: saleData.returnedEmpties.map((e) => ({ productId: e.productId, quantity: e.quantity })),
          },
          balanceAfter: newContainerBalances,
          userId: cancelledByUid,
          reason: reason,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 4. ESCRITURAS ESPECÍFICAS
      if (isPlant) {
        // VENTA PLANTA
        saleData.items.forEach((item) => {
          const isBottleOnly = item.lotNumber === "" || (item as SaleItemWithSaleType).itemSaleType === "BOTTLE";
          if (isBottleOnly) return;

          const productRef = adminDb.collection(PRODUCTS_COLLECTION).doc(item.productId);
          const productData = productDocsMap[item.productId] || {};
          const previousStockFilled = productData.stockFilled || 0;
          const newStockFilled = previousStockFilled + item.quantity;

          transaction.update(productRef, {
            stockFilled: newStockFilled,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          productDocsMap[item.productId].stockFilled = newStockFilled;

          if (item.lotNumber && item.lotNumber !== "GENERIC") {
            const batchInfo = batchDocsMap[`${item.productId}_${item.lotNumber}`];
            if (batchInfo) {
              transaction.update(batchInfo.ref, {
                currentStock: batchInfo.currentStock + item.quantity,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              batchInfo.currentStock += item.quantity;
            }
          }

          const kardexRef = adminDb.collection("kardexLogs").doc();
          transaction.set(kardexRef, {
            productId: item.productId,
            type: "IN",
            phase: "FILLED",
            quantity: item.quantity,
            lotNumber: item.lotNumber || "GENERIC",
            referenceId: saleId,
            referenceType: "SALE_CANCELLATION",
            previousStock: previousStockFilled,
            newStock: newStockFilled,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            movementType: "REVERSAL",
            delta: item.quantity,
            resultingBalance: newStockFilled,
            userId: cancelledByUid,
          });
        });

        saleData.returnedEmpties.forEach((empty) => {
          if (empty.quantity <= 0) return;
          const productRef = adminDb.collection(PRODUCTS_COLLECTION).doc(empty.productId);
          const productData = productDocsMap[empty.productId] || {};
          const previousStockEmpty = productData.stockEmpty || 0;
          const newStockEmpty = previousStockEmpty - empty.quantity;

          transaction.update(productRef, {
            stockEmpty: newStockEmpty,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          productDocsMap[empty.productId].stockEmpty = newStockEmpty;

          const kardexRef = adminDb.collection("kardexLogs").doc();
          transaction.set(kardexRef, {
            productId: empty.productId,
            type: "OUT",
            phase: "EMPTY",
            quantity: empty.quantity,
            referenceId: saleId,
            referenceType: "SALE_CANCELLATION",
            previousStock: previousStockEmpty,
            newStock: newStockEmpty,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            movementType: "REVERSAL",
            delta: -empty.quantity,
            resultingBalance: newStockEmpty,
            userId: cancelledByUid,
          });
        });
      } else {
        // VENTA RUTA
        if (saleData.linkedOrderId) {
          // ROUTE-pedido
          transaction.update(orderRef!, {
            status: "ASSIGNED",
            saleId: null,
            deliveredAt: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // ROUTE-directa
          const manifestData = manifestDoc!.data() as DispatchManifest;
          const manifestItems = reverseManifestItems(
            manifestData.items || [],
            saleData.items || []
          );

          const newCashExpected = Math.max(
            0,
            (manifestData.cashExpected || 0) - (saleData.cashReceived || 0)
          );
          const newDigitalExpected = Math.max(
            0,
            (manifestData.digitalPaymentsExpected || 0) - (saleData.digitalReceived || 0)
          );

          transaction.update(manifestRef!, {
            items: manifestItems,
            cashExpected: newCashExpected,
            digitalPaymentsExpected: newDigitalExpected,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });
  },
};
