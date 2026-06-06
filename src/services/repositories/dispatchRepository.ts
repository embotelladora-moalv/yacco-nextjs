import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { DispatchManifest, DispatchItem } from "@/core/entities/Dispatch";
import { Product } from "@/core/entities/Inventory";
import { orderRepository } from "./orderRepository";
import { serializeFirestoreData } from "@/services/firebase/serialization";
import { paginate } from "./_pagination";

const DISPATCH_COLLECTION = "dispatchManifests";
const PRODUCTION_COLLECTION = "productionBatches";
const PRODUCTS_COLLECTION = "products";
const KARDEX_COLLECTION = "kardexLogs";

export interface DispatchRequestItem {
  productId: string;
  quantityRequested: number;
}

export const dispatchRepository = {
  /**
   * Crea un Manifiesto de Despacho aplicando lógica FIFO automática a los lotes
   */
  async createDispatch(
    driverId: string,
    dispatcherId: string,
    truckPlate: string,
    requestedItems: DispatchRequestItem[],
    notes?: string,
    assistantId?: string,
    initialPettyCash?: number,
  ): Promise<string> {
    let manifestId = "";

    await adminDb.runTransaction(async (transaction) => {
      const finalItems: DispatchItem[] = [];
      const batchUpdates: {
        ref: admin.firestore.DocumentReference;
        newStock: number;
      }[] = [];
      const productUpdates: {
        ref: admin.firestore.DocumentReference;
        newFilledStock: number;
      }[] = [];
      const kardexEntries: any[] = [];

      // 1. ITERAR SOBRE CADA PRODUCTO SOLICITADO
      for (const item of requestedItems) {
        // A. Validar stock general del producto
        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(item.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists)
          throw new Error(`Producto ${item.productId} no encontrado`);
        const productData = productDoc.data() as Product;

        if (productData.stockFilled < item.quantityRequested) {
          throw new Error(
            `Stock insuficiente para ${productData.name}. Faltan ${item.quantityRequested - productData.stockFilled} unidades.`,
          );
        }

        // B. Buscar Lotes disponibles por FIFO (Ordenados por fecha más antigua)
        const batchesQuery = await transaction.get(
          adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", item.productId)
            .where("currentStock", ">", 0)
            .orderBy("currentStock", "asc"),
        );

        // Ordenamos en memoria por fecha de producción (FIFO puro)
        const availableBatches = batchesQuery.docs
          .map((doc) => ({ id: doc.id, ref: doc.ref, ...(doc.data() as any) }))
          .sort(
            (a, b) =>
              a.productionDate.toDate().getTime() -
              b.productionDate.toDate().getTime(),
          );
        let remainingToFulfill = item.quantityRequested;
        let currentProductPreviousStock = productData.stockFilled;

        // C. Algoritmo de Descuento FIFO
        for (const batch of availableBatches) {
          if (remainingToFulfill <= 0) break;

          const takeFromBatch = Math.min(
            batch.currentStock,
            remainingToFulfill,
          );

          // Preparamos el item trazable para el Manifiesto
          finalItems.push({
            productId: item.productId,
            lotNumber: batch.lotNumber,
            quantityLoaded: takeFromBatch,
            quantitySold: 0,
            quantityReturnedFull: 0,
            wasteQuantity: 0,
          });

          // Preparamos la actualización del lote
          batchUpdates.push({
            ref: batch.ref,
            newStock: batch.currentStock - takeFromBatch,
          });

          // Preparamos el Kardex por lote
          const lotNewStock = currentProductPreviousStock - takeFromBatch;
          const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
          kardexEntries.push({
            ref: kardexRef,
            data: {
              productId: item.productId,
              type: "OUT",
              phase: "FILLED",
              quantity: takeFromBatch,
              lotNumber: batch.lotNumber,
              referenceType: "DISPATCH",
              previousStock: currentProductPreviousStock,
              newStock: lotNewStock,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              // Nuevos campos
              movementType: "DISPATCH",
              delta: -takeFromBatch,
              resultingBalance: lotNewStock,
              userId: dispatcherId || "SYSTEM",
            },
          });

          currentProductPreviousStock = lotNewStock;
          remainingToFulfill -= takeFromBatch;
        }

        // D. Seguridad: Si después de revisar los lotes aún falta, el Kardex está corrupto
        if (remainingToFulfill > 0) {
          throw new Error(
            `Inconsistencia de Kardex en ${productData.name}. El stock general dice tener, pero no hay lotes suficientes que lo respalden.`,
          );
        }

        // E. Preparar actualización del producto general
        const newFilledStock = productData.stockFilled - item.quantityRequested;
        productUpdates.push({ ref: productRef, newFilledStock });
      }

      // 2. ESCRIBIR TODAS LAS ACTUALIZACIONES EN LA BASE DE DATOS
      const manifestRef = adminDb.collection(DISPATCH_COLLECTION).doc();
      manifestId = manifestRef.id;

      // Generar el número de manifiesto
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const manifestNumber = `DESP-${dateStr}-${manifestId.substring(0, 4).toUpperCase()}`;

      // A. Crear el Manifiesto usando 'items'
      transaction.set(manifestRef, {
        manifestNumber,
        driverId,
        dispatcherId,
        truckPlate,
        assistantId: assistantId || null,
        initialPettyCash: initialPettyCash || 0,
        dispatchDate: admin.firestore.FieldValue.serverTimestamp(),
        status: "ON_ROUTE",
        items: finalItems, // <-- CAMBIADO: Usando items en lugar de loadedItems
        returnedEmpties: [],
        cashExpected: 0,
        cashReported: 0,
        digitalPaymentsExpected: 0,
        digitalPaymentsReported: 0,
        notes,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // B. Actualizar Lotes
      for (const update of batchUpdates) {
        transaction.update(update.ref, {
          currentStock: update.newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // C. Actualizar Productos (Stock General)
      for (const update of productUpdates) {
        transaction.update(update.ref, {
          stockFilled: update.newFilledStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // D. Guardar Auditoría en Kardex
      for (const entry of kardexEntries) {
        entry.data.referenceId = manifestId;
        transaction.set(entry.ref, entry.data);
      }
    });

    return manifestId;
  },

  /**
   * Obtiene los últimos manifiestos de despacho
   */
  async getRecentDispatches(): Promise<DispatchManifest[]> {
    const snapshot = await adminDb
      .collection(DISPATCH_COLLECTION)
      .orderBy("dispatchDate", "desc")
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return serializeFirestoreData({
        id: doc.id,
        ...data,
        items: data.items || data.loadedItems || [],
      });
    });
  },

  /**
   * Obtiene los manifiestos que actualmente están en ruta (ON_ROUTE)
   * Útil para ventas en ruta desde el panel web.
   */
  async getActiveManifests(): Promise<DispatchManifest[]> {
    const snapshot = await adminDb
      .collection(DISPATCH_COLLECTION)
      .where("status", "==", "ON_ROUTE")
      .orderBy("dispatchDate", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return serializeFirestoreData({
        id: doc.id,
        ...data,
        items: data.items || data.loadedItems || [],
      });
    });
  },

  /**
   * Liquida una ruta detallada (Kardex robusto)
   */
  async liquidateDispatch(
    manifestId: string,
    liquidationData: {
      items: {
        productId: string;
        lotNumber: string;
        quantityLoaded: number;
        quantityReturnedFull: number;
        wasteQuantity: number;
      }[];
      returnedEmpties: { productId: string; quantityReturned: number }[];
      cashReported?: number;
      digitalPaymentsReported?: number;
      notes?: string;
    },
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const manifestRef = adminDb
        .collection(DISPATCH_COLLECTION)
        .doc(manifestId);
      const manifestDoc = await transaction.get(manifestRef);

      if (!manifestDoc.exists) throw new Error("Manifiesto no encontrado");
      const manifestData = manifestDoc.data();
      if (manifestData?.status !== "ON_ROUTE")
        throw new Error("El manifiesto no está en ruta");

      // =========================================================================
      // 🚀 FASE 1: RECOPILACIÓN Y LECTURA DE DATOS ANTES DE LAS ESCRITURAS
      // =========================================================================

      // Obtenemos todos los productIds únicos involucrados en mermas, llenos y envases vacíos
      const uniqueProductIds = Array.from(
        new Set([
          ...liquidationData.items.map((i) => i.productId),
          ...liquidationData.returnedEmpties.map((e) => e.productId),
        ]),
      );

      // Leemos de golpe todos los documentos de productos necesarios
      const productDocsMap: Record<string, any> = {};
      for (const pId of uniqueProductIds) {
        const pRef = adminDb.collection(PRODUCTS_COLLECTION).doc(pId);
        const pDoc = await transaction.get(pRef);
        productDocsMap[pId] = pDoc.exists ? pDoc.data() : {};
      }

      // Leemos de golpe todas las referencias de producción (lotes) requeridas
      const batchDocsMap: Record<string, { ref: any; currentStock: number }> =
        {};
      for (const reportedItem of liquidationData.items) {
        if (reportedItem.quantityReturnedFull > 0) {
          const batchQuery = await adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", reportedItem.productId)
            .where("lotNumber", "==", reportedItem.lotNumber)
            .limit(1)
            .get();

          if (!batchQuery.empty) {
            const docSnap = batchQuery.docs[0];
            const liveBatchDoc = await transaction.get(docSnap.ref);
            batchDocsMap[
              `${reportedItem.productId}_${reportedItem.lotNumber}`
            ] = {
              ref: docSnap.ref,
              currentStock: liveBatchDoc.exists
                ? liveBatchDoc.data()?.currentStock || 0
                : 0,
            };
          }
        }
      }

      // =========================================================================
      // ✍️ FASE 2: MUTACIÓN DE DATOS Y REGISTRO DE ESCRITURAS
      // =========================================================================
      const kardexEntries: any[] = [];
      const updatedItems = [
        ...(manifestData?.items || manifestData?.loadedItems || []),
      ];

      // 1. PROCESAR RETORNO DE LLENOS Y MERMAS
      for (const reportedItem of liquidationData.items) {
        const manifestItemIndex = updatedItems.findIndex(
          (i: any) =>
            i.productId === reportedItem.productId &&
            i.lotNumber === reportedItem.lotNumber,
        );

        if (manifestItemIndex === -1) continue;

        const quantitySold =
          reportedItem.quantityLoaded -
          reportedItem.quantityReturnedFull -
          reportedItem.wasteQuantity;

        updatedItems[manifestItemIndex] = {
          ...updatedItems[manifestItemIndex],
          quantityReturnedFull: reportedItem.quantityReturnedFull,
          wasteQuantity: reportedItem.wasteQuantity,
          quantitySold: quantitySold,
        };

        if (reportedItem.quantityReturnedFull > 0) {
          const productRef = adminDb
            .collection(PRODUCTS_COLLECTION)
            .doc(reportedItem.productId);

          const currentFilled =
            productDocsMap[reportedItem.productId]?.stockFilled || 0;
          const newFilledStock =
            currentFilled + reportedItem.quantityReturnedFull;

          transaction.update(productRef, {
            stockFilled: newFilledStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          productDocsMap[reportedItem.productId].stockFilled = newFilledStock;

          const batchInfo =
            batchDocsMap[`${reportedItem.productId}_${reportedItem.lotNumber}`];
          if (batchInfo) {
            transaction.update(batchInfo.ref, {
              currentStock:
                batchInfo.currentStock + reportedItem.quantityReturnedFull,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            batchInfo.currentStock += reportedItem.quantityReturnedFull;
          }

          const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
          kardexEntries.push({
            ref: kardexRef,
            data: {
              productId: reportedItem.productId,
              type: "IN",
              phase: "FILLED",
              quantity: reportedItem.quantityReturnedFull,
              lotNumber: reportedItem.lotNumber,
              referenceType: "ROUTE_RETURN",
              referenceId: manifestId,
              previousStock: currentFilled,
              newStock: newFilledStock,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              // Nuevos campos
              movementType: "RETURN",
              delta: reportedItem.quantityReturnedFull,
              resultingBalance: newFilledStock,
              userId: manifestData?.dispatcherId || manifestData?.driverId || "SYSTEM",
            },
          });
        }
      }

      // 2. PROCESAR RETORNO DE ENVASES VACÍOS (SOLO LOS NUEVOS DE LA LIQUIDACIÓN)
      const combinedEmpties = [...(manifestData?.returnedEmpties || [])];

      for (const emptyReturn of liquidationData.returnedEmpties) {
        if (emptyReturn.quantityReturned <= 0) continue;

        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(emptyReturn.productId);

        // Sumamos SÓLO los nuevos al inventario de la planta
        const currentEmpty =
          productDocsMap[emptyReturn.productId]?.stockEmpty || 0;
        const newEmptyStock = currentEmpty + emptyReturn.quantityReturned;

        transaction.update(productRef, {
          stockEmpty: newEmptyStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        productDocsMap[emptyReturn.productId].stockEmpty = newEmptyStock;

        // Sumamos al arreglo combinado para que quede registrado en el Manifiesto final
        // 🔥 CORRECCIÓN: (e: any) para evitar errores de TypeScript
        const existingIdx = combinedEmpties.findIndex(
          (e: any) => e.productId === emptyReturn.productId,
        );

        if (existingIdx >= 0) {
          combinedEmpties[existingIdx].quantityReturned =
            (combinedEmpties[existingIdx].quantityReturned || 0) +
            emptyReturn.quantityReturned;
          combinedEmpties[existingIdx].quantity =
            combinedEmpties[existingIdx].quantityReturned;
        } else {
          combinedEmpties.push({
            productId: emptyReturn.productId,
            quantityReturned: emptyReturn.quantityReturned,
            quantity: emptyReturn.quantityReturned,
          });
        }

        const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
        kardexEntries.push({
          ref: kardexRef,
          data: {
            productId: emptyReturn.productId,
            type: "IN",
            phase: "EMPTY",
            quantity: emptyReturn.quantityReturned,
            referenceType: "EMPTY_RETURN_LIQUIDATION",
            referenceId: manifestId,
            previousStock: currentEmpty,
            newStock: newEmptyStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Nuevos campos
            movementType: "RETURN",
            delta: emptyReturn.quantityReturned,
            resultingBalance: newEmptyStock,
            userId: manifestData?.dispatcherId || manifestData?.driverId || "SYSTEM",
          },
        });
      }

      // 3. ACTUALIZAR EL MANIFIESTO A "LIQUIDADO"
      transaction.update(manifestRef, {
        status: "LIQUIDATED",
        items: updatedItems,
        returnedEmpties: combinedEmpties, // <--- AHORA GUARDAMOS EL COMBINADO (Historia + Nuevos)
        cashReported: liquidationData.cashReported || 0,
        digitalPaymentsReported: liquidationData.digitalPaymentsReported || 0,
        notes: liquidationData.notes
          ? `${manifestData?.notes || ""} | Liq: ${liquidationData.notes}`
          : manifestData?.notes,
        liquidationDate: admin.firestore.FieldValue.serverTimestamp(),
        liquidatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. GUARDAR LOS REGISTROS KARDEX ASOCIADOS
      for (const entry of kardexEntries) {
        transaction.set(entry.ref, entry.data);
      }
    });

    // Finalizado el bloque transaccional, ejecutamos la desasignación de pedidos remanentes
    try {
      await orderRepository.unassignPendingOrdersFromManifest(manifestId);
    } catch (error) {
      console.error("Error desasignando pedidos al liquidar:", error);
    }
  },

  /**
   * Obtiene un Manifiesto específico por su ID
   */
  async getDispatchById(id: string): Promise<any> {
    const doc = await adminDb.collection(DISPATCH_COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data();
    return serializeFirestoreData({
      id: doc.id,
      ...data,
      items: data?.items || data?.loadedItems || [],
    });
  },

  /**
   * Igual a getDispatchById, pero con compatibilidad reforzada.
   */
  async getManifestById(id: string): Promise<DispatchManifest | null> {
    return this.getDispatchById(id);
  },

  /**
   * Obtiene todos los pedidos (Orders) asignados a un manifiesto específico
   */
  async getOrdersByManifestId(manifestId: string): Promise<any[]> {
    const snapshot = await adminDb
      .collection("orders") // <-- Buscamos en la colección de pedidos
      .where("manifestId", "==", manifestId)
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  /**
   * PIT STOP AVANZADO: Ejecuta recarga, descarga de mermas/llenos, envases y caja chica.
   */
  async advancedReloadDispatch(
    manifestId: string,
    reloadRequest: {
      driverId?: string; // <-- Agregado para el cambio de chofer
      assistantId?: string;
      newItems: { productId: string; quantityRequested: number }[];
      returnedEmpties: { productId: string; quantity: number }[];
      returnedFulls: { productId: string; lotNumber: string; quantity: number }[];
      cashHandover: number;
      additionalPettyCash: number;
      notes?: string;
    },
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const manifestRef = adminDb
        .collection(DISPATCH_COLLECTION)
        .doc(manifestId);
      const manifestDoc = await transaction.get(manifestRef);

      if (!manifestDoc.exists) throw new Error("Manifiesto no encontrado");
      const currentManifest = manifestDoc.data() as any;
      if (currentManifest.status !== "ON_ROUTE")
        throw new Error("El camión no está en ruta");

      const kardexEntries: any[] = [];
      const updatedItems = [
        ...(currentManifest.items || currentManifest.loadedItems || []),
      ];
      const updatedReturnedEmpties: any[] = [
        ...(currentManifest.returnedEmpties || []),
      ];

      // --- 1. PRE-FETCH ALL REQUIRED PRODUCTS ---
      const productIds = new Set<string>();
      reloadRequest.newItems.forEach((i) => productIds.add(i.productId));
      reloadRequest.returnedFulls.forEach((i) => productIds.add(i.productId));
      reloadRequest.returnedEmpties.forEach((i) => productIds.add(i.productId));

      const productRefs = Array.from(productIds).map((id) =>
        adminDb.collection(PRODUCTS_COLLECTION).doc(id),
      );
      const productDocs = productRefs.length > 0 ? await transaction.getAll(...productRefs) : [];
      const productMap: Record<string, Product> = {};
      productDocs.forEach((doc, idx) => {
        if (!doc.exists) {
          throw new Error(`Producto ${productRefs[idx].id} no encontrado`);
        }
        productMap[doc.id] = doc.data() as Product;
      });

      // --- 2. PRE-FETCH BATCHES FOR FIFO (newItems) ---
      const newItemsProductIds = Array.from(
        new Set(reloadRequest.newItems.map((i) => i.productId)),
      );
      const newItemsBatchesMap: Record<string, any[]> = {};
      for (const productId of newItemsProductIds) {
        const query = adminDb
          .collection(PRODUCTION_COLLECTION)
          .where("productId", "==", productId)
          .where("currentStock", ">", 0);
        const querySnapshot = await transaction.get(query);
        const batches = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ref: doc.ref,
            ...(doc.data() as any),
          }))
          .sort(
            (a, b) =>
              a.productionDate.toDate().getTime() -
              b.productionDate.toDate().getTime(),
          );
        newItemsBatchesMap[productId] = batches;
      }

      // --- 3. PRE-FETCH BATCHES FOR RETURNS (returnedFulls) ---
      const batchDocsMap: Record<
        string,
        { ref: admin.firestore.DocumentReference; currentStock: number }
      > = {};

      // Seed map from FIFO batches already loaded
      for (const productId in newItemsBatchesMap) {
        for (const batch of newItemsBatchesMap[productId]) {
          batchDocsMap[`${productId}_${batch.lotNumber}`] = {
            ref: batch.ref,
            currentStock: batch.currentStock,
          };
        }
      }

      // Load specific lot batches requested for returnedFulls if not already loaded
      for (const retFull of reloadRequest.returnedFulls) {
        const key = `${retFull.productId}_${retFull.lotNumber}`;
        if (!batchDocsMap[key]) {
          const batchQuery = adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", retFull.productId)
            .where("lotNumber", "==", retFull.lotNumber)
            .limit(1);
          const querySnapshot = await transaction.get(batchQuery);
          if (querySnapshot.empty) {
            throw new Error(`El lote ${retFull.lotNumber} no existe en la base de datos.`);
          }
          const docSnap = querySnapshot.docs[0];
          batchDocsMap[key] = {
            ref: docSnap.ref,
            currentStock: docSnap.data().currentStock || 0,
          };
        }
      }

      // --- 4. INITIALIZE RUNNING BALANCES ---
      const productStockFilledRunning: Record<string, number> = {};
      const productStockEmptyRunning: Record<string, number> = {};
      for (const productId in productMap) {
        productStockFilledRunning[productId] = productMap[productId].stockFilled || 0;
        productStockEmptyRunning[productId] = productMap[productId].stockEmpty || 0;
      }

      const batchStockRunning: Record<string, number> = {};
      for (const key in batchDocsMap) {
        batchStockRunning[key] = batchDocsMap[key].currentStock;
      }

      // --- 5. PROCESS NEW ITEMS (RECHARGE / LOAD) ---
      for (const item of reloadRequest.newItems) {
        if (item.quantityRequested <= 0) continue;

        const productData = productMap[item.productId];
        const currentStockFilled = productStockFilledRunning[item.productId];

        if (currentStockFilled < item.quantityRequested) {
          throw new Error(
            `Stock insuficiente para recargar ${productData.name}. Disponible: ${currentStockFilled}, Solicitado: ${item.quantityRequested}`,
          );
        }

        const availableBatches = newItemsBatchesMap[item.productId] || [];
        let remainingToFulfill = item.quantityRequested;

        for (const batch of availableBatches) {
          if (remainingToFulfill <= 0) break;

          const key = `${item.productId}_${batch.lotNumber}`;
          const currentBatchStock = batchStockRunning[key];
          if (currentBatchStock <= 0) continue;

          const takeFromBatch = Math.min(currentBatchStock, remainingToFulfill);

          const existingItemIndex = updatedItems.findIndex(
            (i) => i.productId === item.productId && i.lotNumber === batch.lotNumber,
          );

          if (existingItemIndex >= 0) {
            updatedItems[existingItemIndex].quantityLoaded += takeFromBatch;
          } else {
            updatedItems.push({
              productId: item.productId,
              lotNumber: batch.lotNumber,
              quantityLoaded: takeFromBatch,
              quantitySold: 0,
              quantityReturnedFull: 0,
              wasteQuantity: 0,
            });
          }

          batchStockRunning[key] -= takeFromBatch;
          remainingToFulfill -= takeFromBatch;
        }

        if (remainingToFulfill > 0) {
          throw new Error(
            `Inconsistencia de Kardex al recargar lotes para el producto ${productData.name}. Quedaron ${remainingToFulfill} unidades sin asignar a ningún lote.`,
          );
        }

        const prevStock = productStockFilledRunning[item.productId];
        productStockFilledRunning[item.productId] -= item.quantityRequested;
        const newFilledStock = productStockFilledRunning[item.productId];

        kardexEntries.push({
          ref: adminDb.collection(KARDEX_COLLECTION).doc(),
          data: {
            productId: item.productId,
            type: "OUT",
            phase: "FILLED",
            quantity: item.quantityRequested,
            referenceType: "DISPATCH_RELOAD",
            referenceId: manifestId,
            previousStock: prevStock,
            newStock: newFilledStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            movementType: "DISPATCH",
            delta: -item.quantityRequested,
            resultingBalance: newFilledStock,
            userId:
              currentManifest.dispatcherId || currentManifest.driverId || "SYSTEM",
          },
        });
      }

      // --- 6. PROCESS RETURNED FULLS (DEPOSIT / RETURN) ---
      for (const retFull of reloadRequest.returnedFulls) {
        if (retFull.quantity <= 0) continue;

        const existingItemIndex = updatedItems.findIndex(
          (i) => i.productId === retFull.productId && i.lotNumber === retFull.lotNumber,
        );
        if (existingItemIndex === -1) {
          throw new Error(
            `El producto con lote ${retFull.lotNumber} no está registrado en el camión.`,
          );
        }

        const mItem = updatedItems[existingItemIndex];
        const maxDisp =
          (mItem.quantityLoaded || 0) -
          (mItem.quantityReturnedFull || 0) -
          (mItem.wasteQuantity || 0) -
          (mItem.quantitySold || 0);
        if (retFull.quantity > maxDisp) {
          throw new Error(
            `Intentas devolver más unidades del lote ${retFull.lotNumber} de las disponibles a bordo.`,
          );
        }

        // Incrementar el reingreso de llenos en el manifiesto
        updatedItems[existingItemIndex].quantityReturnedFull =
          (updatedItems[existingItemIndex].quantityReturnedFull || 0) + retFull.quantity;

        // Sumar al stock de la planta
        const prevStock = productStockFilledRunning[retFull.productId];
        productStockFilledRunning[retFull.productId] += retFull.quantity;
        const newFilledStock = productStockFilledRunning[retFull.productId];

        // Sumar de vuelta al Lote de producción exacto
        const key = `${retFull.productId}_${retFull.lotNumber}`;
        batchStockRunning[key] += retFull.quantity;

        kardexEntries.push({
          ref: adminDb.collection(KARDEX_COLLECTION).doc(),
          data: {
            productId: retFull.productId,
            lotNumber: retFull.lotNumber,
            type: "IN",
            phase: "FILLED",
            quantity: retFull.quantity,
            referenceType: "DISPATCH_RELOAD_RETURN",
            referenceId: manifestId,
            previousStock: prevStock,
            newStock: newFilledStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            movementType: "RETURN",
            delta: retFull.quantity,
            resultingBalance: newFilledStock,
            userId:
              currentManifest.dispatcherId || currentManifest.driverId || "SYSTEM",
          },
        });
      }

      // --- 7. PROCESS RETURNED EMPTIES (DEPOSIT / RETURN) ---
      for (const emptyReturn of reloadRequest.returnedEmpties) {
        if (emptyReturn.quantity <= 0) continue;

        // A) Sumamos al arreglo interno del manifiesto
        const existingEmptyIndex = updatedReturnedEmpties.findIndex(
          (e) => e.productId === emptyReturn.productId,
        );
        if (existingEmptyIndex >= 0) {
          updatedReturnedEmpties[existingEmptyIndex].quantityReturned =
            (updatedReturnedEmpties[existingEmptyIndex].quantityReturned || 0) +
            emptyReturn.quantity;
          updatedReturnedEmpties[existingEmptyIndex].quantity =
            updatedReturnedEmpties[existingEmptyIndex].quantityReturned;
        } else {
          updatedReturnedEmpties.push({
            productId: emptyReturn.productId,
            quantityReturned: emptyReturn.quantity,
            quantity: emptyReturn.quantity,
          });
        }

        // B) Sumamos al inventario de la Planta
        const prevStock = productStockEmptyRunning[emptyReturn.productId];
        productStockEmptyRunning[emptyReturn.productId] += emptyReturn.quantity;
        const newEmptyStock = productStockEmptyRunning[emptyReturn.productId];

        // C) Inyectamos el movimiento al Kardex
        kardexEntries.push({
          ref: adminDb.collection(KARDEX_COLLECTION).doc(),
          data: {
            productId: emptyReturn.productId,
            type: "IN",
            phase: "EMPTY",
            quantity: emptyReturn.quantity,
            referenceType: "EMPTY_RETURN_PITSTOP",
            referenceId: manifestId,
            previousStock: prevStock,
            newStock: newEmptyStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            movementType: "RETURN",
            delta: emptyReturn.quantity,
            resultingBalance: newEmptyStock,
            userId:
              currentManifest.dispatcherId || currentManifest.driverId || "SYSTEM",
          },
        });
      }

      // --- 8. APPLY ALL WRITES ---
      // Apply batch updates
      for (const key in batchStockRunning) {
        const initialStock = batchDocsMap[key].currentStock;
        const finalStock = batchStockRunning[key];
        if (finalStock !== initialStock) {
          transaction.update(batchDocsMap[key].ref, {
            currentStock: finalStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Apply product updates
      for (const productId of Array.from(productIds)) {
        const updates: any = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        let modified = false;
        if (productStockFilledRunning[productId] !== productMap[productId].stockFilled) {
          updates.stockFilled = productStockFilledRunning[productId];
          modified = true;
        }
        if (productStockEmptyRunning[productId] !== productMap[productId].stockEmpty) {
          updates.stockEmpty = productStockEmptyRunning[productId];
          modified = true;
        }
        if (modified) {
          transaction.update(
            adminDb.collection(PRODUCTS_COLLECTION).doc(productId),
            updates,
          );
        }
      }

      // Set Kardex documents
      for (const entry of kardexEntries) {
        transaction.set(entry.ref, entry.data);
      }

      // Guardamos el historial del pit-stop
      const pitStopsHistory = currentManifest.pitStopsHistory || [];
      pitStopsHistory.push({
        id: adminDb.collection(KARDEX_COLLECTION).doc().id,
        createdAt: new Date().toISOString(),
        driverId: reloadRequest.driverId || currentManifest.driverId,
        assistantId: reloadRequest.assistantId,
        cashHandover: reloadRequest.cashHandover || 0,
        additionalPettyCash: reloadRequest.additionalPettyCash || 0,
        newItems: reloadRequest.newItems || [],
        returnedFulls: reloadRequest.returnedFulls || [],
        returnedEmpties: reloadRequest.returnedEmpties || [],
        notes: reloadRequest.notes || "",
      });

      const updatedNotes = reloadRequest.notes
        ? `${currentManifest.notes || ""} | PIT STOP: ${reloadRequest.notes}`
        : currentManifest.notes;

      const manifestUpdates: any = {
        items: updatedItems,
        returnedEmpties: updatedReturnedEmpties,
        cashAdvances:
          (currentManifest.cashAdvances || 0) + reloadRequest.cashHandover,
        additionalPettyCash:
          (currentManifest.additionalPettyCash || 0) +
          reloadRequest.additionalPettyCash,
        pitStopsHistory: pitStopsHistory,
        notes: updatedNotes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (reloadRequest.driverId) {
        manifestUpdates.driverId = reloadRequest.driverId;
      }
      if (reloadRequest.assistantId !== undefined) {
        manifestUpdates.assistantId =
          reloadRequest.assistantId === "" ? null : reloadRequest.assistantId;
      }

      transaction.update(manifestRef, manifestUpdates);
    });
  },

  async listPaginated(options: {
    pageSize: number;
    cursor?: string;
    status?: "ON_ROUTE" | "LIQUIDATED" | "ALL";
    driverId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let query: admin.firestore.Query = adminDb.collection(DISPATCH_COLLECTION);

    if (options.status && options.status !== "ALL") {
      query = query.where("status", "==", options.status);
    }
    if (options.driverId && options.driverId !== "ALL") {
      query = query.where("driverId", "==", options.driverId);
    }
    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(`${options.startDate}T00:00:00`));
      query = query.where("dispatchDate", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(`${options.endDate}T23:59:59`));
      query = query.where("dispatchDate", "<=", endTimestamp);
    }

    query = query
      .select(
        "id",
        "manifestNumber",
        "truckPlate",
        "driverId",
        "assistantId",
        "dispatchDate",
        "liquidatedAt",
        "liquidationDate",
        "status",
        "realCashReceived",
        "cashReported",
        "items",
        "returnedEmpties",
        "notes"
      )
      .orderBy("dispatchDate", "desc")
      .orderBy("__name__", "desc");

    return await paginate<DispatchManifest>(
      query,
      options,
      ["dispatchDate", "id"],
      (doc) => {
        const data = doc.data();
        return serializeFirestoreData({
          id: doc.id,
          ...data,
          items: data.items || data.loadedItems || [],
          returnedEmpties: data.returnedEmpties || [],
        }) as DispatchManifest;
      }
    );
  },

  async getCount(options: {
    status?: "ON_ROUTE" | "LIQUIDATED" | "ALL";
    driverId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    let query: admin.firestore.Query = adminDb.collection(DISPATCH_COLLECTION);

    if (options.status && options.status !== "ALL") {
      query = query.where("status", "==", options.status);
    }
    if (options.driverId && options.driverId !== "ALL") {
      query = query.where("driverId", "==", options.driverId);
    }
    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(`${options.startDate}T00:00:00`));
      query = query.where("dispatchDate", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(`${options.endDate}T23:59:59`));
      query = query.where("dispatchDate", "<=", endTimestamp);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  },
};
