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

export async function registerSaleAction(
  data: SaleFormValues & { linkedOrderId?: string },
) {
  try {
    const parsedData = saleSchema.parse(data);

    // Auditoría de Usuario
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("yacco_session")?.value;
    if (!sessionCookie)
      throw new Error("No hay una sesión activa. Vuelva a iniciar sesión.");

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true,
    );
    const registeredByUid = decodedClaims.uid;

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
    const sales = await salesRepository.getPaginatedSales(
      limitCount,
      lastCreatedAtIso,
      paymentFilter,
    );

    const customerIds = Array.from(
      new Set(sales.map((s: any) => s.customerId).filter(Boolean)),
    ) as string[];

    const customersData =
      customerIds.length > 0
        ? await customerRepository.getCustomersByIds(customerIds)
        : {};

    return { success: true, sales, customersData };
  } catch (error: any) {
    console.error("Error en paginación de ventas:", error);
    return { success: false, error: error.message };
  }
}
