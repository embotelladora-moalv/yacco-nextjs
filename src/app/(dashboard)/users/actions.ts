"use server";

import { userRepository } from "@/services/repositories/userRepository";
import { userSchema, UserFormValues } from "@/core/validations/userSchema";
import { revalidatePath } from "next/cache";
import { adminAuth } from "@/services/firebase/admin"; // Importamos Auth del Admin SDK

export async function saveUserAction(data: UserFormValues, id?: string) {
  try {
    const parsed = userSchema.parse(data);

    // Extraemos el password para no guardarlo en Firestore, solo se usa en Auth
    const { password, ...firestoreData } = parsed;

    if (id) {
      // 1. MODO EDICIÓN
      await userRepository.update(id, firestoreData);

      // Si el admin escribió una nueva contraseña en el formulario de edición, la actualizamos
      if (password && password.trim() !== "") {
        await adminAuth.updateUser(id, { password });
      }
    } else {
      // 2. MODO CREACIÓN
      if (!password || password.trim() === "") {
        throw new Error(
          "La contraseña es obligatoria para crear un nuevo usuario.",
        );
      }

      // Creamos la cuenta en Firebase Auth con la clave manual
      const authUser = await adminAuth.createUser({
        email: firestoreData.email,
        password: password,
        displayName: firestoreData.name,
      });

      // Vinculamos el Perfil en Firestore
      await userRepository.createWithId(authUser.uid, firestoreData);
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        error: "Este correo ya está registrado en el sistema.",
      };
    }
    return {
      success: false,
      error: error.message || "Error al gestionar el usuario.",
    };
  }
}

// Acción específica por si quieres poner un botón de "Regenerar Clave" directo en la tabla
export async function regeneratePasswordAction(
  id: string,
  newPassword: string,
) {
  try {
    if (newPassword.length < 6) throw new Error("Mínimo 6 caracteres");
    await adminAuth.updateUser(id, { password: newPassword });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatusAction(id: string, isActive: boolean) {
  try {
    // Suspendemos en Firestore (para la UI y reglas)
    await userRepository.toggleStatus(id, isActive);

    // Suspendemos el acceso real en Firebase Authentication
    await adminAuth.updateUser(id, { disabled: !isActive });

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al cambiar el estado del usuario." };
  }
}
