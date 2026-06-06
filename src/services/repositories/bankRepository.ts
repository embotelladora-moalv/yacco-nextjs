import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Bank } from "@/core/entities/Bank";
import { serializeFirestoreData } from "@/services/firebase/serialization";

const COLLECTION = "banks";

export const bankRepository = {
  async getActiveBanks(): Promise<Bank[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .orderBy("name", "asc")
      .get();

    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      })
    ) as Bank[];
  },

  async getAllBanks(): Promise<Bank[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("name", "asc")
      .get();

    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      })
    ) as Bank[];
  },

  async createBank(name: string, accountNumber?: string): Promise<string> {
    const data: admin.firestore.DocumentData = {
      name,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (accountNumber !== undefined && accountNumber !== null) {
      data.accountNumber = accountNumber;
    }
    const docRef = await adminDb.collection(COLLECTION).add(data);
    return docRef.id;
  },

  async updateBank(
    id: string,
    updates: { name: string; accountNumber?: string },
  ): Promise<void> {
    const data: admin.firestore.DocumentData = {
      name: updates.name,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (updates.accountNumber !== undefined) {
      data.accountNumber = updates.accountNumber;
    }
    await adminDb.collection(COLLECTION).doc(id).update(data);
  },

  async deactivateBank(id: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  async activateBank(id: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
