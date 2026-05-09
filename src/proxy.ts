// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/services/firebase/admin";

/**
 * Proxy de Seguridad - Yacco ERP
 * Razón Social: Embotelladora Moalv S.a.C.
 * RUC: 20612769151
 */
export async function proxy(request: NextRequest) {
  const session = request.cookies.get("yacco_session");
  const { pathname } = request.nextUrl;

  const sessionValue = session?.value;

  // 1. Regla para la página de acceso
  if (pathname === "/login") {
    if (sessionValue) {
      return NextResponse.redirect(new URL("/inventory", request.url));
    }
    return NextResponse.next();
  }

  // 2. Regla de Roles: Rutas que requieren ser ADMINISTRADOR
  const isAdminRoute =
    pathname.startsWith("/users") || pathname.startsWith("/settings");

  if (isAdminRoute) {
    if (!sessionValue)
      return NextResponse.redirect(new URL("/login", request.url));

    try {
      // Verificamos el rol directamente en el Proxy usando el Admin SDK
      const decodedClaims = await adminAuth.verifySessionCookie(sessionValue);

      if (decodedClaims.role !== "ADMIN") {
        // Si no es ADMIN, lo desviamos al Kardex (Acceso denegado a configuración)
        return NextResponse.redirect(new URL("/inventory", request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 3. Regla general para el sistema interno (Rutas protegidas básicas)
  const isProtectedRoute =
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/production") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/dashboard");

  if (isProtectedRoute && !sessionValue) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Inyección de cabeceras corporativas
  const response = NextResponse.next();
  response.headers.set("x-yacco-org", "Embotelladora Moalv S.a.C.");
  response.headers.set("x-yacco-ruc", "20612769151");

  return response;
}

// Configuración de rutas
export const config = {
  matcher: [
    "/inventory/:path*",
    "/production/:path*",
    "/products/:path*",
    "/dashboard/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/login",
  ],
};
