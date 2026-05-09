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
      // 2. Extraemos el rol que guardamos en los Custom Claims
      role: (decodedClaims.role as string) || "PLANTA", // Por defecto rol básico
    };
  } catch (error) {
    return null;
  }
}
