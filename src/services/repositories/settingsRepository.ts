import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { SystemSettings } from "@/core/entities/SystemSettings";
import { serializeFirestoreData } from "@/services/firebase/serialization";

// ACTUALIZADO: Ahora apuntamos a la colección unificada que creamos en el seeder
const SETTINGS_DOC = "systemSettings/config";

export const settingsRepository = {
  /**
   * Obtiene todos los catálogos del sistema. Si no existe el documento, lo crea con valores por defecto.
   */
  async getSettings(): Promise<SystemSettings> {
    const doc = await adminDb.doc(SETTINGS_DOC).get();

    // Si por alguna razón el script no corrió o el documento no existe, lo creamos con todos los datos
    if (!doc.exists) {
      const defaultSettings: SystemSettings = {
        clientTags: ["VIP", "Mayorista", "Bodega", "Empresa"],
        packagingTypes: ["Bidón 20L", "Bidón 7L", "Botella 1L", "Surtidor"],
        productionWasteReasons: [
          "Falla de sellado",
          "Bidón fisurado de fábrica",
        ],
        routeWasteReasons: ["Caída en reparto", "Robo/Pérdida"],
        bottleChangeReasons: ["Agua turbia", "Caño goteando", "Sabor extraño"],
        debtReasons: ["Saldo inicial", "Penalidad por bidón perdido"],
        maquilaBrands: [], // <--- Agregado en los valores por defecto
        updatedAt: new Date(),
      };

      await adminDb.doc(SETTINGS_DOC).set({
        ...defaultSettings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return defaultSettings as any;
    }

    const data = doc.data()!;

    // Mapeo seguro: Si el documento existe pero le falta alguna lista (porque la acabamos de inventar),
    // devolvemos un arreglo vacío o por defecto para que el .map() en el frontend no explote.
    return serializeFirestoreData({
      clientTags: data.clientTags || [],
      packagingTypes: data.packagingTypes || [],
      productionWasteReasons: data.productionWasteReasons || [],
      routeWasteReasons: data.routeWasteReasons || [],
      bottleChangeReasons: data.bottleChangeReasons || [],
      debtReasons: data.debtReasons || [],
      maquilaBrands: data.maquilaBrands || [], // <--- Aseguramos que siempre exista este campo
      updatedAt: data.updatedAt,
    }) as any;
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
