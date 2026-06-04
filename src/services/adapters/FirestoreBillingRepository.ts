import { IBillingRepository } from "@/core/use-cases/billing/IBillingRepository";
import { adminDb } from "@/services/firebase/admin";

export class FirestoreBillingRepository implements IBillingRepository {
  async saveDocument(doc: any): Promise<void> {
    await adminDb.collection("sunatDocuments").doc(doc.id).set(doc);
  }

  async findApprovedGreBySaleId(saleId: string): Promise<string | null> {
    const greSnapshot = await adminDb
      .collection("sunatDocuments")
      .where("saleId", "==", saleId)
      .where("type", "==", "09")
      .where("status", "==", "ACCEPTED")
      .get();

    if (greSnapshot.empty) return null;
    return greSnapshot.docs[0].id;
  }
}
