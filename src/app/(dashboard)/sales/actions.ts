// src/app/(admin)/sales/actions.ts
"use server";

import { cookies } from "next/headers";
// Asegúrate de exportar adminDb desde este archivo junto con adminAuth
import { adminAuth, adminDb } from "@/services/firebase/admin";
import * as admin from "firebase-admin";
import { salesRepository } from "@/services/repositories/salesRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { saleSchema, SaleFormValues } from "@/core/validations/crmSchemas";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/services/firebase/auth";

export async function registerSaleAction(
  data: SaleFormValues & { linkedOrderId?: string },
) {
  try {
    const parsedData = saleSchema.parse(data);

    // Auditoría de Usuario
    const session = await getUserSession();
    if (!session) {
      throw new Error("No hay una sesión activa. Vuelva a iniciar sesión.");
    }
    const registeredByUid = session.uid;

    // Asignación de caja e inventario (Chofer o Planta)
    let actualDriverId = "ADMIN_PLANT";
    if (parsedData.saleType === "ROUTE" && parsedData.manifestId) {
      const manifest = await dispatchRepository.getDispatchById(
        parsedData.manifestId,
      );
      if (!manifest) throw new Error("El manifiesto seleccionado no existe.");
      actualDriverId = manifest.driverId;
    }

    // Calculamos el total exacto de los items reales
    const calculatedTotalAmount = parsedData.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    // Invocamos el repositorio maestro para inyectar el total y guardar la venta
    const saleId = await salesRepository.registerSale(
      {
        ...parsedData,
        totalAmount: calculatedTotalAmount,
      } as any,
      actualDriverId,
      registeredByUid,
    );

    // 🔥 VÍNCULO LOGÍSTICO: Si nació de un pedido, cerramos su estado atómicamente
    if (data.linkedOrderId) {
      await adminDb.collection("orders").doc(data.linkedOrderId).update({
        status: "DELIVERED",
        saleId: saleId,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // COLA AUTOMÁTICA DE SUNAT (Si se marcó la casilla de emisión de boleta/factura)
    if (parsedData.requiresBilling) {
      await adminDb.collection("sunatQueue").add({
        referenceId: saleId,
        referenceType: "SALE",
        status: "PENDING",
        requiresBilling: true,
        requiresGuide: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Sincronización y purga de cachés de Next.js
    revalidatePath("/orders");
    revalidatePath("/sales");
    revalidatePath("/customers");
    if (parsedData.manifestId)
      revalidatePath(`/dispatch/${parsedData.manifestId}`);

    return { success: true, saleId };
  } catch (error: any) {
    console.error("Error al registrar venta:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchPaginatedSalesAction(
  limitCount: number,
  lastCreatedAtIso?: string,
  paymentFilter?: string,
) {
  try {
    const paginatedResult = await salesRepository.listPaginated({
      pageSize: limitCount,
      cursor: lastCreatedAtIso,
      paymentFilter: paymentFilter,
    });

    const sales = paginatedResult.items;

    const customerIds = Array.from(
      new Set(sales.map((s: any) => s.customerId).filter(Boolean)),
    ) as string[];

    const customersData =
      customerIds.length > 0
        ? await customerRepository.getCustomersByIds(customerIds)
        : {};

    return {
      success: true,
      sales,
      customersData,
      nextCursor: paginatedResult.nextCursor,
      hasMore: paginatedResult.hasMore,
    };
  } catch (error: any) {
    console.error("Error en paginación de ventas:", error);
    return { success: false, error: error.message };
  }
}

export async function cancelSaleAction(
  saleId: string,
  reason: string,
  confirmPostLiquidation = false
) {
  try {
    const session = await getUserSession();
    if (!session) {
      return { success: false, error: "Sesión inválida. Vuelva a iniciar sesión." };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: "El motivo de la anulación es obligatorio." };
    }

    // 1. Leer Venta para saber el estado del manifiesto
    const saleDocRef = adminDb.collection("sales").doc(saleId);
    const saleDoc = await saleDocRef.get();
    if (!saleDoc.exists) {
      return { success: false, error: "La venta no existe." };
    }
    const saleData = saleDoc.data() as any;

    let manifestLiquidated = false;
    if (saleData.manifestId && saleData.manifestId !== "PLANT_SALE") {
      const manifestDoc = await adminDb.collection("dispatchManifests").doc(saleData.manifestId).get();
      if (manifestDoc.exists && manifestDoc.data()?.status === "LIQUIDATED") {
        manifestLiquidated = true;
      }
    }

    // 2. Control de Acceso Basado en Roles (RBAC)
    const canCancelNormal = session.roles.some((r: string) => ["ADMIN", "SALES", "DRIVER"].includes(r));
    const isAdmin = session.roles.includes("ADMIN");

    if (manifestLiquidated) {
      if (!isAdmin) {
        return { 
          success: false, 
          error: "Solo un administrador puede anular ventas de un manifiesto liquidado." 
        };
      }
    } else {
      if (!canCancelNormal) {
        return { 
          success: false, 
          error: "No tiene permisos para anular ventas." 
        };
      }
    }

    if (saleData.status === "CANCELLED") {
      return { success: false, error: "Esta venta ya ha sido anulada previamente." };
    }

    if (saleData.isBilled === true || saleData.sunatDocumentId) {
      return {
        success: false,
        error: "Venta facturada con SUNAT, requiere nota de crédito (Fase B). No se puede anular.",
      };
    }

    const queueSnap = await adminDb
      .collection("sunatQueue")
      .where("referenceId", "==", saleId)
      .where("referenceType", "==", "SALE")
      .get();
    if (!queueSnap.empty) {
      return {
        success: false,
        error: "Facturación en cola/proceso de envío a SUNAT. Espere a que termine.",
      };
    }

    const paymentsSnap = await adminDb
      .collection("debtPayments")
      .where("customerId", "==", saleData.customerId)
      .where("status", "==", "ACTIVE")
      .get();

    const hasAppliedPayments = paymentsSnap.docs.some((doc) => {
      const payment = doc.data();
      return (payment.appliedTo || []).some((app: any) => app.saleId === saleId);
    });

    if (hasAppliedPayments) {
      return {
        success: false,
        error: "La venta tiene pagos aplicados, anule primero los pagos.",
      };
    }

    await salesRepository.cancelSale(
      saleId,
      session.uid,
      reason.trim(),
      confirmPostLiquidation
    );

    revalidatePath("/sales");
    if (saleData.linkedOrderId) {
      revalidatePath("/orders");
    }
    if (saleData.manifestId && saleData.manifestId !== "PLANT_SALE") {
      revalidatePath(`/dispatch/${saleData.manifestId}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error al anular venta:", error);
    return { success: false, error: error.message || "Error al anular la venta." };
  }
}
