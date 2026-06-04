import { adminDb, adminAuth } from "../firebase/admin"; // <-- Agregamos adminAuth aquí
import admin from "firebase-admin";
import { User } from "@/core/entities/User";
import { UserFormValues } from "@/core/validations/userSchema";
import { serializeFirestoreData } from "@/services/firebase/serialization";

const COLLECTION = "users";

export const userRepository = {
  async getAll(): Promise<User[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("name", "asc")
      .get();
    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      }),
    );
  },

  async getById(id: string): Promise<any | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return serializeFirestoreData({
      id: doc.id,
      ...data,
    });
  },

  /**
   * Crea un documento y sincroniza los Custom Claims (Roles) con Firebase Auth
   */
  async createWithId(id: string, data: UserFormValues): Promise<void> {
    // 1. Guardamos en Firestore para poder leerlo en las tablas visuales
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // 2. MAGIA: Inyectamos los roles directamente en el "pasaporte" de Firebase Auth
    if (data.roles && data.roles.length > 0) {
      await adminAuth.setCustomUserClaims(id, { roles: data.roles });
    }
  },

  /**
   * Actualiza el documento y resincroniza los Custom Claims si los roles cambian
   */
  async update(id: string, data: Partial<UserFormValues>): Promise<void> {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Si la actualización incluye un cambio de roles, actualizamos Auth
    if (data.roles) {
      await adminAuth.setCustomUserClaims(id, { roles: data.roles });
    }
  },

  async toggleStatus(id: string, isActive: boolean): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
