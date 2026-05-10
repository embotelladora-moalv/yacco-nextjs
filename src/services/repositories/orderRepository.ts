import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { OrderFormValues } from "@/core/validations/orderSchema";
import { Order } from "@/core/entities/Order";

const COLLECTION = "orders";

export const orderRepository = {
  /**
   * Crea un pedido utilizando una Transacción.
   * Si es a crédito, actualiza automáticamente la deuda del cliente.
   * También actualiza la 'lastSaleDate' del cliente para el CRM.
   */
  async createOrderTransaction(data: OrderFormValues): Promise<string> {
    let newOrderId = "";

    await adminDb.runTransaction(async (transaction) => {
      // 1. Obtenemos la referencia del cliente
      const customerRef = adminDb.collection("customers").doc(data.customerId);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists)
        throw new Error("Cliente no encontrado en el sistema.");

      // 2. Calculamos si hay un incremento en la deuda
      let debtIncrease = 0;
      if (data.paymentMethod === "CREDIT" || data.paymentStatus === "PARTIAL") {
        debtIncrease = data.totalAmount - data.amountPaid;
      }

      // 3. Preparamos el documento del Pedido
      const orderRef = adminDb.collection(COLLECTION).doc();
      newOrderId = orderRef.id;

      const orderData: any = {
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Si el pedido ya nace entregado (Ej: Venta en Planta), registramos la fecha de entrega
      if (data.status === "DELIVERED") {
        orderData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
      }

      transaction.set(orderRef, orderData);

      // 4. Actualizamos el CRM y las finanzas del Cliente
      const customerUpdates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSaleDate: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (debtIncrease > 0) {
        const currentDebt = customerDoc.data()?.debtAmount || 0;
        customerUpdates.debtAmount = currentDebt + debtIncrease;
      }

      transaction.update(customerRef, customerUpdates);
    });

    return newOrderId;
  },

  /**
   * Obtiene el historial de pedidos (para la tabla principal)
   */
  async getAll(): Promise<Order[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        scheduledDate: data.scheduledDate
          ? new Date(data.scheduledDate)
          : new Date(),
        deliveredAt: data.deliveredAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Order;
    });
  },

  /**
   * Obtiene un pedido específico por su ID.
   */
  async getById(id: string): Promise<Order | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      scheduledDate: data.scheduledDate
        ? new Date(data.scheduledDate)
        : new Date(),
      deliveredAt: data.deliveredAt?.toDate() || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Order;
  },

  /**
   * Asigna un pedido reservado a una ruta activa (Camión).
   */
  async assignToRoute(orderId: string, routeId: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(orderId).update({
      status: "ASSIGNED",
      routeId: routeId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
