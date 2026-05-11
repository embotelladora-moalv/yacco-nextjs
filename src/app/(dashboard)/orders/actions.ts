"use server";

import { OrderFormValues, orderSchema } from "@/core/validations/orderSchema";
import { orderRepository } from "@/services/repositories/orderRepository";
import { revalidatePath } from "next/cache";

export async function createOrderAction(data: OrderFormValues) {
  try {
    // 1. Validación estricta con Zod
    const parsedData = orderSchema.parse(data);

    // 2. Guardar en Base de Datos (Estado: PENDING)
    const orderId = await orderRepository.createOrder(parsedData);

    // 3. Limpiar caché para que el tablero logístico se actualice
    revalidatePath("/orders");

    return { success: true, orderId };
  } catch (error: any) {
    console.error("Error al crear pedido:", error);
    return { success: false, error: error.message };
  }
}

export async function assignOrderToManifestAction(
  orderId: string,
  manifestId: string,
) {
  try {
    await orderRepository.assignOrderToManifest(orderId, manifestId);

    // Refrescamos ambas pantallas (Pedidos y Despachos)
    revalidatePath("/orders");
    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error al asignar pedido:", error);
    return { success: false, error: error.message };
  }
}

// ... (código anterior)

export async function updateOrderAction(id: string, data: OrderFormValues) {
  try {
    const parsedData = orderSchema.parse(data);
    await orderRepository.updateOrder(id, parsedData);
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignOrdersBulkAction(
  orderIds: string[],
  manifestId: string,
) {
  try {
    if (!orderIds.length || !manifestId)
      throw new Error("Faltan datos para la asignación masiva.");

    await orderRepository.assignOrdersBulk(orderIds, manifestId);

    revalidatePath("/orders");
    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteOrderAction(id: string) {
  try {
    await orderRepository.deleteOrder(id);

    // Refrescamos la vista principal
    revalidatePath("/orders");

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar pedido:", error);
    return { success: false, error: error.message };
  }
}
