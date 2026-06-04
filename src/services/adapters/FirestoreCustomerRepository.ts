import { ICustomerRepository } from "@/core/use-cases/crm/ICustomerRepository";
import { Customer } from "@/core/entities/CRM";
import { adminDb } from "@/services/firebase/admin";
import { serializeFirestoreData } from "@/services/firebase/serialization";

export class FirestoreCustomerRepository implements ICustomerRepository {
  async getById(id: string): Promise<Customer | null> {
    const doc = await adminDb.collection("customers").doc(id).get();
    if (!doc.exists) return null;
    return serializeFirestoreData({ id: doc.id, ...doc.data() });
  }
}
