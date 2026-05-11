import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { PaymentFormValues } from "@/core/validations/paymentSchema";

const COLLECTION = "payments";

export const paymentRepository = {
  async registerPaymentTransaction(
    data: PaymentFormValues,
    userId: string,
  ): Promise<string> {
    let newPaymentId = "";

    await adminDb.runTransaction(async (transaction) => {
      // ... (TODA TU LÓGICA DE LECTURA Y CASCADA FIFO QUEDA EXACTAMENTE IGUAL) ...
      const customerRef = adminDb.collection("customers").doc(data.customerId);
      const customerDoc = await transaction.get(customerRef);
      if (!customerDoc.exists) throw new Error("Cliente no encontrado.");

      const pendingOrdersQuery = adminDb
        .collection("orders")
        .where("customerId", "==", data.customerId)
        .where("paymentStatus", "in", ["PENDING", "PARTIAL"])
        .orderBy("createdAt", "asc");

      const pendingOrdersSnap = await transaction.get(pendingOrdersQuery);
      const customerData = customerDoc.data()!;
      const currentDebt = customerData.debtAmount || 0;

      if (data.amount > currentDebt + 0.1) {
        throw new Error(
          `El monto (S/${data.amount}) supera la deuda actual del cliente (S/${currentDebt}).`,
        );
      }

      let remainingMoneyToApply = data.amount;
      const orderUpdates: { ref: any; data: any }[] = [];

      for (const orderDoc of pendingOrdersSnap.docs) {
        if (remainingMoneyToApply <= 0) break;
        const orderData = orderDoc.data();
        const orderDebt = orderData.totalAmount - (orderData.amountPaid || 0);
        let moneyToApplyToThisOrder = 0;

        if (remainingMoneyToApply >= orderDebt) {
          moneyToApplyToThisOrder = orderDebt;
          remainingMoneyToApply -= orderDebt;
        } else {
          moneyToApplyToThisOrder = remainingMoneyToApply;
          remainingMoneyToApply = 0;
        }

        const newAmountPaid =
          (orderData.amountPaid || 0) + moneyToApplyToThisOrder;
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

      // A. Crear el recibo de pago (AQUÍ ESTÁ EL CAMBIO PARA LA FECHA)
      const paymentRef = adminDb.collection(COLLECTION).doc();
      newPaymentId = paymentRef.id;
      transaction.set(paymentRef, {
        ...data,
        date: admin.firestore.Timestamp.fromDate(new Date(data.date)), // <-- Parseamos la fecha
        createdBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // B. Actualizar deuda global del cliente
      const newDebt = Math.max(0, currentDebt - data.amount);
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
