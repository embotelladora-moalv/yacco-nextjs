import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { serializeFirestoreData } from "@/services/firebase/serialization";

/**
 * Interface para Categorías de Clientes
 * Representa las zonas gestionables de Moalv S.a.C.
 */
export interface CustomerCategory {
  id: string;
  name: string; // Ej: "Parque", "Industrial", "Ruta Norte"
  description?: string;
  colorLabel?: string; // Para identificar la zona en el mapa
  isActive: boolean;
  createdAt: Date;
}

export const categoryRepository = {
  /**
   * Obtiene todas las categorías activas para los selects de los formularios.
   */
  async getActiveCategories(): Promise<CustomerCategory[]> {
    try {
      const snapshot = await adminDb
        .collection("settings_categories")
        .where("isActive", "==", true)
        .orderBy("name", "asc")
        .get();

      return snapshot.docs.map((doc) => {
        return serializeFirestoreData({
          id: doc.id,
          ...doc.data(),
        });
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  },

  /**
   * Crea una nueva categoría (útil para el módulo de Ajustes).
   */
  async createCategory(data: {
    name: string;
    description?: string;
    colorLabel?: string;
  }) {
    try {
      const newDoc = await adminDb.collection("settings_categories").add({
        ...data,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, id: newDoc.id };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Inicialización rápida: Crea categorías base si la colección está vacía.
   */
  async seedCategories() {
    const categories = ["Parque", "Industrial", "Residencial", "Centro"];
    for (const name of categories) {
      await this.createCategory({ name, colorLabel: "#1d4ed8" });
    }
  },
};
