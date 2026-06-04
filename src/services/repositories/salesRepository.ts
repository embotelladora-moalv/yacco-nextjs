import admin from "firebase-admin";
import { Sale, Customer, CustomerContainerBalance } from "@/core/entities/CRM";
import { DispatchManifest } from "@/core/entities/Dispatch";
import { SaleFormValues } from "@/core/validations/crmSchemas";
import { adminDb } from "@/services/firebase/admin";
import { PaymentFormValues } from "@/core/validations/paymentSchema";
import { serializeFirestoreData } from "@/services/firebase/serialization";
import { paginate } from "./_pagination";

const SALES_COLLECTION = "sales";
const CUSTOMERS_COLLECTION = "customers";
const DISPATCH_COLLECTION = "dispatchManifests";
const PRODUCTS_COLLECTION = "products";

export const salesRepository = {
  /**
   * Registra una venta atómica.
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
      data.items.forEach((item) => {
        const current = balanceMap.get(item.productId) || 0;
        balanceMap.set(item.productId, current + item.quantity);
      });
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

      const newMoneyDebt =
        data.paymentMethod === "CREDIT"
          ? totalAmount
          : Math.max(0, totalAmount - totalPaid);

      const currentMoneyDebt = customer.debtAmount || 0;
      const updatedMoneyDebt = currentMoneyDebt + newMoneyDebt;

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
      const saleDoc: any = {
        id: newSaleRef.id,
        manifestId:
          data.saleType === "PLANT" ? "PLANT_SALE" : data.manifestId || "",
        driverId: data.saleType === "PLANT" ? "ADMIN_WEB" : driverId,
        registeredBy: registeredBy,
        customerId: data.customerId,
        customerName: customer.name || "Cliente Desconocido",
        customerAlias: customer.alias || "",
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
        paymentStatus: paymentStatus,
        remainingBalance: remainingBalance,

        // 🔥 CORRECCIÓN CRÍTICA: Guardamos correctamente los flags de SUNAT
        isBilled: false,
        sunatDocumentId: null,
        billingSkipped: data.requiresBilling === false, // Si no pide factura, se salta la facturación

        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      // 6. ESCRITURAS SIMULTÁNEAS
      transaction.set(newSaleRef, saleDoc);

      transaction.update(customerRef, {
        containerBalances: newContainerBalances,
        debtAmount: updatedMoneyDebt,
        lastSaleDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // C) ACTUALIZAR INVENTARIOS SEGÚN EL TIPO DE VENTA
      if (data.saleType === "ROUTE" && manifestRef && manifest) {
        // VENTA EN RUTA: Actualizar los Llenos vendidos en el camión
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

        // 🔥 CORRECCIÓN CLAVE:
        // Hemos eliminado el bloque que sumaba los `returnedEmpties` al manifiesto.
        // La venta en ruta NO debe registrar los vacíos en el manifiesto todavía,
        // ya que el chofer los tiene en el camión. Solo se guardan en el ticket de venta.
        // El manifiesto se actualizará recién cuando el chofer los descargue en el Pit Stop o Liquidación.

        transaction.update(manifestRef, {
          cashExpected: (manifest.cashExpected || 0) + data.cashReceived,
          digitalPaymentsExpected:
            (manifest.digitalPaymentsExpected || 0) + data.digitalReceived,
          items: updatedItems,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (data.saleType === "PLANT") {
        // VENTA EN PLANTA: Actualizar el almacén central directo (Descontar llenos, aumentar vacíos)
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

  async getRecentSales(limitCount = 100): Promise<Sale[]> {
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async getPaginatedSales(
    limitCount: number,
    lastCreatedAtIso?: string,
    paymentFilter?: string,
  ): Promise<Sale[]> {
    let query: admin.firestore.Query = adminDb.collection(SALES_COLLECTION);

    if (paymentFilter && paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", paymentFilter);
    }

    query = query.orderBy("createdAt", "desc").limit(limitCount);

    if (lastCreatedAtIso) {
      const lastDate = new Date(lastCreatedAtIso);
      const lastTimestamp = admin.firestore.Timestamp.fromDate(lastDate);
      query = query.startAfter(lastTimestamp);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async registerPayment(data: any): Promise<void> {
    return await adminDb.runTransaction(async (transaction) => {
      const customerRef = adminDb.collection("customers").doc(data.customerId);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists) throw new Error("Cliente no encontrado");

      const pendingQuery = adminDb
        .collection(SALES_COLLECTION)
        .where("customerId", "==", data.customerId)
        .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
        .orderBy("createdAt", "asc");

      const pendingSnap = await transaction.get(pendingQuery);

      let amountToDistribute = data.amount;
      const appliedTo: { saleId: string; amountApplied: number }[] = [];

      for (const doc of pendingSnap.docs) {
        if (amountToDistribute <= 0) break;

        const sale = doc.data();
        const currentBalance = sale.remainingBalance ?? sale.totalAmount;
        let appliedInThisTicket = 0;

        if (amountToDistribute >= currentBalance) {
          appliedInThisTicket = currentBalance;
          amountToDistribute -= currentBalance;

          transaction.update(doc.ref, {
            remainingBalance: 0,
            paymentStatus: "PAID",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          appliedInThisTicket = amountToDistribute;
          const newBalance = currentBalance - amountToDistribute;
          amountToDistribute = 0;

          transaction.update(doc.ref, {
            remainingBalance: newBalance,
            paymentStatus: "PARTIAL",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        appliedTo.push({
          saleId: doc.id,
          amountApplied: appliedInThisTicket,
        });
      }

      transaction.update(customerRef, {
        debtAmount: admin.firestore.FieldValue.increment(-data.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const paymentRef = adminDb.collection("debtPayments").doc();
      transaction.set(paymentRef, {
        ...data,
        appliedTo: appliedTo,
        status: "ACTIVE",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        receivedById: data.receivedById || "ADMIN_DIRECT_PAYMENT",
      });
    });
  },

  async getPendingSalesByCustomer(customerId: string): Promise<Sale[]> {
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("customerId", "==", customerId)
      .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        ...doc.data(),
        id: doc.id,
      });
    });
  },

  async getCustomerPaymentHistory(customerId: string): Promise<any[]> {
    const snapshot = await adminDb
      .collection("debtPayments")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      return serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      });
    });
  },

  async cancelPayment(
    paymentId: string,
    cancelledByUid: string,
  ): Promise<void> {
    return await adminDb.runTransaction(async (transaction) => {
      const paymentRef = adminDb.collection("debtPayments").doc(paymentId);
      const paymentDoc = await transaction.get(paymentRef);

      if (!paymentDoc.exists)
        throw new Error("El comprobante de pago no existe.");

      const payment = paymentDoc.data() as any;

      if (payment.status === "CANCELLED") {
        throw new Error("Este pago ya fue anulado previamente.");
      }

      const appliedTo = payment.appliedTo || [];
      const saleRefs = appliedTo.map((item: any) =>
        adminDb.collection(SALES_COLLECTION).doc(item.saleId),
      );

      const saleDocs =
        saleRefs.length > 0 ? await transaction.getAll(...saleRefs) : [];

      const customerRef = adminDb
        .collection("customers")
        .doc(payment.customerId);
      transaction.update(customerRef, {
        debtAmount: admin.firestore.FieldValue.increment(payment.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      appliedTo.forEach((item: any, index: number) => {
        const saleDoc = saleDocs[index];

        if (saleDoc && saleDoc.exists) {
          const saleData = saleDoc.data() as any;
          const newBalance =
            (saleData.remainingBalance || 0) + item.amountApplied;
          const newStatus =
            newBalance >= saleData.totalAmount ? "UNPAID" : "PARTIAL";

          transaction.update(saleDoc.ref, {
            remainingBalance: newBalance,
            paymentStatus: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      transaction.update(paymentRef, {
        status: "CANCELLED",
        cancelledBy: cancelledByUid,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },

  // 🔥 CORRECCIÓN CRÍTICA: Filtrado en memoria para evitar errores de índice en Firebase
  async getUnbilledSales() {
    // 1. Buscamos solo por isBilled para no forzar la creación de un Índice Compuesto
    const snapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("isBilled", "==", false)
      .get();

    // 2. Mapeamos TODA la data (incluyendo items) y serializamos fechas.
    const pendingSales = snapshot.docs.map((doc) => {
      const data = doc.data();
      const serialized = serializeFirestoreData({
        ...data,
        id: doc.id,
      });

      return {
        ...serialized,
        customerId: (data.customerId ?? "") as string,
        totalAmount: (data.totalAmount ?? 0) as number,
        issueDate: data.createdAt?.toDate
          ? data.createdAt.toDate().toLocaleDateString("es-PE")
          : "Sin fecha",
      };
    });

    // 3. Filtramos en memoria los que "saltaron" facturación y ordenamos por fecha descendente
    return pendingSales
      .filter((sale: any) => sale.billingSkipped !== true)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Descendente (los más nuevos primero)
      });
  },

  async getSaleDetailFull(saleId: string) {
    const saleDoc = await adminDb
      .collection(SALES_COLLECTION)
      .doc(saleId)
      .get();
    if (!saleDoc.exists) return null;
    const saleData: any = { id: saleDoc.id, ...saleDoc.data() };

    const customerDoc = await adminDb
      .collection("customers")
      .doc(saleData.customerId)
      .get();
    const customerData: any = customerDoc.exists
      ? { id: customerDoc.id, ...customerDoc.data() }
      : null;

    let sunatData: any = null;
    if (saleData.sunatDocumentId) {
      const sunatDoc = await adminDb
        .collection("sunatDocuments")
        .doc(saleData.sunatDocumentId)
        .get();
      if (sunatDoc.exists) sunatData = { id: sunatDoc.id, ...sunatDoc.data() };
    }

    let greData: any = null;
    const greSnapshot = await adminDb
      .collection("sunatDocuments")
      .where("saleId", "==", saleId)
      .where("type", "==", "09")
      .limit(1)
      .get();

    if (!greSnapshot.empty) {
      greData = { id: greSnapshot.docs[0].id, ...greSnapshot.docs[0].data() };
    }

    const trucksSnapshot = await adminDb.collection("trucks").get();
    const trucks = trucksSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const usersSnapshot = await adminDb.collection("users").get();
    const drivers = usersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return serializeFirestoreData({
      saleData,
      customerData,
      sunatData,
      greData,
      trucks,
      drivers,
    });
  },

  async listPaginated(options: {
    pageSize: number;
    cursor?: string;
    paymentFilter?: string;
    customerId?: string;
    isBilled?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    let query: admin.firestore.Query = adminDb.collection(SALES_COLLECTION);

    if (options.paymentFilter && options.paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", options.paymentFilter);
    }
    if (options.customerId) {
      query = query.where("customerId", "==", options.customerId);
    }
    if (options.isBilled !== undefined) {
      query = query.where("isBilled", "==", options.isBilled);
    }
    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.startDate));
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.endDate));
      query = query.where("createdAt", "<=", endTimestamp);
    }

    query = query
      .select(
        "id",
        "createdAt",
        "customerId",
        "customerName",
        "customerAlias",
        "paymentMethod",
        "totalAmount",
        "cashReceived",
        "digitalReceived",
        "remainingBalance",
        "isBilled",
        "sunatDocumentId",
        "items",
        "billingSkipped"
      )
      .orderBy("createdAt", "desc")
      .orderBy("__name__", "desc");

    return await paginate<Sale>(
      query,
      options,
      ["createdAt", "id"],
      (doc) => {
        const data = doc.data();
        return serializeFirestoreData({
          id: doc.id,
          ...data,
          items: data.items || [],
        }) as Sale;
      }
    );
  },

  async getSalesMetrics(options: {
    paymentFilter?: string;
    customerId?: string;
    isBilled?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    let query: admin.firestore.Query = adminDb.collection(SALES_COLLECTION);

    if (options.paymentFilter && options.paymentFilter !== "ALL") {
      query = query.where("paymentMethod", "==", options.paymentFilter);
    }
    if (options.customerId) {
      query = query.where("customerId", "==", options.customerId);
    }
    if (options.isBilled !== undefined) {
      query = query.where("isBilled", "==", options.isBilled);
    }
    if (options.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.startDate));
      query = query.where("createdAt", ">=", startTimestamp);
    }
    if (options.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(options.endDate));
      query = query.where("createdAt", "<=", endTimestamp);
    }

    let totalRevenue = 0;
    let totalCash = 0;
    let totalDigital = 0;

    try {
      const aggSnapshot = await query.aggregate({
        totalRevenue: admin.firestore.AggregateField.sum("totalAmount"),
        totalCash: admin.firestore.AggregateField.sum("cashReceived"),
        totalDigital: admin.firestore.AggregateField.sum("digitalReceived"),
      }).get();

      const aggData = aggSnapshot.data();
      totalRevenue = aggData.totalRevenue || 0;
      totalCash = aggData.totalCash || 0;
      totalDigital = aggData.totalDigital || 0;
    } catch (err) {
      console.error("Error in getSalesMetrics aggregate sum, fallback to 0:", err);
    }

    return {
      totalRevenue,
      totalCash,
      totalDigital,
    };
  },

  async getSalesCountThisMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfMonth);
    const countSnapshot = await adminDb
      .collection(SALES_COLLECTION)
      .where("createdAt", ">=", startTimestamp)
      .count()
      .get();
    return countSnapshot.data().count;
  },
};
