// src/services/firebase/admin-actions.ts
"use server";

import { adminAuth } from "./admin";
import { revalidatePath } from "next/cache";

export type YaccoRole = "ADMIN" | "PLANTA" | "LOGISTICA" | "VENTAS";

/**
 * Asigna un rol específico a un usuario de Moalv S.a.C.
 * @param uid El ID único del usuario en Firebase
 * @param role El rol a asignar
 */
export async function setUserRole(uid: string, role: YaccoRole) {
  try {
    // 1. Seteamos el rol en los Custom Claims de Firebase
    await adminAuth.setCustomUserClaims(uid, { role });

    console.log(`✅ Rol ${role} asignado al usuario ${uid}`);

    revalidatePath("/users"); // Para actualizar cualquier tabla de usuarios
    return { success: true };
  } catch (error) {
    console.error("Error asignando rol:", error);
    return { success: false, error: "No se pudo asignar el rol." };
  }
}
