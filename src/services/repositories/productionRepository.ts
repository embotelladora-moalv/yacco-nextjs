import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { ProductionBatchValues } from "@/core/validations/productionSchema";

export const productionRepository = {
  /**
   * Registra un lote de producción, actualiza stock y genera Kardex atómicamente.
   */
  async registerBatch(data: ProductionBatchValues): Promise<string> {
    const productRef = adminDb.collection("products").doc(data.productId);
    const batchRef = adminDb.collection("production_batches").doc();
    const kardexRef = adminDb.collection("kardex_logs").doc();

    await adminDb.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists) throw new Error("Producto no encontrado");

      const currentStockFilled = productDoc.data()?.stockFilled || 0;
      const newStockFilled = currentStockFilled + data.quantityProduced;

      // 1. Crear el Lote de Producción
      transaction.set(batchRef, {
        ...data,
        productionDate: new Date(data.productionDate),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Actualizar Stock del Producto
      transaction.update(productRef, {
        stockFilled: newStockFilled,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Registrar Movimiento Inmutable en Kardex
      transaction.set(kardexRef, {
        productId: data.productId,
        type: "IN",
        quantity: data.quantityProduced,
        referenceId: batchRef.id,
        referenceType: "PRODUCTION",
        previousStock: currentStockFilled,
        newStock: newStockFilled,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return batchRef.id;
  },

  async getRecentBatches(limit = 20) {
    const snapshot = await adminDb
      .collection("production_batches")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      productionDate: doc.data().productionDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
  },
};
