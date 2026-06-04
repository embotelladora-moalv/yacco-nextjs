import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { DailyRouteFormValues } from "@/core/validations/dailyRouteSchema";
import { DailyRoute } from "@/core/entities/DailyRoute"; // Asumiendo que creaste la interfaz que discutimos
import { serializeFirestoreData } from "@/services/firebase/serialization";

const COLLECTION = "daily_routes";

export const dailyRouteRepository = {
  /**
   * Abre una nueva ruta para el día.
   */
  async createRoute(data: DailyRouteFormValues): Promise<string> {
    const ref = adminDb.collection(COLLECTION).doc();

    await ref.set({
      ...data,
      date: new Date(data.date), // Convertimos el string del input a Date
      status: "IN_PROGRESS", // Estado inicial: En ruta
      totalExpenses: 0, // Inicializa sin gastos
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return ref.id;
  },

  /**
   * Obtiene las rutas activas (para ver los camiones que están en la calle ahora mismo)
   */
  async getActiveRoutes(): Promise<DailyRoute[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("status", "==", "IN_PROGRESS")
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  /**
   * Obtiene una ruta específica por su ID.
   */
  async getRouteById(id: string): Promise<DailyRoute | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return serializeFirestoreData({
      id: doc.id,
      ...data,
    });
  },
};
