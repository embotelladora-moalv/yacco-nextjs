"use server";

import { settingsRepository } from "@/services/repositories/settingsRepository";
import { SystemSettings } from "@/core/entities/SystemSettings";
import { revalidatePath } from "next/cache";

export async function addCatalogItemAction(
  catalogKey: keyof SystemSettings,
  item: string,
) {
  try {
    if (!item || item.trim() === "")
      throw new Error("El valor no puede estar vacío");
    await settingsRepository.addItemToCatalog(catalogKey, item.trim());

    revalidatePath("/settings");
    revalidatePath("/customers"); // Por si agregamos tags de clientes
    revalidatePath("/orders"); // Por si agregamos motivos de cambio

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
  item: string,
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
