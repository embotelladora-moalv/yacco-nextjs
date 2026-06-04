"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { userSchema } from "@/core/validations/userSchema";
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
  Truck,
  Lock, // Icono para la contraseña
} from "lucide-react";
import { saveUserAction } from "../actions";
import { UserRole } from "@/core/entities/User";

const AVAILABLE_ROLES: { id: UserRole; label: string }[] = [
  { id: "ADMIN", label: "Administrador (Control Total)" },
  { id: "PRODUCTION", label: "Producción (Kardex)" },
  { id: "SALES", label: "Ventas / Oficina (Pedidos)" },
  { id: "DRIVER", label: "Chofer (App Reparto)" },
  { id: "ASSISTANT", label: "Auxiliar (Reparto)" },
];

interface UserFormProps {
  initialData?: any;
}

type FormData = z.infer<typeof userSchema>;

export function UserForm({ initialData }: UserFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      roles: initialData?.roles || [],
      licenseNumber: initialData?.licenseNumber ?? "",
      documentNumber: initialData?.documentNumber ?? "",
      isActive: initialData?.isActive ?? true,
      password: "", // Inicializamos el campo de contraseña
    },
  });

  const selectedRoles = form.watch("roles") || [];
  const isDriver = selectedRoles.includes("DRIVER" as any);

  const onSubmit = async (values: FormData) => {
    setIsPending(true);
    try {
      const payload = {
        ...values,
        licenseNumber: isDriver ? values.licenseNumber : "",
        documentNumber: isDriver ? values.documentNumber : "",
        // Si el campo está vacío durante una edición, se envía como undefined para no alterarlo
        password: values.password || undefined,
      };

      const result = await saveUserAction(payload, initialData?.id);

      if (result.success) {
        toast.success(
          initialData
            ? "Usuario actualizado con éxito"
            : "Usuario creado con éxito",
        );
        router.push("/users");
        router.refresh();
      } else {
        toast.error(result.error || "Ocurrió un error inesperado.");
      }
    } catch (error) {
      toast.error("Error de conexión al guardar el usuario.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 max-w-3xl mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* CAMPO: NOMBRE COMPLETO */}
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-xs font-black text-slate-500 uppercase tracking-wider"
          >
            Nombre Completo
          </Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="name"
              type="text"
              placeholder="Ej. Roberto Pérez"
              className="pl-10 rounded-xl font-medium"
              {...form.register("name")}
            />
          </div>
          {form.formState.errors.name && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.name.message as string}
            </p>
          )}
        </div>

        {/* CAMPO: TELÉFONO */}
        <div className="space-y-2">
          <Label
            htmlFor="phone"
            className="text-xs font-black text-slate-500 uppercase tracking-wider"
          >
            Teléfono / Celular
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="Ej. 987654321"
              className="pl-10 rounded-xl font-medium"
              {...form.register("phone")}
            />
          </div>
          {form.formState.errors.phone && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.phone.message as string}
            </p>
          )}
        </div>

        {/* CAMPO: CORREO ELECTRÓNICO */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-xs font-black text-slate-500 uppercase tracking-wider"
          >
            Correo Electrónico
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="correo@empresa.com"
              className="pl-10 rounded-xl font-medium"
              disabled={!!initialData}
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.email.message as string}
            </p>
          )}
        </div>

        {/* CAMPO: CONTRASEÑA */}
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-xs font-black text-slate-500 uppercase tracking-wider"
          >
            Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type="password"
              placeholder={
                initialData
                  ? "Dejar en blanco para mantener la actual"
                  : "••••••••"
              }
              className="pl-10 rounded-xl font-medium"
              {...form.register("password")}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.password.message as string}
            </p>
          )}
        </div>
      </div>

      {/* SECCIÓN DE ASIGNACIÓN DE ROLES */}
      <div className="space-y-3 pt-4 border-t border-slate-50">
        <Label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-400" /> Permisos y Roles en
          el Sistema
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <Controller
            control={form.control}
            name="roles"
            render={({ field }) => (
              <>
                {AVAILABLE_ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm hover:bg-slate-50/50 transition-colors"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={field.value?.includes(role.id as any)}
                      onCheckedChange={(checked) => {
                        const currentRoles = field.value || [];
                        if (checked) {
                          field.onChange([...currentRoles, role.id]);
                        } else {
                          field.onChange(
                            currentRoles.filter((r: any) => r !== role.id),
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-bold leading-none cursor-pointer text-slate-700 w-full select-none"
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
            {form.formState.errors.roles.message as string}
          </p>
        )}
      </div>

      {/* PANEL DE DATOS PARA GUÍAS DE REMISIÓN */}
      {isDriver && (
        <div className="space-y-4 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="h-4 w-4" /> Datos de Transportista (Obligatorio
            para GRE)
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100">
            <div className="space-y-2">
              <Label
                htmlFor="documentNumber"
                className="text-xs font-bold text-slate-600"
              >
                DNI del Chofer
              </Label>
              <Input
                id="documentNumber"
                type="text"
                placeholder="Ej. 12345678"
                className="rounded-xl font-medium border-emerald-200 bg-white"
                {...form.register("documentNumber")}
              />
              {form.formState.errors.documentNumber && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.documentNumber.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="licenseNumber"
                className="text-xs font-bold text-slate-600"
              >
                Licencia de Conducir
              </Label>
              <Input
                id="licenseNumber"
                type="text"
                placeholder="Ej. Q45678912"
                className="rounded-xl font-medium border-emerald-200 bg-white uppercase"
                {...form.register("licenseNumber")}
              />
              {form.formState.errors.licenseNumber && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.licenseNumber.message as string}
                </p>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium px-1">
            SUNAT requiere ambos datos en el XML para validar la identidad del
            conductor de tu flota.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
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
          className="bg-blue-700 hover:bg-blue-800 px-10 font-black shadow-lg rounded-xl h-11"
        >
          <Save className="mr-2 h-4 w-4" />{" "}
          {isPending
            ? "Procesando..."
            : initialData
              ? "Guardar Cambios"
              : "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}
