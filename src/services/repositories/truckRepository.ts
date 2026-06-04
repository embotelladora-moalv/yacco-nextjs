import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { TruckFormValues } from "@/core/validations/truckSchema";
import { Truck } from "@/core/entities/Truck";
import { serializeFirestoreData } from "@/services/firebase/serialization";

const COLLECTION = "trucks";

export const truckRepository = {
  async getAll(): Promise<Truck[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async getById(id: string): Promise<Truck | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return serializeFirestoreData({
      id: doc.id,
      ...data,
    });
  },

  async create(data: TruckFormValues) {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.set({
      ...data,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  },

  async update(id: string, data: Partial<TruckFormValues>) {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  },

  async deactivate(id: string) {
    await adminDb.collection(COLLECTION).doc(id).update({ isActive: false });
  },
};
