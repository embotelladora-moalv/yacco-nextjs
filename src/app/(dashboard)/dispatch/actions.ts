"use server";

import { orderRepository } from "@/services/repositories/orderRepository";
import { revalidatePath } from "next/cache";

export async function assignOrderAction(orderId: string, routeId: string) {
  try {
    if (!routeId) throw new Error("Debes seleccionar un camión/ruta.");

    await orderRepository.assignToRoute(orderId, routeId);

    // Refrescamos los tableros afectados
    revalidatePath("/dispatch");
    revalidatePath("/orders");
    revalidatePath("/routes");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al asignar el pedido.",
    };
  }
}
