import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { CashMovement, FinanceCategory } from "@/core/entities/Finance";
import { CashMovementFormValues } from "@/core/validations/financeSchemas";

const MOVEMENTS_COLLECTION = "cashMovements";
const CATEGORIES_COLLECTION = "finance_categories";

export const financeRepository = {
  // ==========================================
  // CATEGORÍAS FINANCIERAS
  // ==========================================

  async getActiveCategories(): Promise<FinanceCategory[]> {
    const snapshot = await adminDb
      .collection(CATEGORIES_COLLECTION)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    })) as any;
  },

  // ==========================================
  // MOVIMIENTOS DE CAJA (INGRESOS / EGRESOS)
  // ==========================================

  /**
   * Registra un nuevo movimiento de dinero
   */
  async registerMovement(data: CashMovementFormValues): Promise<string> {
    const docRef = await adminDb.collection(MOVEMENTS_COLLECTION).add({
      ...data,
      date: new Date(data.date), // Convertimos el string del formulario a Fecha real
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return docRef.id;
  },

  /**
   * Obtiene los movimientos recientes (Para el Dashboard Financiero)
   */
  async getRecentMovements(limitCount = 100): Promise<CashMovement[]> {
    const snapshot = await adminDb
      .collection(MOVEMENTS_COLLECTION)
      .orderBy("date", "desc")
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      } as any;
    });
  },

  /**
   * Obtiene los gastos asociados a un camión/manifiesto específico
   * (Útil para la Liquidación al final del día)
   */
  async getMovementsByManifest(manifestId: string): Promise<CashMovement[]> {
    const snapshot = await adminDb
      .collection(MOVEMENTS_COLLECTION)
      .where("manifestId", "==", manifestId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      } as any;
    });
  },
};
