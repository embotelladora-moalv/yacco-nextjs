"use server";

import { OrderFormValues, orderSchema } from "@/core/validations/orderSchema";
import { orderRepository } from "@/services/repositories/orderRepository";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/services/firebase/admin";
import admin from "firebase-admin";

export async function createOrderAction(data: OrderFormValues) {
  try {
    const parsedData = orderSchema.parse(data);
    const orderId = await orderRepository.createOrder(parsedData);
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
    revalidatePath("/orders");
    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al asignar pedido:", error);
    return { success: false, error: error.message };
  }
}

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

// 🔥 ACTUALIZADO: Ahora recibe la orden de emitir guías y usa la cola SUNAT
export async function assignOrdersBulkAction(
  orderIds: string[],
  manifestId: string,
  generateGuides: boolean = false,
) {
  try {
    if (!orderIds.length || !manifestId)
      throw new Error("Faltan datos para la asignación masiva.");

    // 1. Asignamos logísticamente en la base de datos de Pedidos
    // Pasamos el generateGuides al repositorio
    await orderRepository.assignOrdersBulk(
      orderIds,
      manifestId,
      generateGuides,
    );

    // 2. Si marcaron "Emitir Guías", enviamos a la cola de SUNAT
    if (generateGuides) {
      const batch = adminDb.batch();

      orderIds.forEach((orderId) => {
        const queueRef = adminDb.collection("sunatQueue").doc();
        batch.set(queueRef, {
          referenceId: orderId, // Enviamos el ID del Pedido
          referenceType: "ORDER", // Le decimos al Worker que busque en 'orders'
          status: "PENDING",
          requiresGuide: true, // Solo queremos la Guía de Remisión (GRE)
          requiresBilling: false, // Aún no hay factura, eso es al entregar
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
    }

    revalidatePath("/orders");
    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. AGREGA el Action para Desasignar
export async function unassignOrdersBulkAction(
  orderIds: string[],
  manifestId: string,
) {
  try {
    if (!orderIds.length) throw new Error("No hay pedidos seleccionados.");

    await orderRepository.unassignOrdersBulk(orderIds);

    // Refrescamos cachés
    revalidatePath("/orders");
    revalidatePath(`/dispatch/${manifestId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteOrderAction(id: string) {
  try {
    await orderRepository.deleteOrder(id);
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar pedido:", error);
    return { success: false, error: error.message };
  }
}

// 🔥 NUEVO: Convierte el Pedido en Venta y decide si factura o no
export async function confirmOrderDeliveryAction(
  orderId: string,
  paymentData: {
    method: string;
    cash: number;
    digital: number;
    driverId: string;
    returnedEmpties: any[];
  },
) {
  try {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) throw new Error("El pedido no existe.");
    const orderData = orderSnap.data()!;

    if (orderData.status === "DELIVERED")
      throw new Error("Este pedido ya fue entregado.");

    // Consultamos la preferencia de SUNAT del cliente
    const customerSnap = await adminDb
      .collection("customers")
      .doc(orderData.customerId)
      .get();
    const customerData = customerSnap.data()!;
    const requiresSunat = customerData.alwaysRequiresBilling === true;

    // Preparamos el documento de la Venta (Sale)

    // 🔥 NUEVO: Calculamos el total antes de guardar
    const calculatedTotalAmount = orderData.items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const saleData = {
      saleType: "ROUTE",
      manifestId: orderData.manifestId,
      customerId: orderData.customerId,
      items: orderData.items,
      returnedEmpties: paymentData.returnedEmpties || [],
      paymentMethod: paymentData.method,
      cashReceived: paymentData.cash,
      digitalReceived: paymentData.digital,
      driverId: paymentData.driverId,

      // 🔥 GUARDAMOS EL TOTAL EN LA BASE DE DATOS
      totalAmount: calculatedTotalAmount,

      isBilled: false,
      billingSkipped: !requiresSunat,
      linkedOrderId: orderId,
      guideDocumentId: orderData.guideDocumentId || null,

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();

    // A. Creamos la venta
    const newSaleRef = adminDb.collection("sales").doc();
    batch.set(newSaleRef, saleData);

    // B. Marcamos el pedido como entregado
    batch.update(orderRef, {
      status: "DELIVERED",
      saleId: newSaleRef.id,
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // C. Si exige comprobante, mandamos a la cola para Factura/Boleta
    if (requiresSunat) {
      const queueRef = adminDb.collection("sunatQueue").doc();
      batch.set(queueRef, {
        referenceId: newSaleRef.id,
        referenceType: "SALE",
        status: "PENDING",
        requiresBilling: true, // Factura o Boleta
        requiresGuide: false, // Ya se hizo la guía al asignar el camión
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    revalidatePath("/orders");
    revalidatePath("/sales");
    return { success: true, saleId: newSaleRef.id };
  } catch (error: any) {
    console.error("Error confirmando entrega:", error);
    return { success: false, error: error.message };
  }
}
