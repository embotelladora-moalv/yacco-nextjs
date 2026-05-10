"use server";

import { billingRepository } from "@/services/repositories/billingRepository";
import {
  billingSchema,
  BillingFormValues,
} from "@/core/validations/billingSchema";
import { revalidatePath } from "next/cache";

export async function emitInvoiceAction(data: BillingFormValues) {
  try {
    const parsedData = billingSchema.parse(data);
    await billingRepository.emitInvoiceTransaction(parsedData);

    revalidatePath("/billing");
    revalidatePath("/orders"); // Actualiza la vista de pedidos

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al generar el comprobante electrónico.",
    };
  }
}
