import { ISaleRepository } from "@/core/use-cases/sales/ISaleRepository";
import { Sale } from "@/core/entities/CRM";
import { adminDb } from "@/services/firebase/admin";

export class FirestoreSaleRepository implements ISaleRepository {
  async getById(id: string): Promise<Sale | null> {
    const doc = await adminDb.collection("sales").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Sale;
  }

  async updateBilledStatus(ids: string[], documentId: string): Promise<void> {
    const batch = adminDb.batch();
    for (const id of ids) {
      const ref = adminDb.collection("sales").doc(id);
      batch.update(ref, {
        isBilled: true,
        sunatDocumentId: documentId,
        updatedAt: new Date(),
      });
    }
    await batch.commit();
  }
}
