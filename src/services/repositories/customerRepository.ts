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

  async getCustomersByIds(customerIds: string[]) {
    const customersData: Record<string, any> = {};

    // Dividimos en lotes de 10 (Límite de Firebase para la cláusula 'in')
    const chunks = [];
    for (let i = 0; i < customerIds.length; i += 10) {
      chunks.push(customerIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const snapshot = await adminDb
        .collection("customers")
        .where("__name__", "in", chunk)
        .get();

      snapshot.forEach((doc) => {
        const data = doc.data();

        customersData[doc.id] = {
          id: doc.id,
          ...data,
          // SERIALIZACIÓN OBLIGATORIA PARA NEXT.JS: Convertimos los Timestamps a strings ISO
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          lastSaleDate: data.lastSaleDate?.toDate?.()?.toISOString() || null,
        };
      });
    }

    return customersData;
  },

  /**
   * Obtiene la carga inicial de clientes (Paginada desde el servidor)
   * Ideal para no colapsar la memoria del Frontend al cargar la tabla principal.
   * @param limitSize Cantidad máxima de registros a traer (Por defecto 100)
   */
  async getInitialCustomers(limitSize: number = 100): Promise<Customer[]> {
    const snapshot = await adminDb
      .collection(CUSTOMERS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limitSize)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();

        // Verificamos que la data exista
        if (!data) return null;

        return {
          id: doc.id,
          ...data,
          containerBalances: data.containerBalances || [],
          locations: data.locations || [],
          // SERIALIZACIÓN OBLIGATORIA PARA NEXT.JS SERVER COMPONENTS
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          lastSaleDate: data.lastSaleDate?.toDate?.()?.toISOString() || null,
        };
      })
      .filter((c): c is any => c !== null); // Filtramos nulos por seguridad
  },
};
