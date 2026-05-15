// src/app/(admin)/sales/actions.ts
"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/services/firebase/admin";
import { salesRepository } from "@/services/repositories/salesRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { saleSchema, SaleFormValues } from "@/core/validations/crmSchemas";
import { revalidatePath } from "next/cache";

export async function registerSaleAction(data: SaleFormValues) {
  try {
    // 1. Validar estrictamente los datos con Zod
    const parsedData = saleSchema.parse(data);

    // 2. OBTENER EL USUARIO REAL (Auditoría)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("yacco_session")?.value;

    if (!sessionCookie) {
      throw new Error(
        "No hay una sesión activa. Por favor, vuelva a iniciar sesión.",
      );
    }

    // Decodificamos la cookie usando tu adminAuth para obtener el UID real del admin
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true,
    );
    const registeredByUid = decodedClaims.uid;

    // 3. DETERMINAR EL CHOFER (Dueño del inventario y del dinero)
    let actualDriverId = "ADMIN_PLANT"; // Por defecto, la plata va a la caja de la planta

    if (parsedData.saleType === "ROUTE" && parsedData.manifestId) {
      // Si eligieron "Camión en Ruta", el dinero y el stock le pertenecen al chofer
      const manifest = await dispatchRepository.getManifestById(
        parsedData.manifestId,
      );

      if (!manifest) {
        throw new Error(
          "El manifiesto seleccionado no existe o fue eliminado.",
        );
      }

      actualDriverId = manifest.driverId;
    }

    // 4. Ejecutar la transacción maestra
    // NOTA: Asegúrate de que en tu salesRepository.ts, al crear el 'saleDoc',
    // le agregues el campo: registeredBy: registeredByUid
    const saleId = await salesRepository.registerSale(
      parsedData,
      actualDriverId, // Se guarda como driverId
      registeredByUid,
    );

    // 5. Limpiar caché de las vistas afectadas
    revalidatePath("/customers");
    revalidatePath(`/customers/${data.customerId}`);
    if (data.manifestId) revalidatePath(`/dispatch/${data.manifestId}`);
    revalidatePath("/dispatch");
    revalidatePath("/sales");

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
    return { success: true, sales };
  } catch (error: any) {
    console.error("Error en paginación de ventas:", error);
    return { success: false, error: error.message };
  }
}
