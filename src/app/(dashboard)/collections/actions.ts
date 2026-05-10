"use server";

import { paymentRepository } from "@/services/repositories/paymentRepository";
import {
  paymentSchema,
  PaymentFormValues,
} from "@/core/validations/paymentSchema";
import { revalidatePath } from "next/cache";

export async function registerPaymentAction(data: PaymentFormValues) {
  try {
    const parsedData = paymentSchema.parse(data);

    // Aquí usarías el ID de la sesión real. Lo hardcodeamos por ahora.
    const userId = "ADMIN_SYS";

    await paymentRepository.registerPaymentTransaction(parsedData, userId);

    // Refrescamos clientes y pedidos porque sus estados financieros cambiaron
    revalidatePath("/customers");
    revalidatePath("/orders");
    revalidatePath("/collections");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al registrar el pago.",
    };
  }
}
