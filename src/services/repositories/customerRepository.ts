import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Customer } from "@/core/entities/CRM";

const CUSTOMERS_COLLECTION = "customers";

export const customerRepository = {
  /**
   * Crea un nuevo cliente. Su cuenta corriente de envases inicia vacía.
   */
  async createCustomer(
    data: Omit<
      Customer,
      "id" | "containerBalances" | "isActive" | "createdAt" | "updatedAt"
    >,
  ): Promise<string> {
    const docRef = await adminDb.collection(CUSTOMERS_COLLECTION).add({
      ...data,
      containerBalances: [], // Inicia sin deudas de envases
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return docRef.id;
  },

  /**
   * Actualiza los datos básicos de un cliente (No toca los balances)
   */
  async updateCustomer(
    id: string,
    data: Partial<
      Omit<
        Customer,
        "id" | "containerBalances" | "isActive" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<void> {
    await adminDb
      .collection(CUSTOMERS_COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  },

  /**
   * Cambia el estado activo/inactivo del cliente
   */
  async toggleCustomerStatus(id: string, isActive: boolean): Promise<void> {
    await adminDb.collection(CUSTOMERS_COLLECTION).doc(id).update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  /**
   * Obtiene la lista completa de clientes con fechas serializadas y validación de nulidad
   */
  async getAllCustomers(): Promise<Customer[]> {
    const snapshot = await adminDb
      .collection(CUSTOMERS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data(); // Aquí data podría ser undefined según TS

        // Verificamos que 'data' exista para poder mapear
        if (!data) return null;

        return {
          id: doc.id,
          ...data,
          containerBalances: data.containerBalances || [],
          locations: data.locations || [],
          // Usamos el operador '?.' para proteger la ejecución si el campo no existe
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          lastSaleDate: data.lastSaleDate?.toDate?.()?.toISOString() || null,
        };
      })
      .filter((c): c is any => c !== null); // Filtramos nulos para limpiar el array
  },

  /**
   * Obtiene un cliente específico por su ID serializado con protección de datos
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    const doc = await adminDb.collection(CUSTOMERS_COLLECTION).doc(id).get();

    // Validamos primero si el documento existe
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    return {
      id: doc.id,
      ...data,
      containerBalances: data.containerBalances || [],
      locations: data.locations || [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      lastSaleDate: data.lastSaleDate?.toDate?.()?.toISOString() || null,
    } as any;
  },
};
