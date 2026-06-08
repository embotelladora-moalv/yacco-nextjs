"use server";

import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import {
  dispatchManifestSchema,
  DispatchManifestFormValues,
  LiquidationManifestFormValues,
  liquidationManifestSchema,
  AdvancedPitStopFormValues,
  advancedPitStopSchema,
} from "@/core/validations/dispatchSchemas";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/services/firebase/auth";
import { parsePeruDatetimeLocal } from "@/core/utils/dateUtils";

// =========================================================================
// 1. IMPORTA AQUÍ TU SISTEMA DE AUTENTICACIÓN
// =========================================================================
// Si usas NextAuth:  import { getServerSession } from "next-auth/next";
// Si usas Clerk:     import { auth } from "@clerk/nextjs/server";
// Si usas Firebase:  import { cookies } from "next/headers"; import { adminAuth } from "@/services/firebase/admin";

export async function createDispatchAction(data: DispatchManifestFormValues) {
  try {
    const session = await getUserSession();
    if (!session) {
      return { success: false, error: "Sesión inválida. Vuelve a iniciar sesión." };
    }
    const dispatcherId = session.uid;
    const parsed = dispatchManifestSchema.parse(data);

    const manifestId = await dispatchRepository.createDispatch(
      parsed.driverId,
      dispatcherId, // <-- AQUÍ YA SE ENVÍA EL ID REAL DEL ALMACENERO
      parsed.truckPlate,
      parsed.items,
      parsed.notes,
      parsed.assistantId,
      parsed.initialPettyCash,
    );

    revalidatePath("/dispatch");
    revalidatePath("/inventory");

    return { success: true, manifestId };
  } catch (error: any) {
    console.error("Error en Despacho:", error);
    return { success: false, error: error.message };
  }
}

export async function liquidateDispatchAction(
  manifestId: string,
  data: LiquidationManifestFormValues,
) {
  try {
    const session = await getUserSession();
    if (!session) {
      return { success: false, error: "Sesión inválida. Vuelve a iniciar sesión." };
    }
    const parsed = liquidationManifestSchema.parse(data);

    // 1. Cargar el manifiesto para validaciones de negocio
    const manifest = await dispatchRepository.getManifestById(manifestId);
    if (!manifest) {
      return { success: false, error: "Manifiesto no encontrado" };
    }

    // 2. Seguridad: Doble liquidación
    if (manifest.status === "LIQUIDATED") {
      return { success: false, error: "Este despacho ya fue liquidado" };
    }

    // 3. Validar rango de fecha (interpretar como hora Perú)
    const liquidationDate = parsePeruDatetimeLocal(parsed.liquidationDate);
    const now = new Date(); // Instante real UTC
    
    // El dispatchDate viene como objeto Date (ya serializado)
    const dispatchDate = new Date(manifest.dispatchDate);

    if (liquidationDate < dispatchDate) {
      return { success: false, error: "La fecha de cierre no puede ser anterior a la apertura" };
    }
    
    // Margen de 5 min por si hay desfase de relojes en el cliente
    const fiveMinutes = 5 * 60 * 1000;
    if (liquidationDate.getTime() > now.getTime() + fiveMinutes) {
      return { success: false, error: "La fecha de cierre no puede ser futura" };
    }

    await dispatchRepository.liquidateDispatch(
      manifestId, 
      {
        ...parsed,
        liquidationDate // Pasamos el objeto Date
      }, 
      session.uid
    );

    revalidatePath("/dispatch");
    revalidatePath("/inventory");

    return { success: true };
  } catch (error: any) {
    console.error("Error al liquidar:", error);
    return { success: false, error: error.message };
  }
}

export async function advancedReloadDispatchAction(
  manifestId: string,
  data: AdvancedPitStopFormValues,
) {
  try {
    const session = await getUserSession();
    if (!session) {
      return { success: false, error: "Sesión inválida. Vuelve a iniciar sesión." };
    }
    // 1. Validación estricta con Zod
    const parsedData = advancedPitStopSchema.parse(data);

    // 2. Ejecutar lógica transaccional del Pit Stop
    await dispatchRepository.advancedReloadDispatch(manifestId, parsedData, session.uid);

    // 3. Limpiar caché para refrescar la interfaz
    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);
    revalidatePath(`/dispatch/${manifestId}/pit-stop`);

    return { success: true };
  } catch (error: any) {
    console.error("Error en Pit Stop Avanzado:", error);
    return { success: false, error: error.message };
  }
}
