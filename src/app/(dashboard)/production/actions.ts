"use server";

import { productionRepository } from "@/services/repositories/productionRepository";
import {
  productionBatchSchema,
  ProductionBatchValues,
} from "@/core/validations/productionSchema";
import { revalidatePath } from "next/cache";

export async function registerProductionAction(data: ProductionBatchValues) {
  try {
    const parsedData = productionBatchSchema.parse(data);
    await productionRepository.registerBatch(parsedData);

    // Refrescamos vistas de producción e inventario (kardex)
    revalidatePath("/production");
    revalidatePath("/inventory");

    return {
      success: true,
      message: "Lote de producción y Kardex actualizados.",
    };
  } catch (error: any) {
    console.error("Error en producción:", error);
    return {
      success: false,
      error: error.message || "Error al registrar producción.",
    };
  }
}
