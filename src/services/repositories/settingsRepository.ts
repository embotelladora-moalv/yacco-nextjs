import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { SystemSettings, ShrinkageReason } from "@/core/entities/SystemSettings";
import { serializeFirestoreData } from "@/services/firebase/serialization";
import { slugifyReason } from "@/core/utils/dateUtils";

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
          {
            id: "plant-falla-sellado",
            name: "Falla de sellado",
            context: "PLANT",
            phase: "FILLED",
            isRecyclableDefault: true,
            isActive: true,
          },
          {
            id: "plant-bidon-fisurado",
            name: "Bidón fisurado de fábrica",
            context: "PLANT",
            phase: "FILLED",
            isRecyclableDefault: false,
            isActive: true,
          },
        ],
        routeWasteReasons: [
          {
            id: "route-caida-reparto",
            name: "Caída en reparto",
            context: "ROUTE",
            phase: "FILLED",
            isRecyclableDefault: true,
            isActive: true,
          },
          {
            id: "route-robo-perdida",
            name: "Robo/Pérdida",
            context: "ROUTE",
            phase: "FILLED",
            isRecyclableDefault: false,
            isActive: true,
          },
          {
            id: "route-cambio-garantia",
            name: "Cambio por garantía (agua mal estado)",
            context: "ROUTE",
            phase: "FILLED",
            isRecyclableDefault: true,
            isActive: true,
          },
        ],
        bottleChangeReasons: ["Agua turbia", "Caño goteando", "Sabor extraño"],
        debtReasons: ["Saldo inicial", "Penalidad por bidón perdido"],
        maquilaBrands: [],
        updatedAt: new Date(),
      };

      await adminDb.doc(SETTINGS_DOC).set({
        ...defaultSettings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return defaultSettings as any;
    }

    const data = doc.data()!;

    // Capa de normalización para motivos de merma (Compatibilidad Legacy string[])
    const normalizeReasons = (items: any[], context: "ROUTE" | "PLANT"): ShrinkageReason[] => {
      return (items || []).map((item) => {
        if (typeof item === "string") {
          // Normalizamos string legacy a objeto ShrinkageReason
          return {
            id: `${context.toLowerCase()}-${slugifyReason(item)}`,
            name: item,
            context: context,
            phase: "FILLED",
            isRecyclableDefault: false,
            isActive: true,
          };
        }
        return item as ShrinkageReason;
      });
    };

    // Mapeo seguro: Si el documento existe pero le falta alguna lista (porque la acabamos de inventar),
    // devolvemos un arreglo vacío o por defecto para que el .map() en el frontend no explote.
    return serializeFirestoreData({
      clientTags: data.clientTags || [],
      packagingTypes: data.packagingTypes || [],
      productionWasteReasons: normalizeReasons(data.productionWasteReasons || [], "PLANT"),
      routeWasteReasons: normalizeReasons(data.routeWasteReasons || [], "ROUTE"),
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
    item: string | ShrinkageReason,
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
    item: string | ShrinkageReason,
  ): Promise<void> {
    await adminDb.doc(SETTINGS_DOC).update({
      [catalogKey]: admin.firestore.FieldValue.arrayRemove(item),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  /**
   * Sobrescribe una lista completa del catálogo.
   */
  async updateCatalogList(
    catalogKey: keyof SystemSettings,
    newList: any[],
  ): Promise<void> {
    await adminDb.doc(SETTINGS_DOC).update({
      [catalogKey]: newList,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
