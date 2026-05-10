"use server";

import { productRepository } from "@/services/repositories/productRepository";
import {
  productSchema,
  ProductFormValues,
} from "@/core/validations/productSchema";
import { revalidatePath } from "next/cache";

// Tipo estricto de retorno para evitar el error 'void'
type ActionResponse = { success: boolean; error?: string };

export async function saveProductAction(
  data: ProductFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = productSchema.parse(data);
    await productRepository.create(parsedData);
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al registrar el producto." };
  }
}

export async function updateProductAction(
  id: string,
  data: ProductFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = productSchema.parse(data);
    await productRepository.update(id, parsedData);
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al actualizar el producto." };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResponse> {
  try {
    // Usamos Soft-Delete (desactivar) para no arruinar el historial del Kardex
    await productRepository.deactivate(id);
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al eliminar el producto." };
  }
}
