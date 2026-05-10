"use server";

import { orderRepository } from "@/services/repositories/orderRepository";
import { orderSchema, OrderFormValues } from "@/core/validations/orderSchema";
import { revalidatePath } from "next/cache";

export type ActionResponse = { success: boolean; error?: string };

export async function submitOrderAction(
  data: OrderFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = orderSchema.parse(data);

    await orderRepository.createOrderTransaction(parsedData);

    // Refrescamos las vistas que dependen de estos datos
    revalidatePath("/orders");
    revalidatePath("/customers"); // Porque la deuda y última compra del cliente pudieron cambiar

    return { success: true };
  } catch (error: any) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: error.message || "Error al procesar el pedido.",
    };
  }
}
