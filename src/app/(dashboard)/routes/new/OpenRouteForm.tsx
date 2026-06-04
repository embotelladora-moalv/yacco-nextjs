"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  dailyRouteSchema,
  DailyRouteFormValues,
} from "@/core/validations/dailyRouteSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openRouteAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Map, Truck, User, Banknote } from "lucide-react";

interface OpenRouteFormProps {
  trucks: any[];
  drivers: any[];
  assistants: any[]; // Recibimos la lista mixta
}

export function OpenRouteForm({
  trucks,
  drivers,
  assistants,
}: OpenRouteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<DailyRouteFormValues>({
    resolver: zodResolver(dailyRouteSchema),
    defaultValues: {
      truckId: "",
      driverId: "",
      assistantId: "",
      initialCash: 0,
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Observamos quién es el chofer actual para bloquearlo en el otro selector
  const selectedDriverId = form.watch("driverId");

  const onSubmit = async (values: DailyRouteFormValues) => {
    setIsLoading(true);
    const result = await openRouteAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success("Ruta Iniciada", {
        description: "El camión está marcado como 'En Ruta'.",
      });
      router.push("/routes");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-2xl mx-auto">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-3">
        <Map className="h-6 w-6 text-blue-400" />
        <div>
          <h2 className="text-xl font-black">Apertura de Ruta Diaria</h2>
          <p className="text-slate-400 text-sm">
            Asignación de unidad y caja chica para reparto
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
        {/* SECCIÓN 1: FECHA Y UNIDAD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              Fecha de Despacho
            </Label>
            <Input
              type="date"
              {...form.register("date")}
              className="h-11 focus-visible:ring-blue-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <Truck className="h-4 w-4 text-blue-600" /> Vehículo Asignado
            </Label>
            <select
              {...form.register("truckId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="">Seleccione un camión...</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.alias} ({t.plateNumber})
                </option>
              ))}
            </select>
            {form.formState.errors.truckId && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.truckId.message}
              </p>
            )}
          </div>
        </div>

        {/* SECCIÓN 2: PERSONAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-blue-600" /> Chofer Responsable
            </Label>
            <select
              {...form.register("driverId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="">Seleccione al conductor...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {form.formState.errors.driverId && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.driverId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-slate-400" /> Auxiliar (Opcional)
            </Label>
            <select
              {...form.register("assistantId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="">Ninguno / Sin auxiliar</option>
              {assistants.map((a) => (
                <option
                  key={a.id}
                  value={a.id}
                  disabled={a.id === selectedDriverId} // Evita asignar al mismo chofer como su propio auxiliar
                  className={a.id === selectedDriverId ? "text-slate-300" : ""}
                >
                  {a.name} {a.roles?.includes("DRIVER") ? "(Chofer)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECCIÓN 3: FINANZAS */}
        <div className="space-y-2">
          <Label className="font-bold flex items-center gap-2 text-slate-700">
            <Banknote className="h-4 w-4 text-green-600" /> Efectivo Inicial
            (S/) - Caja Chica
          </Label>
          <Input
            type="number"
            step="0.50"
            {...form.register("initialCash", { valueAsNumber: true })}
            className="h-14 text-2xl font-black text-green-700 bg-green-50 border-green-200 focus-visible:ring-green-600"
          />
          <p className="text-xs text-slate-500">
            Monto entregado para dar vuelto o cubrir gastos operativos (peajes,
            combustible).
          </p>
          {form.formState.errors.initialCash && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.initialCash.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-blue-700 hover:bg-blue-800 text-lg font-bold shadow-lg shadow-blue-900/20"
        >
          Autorizar Salida de Camión
        </Button>
      </form>
    </div>
  );
}
