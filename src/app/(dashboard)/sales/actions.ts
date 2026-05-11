"use server";

import { salesRepository } from "@/services/repositories/salesRepository";
import { saleSchema, SaleFormValues } from "@/core/validations/crmSchemas";
import { revalidatePath } from "next/cache";

export async function registerSaleAction(data: SaleFormValues) {
  try {
    // 1. Validar estrictamente los datos con Zod
    const parsedData = saleSchema.parse(data);

    // TODO: Obtener el ID del chofer autenticado desde la sesión (Auth)
    // Por ahora usamos un ID temporal para que compile y funcione
    const currentDriverId = "driver_123";

    // 2. Ejecutar la transacción maestra
    const saleId = await salesRepository.registerSale(
      parsedData,
      currentDriverId,
    );

    // 3. Limpiar caché de las vistas afectadas
    revalidatePath("/customers");
    revalidatePath(`/customers/${data.customerId}`);
    revalidatePath(`/dispatch/${data.manifestId}`);
    revalidatePath("/dispatch");

    return { success: true, saleId };
  } catch (error: any) {
    console.error("Error al registrar venta:", error);
    return { success: false, error: error.message };
  }
}
