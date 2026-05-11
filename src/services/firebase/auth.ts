// src/services/firebase/auth.ts
import { cookies } from "next/headers";
import { adminAuth } from "./admin";

export async function getUserSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("yacco_session")?.value;

  if (!session) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(session, true);

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      name: decodedClaims.name || "Usuario Yacco",
      // ACTUALIZADO: Ahora extraemos un array de 'roles' en lugar de un 'role' único
      roles: (decodedClaims.roles as string[]) || ["PLANTA"], // Por defecto un rol básico en array
    };
  } catch (error) {
    return null;
  }
}
