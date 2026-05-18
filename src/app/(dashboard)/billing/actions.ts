"use server";

import { billingRepository } from "@/services/repositories/billingRepository";
// IMPORTANTE: Asegúrate de que las rutas a tus repositorios sean correctas
import { salesRepository } from "@/services/repositories/salesRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
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

// --- NUEVA ACCIÓN PARA LA VISTA DE FACTURACIÓN ---
export async function getPendingBillingDataAction() {
  try {
    // 1. Delegamos la consulta de ventas pendientes al repositorio de ventas
    const pendingSales = await salesRepository.getUnbilledSales();

    // 2. Extraemos los IDs únicos de los clientes para no consultar duplicados
    const customerIds = [
      ...new Set(pendingSales.map((s: any) => s.customerId)),
    ];
    let customersData = {};

    // 3. Delegamos la consulta de la información del cliente a su repositorio
    if (customerIds.length > 0) {
      customersData = await customerRepository.getCustomersByIds(customerIds);
    }

    return { success: true, pendingSales, customersData };
  } catch (error) {
    console.error("Error obteniendo datos de facturación:", error);
    return { success: false, pendingSales: [], customersData: {} };
  }
}
