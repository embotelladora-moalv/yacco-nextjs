"use server";

import { settingsRepository } from "@/services/repositories/settingsRepository";
import { SystemSettings, ShrinkageReason } from "@/core/entities/SystemSettings";
import { revalidatePath } from "next/cache";

export async function addCatalogItemAction(
  catalogKey: keyof SystemSettings,
  item: string | ShrinkageReason,
) {
  try {
    const itemName = typeof item === "string" ? item.trim() : item.name.trim();
    if (!itemName) throw new Error("El valor no puede estar vacío");
    
    await settingsRepository.addItemToCatalog(catalogKey, item);

    revalidatePath("/settings");
    revalidatePath("/customers"); 
    revalidatePath("/orders"); 

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al guardar el ajuste.",
    };
  }
}

export async function removeCatalogItemAction(
  catalogKey: keyof SystemSettings,
  item: string | ShrinkageReason,
) {
  try {
    await settingsRepository.removeItemFromCatalog(catalogKey, item);
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al eliminar el ajuste.",
    };
  }
}

export async function updateShrinkageReasonAction(
  catalogKey: "productionWasteReasons" | "routeWasteReasons",
  reason: ShrinkageReason,
) {
  try {
    // Para simplificar el update en el array de Firestore sin conocer el index previo,
    // leemos, filtramos e insertamos el nuevo. 
    const settings = await settingsRepository.getSettings();
    const currentList = settings[catalogKey] as ShrinkageReason[];
    
    const newList = currentList.map(r => r.id === reason.id ? reason : r);

    await settingsRepository.updateCatalogList(catalogKey, newList);
    
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
