import { IProductRepository } from "@/core/use-cases/inventory/IProductRepository";
import { Product } from "@/core/entities/Inventory";
import { adminDb } from "@/services/firebase/admin";
import { serializeFirestoreData } from "@/services/firebase/serialization";

export class FirestoreProductRepository implements IProductRepository {
  async getById(id: string): Promise<Product | null> {
    const doc = await adminDb.collection("products").doc(id).get();
    if (!doc.exists) return null;
    return serializeFirestoreData({ id: doc.id, ...doc.data() });
  }
}
