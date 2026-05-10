import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { PaymentFormValues } from "@/core/validations/paymentSchema";

const COLLECTION = "payments";

export const paymentRepository = {
  /**
   * Registra un pago y aplica la amortización en cascada (FIFO) sobre los pedidos.
   */
  async registerPaymentTransaction(
    data: PaymentFormValues,
    userId: string,
  ): Promise<string> {
    let newPaymentId = "";

    await adminDb.runTransaction(async (transaction) => {
      // 1. REGLA DE ORO FIRESTORE: Todas las LECTURAS van primero
      const customerRef = adminDb.collection("customers").doc(data.customerId);
      const customerDoc = await transaction.get(customerRef);
      if (!customerDoc.exists) throw new Error("Cliente no encontrado.");

      // Buscamos los pedidos del cliente que tengan deuda, ordenados del más viejo al más nuevo
      const pendingOrdersQuery = adminDb
        .collection("orders")
        .where("customerId", "==", data.customerId)
        .where("paymentStatus", "in", ["PENDING", "PARTIAL"])
        .orderBy("createdAt", "asc");

      const pendingOrdersSnap = await transaction.get(pendingOrdersQuery);

      const customerData = customerDoc.data()!;
      const currentDebt = customerData.debtAmount || 0;

      if (data.amount > currentDebt + 0.1) {
        // Margen de 10 céntimos por redondeos
        throw new Error(
          `El monto (S/${data.amount}) supera la deuda actual del cliente (S/${currentDebt}).`,
        );
      }

      // 2. LÓGICA DE NEGOCIO (Amortización en cascada)
      let remainingMoneyToApply = data.amount;
      const orderUpdates: { ref: any; data: any }[] = [];

      for (const orderDoc of pendingOrdersSnap.docs) {
        if (remainingMoneyToApply <= 0) break;

        const orderData = orderDoc.data();
        const orderDebt = orderData.totalAmount - (orderData.amountPaid || 0);

        let moneyToApplyToThisOrder = 0;
        if (remainingMoneyToApply >= orderDebt) {
          // El pago cubre toda la deuda de este pedido
          moneyToApplyToThisOrder = orderDebt;
          remainingMoneyToApply -= orderDebt;
        } else {
          // El pago solo cubre una parte de este pedido
          moneyToApplyToThisOrder = remainingMoneyToApply;
          remainingMoneyToApply = 0;
        }

        const newAmountPaid =
          (orderData.amountPaid || 0) + moneyToApplyToThisOrder;
        // Lógica para evitar errores de precisión de decimales en JS (ej: 0.999999)
        const isFullyPaid = orderData.totalAmount - newAmountPaid < 0.05;

        orderUpdates.push({
          ref: orderDoc.ref,
          data: {
            amountPaid: newAmountPaid,
            paymentStatus: isFullyPaid ? "PAID" : "PARTIAL",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      }

      // 3. EJECUCIÓN DE ESCRITURAS (Updates y Sets)

      // A. Crear el recibo de pago
      const paymentRef = adminDb.collection(COLLECTION).doc();
      newPaymentId = paymentRef.id;
      transaction.set(paymentRef, {
        ...data,
        createdBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // B. Actualizar deuda global del cliente
      const newDebt = Math.max(0, currentDebt - data.amount); // Aseguramos que no baje de cero
      transaction.update(customerRef, {
        debtAmount: newDebt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // C. Actualizar los pedidos amortizados
      for (const update of orderUpdates) {
        transaction.update(update.ref, update.data);
      }
    });

    return newPaymentId;
  },
};
