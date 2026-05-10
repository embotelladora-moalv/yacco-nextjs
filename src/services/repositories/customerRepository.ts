import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { CustomerFormValues } from "@/core/validations/customerSchema";
import { Customer } from "@/core/entities/Customer";

const COLLECTION = "customers";

export const customerRepository = {
  /**
   * Obtiene todos los clientes activos del directorio.
   */
  async getAll(): Promise<Customer[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastSaleDate: data.lastSaleDate?.toDate() || undefined,
        lastVisitDate: data.lastVisitDate?.toDate() || undefined,
      } as Customer;
    });
  },

  /**
   * Obtiene un cliente específico por su ID.
   */
  async getById(id: string): Promise<Customer | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastSaleDate: data.lastSaleDate?.toDate() || undefined,
      lastVisitDate: data.lastVisitDate?.toDate() || undefined,
    } as Customer;
  },

  /**
   * Crea un nuevo cliente inicializando sus balances financieros en cero.
   */
  async create(data: CustomerFormValues): Promise<string> {
    const ref = adminDb.collection(COLLECTION).doc();

    await ref.set({
      ...data,
      // Inicialización financiera (Kardex de cliente)
      debtAmount: 0,
      loanedItems: {}, // Sin envases prestados al inicio

      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return ref.id;
  },

  /**
   * Actualiza los datos generales, ubicaciones o contactos del cliente.
   */
  async update(id: string, data: Partial<CustomerFormValues>): Promise<void> {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  },

  /**
   * Borrado lógico (Mantiene el historial de facturación intacto).
   */
  async deactivate(id: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
