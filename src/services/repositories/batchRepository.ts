// src/services/repositories/batchRepository.ts
import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { BatchFormValues } from "@/core/validations/batchSchema";

const BATCH_COLLECTION = "production_batches";
const INVENTORY_COLLECTION = "inventory_items";

export const batchRepository = {
  async createAndProcessBatch(data: BatchFormValues): Promise<string> {
    const batch = adminDb.batch();

    // A. Referencia al nuevo Lote
    const newBatchRef = adminDb.collection(BATCH_COLLECTION).doc();

    batch.set(newBatchRef, {
      productionDate: admin.firestore.Timestamp.fromDate(
        new Date(`${data.productionDate}T12:00:00`),
      ),
      managerId: data.managerId,
      status: data.status,
      notes: data.notes || "",
      details: data.details,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // B. Si está completado, actualizamos Kardex
    if (data.status === "completed") {
      data.details.forEach((detail) => {
        const inventoryRef = adminDb
          .collection(INVENTORY_COLLECTION)
          .doc(detail.productId);

        batch.set(
          inventoryRef,
          {
            productId: detail.productId,
            warehouseLocation: "planta_principal",
            // Incremento atómico del lado del servidor
            quantityFull: admin.firestore.FieldValue.increment(
              detail.quantityProduced,
            ),
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }

    await batch.commit();
    return newBatchRef.id;
  },
};
