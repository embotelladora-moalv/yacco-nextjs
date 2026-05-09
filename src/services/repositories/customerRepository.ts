import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Customer } from "@/core/entities/Customer";

const COLLECTION = "customers";

export const customerRepository = {
  async save(data: any): Promise<string> {
    const ref = adminDb.collection(COLLECTION);
    const query = await ref
      .where("documentNumber", "==", data.documentNumber)
      .get();

    const payload = {
      ...data,
      alias: data.alias || data.businessName, // Si no hay alias, usamos la razón social por defecto
      isActive: true,
      // Inicialización de campos para cumplir con el listado de requisitos
      locations: data.locations || [],
      contacts: data.contacts || [],
      customPricing: [],
      stats: {
        currentDebt: 0,
        loanedBottles: 0,
        orderFrequencyDays: 0,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!query.empty) {
      const docId = query.docs[0].id;
      await ref.doc(docId).update(payload);
      return docId;
    }

    const newDoc = await ref.add({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return newDoc.id;
  },

  async getAllActive(): Promise<Customer[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .orderBy("businessName", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        stats: {
          ...data.stats,
          lastSaleDate: data.stats?.lastSaleDate?.toDate(),
          lastVisitDate: data.stats?.lastVisitDate?.toDate(),
        },
      } as Customer;
    });
  },

  async getById(id: string): Promise<Customer | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      stats: {
        ...data.stats,
        lastSaleDate: data.stats?.lastSaleDate?.toDate(),
        lastVisitDate: data.stats?.lastVisitDate?.toDate(),
      },
    } as Customer;
  },
};
