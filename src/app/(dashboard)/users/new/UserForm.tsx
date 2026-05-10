"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema, UserFormValues } from "@/core/validations/userSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  User as UserIcon,
  Phone,
  Save,
  X,
  KeySquare,
} from "lucide-react";
import { saveUserAction } from "../actions";
import { UserRole } from "@/core/entities/User";

// Le indicamos explícitamente a TypeScript que 'id' es un UserRole, no un string cualquiera
const AVAILABLE_ROLES: { id: UserRole; label: string }[] = [
  { id: "ADMIN", label: "Administrador (Control Total)" },
  { id: "PRODUCTION", label: "Producción (Kardex)" },
  { id: "SALES", label: "Ventas / Oficina (Pedidos)" },
  { id: "DRIVER", label: "Chofer (App Reparto)" },
  { id: "ASSISTANT", label: "Auxiliar (Reparto)" },
];

export function UserForm({ initialData }: { initialData?: any }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: initialData || {
      name: "",
      email: "",
      roles: ["DRIVER"], // Ahora es un array por defecto
      phone: "",
      password: "", // Añadimos la clave por defecto vacía
      isActive: true,
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    setIsPending(true);
    const result = await saveUserAction(values, initialData?.id);
    setIsPending(false);

    if (result.success) {
      toast.success(initialData ? "Cambios guardados" : "Usuario registrado");
      router.push("/users");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* SECCIÓN 1: DATOS PERSONALES Y ACCESO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-slate-400" /> Nombre Completo
              </Label>
              <Input
                {...form.register("name")}
                placeholder="Ej: Juan Pérez"
                className="h-11 font-medium"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> Teléfono
              </Label>
              <Input
                {...form.register("phone")}
                placeholder="999 000 000"
                className="h-11 font-medium"
              />
            </div>
          </div>

          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> Correo Institucional
              </Label>
              <Input
                {...form.register("email")}
                type="email"
                disabled={!!initialData}
                placeholder="usuario@moalv.com"
                className="h-11 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <KeySquare className="h-4 w-4 text-slate-400" /> Contraseña de
                Acceso
              </Label>
              <Input
                {...form.register("password")}
                type="text" // Type text para que el admin la vea mientras la anota
                placeholder={
                  initialData ? "Dejar vacío para no cambiar" : "Ej: Moalv2026!"
                }
                className="h-11 font-medium"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.password.message}
                </p>
              )}
              {initialData && (
                <p className="text-xs text-slate-400 font-medium">
                  Solo llene esto si el usuario solicitó regenerar su clave.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: MÚLTIPLES ROLES */}
        <div className="space-y-4">
          <Label className="font-bold text-slate-700 flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-blue-600" /> Asignación de
            Roles (Seleccione uno o varios)
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Controller
              name="roles"
              control={form.control}
              render={({ field }) => (
                <>
                  {AVAILABLE_ROLES.map((role) => (
                    <div
                      key={role.id}
                      className={`flex items-center space-x-3 border rounded-xl p-4 transition-colors cursor-pointer ${field.value.includes(role.id) ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={field.value.includes(role.id)}
                        onCheckedChange={(checked) => {
                          const updatedRoles = checked
                            ? [...field.value, role.id]
                            : field.value.filter((val) => val !== role.id);
                          field.onChange(updatedRoles);
                        }}
                      />
                      <label
                        htmlFor={`role-${role.id}`}
                        className="text-sm font-bold leading-none cursor-pointer text-slate-700 w-full"
                      >
                        {role.label}
                      </label>
                    </div>
                  ))}
                </>
              )}
            />
          </div>
          {form.formState.errors.roles && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.roles.message}
            </p>
          )}
        </div>

        {/* BOTONES DE CIERRE */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500"
          >
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-700 hover:bg-blue-800 px-10 font-black shadow-lg"
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {isPending
              ? "Procesando..."
              : initialData
                ? "Guardar Cambios"
                : "Confirmar Registro"}
          </Button>
        </div>
      </form>
    </div>
  );
}
