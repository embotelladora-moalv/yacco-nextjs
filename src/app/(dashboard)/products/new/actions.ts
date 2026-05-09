// src/app/(dashboard)/products/new/actions.ts
"use server";

import { productRepository } from "@/services/repositories/productRepository";
import {
  productSchema,
  ProductFormValues,
} from "@/core/validations/productSchema";
import { revalidatePath } from "next/cache";

export async function createProductAction(data: ProductFormValues) {
  try {
    // 1. Re-validamos los datos en el servidor por seguridad (Backend Validation)
    const parsedData = productSchema.parse(data);

    // 2. Llamamos al repositorio para guardar en Firebase
    const newProductId = await productRepository.create(parsedData);

    // 3. Limpiamos la caché de Next.js para que la futura tabla se actualice
    revalidatePath("/products");

    return { success: true, id: newProductId };
  } catch (error) {
    console.error("Error creating product:", error);
    return {
      success: false,
      error: "Hubo un error al registrar el producto en la base de datos.",
    };
  }
}
