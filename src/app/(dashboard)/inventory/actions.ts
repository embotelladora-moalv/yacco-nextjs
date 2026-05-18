"use server";

import {
  ProductFormValues,
  ProductionBatchFormValues,
  productionBatchSchema,
  productSchema,
} from "@/core/validations/inventorySchemas";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { revalidatePath } from "next/cache";

export async function saveProductAction(data: ProductFormValues, id?: string) {
  try {
    const parsedData = productSchema.parse(data);

    if (id) {
      // 1. MODO EDICIÓN
      // Extraemos los stocks iniciales para no sobrescribir el Kardex real al editar
      const { initialStockEmpty, initialStockFilled, ...updateData } =
        parsedData;
      await inventoryRepository.updateProduct(id, updateData);
    } else {
      // 2. MODO CREACIÓN
      await inventoryRepository.createProduct(parsedData);
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerPurchaseAction(
  productId: string,
  quantity: number,
) {
  try {
    if (quantity <= 0) throw new Error("La cantidad debe ser mayor a 0");
    // TODO: En producción, reemplazar "ADMIN_ID" por el ID del usuario en sesión
    await inventoryRepository.registerPurchase(productId, quantity, "ADMIN_ID");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerProductionAction(
  data: ProductionBatchFormValues,
) {
  try {
    const parsed = productionBatchSchema.parse(data);

    await inventoryRepository.registerProduction({
      productId: parsed.productId,
      quantityProduced: parsed.quantityProduced,
      productionDate: new Date(parsed.productionDate), // Pasamos la fecha exacta del formulario
      isTollManufacturing: parsed.isTollManufacturing,
      brandName: data.isTollManufacturing ? data.brandName || "" : "",
      notes: parsed.notes,
      managerId: "ADMIN_ID", // TODO: Reemplazar con usuario real
    });

    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKardexAction(productId: string) {
  try {
    const logs = await inventoryRepository.getKardexByProduct(productId);
    return { success: true, data: logs };
  } catch (error: any) {
    console.error("Error al obtener Kardex:", error);
    return { success: false, error: "No se pudo cargar el historial." };
  }
}

// NUEVA ACCIÓN PARA DESACTIVAR/ACTIVAR
export async function toggleProductStatusAction(id: string, isActive: boolean) {
  try {
    await inventoryRepository.toggleProductStatus(id, isActive);
    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
