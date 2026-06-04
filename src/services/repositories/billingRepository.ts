import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { BillingFormValues } from "@/core/validations/billingSchema";
import { Invoice } from "@/core/entities/Invoice";

const COLLECTION = "invoices";

export const billingRepository = {
  /**
   * Genera el comprobante y marca los pedidos asociados con el ID de la factura.
   */
  async emitInvoiceTransaction(data: BillingFormValues): Promise<string> {
    let newInvoiceId = "";

    await adminDb.runTransaction(async (transaction) => {
      // 1. Crear la referencia de la nueva factura
      const invoiceRef = adminDb.collection(COLLECTION).doc();
      newInvoiceId = invoiceRef.id;

      // SIMULACIÓN DE CORRELATIVO (En producción, esto lo da tu proveedor de facturación electrónica)
      const prefix =
        data.type === "FACTURA"
          ? "F001"
          : data.type === "BOLETA"
            ? "B001"
            : "T001";
      const fakeCorrelative = Math.floor(100000 + Math.random() * 900000);
      const invoiceNumber = `${prefix}-${fakeCorrelative}`;

      // 2. Guardar la factura
      transaction.set(invoiceRef, {
        ...data,
        invoiceNumber,
        status: "ISSUED", // "Emitido"
        issueDate: admin.firestore.Timestamp.fromDate(new Date(data.issueDate)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Actualizar los pedidos para ligarlos a esta factura
      for (const orderId of data.orderIds) {
        const orderRef = adminDb.collection("orders").doc(orderId);
        transaction.update(orderRef, {
          billingId: newInvoiceId, // Vinculamos el pedido a la factura
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    return newInvoiceId;
  },

  async getAll(): Promise<Invoice[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        issueDate: data.issueDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Invoice;
    });
  },
};
