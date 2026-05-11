import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { DispatchManifest, DispatchItem } from "@/core/entities/Dispatch";
import { Product } from "@/core/entities/Inventory";

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

          remainingToFulfill -= takeFromBatch;
        }

        // D. Seguridad: Si después de revisar los lotes aún falta, el Kardex está corrupto
        if (remainingToFulfill > 0) {
          throw new Error(
            `Inconsistencia de Kardex en ${productData.name}. El stock general dice tener, pero no hay lotes suficientes que lo respalden.`,
          );
        }

        // E. Preparar actualización del producto general y Kardex
        const newFilledStock = productData.stockFilled - item.quantityRequested;
        productUpdates.push({ ref: productRef, newFilledStock });

        const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
        kardexEntries.push({
          ref: kardexRef,
          data: {
            productId: item.productId,
            type: "OUT",
            phase: "FILLED",
            quantity: item.quantityRequested,
            referenceType: "DISPATCH",
            previousStock: productData.stockFilled,
            newStock: newFilledStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
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
      return {
        id: doc.id,
        ...data,
        items: data.items || data.loadedItems || [], // <-- Salvavidas para datos antiguos
        dispatchDate: data.dispatchDate?.toDate()?.toISOString(),
        liquidationDate: data.liquidationDate?.toDate()?.toISOString(),
        liquidatedAt: data.liquidatedAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
      } as any;
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

      const kardexEntries: any[] = [];
      // Leemos de items (o loadedItems por si es antiguo)
      const updatedItems = [
        ...(manifestData?.items || manifestData?.loadedItems || []),
      ];

      // 1. PROCESAR RETORNO DE LLENOS Y MERMAS
      for (const reportedItem of liquidationData.items) {
        const manifestItemIndex = updatedItems.findIndex(
          (i) =>
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
          const productDoc = await transaction.get(productRef);
          const currentFilled = productDoc.data()?.stockFilled || 0;

          transaction.update(productRef, {
            stockFilled: currentFilled + reportedItem.quantityReturnedFull,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const batchQuery = await transaction.get(
            adminDb
              .collection(PRODUCTION_COLLECTION)
              .where("productId", "==", reportedItem.productId)
              .where("lotNumber", "==", reportedItem.lotNumber)
              .limit(1),
          );
          if (!batchQuery.empty) {
            const batchRef = batchQuery.docs[0].ref;
            const currentBatchStock =
              batchQuery.docs[0].data().currentStock || 0;
            transaction.update(batchRef, {
              currentStock:
                currentBatchStock + reportedItem.quantityReturnedFull,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
          kardexEntries.push({
            ref: kardexRef,
            data: {
              productId: reportedItem.productId,
              type: "IN",
              phase: "FILLED",
              quantity: reportedItem.quantityReturnedFull,
              referenceType: "ROUTE_RETURN",
              referenceId: manifestId,
              previousStock: currentFilled,
              newStock: currentFilled + reportedItem.quantityReturnedFull,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });
        }
      }

      // 2. PROCESAR RETORNO DE ENVASES VACÍOS
      for (const emptyReturn of liquidationData.returnedEmpties) {
        if (emptyReturn.quantityReturned <= 0) continue;

        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(emptyReturn.productId);
        const productDoc = await transaction.get(productRef);
        const currentEmpty = productDoc.data()?.stockEmpty || 0;

        transaction.update(productRef, {
          stockEmpty: currentEmpty + emptyReturn.quantityReturned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
        kardexEntries.push({
          ref: kardexRef,
          data: {
            productId: emptyReturn.productId,
            type: "IN",
            phase: "EMPTY",
            quantity: emptyReturn.quantityReturned,
            referenceType: "EMPTY_RETURN",
            referenceId: manifestId,
            previousStock: currentEmpty,
            newStock: currentEmpty + emptyReturn.quantityReturned,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      }

      // 3. ACTUALIZAR EL MANIFIESTO A "LIQUIDADO"
      transaction.update(manifestRef, {
        status: "LIQUIDATED",
        items: updatedItems, // <-- CAMBIADO: Guarda sobre items
        returnedEmpties: liquidationData.returnedEmpties,
        cashReported: liquidationData.cashReported || 0,
        digitalPaymentsReported: liquidationData.digitalPaymentsReported || 0,
        notes: liquidationData.notes
          ? `${manifestData?.notes || ""} | Liq: ${liquidationData.notes}`
          : manifestData?.notes,
        liquidationDate: admin.firestore.FieldValue.serverTimestamp(),
        liquidatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. GUARDAR LOS KARDEX
      for (const entry of kardexEntries) {
        transaction.set(entry.ref, entry.data);
      }
    });
  },

  /**
   * Obtiene un Manifiesto específico por su ID
   */
  async getDispatchById(id: string): Promise<any> {
    const doc = await adminDb.collection(DISPATCH_COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      items: data?.items || data?.loadedItems || [], // <-- Salvavidas para datos antiguos
      dispatchDate: data?.dispatchDate?.toDate()?.toISOString(),
      liquidationDate: data?.liquidationDate?.toDate()?.toISOString(),
      liquidatedAt: data?.liquidatedAt?.toDate()?.toISOString(),
      createdAt: data?.createdAt?.toDate()?.toISOString(),
      updatedAt: data?.updatedAt?.toDate()?.toISOString(),
    };
  },

  /**
   * Ejecuta una "Parada en Pits" (Recarga y Descarga a mitad de ruta)
   */
  async reloadDispatch(
    manifestId: string,
    reloadRequest: {
      newItems: DispatchRequestItem[];
      returnedEmpties: { productId: string; quantityReturned: number }[];
      cashAdvance: number;
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
      const batchUpdates: any[] = [];
      const productUpdates: any[] = [];

      // Usamos el fallback seguro para extraer el arreglo actual
      const updatedItems = [
        ...(currentManifest.items || currentManifest.loadedItems || []),
      ];
      const updatedReturnedEmpties = [
        ...(currentManifest.returnedEmpties || []),
      ];

      // 1. PROCESAR RECARGA DE NUEVOS PRODUCTOS (FIFO)
      for (const item of reloadRequest.newItems) {
        if (item.quantityRequested <= 0) continue;

        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(item.productId);
        const productDoc = await transaction.get(productRef);
        const productData = productDoc.data() as Product;

        if (productData.stockFilled < item.quantityRequested) {
          throw new Error(
            `Stock insuficiente para recargar ${productData.name}.`,
          );
        }

        const batchesQuery = await transaction.get(
          adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", item.productId)
            .where("currentStock", ">", 0)
            .orderBy("currentStock", "asc"),
        );

        const availableBatches = batchesQuery.docs
          .map((doc) => ({ id: doc.id, ref: doc.ref, ...(doc.data() as any) }))
          .sort(
            (a, b) =>
              a.productionDate.toDate().getTime() -
              b.productionDate.toDate().getTime(),
          );

        let remainingToFulfill = item.quantityRequested;

        for (const batch of availableBatches) {
          if (remainingToFulfill <= 0) break;
          const takeFromBatch = Math.min(
            batch.currentStock,
            remainingToFulfill,
          );

          const existingItemIndex = updatedItems.findIndex(
            (i) =>
              i.productId === item.productId && i.lotNumber === batch.lotNumber,
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

          batchUpdates.push({
            ref: batch.ref,
            newStock: batch.currentStock - takeFromBatch,
          });
          remainingToFulfill -= takeFromBatch;
        }

        if (remainingToFulfill > 0)
          throw new Error("Inconsistencia de Kardex al recargar lotes.");

        const newFilledStock = productData.stockFilled - item.quantityRequested;
        productUpdates.push({
          ref: productRef,
          field: "stockFilled",
          newValue: newFilledStock,
        });

        kardexEntries.push({
          ref: adminDb.collection(KARDEX_COLLECTION).doc(),
          data: {
            productId: item.productId,
            type: "OUT",
            phase: "FILLED",
            quantity: item.quantityRequested,
            referenceType: "DISPATCH_RELOAD",
            referenceId: manifestId,
            previousStock: productData.stockFilled,
            newStock: newFilledStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      }

      // 2. PROCESAR DESCARGA DE ENVASES VACÍOS
      for (const emptyReturn of reloadRequest.returnedEmpties) {
        if (emptyReturn.quantityReturned <= 0) continue;

        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(emptyReturn.productId);
        const productDoc = await transaction.get(productRef);
        const currentEmpty = productDoc.data()?.stockEmpty || 0;

        const existingEmptyIndex = updatedReturnedEmpties.findIndex(
          (e) => e.productId === emptyReturn.productId,
        );
        if (existingEmptyIndex >= 0) {
          updatedReturnedEmpties[existingEmptyIndex].quantityReturned +=
            emptyReturn.quantityReturned;
        } else {
          updatedReturnedEmpties.push(emptyReturn);
        }

        const newEmptyStock = currentEmpty + emptyReturn.quantityReturned;
        productUpdates.push({
          ref: productRef,
          field: "stockEmpty",
          newValue: newEmptyStock,
        });

        kardexEntries.push({
          ref: adminDb.collection(KARDEX_COLLECTION).doc(),
          data: {
            productId: emptyReturn.productId,
            type: "IN",
            phase: "EMPTY",
            quantity: emptyReturn.quantityReturned,
            referenceType: "EMPTY_RETURN",
            referenceId: manifestId,
            previousStock: currentEmpty,
            newStock: newEmptyStock,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      }

      // 3. APLICAR TODAS LAS ACTUALIZACIONES
      for (const update of batchUpdates) {
        transaction.update(update.ref, {
          currentStock: update.newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const combinedProductUpdates: Record<string, any> = {};
      for (const update of productUpdates) {
        const path = update.ref.path;
        if (!combinedProductUpdates[path])
          combinedProductUpdates[path] = {
            ref: update.ref,
            data: { updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          };
        combinedProductUpdates[path].data[update.field] = update.newValue;
      }
      for (const key in combinedProductUpdates) {
        transaction.update(
          combinedProductUpdates[key].ref,
          combinedProductUpdates[key].data,
        );
      }

      for (const entry of kardexEntries) {
        transaction.set(entry.ref, entry.data);
      }

      const updatedNotes = reloadRequest.notes
        ? `${currentManifest.notes || ""} | PIT STOP: ${reloadRequest.notes}`
        : currentManifest.notes;

      transaction.update(manifestRef, {
        items: updatedItems, // <-- CAMBIADO: Guarda sobre items
        returnedEmpties: updatedReturnedEmpties,
        cashAdvances:
          (currentManifest.cashAdvances || 0) + reloadRequest.cashAdvance,
        initialPettyCash:
          (currentManifest.initialPettyCash || 0) +
          reloadRequest.additionalPettyCash,
        notes: updatedNotes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },

  /**
   * Igual a getDispatchById, pero con compatibilidad reforzada.
   */
  async getManifestById(id: string): Promise<DispatchManifest | null> {
    return this.getDispatchById(id);
  },

  /**
   * Liquida un manifiesto (Versión simplificada)
   */
  async liquidateManifest(
    manifestId: string,
    realCashReceived: number,
    returnedEmpties: number,
    returnedFull: number,
    notes: string,
  ): Promise<void> {
    const manifestRef = adminDb.collection(DISPATCH_COLLECTION).doc(manifestId);

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(manifestRef);
      if (!doc.exists) throw new Error("Manifiesto no encontrado");

      const manifest = doc.data() as any;

      if (manifest.status === "LIQUIDATED") {
        throw new Error("Este manifiesto ya fue liquidado anteriormente.");
      }

      const currentItems = manifest.items || manifest.loadedItems || [];
      if (currentItems.length === 0)
        throw new Error("El manifiesto no tiene productos cargados.");

      const firstItem = currentItems[0];
      const productId = firstItem.productId;
      const lotNumber = firstItem.lotNumber;

      if (returnedFull > 0) {
        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(productId);
        const productDoc = await transaction.get(productRef);
        const currentFilled = productDoc.data()?.stockFilled || 0;

        transaction.update(productRef, {
          stockFilled: currentFilled + returnedFull,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const batchQuery = await transaction.get(
          adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", productId)
            .where("lotNumber", "==", lotNumber)
            .limit(1),
        );

        if (!batchQuery.empty) {
          const batchRef = batchQuery.docs[0].ref;
          const currentBatchStock = batchQuery.docs[0].data().currentStock || 0;
          transaction.update(batchRef, {
            currentStock: currentBatchStock + returnedFull,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        const kardexLlenoRef = adminDb.collection(KARDEX_COLLECTION).doc();
        transaction.set(kardexLlenoRef, {
          productId,
          type: "IN",
          phase: "FILLED",
          quantity: returnedFull,
          referenceType: "ROUTE_RETURN",
          referenceId: manifestId,
          previousStock: currentFilled,
          newStock: currentFilled + returnedFull,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (returnedEmpties > 0) {
        const productRef = adminDb
          .collection(PRODUCTS_COLLECTION)
          .doc(productId);
        const productDoc = await transaction.get(productRef);
        const currentEmpty = productDoc.data()?.stockEmpty || 0;

        transaction.update(productRef, {
          stockEmpty: currentEmpty + returnedEmpties,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const kardexVacioRef = adminDb.collection(KARDEX_COLLECTION).doc();
        transaction.set(kardexVacioRef, {
          productId,
          type: "IN",
          phase: "EMPTY",
          quantity: returnedEmpties,
          referenceType: "EMPTY_RETURN",
          referenceId: manifestId,
          previousStock: currentEmpty,
          newStock: currentEmpty + returnedEmpties,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      transaction.update(manifestRef, {
        status: "LIQUIDATED",
        realCashReceived,
        liquidatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        liquidationNotes: notes,
        items: [
          {
            ...firstItem,
            quantityReturnedEmpty: returnedEmpties,
            quantityReturnedFull: returnedFull,
            quantitySold: firstItem.quantityLoaded - returnedFull,
          },
        ],
      });
    });
  },
};
