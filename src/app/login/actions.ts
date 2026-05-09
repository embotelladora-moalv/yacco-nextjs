// src/app/login/actions.ts
"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/services/firebase/admin";
import { redirect } from "next/navigation";

export async function createSessionCookie(idToken: string) {
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    // 1. Resolvemos la promesa antes de setear
    const cookieStore = await cookies();

    cookieStore.set("yacco_session", sessionCookie, {
      // Nombre corregido a yacco_session
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return { success: true };
  } catch (error) {
    console.error("Error creando sesión:", error);
    return { success: false, error: "No se pudo crear la sesión segura." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();

  // Eliminamos la cookie de sesión de Moalv S.a.C.
  cookieStore.delete("yacco_session");

  // Redirección forzada desde el servidor
  redirect("/login");
}
