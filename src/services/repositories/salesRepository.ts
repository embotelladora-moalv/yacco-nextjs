import admin from "firebase-admin";
import { Sale, Customer, CustomerContainerBalance } from "@/core/entities/CRM";
import { DispatchManifest } from "@/core/entities/Dispatch";
import { SaleFormValues } from "@/core/validations/crmSchemas";
import { adminDb } from "@/services/firebase/admin";
import { PaymentFormValues } from "@/core/validations/paymentSchema";

const SALES_COLLECTION = "sales";
const CUSTOMERS_COLLECTION = "customers";
const DISPATCH_COLLECTION = "dispatchManifests";
const PRODUCTS_COLLECTION = "products"; // <-- Nueva constante para Planta

export const salesRepository = {
  /**
   * Registra una venta atómica.
   * Dependiendo del saleType ("PLANT" o "ROUTE") actualizará el almacén central o la tolva del camión.
   */
  async registerSale(
    data: SaleFormValues,
    driverId: string,
    registeredBy: string,
  ): Promise<string> {
    return await adminDb.runTransaction(async (transaction) => {
      // 1. Definir Referencias Comunes
      const customerRef = adminDb
        .collection(CUSTOMERS_COLLECTION)
        .doc(data.customerId);
      const newSaleRef = adminDb.collection(SALES_COLLECTION).doc();

      // Referencia del Manifiesto (Solo si es venta en Ruta)
      let manifestRef;
      if (data.saleType === "ROUTE" && data.manifestId) {
        manifestRef = adminDb
          .collection(DISPATCH_COLLECTION)
          .doc(data.manifestId);
      }

      // 2. Lecturas Previas Obligatorias
      const customerDoc = await transaction.get(customerRef);
      if (!customerDoc.exists)
        throw new Error("Cliente no encontrado en el CRM.");
      const customer = customerDoc.data() as Customer;

      let manifest: any = null;
      if (data.saleType === "ROUTE" && manifestRef) {
        const manifestDoc = await transaction.get(manifestRef);
        if (!manifestDoc.exists)
          throw new Error("Manifiesto de ruta no encontrado.");
        manifest = manifestDoc.data();

        if (manifest.status !== "ON_ROUTE") {
          throw new Error(
            "Seguridad: No se pueden registrar ventas en una ruta que ya fue liquidada o cancelada.",
          );
        }
      }

      // 3. Calcular la nueva Cuenta Corriente de Envases del Cliente
      const currentBalances = customer.containerBalances || [];
      const balanceMap = new Map<string, number>();

      currentBalances.forEach((b) => balanceMap.set(b.productId, b.balance));
      // Sumar deuda por los bidones llenos entregados
      data.items.forEach((item) => {
        const current = balanceMap.get(item.productId) || 0;
        balanceMap.set(item.productId, current + item.quantity);
      });
      // Restar deuda por los vacíos devueltos
      data.returnedEmpties.forEach((empty) => {
        const current = balanceMap.get(empty.productId) || 0;
        balanceMap.set(empty.productId, current - empty.quantity);
      });

      const newContainerBalances: CustomerContainerBalance[] = Array.from(
        balanceMap.entries(),
      ).map(([productId, balance]) => ({ productId, balance }));

      // 4. Cálculos Financieros
      const totalAmount = data.items.reduce(
        (acc, item) => acc + item.quantity * item.unitPrice,
        0,
      );
      const totalPaid = data.cashReceived + data.digitalReceived;

      // Deuda que genera ESTA venta específica
      const newMoneyDebt =
        data.paymentMethod === "CREDIT"
          ? totalAmount
          : Math.max(0, totalAmount - totalPaid);

      const currentMoneyDebt = customer.debtAmount || 0;
      const updatedMoneyDebt = currentMoneyDebt + newMoneyDebt;

      // 4.5 Determinar el estado FIFO de este nuevo ticket
      const remainingBalance = newMoneyDebt;
      let paymentStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";

      if (remainingBalance === 0) {
        paymentStatus = "PAID";
      } else if (remainingBalance < totalAmount) {
        paymentStatus = "PARTIAL";
      } else {
        paymentStatus = "UNPAID";
      }

      // 5. Estructurar el documento de Venta (El Ticket)
      const saleDoc: Sale = {
        id: newSaleRef.id,
        manifestId:
          data.saleType === "PLANT" ? "PLANT_SALE" : data.manifestId || "",
        driverId: data.saleType === "PLANT" ? "ADMIN_WEB" : driverId,
        registeredBy: registeredBy,
        customerId: data.customerId,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })),
        returnedEmpties: data.returnedEmpties,
        totalAmount,
        paymentMethod: data.paymentMethod,
        cashReceived: data.cashReceived,
        digitalReceived: data.digitalReceived,
        notes: data.notes,
        status: "COMPLETED",
        paymentStatus: paymentStatus, // <--- NUEVO CAMPO AÑADIDO
        remainingBalance: remainingBalance, // <--- NUEVO CAMPO AÑADIDO
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      // 6. ESCRITURAS SIMULTÁNEAS (Si una falla, todo se revierte)

      // A) Guardar el Ticket de Venta
      transaction.set(newSaleRef, saleDoc);

      // B) Actualizar Cliente (Deudas de envases, deudas de dinero y última compra)
      transaction.update(customerRef, {
        containerBalances: newContainerBalances,
        debtAmount: updatedMoneyDebt,
        lastSaleDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // C) ACTUALIZAR INVENTARIOS SEGÚN EL TIPO DE VENTA
      if (data.saleType === "ROUTE" && manifestRef && manifest) {
        // VENTA EN RUTA: Actualizar el camión
        const updatedItems = (manifest.items || []).map((mItem: any) => {
          const soldItem = data.items.find(
            (i) => i.productId === mItem.productId,
          );
          if (soldItem) {
            return {
              ...mItem,
              quantitySold: (mItem.quantitySold || 0) + soldItem.quantity,
            };
          }
          return mItem;
        });

        const updatedEmpties = [...(manifest.emptiesReturned || [])];
        data.returnedEmpties.forEach((empty) => {
          const existing = updatedEmpties.find(
            (e: any) => e.productId === empty.productId,
          );
          if (existing) {
            existing.quantity += empty.quantity;
          } else {
            updatedEmpties.push(empty);
          }
        });

        transaction.update(manifestRef, {
          cashExpected: (manifest.cashExpected || 0) + data.cashReceived,
          digitalPaymentsExpected:
            (manifest.digitalPaymentsExpected || 0) + data.digitalReceived,
          items: updatedItems,
          emptiesReturned: updatedEmpties,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (data.saleType === "PLANT") {
        // VENTA EN PLANTA: Actualizar el almacén central (Descontar llenos, aumentar vacíos)
        data.items.forEach((item) => {
          const productRef = adminDb
            .collection(PRODUCTS_COLLECTION)
            .doc(item.productId);
          transaction.update(productRef, {
            stockFilled: admin.firestore.FieldValue.increment(-item.quantity),
          });
        });

        data.returnedEmpties.forEach((empty) => {
          const productRef = adminDb
            .collection(PRODUCTS_COLLECTION)
            .doc(empty.productId);
          transaction.update(productRef, {
            stockEmpty: admin.firestore.FieldValue.increment(empty.quantity),
          });
        });
      }

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
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as any;
    });
  },

  /**
   * Obtiene ventas paginadas desde el servidor (Escalable a 10,000+ registros)
   */
  async getPaginatedSales(
    limitCount: number,
    lastCreatedAtIso?: string,
    paymentFilter?: string,
  ): Promise<Sale[]> {
    let query: admin.firestore.Query = adminDb.collection(SALES_COLLECTION);

    // 1. Aplicar Filtro Nativo (Requiere Índice Compuesto en Firebase)
    if (paymentFilter && paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", paymentFilter);
    }

    // 2. Ordenamiento obligatorio para los cursores
    query = query.orderBy("createdAt", "desc").limit(limitCount);

    // 3. Lógica del Cursor (startAfter)
    if (lastCreatedAtIso) {
      const lastDate = new Date(lastCreatedAtIso);
      const lastTimestamp = admin.firestore.Timestamp.fromDate(lastDate);
      query = query.startAfter(lastTimestamp);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as any;
    });
  },

  async registerPayment(data: any): Promise<void> {
    return await adminDb.runTransaction(async (transaction) => {
      const customerRef = adminDb.collection("customers").doc(data.customerId);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists) throw new Error("Cliente no encontrado");

      // 1. Traer tickets con saldo pendiente (FIFO)
      const pendingQuery = adminDb
        .collection(SALES_COLLECTION)
        .where("customerId", "==", data.customerId)
        .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
        .orderBy("createdAt", "asc");

      const pendingSnap = await transaction.get(pendingQuery);

      let amountToDistribute = data.amount;

      // ESTA ES LA MEMORIA: Guardará [{ saleId: "...", amount: 50 }, ...]
      const appliedTo: { saleId: string; amountApplied: number }[] = [];

      // 2. Algoritmo de distribución FIFO con Memoria
      for (const doc of pendingSnap.docs) {
        if (amountToDistribute <= 0) break;

        const sale = doc.data();
        const currentBalance = sale.remainingBalance ?? sale.totalAmount;
        let appliedInThisTicket = 0;

        if (amountToDistribute >= currentBalance) {
          // Se liquida el ticket completo
          appliedInThisTicket = currentBalance;
          amountToDistribute -= currentBalance;

          transaction.update(doc.ref, {
            remainingBalance: 0,
            paymentStatus: "PAID",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Se abona parcialmente y se acaba el dinero del pago
          appliedInThisTicket = amountToDistribute;
          const newBalance = currentBalance - amountToDistribute;
          amountToDistribute = 0;

          transaction.update(doc.ref, {
            remainingBalance: newBalance,
            paymentStatus: "PARTIAL",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Guardamos en la memoria qué ticket tocamos y con cuánto
        appliedTo.push({
          saleId: doc.id,
          amountApplied: appliedInThisTicket,
        });
      }

      // 3. Actualizar Deuda Global del Cliente
      transaction.update(customerRef, {
        debtAmount: admin.firestore.FieldValue.increment(-data.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Registrar el Comprobante de Pago con su "Memoria"
      const paymentRef = adminDb.collection("debtPayments").doc();
      transaction.set(paymentRef, {
        ...data,
        appliedTo: appliedTo, // <--- ¡AQUÍ ESTÁ LA CLAVE PARA ANULACIONES!
        status: "ACTIVE", // Un pago nace activo
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        receivedById: data.receivedById || "ADMIN_DIRECT_PAYMENT",
      });
    });
  },

  /**
   * Obtiene solo los tickets con saldo pendiente de un cliente (Orden FIFO)
   */
  async getPendingSalesByCustomer(customerId: string): Promise<Sale[]> {
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("customerId", "==", customerId)
      .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
      .orderBy("createdAt", "asc") // FIFO: El más antiguo primero
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Serializamos AMBOS timestamps a formato texto (ISO)
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as any;
    });
  },

  /**
   * Obtiene el historial de abonos de deuda de un cliente.
   */
  async getCustomerPaymentHistory(customerId: string): Promise<any[]> {
    const snapshot = await adminDb
      .collection("debtPayments")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convertimos TODOS los posibles Timestamps de Firebase a Strings ISO
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null, // <--- ESTA LÍNEA FALTABA
      };
    });
  },

  /**
   * Anula un pago, revirtiendo el saldo a los tickets afectados (FIFO) y al cliente.
   * Cumple con la regla estricta de Firestore: Leer todo primero, Escribir después.
   */
  async cancelPayment(
    paymentId: string,
    cancelledByUid: string,
  ): Promise<void> {
    return await adminDb.runTransaction(async (transaction) => {
      // ==========================================
      // 1. FASE DE LECTURAS (READS)
      // ==========================================
      const paymentRef = adminDb.collection("debtPayments").doc(paymentId);
      const paymentDoc = await transaction.get(paymentRef);

      if (!paymentDoc.exists)
        throw new Error("El comprobante de pago no existe.");

      const payment = paymentDoc.data() as any;

      if (payment.status === "CANCELLED") {
        throw new Error("Este pago ya fue anulado previamente.");
      }

      // Preparamos las referencias de todos los tickets que debemos leer
      const appliedTo = payment.appliedTo || [];
      const saleRefs = appliedTo.map((item: any) =>
        adminDb.collection(SALES_COLLECTION).doc(item.saleId),
      );

      // Leemos TODOS los tickets de un solo golpe usando getAll (Mucho más rápido y seguro)
      const saleDocs =
        saleRefs.length > 0 ? await transaction.getAll(...saleRefs) : [];

      // ==========================================
      // 2. FASE DE ESCRITURAS (WRITES)
      // ==========================================

      // A) Devolver el dinero a la deuda global del cliente
      const customerRef = adminDb
        .collection("customers")
        .doc(payment.customerId);
      transaction.update(customerRef, {
        debtAmount: admin.firestore.FieldValue.increment(payment.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // B) Revertir los tickets individuales en base a los documentos leídos
      appliedTo.forEach((item: any, index: number) => {
        const saleDoc = saleDocs[index];

        if (saleDoc && saleDoc.exists) {
          const saleData = saleDoc.data() as any;

          // Le devolvemos el saldo que este pago le había quitado
          const newBalance =
            (saleData.remainingBalance || 0) + item.amountApplied;

          // Recalculamos el estado
          const newStatus =
            newBalance >= saleData.totalAmount ? "UNPAID" : "PARTIAL";

          transaction.update(saleDoc.ref, {
            remainingBalance: newBalance,
            paymentStatus: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      // C) Marcar el comprobante como anulado para auditoría
      transaction.update(paymentRef, {
        status: "CANCELLED",
        cancelledBy: cancelledByUid,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },
};
