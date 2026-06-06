import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Customer, CustomerContainerLog } from "@/core/entities/CRM";
import { serializeFirestoreData } from "@/services/firebase/serialization";
import { customerSearchService } from "../search/customerSearchService";
import { paginate } from "./_pagination";
import { calculateAdjustmentDeltas, mergeBalances } from "@/core/use-cases/customers/containerAdjustment";

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
   * Obtiene el conteo total de clientes utilizando getCountFromServer para optimización de costos.
   */
  async getCustomerCount(): Promise<number> {
    const countSnapshot = await adminDb.collection(CUSTOMERS_COLLECTION).count().get();
    return countSnapshot.data().count;
  },

  /**
   * Obtiene una lista paginada y filtrada de clientes con campos seleccionados.
   */
  async listPaginated(options: {
    pageSize: number;
    cursor?: string;
    search?: string;
  }): Promise<{ items: Customer[]; nextCursor: string | null; hasMore: boolean; totalCount: number }> {
    if (options.search) {
      const page = options.cursor ? parseInt(options.cursor, 10) : 0;
      const searchResult = await customerSearchService.searchCustomers({
        query: options.search,
        page,
        hitsPerPage: options.pageSize,
      });

      return {
        items: searchResult.data.map((hit: any) => serializeFirestoreData(hit)),
        nextCursor: page + 1 < searchResult.totalPages ? String(page + 1) : null,
        hasMore: page + 1 < searchResult.totalPages,
        totalCount: searchResult.totalHits,
      };
    }

    const query = adminDb
      .collection(CUSTOMERS_COLLECTION)
      .select(
        "name",
        "isActive",
        "documentType",
        "documentNumber",
        "alias",
        "locations",
        "debtAmount",
        "containerBalances",
        "lastSaleDate",
        "tags",
        "createdAt"
      )
      .orderBy("name", "asc")
      .orderBy("__name__", "asc");

    const [paginatedResult, totalCount] = await Promise.all([
      paginate<Customer>(
        query,
        options,
        ["name", "id"],
        (doc) => {
          const data = doc.data();
          return serializeFirestoreData({
            id: doc.id,
            ...data,
            containerBalances: data.containerBalances || [],
            locations: data.locations || [],
          });
        }
      ),
      this.getCustomerCount()
    ]);

    return {
      ...paginatedResult,
      totalCount,
    };
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
        const data = doc.data();
        if (!data) return null;

        return serializeFirestoreData({
          id: doc.id,
          ...data,
          containerBalances: data.containerBalances || [],
          locations: data.locations || [],
        });
      })
      .filter((c): c is any => c !== null);
  },

  /**
   * Obtiene un cliente específico por su ID serializado con protección de datos
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    const doc = await adminDb.collection(CUSTOMERS_COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    return serializeFirestoreData({
      id: doc.id,
      ...data,
      containerBalances: data.containerBalances || [],
      locations: data.locations || [],
    });
  },

  async getCustomersByIds(customerIds: string[]) {
    const customersData: Record<string, any> = {};

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
        customersData[doc.id] = serializeFirestoreData({
          id: doc.id,
          ...data,
        });
      });
    }

    return customersData;
  },

  /**
   * Obtiene la carga inicial de clientes (Paginada desde el servidor)
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
        if (!data) return null;

        return serializeFirestoreData({
          id: doc.id,
          ...data,
          containerBalances: data.containerBalances || [],
          locations: data.locations || [],
        });
      })
      .filter((c): c is any => c !== null);
  },

  /**
   * Obtiene una lista paginada y agregada de deudores (debtAmount > 0)
   */
  async listDebtorsPaginated(options: {
    pageSize: number;
    cursor?: string;
    search?: string;
  }) {
    if (options.search) {
      const page = options.cursor ? parseInt(options.cursor, 10) : 0;
      const searchResult = await customerSearchService.searchCustomers({
        query: options.search,
        page,
        hitsPerPage: options.pageSize * 2,
      });

      const debtorsHits = searchResult.data
        .map((hit: any) => serializeFirestoreData(hit))
        .filter((c: any) => Number(c.debtAmount || 0) > 0);

      return {
        items: debtorsHits.slice(0, options.pageSize) as Customer[],
        nextCursor: page + 1 < searchResult.totalPages ? String(page + 1) : null,
        hasMore: page + 1 < searchResult.totalPages,
        totalCount: searchResult.totalHits,
        totalDebtAmount: debtorsHits.reduce((acc, curr: any) => acc + Number(curr.debtAmount || 0), 0),
      };
    }

    let query = adminDb
      .collection(CUSTOMERS_COLLECTION)
      .select("name", "alias", "documentType", "documentNumber", "contactName", "contactPhone", "debtAmount", "createdAt")
      .where("debtAmount", ">", 0)
      .orderBy("debtAmount", "desc")
      .orderBy("__name__", "desc");

    const [paginatedResult, countSnapshot, sumSnapshot] = await Promise.all([
      paginate<Customer>(
        query,
        options,
        ["debtAmount", "id"],
        (doc) => {
          const data = doc.data();
          return serializeFirestoreData({
            id: doc.id,
            ...data,
          }) as Customer;
        }
      ),
      adminDb
        .collection(CUSTOMERS_COLLECTION)
        .where("debtAmount", ">", 0)
        .count()
        .get(),
      adminDb
        .collection(CUSTOMERS_COLLECTION)
        .where("debtAmount", ">", 0)
        .aggregate({
          totalDebt: admin.firestore.AggregateField.sum("debtAmount"),
        })
        .get(),
    ]);

    const totalCount = countSnapshot.data().count;
    const totalDebtAmount = sumSnapshot.data().totalDebt || 0;

    return {
      ...paginatedResult,
      totalCount,
      totalDebtAmount,
    };
  },

  async adjustContainerBalances(
    customerId: string,
    newBalances: { productId: string; balance: number }[],
    reason: string,
    userId: string
  ): Promise<void> {
    const customerRef = adminDb.collection(CUSTOMERS_COLLECTION).doc(customerId);

    await adminDb.runTransaction(async (transaction) => {
      const customerDoc = await transaction.get(customerRef);
      if (!customerDoc.exists) {
        throw new Error("El cliente no existe.");
      }

      const customerData = customerDoc.data() as Customer;
      const currentBalances = customerData.containerBalances || [];

      // 1. Calcular deltas usando la función pura
      const containerDeltas = calculateAdjustmentDeltas(currentBalances, newBalances);

      if (containerDeltas.length === 0) {
        throw new Error("No hay cambios en los saldos.");
      }

      // 2. Fusionar saldos usando la función pura
      const balancesFinales = mergeBalances(currentBalances, newBalances);

      // 3. Escrituras
      transaction.update(customerRef, {
        containerBalances: balancesFinales,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const containerLogRef = adminDb.collection("customerContainerLogs").doc();
      transaction.set(containerLogRef, {
        id: containerLogRef.id,
        customerId,
        type: "ADJUSTMENT",
        delta: containerDeltas,
        detail: {
          items: [],
          returnedEmpties: [],
        },
        balanceAfter: balancesFinales,
        reason,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },

  /**
   * Obtiene el historial de movimientos de envases de un cliente.
   */
  async getContainerLogsByCustomerId(
    customerId: string,
    max?: number
  ): Promise<CustomerContainerLog[]> {
    const snapshot = await adminDb
      .collection("customerContainerLogs")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .limit(max || 50)
      .get();

    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      })
    ) as CustomerContainerLog[];
  },
};
