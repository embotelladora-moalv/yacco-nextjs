import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { User } from "@/core/entities/User";
import { UserFormValues } from "@/core/validations/userSchema";

const COLLECTION = "users";

export const userRepository = {
  async getAll(): Promise<User[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("name", "asc")
      .get();
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        }) as User,
    );
  },

  /**
   * Obtiene un usuario específico y limpia los Timestamps para Next.js
   */
  async getById(id: string): Promise<any | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      // Convertimos a string ISO para evitar el error de "Only plain objects" en Client Components
      createdAt: data.createdAt?.toDate()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
    };
  },

  /**
   * Crea un documento usando un ID específico (El ID de Firebase Auth)
   */
  async createWithId(id: string, data: UserFormValues): Promise<void> {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  },

  async update(id: string, data: Partial<UserFormValues>): Promise<void> {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  },

  async toggleStatus(id: string, isActive: boolean): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
