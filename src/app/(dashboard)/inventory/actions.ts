"use server";

import {
  ProductFormValues,
  ProductionBatchFormValues,
  productionBatchSchema,
  productSchema,
} from "@/core/validations/inventorySchemas";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/services/firebase/auth";

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
    const session = await getUserSession();
    if (!session) {
      return { success: false, error: "Sesión inválida. Vuelve a iniciar sesión." };
    }
    if (quantity <= 0) throw new Error("La cantidad debe ser mayor a 0");
    await inventoryRepository.registerPurchase(productId, quantity, session.uid);
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
    const session = await getUserSession();
    if (!session) {
      return { success: false, error: "Sesión inválida. Vuelve a iniciar sesión." };
    }
    const parsed = productionBatchSchema.parse(data);

    await inventoryRepository.registerProduction({
      productId: parsed.productId,
      quantityProduced: parsed.quantityProduced,
      productionDate: new Date(parsed.productionDate + "T12:00:00"), // Evitar problemas de zona horaria
      expirationDate: parsed.expirationDate
        ? new Date(parsed.expirationDate + "T12:00:00")
        : undefined,
      isTollManufacturing: parsed.isTollManufacturing,
      brandName: data.isTollManufacturing ? data.brandName || "" : "",
      notes: parsed.notes,
      managerId: session.uid,
    });

    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKardexAction(
  productId: string,
  pageSize: number = 20,
  cursor?: string,
) {
  try {
    const result = await inventoryRepository.listKardexPaginated({
      productId,
      pageSize,
      cursor,
    });
    return {
      success: true,
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
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
