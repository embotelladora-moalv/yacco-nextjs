import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { SystemSettings } from "@/core/entities/SystemSettings";

const SETTINGS_DOC = "settings/catalogs";

export const settingsRepository = {
  /**
   * Obtiene todos los catálogos del sistema. Si no existe el documento, lo crea con valores por defecto.
   */
  async getSettings(): Promise<SystemSettings> {
    const doc = await adminDb.doc(SETTINGS_DOC).get();

    if (!doc.exists) {
      const defaultSettings: SystemSettings = {
        clientTags: ["VIP", "Mayorista", "Parque", "Casa"],
        productionWasteReasons: [
          "Falla de sellado",
          "Bidón fisurado de fábrica",
        ],
        routeWasteReasons: ["Caída en reparto", "Robo/Pérdida"],
        bottleChangeReasons: ["Agua turbia", "Caño goteando", "Sabor extraño"],
        debtReasons: ["Saldo inicial", "Penalidad por bidón perdido"],
        packagingTypes: ["Bidón (Jug)", "Botella (Bottle)", "Caja", "Surtidor"], // <--- Agrega esta línea
        updatedAt: new Date(),
      };
      // ... resto de tu código
      await adminDb.doc(SETTINGS_DOC).set({
        ...defaultSettings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return defaultSettings;
    }

    const data = doc.data()!;
    return {
      ...data,
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SystemSettings;
  },

  /**
   * Añade un nuevo elemento a una lista específica usando arrayUnion.
   */
  async addItemToCatalog(
    catalogKey: keyof SystemSettings,
    item: string,
  ): Promise<void> {
    await adminDb.doc(SETTINGS_DOC).update({
      [catalogKey]: admin.firestore.FieldValue.arrayUnion(item),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  /**
   * Elimina un elemento de una lista específica usando arrayRemove.
   */
  async removeItemFromCatalog(
    catalogKey: keyof SystemSettings,
    item: string,
  ): Promise<void> {
    await adminDb.doc(SETTINGS_DOC).update({
      [catalogKey]: admin.firestore.FieldValue.arrayRemove(item),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
