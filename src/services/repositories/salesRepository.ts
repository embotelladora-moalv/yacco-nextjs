import admin from "firebase-admin";
import { Sale, Customer, CustomerContainerBalance } from "@/core/entities/CRM";
import { DispatchManifest } from "@/core/entities/Dispatch";
import { SaleFormValues } from "@/core/validations/crmSchemas";
import { adminDb } from "@/services/firebase/admin";

const SALES_COLLECTION = "sales";
const CUSTOMERS_COLLECTION = "customers";
const DISPATCH_COLLECTION = "dispatch_manifests";

export const salesRepository = {
  /**
   * Registra una venta, actualiza la deuda del cliente y la caja del camión.
   */
  async registerSale(data: SaleFormValues, driverId: string): Promise<string> {
    return await adminDb.runTransaction(async (transaction) => {
      // 1. Definir Referencias
      const manifestRef = adminDb
        .collection(DISPATCH_COLLECTION)
        .doc(data.manifestId);
      const customerRef = adminDb
        .collection(CUSTOMERS_COLLECTION)
        .doc(data.customerId);
      const newSaleRef = adminDb.collection(SALES_COLLECTION).doc();

      // 2. Lecturas (Se deben hacer todas antes de las escrituras)
      const manifestDoc = await transaction.get(manifestRef);
      const customerDoc = await transaction.get(customerRef);

      if (!manifestDoc.exists)
        throw new Error("Manifiesto de ruta no encontrado.");
      if (!customerDoc.exists)
        throw new Error("Cliente no encontrado en el CRM.");

      const manifest = manifestDoc.data() as DispatchManifest;
      const customer = customerDoc.data() as Customer;

      if (manifest.status !== "ON_ROUTE") {
        throw new Error(
          "Seguridad: No se pueden registrar ventas en una ruta que ya fue liquidada o cancelada.",
        );
      }

      // 3. Calcular la nueva Cuenta Corriente de Envases
      const currentBalances = customer.containerBalances || [];
      const balanceMap = new Map<string, number>();

      // A) Cargar deuda actual
      currentBalances.forEach((b) => balanceMap.set(b.productId, b.balance));

      // B) Sumar deuda por los bidones nuevos entregados
      data.items.forEach((item) => {
        const current = balanceMap.get(item.productId) || 0;
        balanceMap.set(item.productId, current + item.quantity);
      });

      // C) Restar deuda por los vacíos devueltos
      data.returnedEmpties.forEach((empty) => {
        const current = balanceMap.get(empty.productId) || 0;
        balanceMap.set(empty.productId, current - empty.quantity);
      });

      // Transformar el mapa de vuelta al arreglo estructurado
      const newContainerBalances: CustomerContainerBalance[] = Array.from(
        balanceMap.entries(),
      ).map(([productId, balance]) => ({ productId, balance }));

      // 4. Cálculos Financieros
      const totalAmount = data.items.reduce(
        (acc, item) => acc + item.quantity * item.unitPrice,
        0,
      );
      const totalPaid = data.cashReceived + data.digitalReceived;
      const newMoneyDebt = totalAmount - totalPaid; // Si pagó menos del total, genera deuda

      const currentMoneyDebt = customer.debtAmount || 0;
      const updatedMoneyDebt = currentMoneyDebt + newMoneyDebt;

      // 5. Estructurar el documento de Venta
      const saleDoc: Sale = {
        id: newSaleRef.id,
        manifestId: data.manifestId,
        driverId,
        customerId: data.customerId,

        // MAPEO CORREGIDO: Calculamos el subtotal para cada item
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice, // <-- Esto resuelve el error
        })),

        returnedEmpties: data.returnedEmpties,
        totalAmount,
        paymentMethod: data.paymentMethod,
        cashReceived: data.cashReceived,
        digitalReceived: data.digitalReceived,
        notes: data.notes,
        status: "COMPLETED",
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      // 6. Escrituras Simultáneas (Si una falla, Firebase revierte todas)

      // A) Guardar el Ticket de Venta
      transaction.set(newSaleRef, saleDoc);

      // B) Actualizar Cliente (Saldos y última fecha de compra)
      transaction.update(customerRef, {
        containerBalances: newContainerBalances,
        debtAmount: updatedMoneyDebt,
        lastSaleDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // C) Actualizar Manifiesto (Incrementar el dinero esperado para la liquidación)
      transaction.update(manifestRef, {
        cashExpected: (manifest.cashExpected || 0) + data.cashReceived,
        digitalPaymentsExpected:
          (manifest.digitalPaymentsExpected || 0) + data.digitalReceived,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return newSaleRef.id;
    });
  },

  /**
   * Obtiene el historial de ventas recientes
   */

  async getRecentSales(limitCount = 100): Promise<Sale[]> {
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Convertimos el Timestamp de Firebase a String ISO para el frontend
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as any;
    });
  },
};
