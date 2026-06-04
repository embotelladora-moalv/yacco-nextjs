import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Order } from "@/core/entities/Order";
import { OrderFormValues } from "@/core/validations/orderSchema";

const ORDERS_COLLECTION = "orders";

export const orderRepository = {
  /**
   * Crea un nuevo pedido en estado PENDIENTE.
   */
  async createOrder(data: OrderFormValues): Promise<string> {
    const docRef = await adminDb.collection(ORDERS_COLLECTION).add({
      ...data,
      // Convertimos el string YYYY-MM-DD del formulario a una fecha real
      expectedDeliveryDate: new Date(data.expectedDeliveryDate),
      status: "PENDING",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return docRef.id;
  },

  /**
   * Obtiene todos los pedidos pendientes (Para la pantalla de "Armar Rutas")
   */
  async getPendingOrders(): Promise<Order[]> {
    const snapshot = await adminDb
      .collection(ORDERS_COLLECTION)
      .where("status", "==", "PENDING")
      .orderBy("expectedDeliveryDate", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Serialización segura de fechas para Next.js Client Components
        expectedDeliveryDate:
          data.expectedDeliveryDate?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      } as any;
    });
  },

  /**
   * Asigna un pedido a un camión (Manifiesto)
   */
  async assignOrderToManifest(
    orderId: string,
    manifestId: string,
  ): Promise<void> {
    await adminDb.collection(ORDERS_COLLECTION).doc(orderId).update({
      status: "ASSIGNED",
      manifestId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  /**
   * Cancela un pedido
   */
  async cancelOrder(orderId: string): Promise<void> {
    await adminDb.collection(ORDERS_COLLECTION).doc(orderId).update({
      status: "CANCELLED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  /**
   * Obtiene un pedido específico para poder editarlo
   */
  async getOrderById(id: string): Promise<Order | null> {
    const doc = await adminDb.collection(ORDERS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    return {
      id: doc.id,
      ...data,
      expectedDeliveryDate:
        data.expectedDeliveryDate?.toDate?.()?.toISOString().split("T")[0] ||
        null, // Formato YYYY-MM-DD para el form
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    } as any;
  },

  /**
   * Actualiza un pedido (Solo si está PENDING)
   */
  async updateOrder(id: string, data: Partial<OrderFormValues>): Promise<void> {
    const docRef = adminDb.collection(ORDERS_COLLECTION).doc(id);
    const updateData: any = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
    }

    await docRef.update(updateData);
  },

  /**
   * Asignación Masiva: Envía múltiples pedidos a un solo camión
   */
  async assignOrdersBulk(
    orderIds: string[],
    manifestId: string,
    guideRequested: boolean = false, // <-- Recibe el parámetro
  ): Promise<void> {
    const batch = adminDb.batch();

    orderIds.forEach((orderId) => {
      const orderRef = adminDb.collection(ORDERS_COLLECTION).doc(orderId);
      batch.update(orderRef, {
        status: "ASSIGNED",
        manifestId,
        guideRequested, // <-- Guarda la bandera
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  },

  async unassignOrdersBulk(orderIds: string[]): Promise<void> {
    const batch = adminDb.batch();

    orderIds.forEach((orderId) => {
      const orderRef = adminDb.collection(ORDERS_COLLECTION).doc(orderId);
      batch.update(orderRef, {
        status: "PENDING",
        manifestId: admin.firestore.FieldValue.delete(), // Lo quitamos del camión
        guideRequested: admin.firestore.FieldValue.delete(), // Limpiamos la bandera
        guideDocumentId: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  },

  async unassignPendingOrdersFromManifest(manifestId: string): Promise<void> {
    const snapshot = await adminDb
      .collection(ORDERS_COLLECTION)
      .where("manifestId", "==", manifestId)
      .where("status", "==", "ASSIGNED") // Solo los que no se entregaron
      .get();

    if (snapshot.empty) return;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "PENDING",
        manifestId: admin.firestore.FieldValue.delete(),
        guideRequested: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  },

  /**
   * Elimina físicamente un pedido de la base de datos (Hard Delete)
   * Útil para limpiar errores de digitación.
   */
  async deleteOrder(id: string): Promise<void> {
    await adminDb.collection(ORDERS_COLLECTION).doc(id).delete();
  },
};
