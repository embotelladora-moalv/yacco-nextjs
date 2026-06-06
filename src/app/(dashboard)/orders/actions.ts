"use server";

import { OrderFormValues, orderSchema } from "@/core/validations/orderSchema";
import { orderRepository } from "@/services/repositories/orderRepository";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/services/firebase/admin";
import admin from "firebase-admin";
import { OrderItem } from "@/core/entities/Order";
import { getUserSession } from "@/services/firebase/auth";


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

// 🔥 NUEVO: Convierte el Pedido en Venta, actualiza balances de envases/deuda de cliente de manera atómica, y decide si factura o no
export async function confirmOrderDeliveryAction(
  orderId: string,
  paymentData: {
    method: string;
    cash: number;
    digital: number;
    driverId: string;
    returnedEmpties: { productId: string; quantity: number }[];
  },
) {
  try {
    const session = await getUserSession();
    if (!session) {
      throw new Error("No hay una sesión activa. Vuelva a iniciar sesión.");
    }

    const saleId = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection("orders").doc(orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) throw new Error("El pedido no existe.");
      const orderData = orderSnap.data()!;

      if (orderData.status === "DELIVERED")
        throw new Error("Este pedido ya fue entregado.");

      // Consultamos los datos actuales y la preferencia de SUNAT del cliente
      const customerRef = adminDb.collection("customers").doc(orderData.customerId);
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists)
        throw new Error("Cliente no encontrado en el CRM.");
      const customerData = customerSnap.data()!;

      const requiresSunat = customerData.alwaysRequiresBilling === true;

      // 🔥 CÁLCULO DE TOTAL DE LA VENTA Y DEUDA MONETARIA
      const calculatedTotalAmount = (orderData.items || []).reduce(
        (sum: number, item: OrderItem) =>
          sum + Number(item.quantity) * Number(item.unitPrice),
        0,
      );

      const totalPaid = Number(paymentData.cash || 0) + Number(paymentData.digital || 0);

      const newMoneyDebt =
        paymentData.method === "CREDIT"
          ? calculatedTotalAmount
          : Math.max(0, calculatedTotalAmount - totalPaid);

      const currentMoneyDebt = Number(customerData.debtAmount || 0);
      const updatedMoneyDebt = currentMoneyDebt + newMoneyDebt;

      // 🔥 CÁLCULO DE CUENTA CORRIENTE DE ENVASES DEL CLIENTE
      const currentBalances: { productId: string; balance: number }[] = customerData.containerBalances || [];
      const balanceMap = new Map<string, number>();

      currentBalances.forEach((b) => balanceMap.set(b.productId, Number(b.balance || 0)));
      (orderData.items || []).forEach((item: OrderItem) => {
        const current = balanceMap.get(item.productId) || 0;
        balanceMap.set(item.productId, current + Number(item.quantity || 0));
      });
      (paymentData.returnedEmpties || []).forEach((empty: { productId: string; quantity: number }) => {
        const current = balanceMap.get(empty.productId) || 0;
        balanceMap.set(empty.productId, current - Number(empty.quantity || 0));
      });

      const newContainerBalances = Array.from(
        balanceMap.entries(),
      ).map(([productId, balance]) => ({ productId, balance }));

      // Preparamos el documento de la Venta (Sale)
      const newSaleRef = adminDb.collection("sales").doc();
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
        registeredBy: session.uid,
        totalAmount: calculatedTotalAmount,
        isBilled: false,
        billingSkipped: !requiresSunat,
        linkedOrderId: orderId,
        guideDocumentId: orderData.guideDocumentId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // ESCRITURAS DE LA TRANSACCIÓN
      // A. Creamos la venta
      transaction.set(newSaleRef, saleData);

      // B. Marcamos el pedido como entregado
      transaction.update(orderRef, {
        status: "DELIVERED",
        saleId: newSaleRef.id,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // C. Actualizamos balances de envases y deuda del cliente
      transaction.update(customerRef, {
        containerBalances: newContainerBalances,
        debtAmount: updatedMoneyDebt,
        lastSaleDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Registrar movimientos de envases (customerContainerLogs) si hay deltas
      const deltaMap = new Map<string, number>();
      (orderData.items || []).forEach((item: OrderItem) => {
        deltaMap.set(item.productId, (deltaMap.get(item.productId) || 0) + Number(item.quantity || 0));
      });
      (paymentData.returnedEmpties || []).forEach((empty: { productId: string; quantity: number }) => {
        deltaMap.set(empty.productId, (deltaMap.get(empty.productId) || 0) - Number(empty.quantity || 0));
      });

      const delta = Array.from(deltaMap.entries())
        .map(([productId, d]) => ({ productId, delta: d }))
        .filter((item) => item.delta !== 0);

      if (delta.length > 0) {
        const containerLogRef = adminDb.collection("customerContainerLogs").doc();
        transaction.set(containerLogRef, {
          id: containerLogRef.id,
          customerId: orderData.customerId,
          type: "DELIVERY",
          saleId: newSaleRef.id,
          manifestId: orderData.manifestId || null,
          delta,
          detail: {
            items: (orderData.items || []).map((i: OrderItem) => ({ productId: i.productId, quantity: Number(i.quantity || 0) })),
            returnedEmpties: (paymentData.returnedEmpties || []).map((e: { productId: string; quantity: number }) => ({ productId: e.productId, quantity: Number(e.quantity || 0) })),
          },
          balanceAfter: newContainerBalances,
          userId: session.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // D. Si exige comprobante, mandamos a la cola para Factura/Boleta
      if (requiresSunat) {
        const queueRef = adminDb.collection("sunatQueue").doc();
        transaction.set(queueRef, {
          referenceId: newSaleRef.id,
          referenceType: "SALE",
          status: "PENDING",
          requiresBilling: true, // Factura o Boleta
          requiresGuide: false, // Ya se hizo la guía al asignar el camión
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return newSaleRef.id;
    });

    revalidatePath("/orders");
    revalidatePath("/sales");
    return { success: true, saleId };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error confirmando entrega:", error);
    return { success: false, error: errorMsg };
  }
}
