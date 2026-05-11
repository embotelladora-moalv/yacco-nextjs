// src/app/(dashboard)/dispatch/actions.ts

"use server";

import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import {
  dispatchManifestSchema,
  DispatchManifestFormValues,
  LiquidationManifestFormValues,
  liquidationManifestSchema,
  ReloadManifestFormValues,
  reloadManifestSchema,
} from "@/core/validations/dispatchSchemas";
import { revalidatePath } from "next/cache";

// =========================================================================
// 1. IMPORTA AQUÍ TU SISTEMA DE AUTENTICACIÓN
// =========================================================================
// Si usas NextAuth:  import { getServerSession } from "next-auth/next";
// Si usas Clerk:     import { auth } from "@clerk/nextjs/server";
// Si usas Firebase:  import { cookies } from "next/headers"; import { adminAuth } from "@/services/firebase/admin";

export async function createDispatchAction(data: DispatchManifestFormValues) {
  try {
    const parsed = dispatchManifestSchema.parse(data);

    // =========================================================================
    // 2. OBTENER EL USUARIO REAL DE LA SESIÓN
    // =========================================================================
    let dispatcherId = "ADMIN_ID"; // Fallback por defecto si algo falla

    // OPCIÓN A: Si usas NextAuth
    // const session = await getServerSession();
    // if (!session?.user?.id) throw new Error("No autorizado");
    // dispatcherId = session.user.id;

    // OPCIÓN B: Si usas Clerk
    // const { userId } = auth();
    // if (!userId) throw new Error("No autorizado");
    // dispatcherId = userId;

    // OPCIÓN C: Si usas Firebase Auth (Verificando Cookies de Sesión)
    // const sessionCookie = cookies().get('session')?.value;
    // if (!sessionCookie) throw new Error("No autorizado");
    // const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    // dispatcherId = decodedClaims.uid;

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
    const parsed = liquidationManifestSchema.parse(data);

    await dispatchRepository.liquidateDispatch(manifestId, parsed);

    revalidatePath("/dispatch");
    revalidatePath("/inventory");

    return { success: true };
  } catch (error: any) {
    console.error("Error al liquidar:", error);
    return { success: false, error: error.message };
  }
}

export async function reloadDispatchAction(
  manifestId: string,
  data: ReloadManifestFormValues,
) {
  try {
    const parsed = reloadManifestSchema.parse(data);
    await dispatchRepository.reloadDispatch(manifestId, parsed);

    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);
    revalidatePath("/inventory");

    return { success: true };
  } catch (error: any) {
    console.error("Error en Parada en Pits:", error);
    return { success: false, error: error.message };
  }
}

export async function liquidateManifestAction(
  manifestId: string,
  realCashReceived: number,
  returnedEmpties: number,
  returnedFull: number,
  notes: string,
) {
  try {
    await dispatchRepository.liquidateManifest(
      manifestId,
      realCashReceived,
      returnedEmpties,
      returnedFull,
      notes,
    );

    revalidatePath("/dispatch");
    revalidatePath(`/dispatch/${manifestId}`);

    // ¡AQUÍ ESTABA EL BUG! Esto es lo que hacía que no vieras el retorno
    // de bidones en tu pantalla del Inventario.
    revalidatePath("/inventory");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
