// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebase/config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Loader2 } from "lucide-react";
import { createSessionCookie } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@planta.com");
  const [password, setPassword] = useState("123456");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Autenticamos con Firebase en el cliente
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // 2. Extraemos el Token de seguridad
      const idToken = await userCredential.user.getIdToken();

      // 3. Llamamos a nuestro Server Action para crear la Cookie
      const sessionResult = await createSessionCookie(idToken);

      if (!sessionResult.success) {
        throw new Error("No se pudo establecer la sesión en el servidor");
      }

      toast.success("Bienvenido a Rosimo ERP", {
        description: "Has iniciado sesión correctamente.",
      });

      // 4. Redirigimos al Kardex (o al dashboard principal)
      router.push("/inventory");
    } catch (error: any) {
      console.error("Error de autenticación:", error);
      toast.error("Error de acceso", {
        description: "Credenciales incorrectas o usuario no autorizado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border">
        {/* Cabecera del Login */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm mb-4">
            <Droplet className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Acceso al Sistema
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Gestión de Inventario y Producción para Rosimo Inversiones E.I.R.L.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6 mt-8">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
