"use server";

import { financeRepository } from "@/services/repositories/financeRepository";
import {
  cashMovementSchema,
  CashMovementFormValues,
} from "@/core/validations/financeSchemas";
import { revalidatePath } from "next/cache";

export async function registerCashMovementAction(data: CashMovementFormValues) {
  try {
    // 1. Validar estrictamente los datos con Zod
    const parsedData = cashMovementSchema.parse(data);

    // 2. Guardar en Base de Datos
    const movementId = await financeRepository.registerMovement(parsedData);

    // 3. Limpiar caché para que las tablas se actualicen
    revalidatePath("/finance");

    if (parsedData.manifestId) {
      revalidatePath(`/dispatch/${parsedData.manifestId}`);
    }

    return { success: true, movementId };
  } catch (error: any) {
    console.error("Error al registrar movimiento:", error);
    return { success: false, error: error.message };
  }
}
