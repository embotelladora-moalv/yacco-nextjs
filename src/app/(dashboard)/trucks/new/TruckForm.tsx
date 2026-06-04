"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { truckSchema, TruckFormValues } from "@/core/validations/truckSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveTruckAction, updateTruckAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save, Truck } from "lucide-react";

interface TruckFormProps {
  initialData?: any; // Si pasamos esto, el formulario entra en modo "Edición"
}

export function TruckForm({ initialData }: TruckFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<TruckFormValues>({
    resolver: zodResolver(truckSchema),
    defaultValues: initialData
      ? {
          plateNumber: initialData.plateNumber,
          alias: initialData.alias,
          capacity: initialData.capacity,
        }
      : {
          plateNumber: "",
          alias: "",
          capacity: 100, // Un valor por defecto razonable para empezar
        },
  });

  const onSubmit = async (values: TruckFormValues) => {
    setIsLoading(true);

    const result = initialData
      ? await updateTruckAction(initialData.id, values)
      : await saveTruckAction(values);

    setIsLoading(false);

    if (result.success) {
      toast.success(
        initialData ? "Vehículo actualizado" : "Vehículo registrado",
        {
          description: "La flota de Moalv S.a.C. ha sido actualizada.",
        },
      );
      router.push("/trucks");
      router.refresh();
    } else {
      toast.error("Error", {
        description: result.error || "No se pudo guardar la información.",
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-2xl mx-auto">
      <div className="bg-blue-700 p-6 text-white flex items-center gap-3">
        <Truck className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-black">
            {initialData ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
          </h2>
          <p className="text-blue-100 text-sm">Gestión de Flota Yacco</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">
              Placa del Vehículo
            </Label>
            <Input
              {...form.register("plateNumber")}
              placeholder="Ej: ABC-123"
              className="h-11 font-mono uppercase focus-visible:ring-blue-600"
            />
            {form.formState.errors.plateNumber && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.plateNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">
              Alias / Identificador
            </Label>
            <Input
              {...form.register("alias")}
              placeholder="Ej: Fuso Blanco o Camión 1"
              className="h-11 focus-visible:ring-blue-600"
            />
            {form.formState.errors.alias && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.alias.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-700 font-bold">
              Capacidad Máxima de Carga
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                {...form.register("capacity", { valueAsNumber: true })}
                className="h-11 text-lg font-black text-blue-700 bg-blue-50/50 border-blue-100 w-1/2"
              />
              <span className="text-sm font-bold text-slate-500 uppercase">
                Bidones de 20L
              </span>
            </div>
            {form.formState.errors.capacity && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.capacity.message}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Esta capacidad se usará para calcular si el camión se está
              sobrecargando en la ruta.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-base font-bold shadow-lg shadow-blue-900/20"
        >
          <Save className="mr-2 h-5 w-5" />{" "}
          {initialData ? "Guardar Cambios" : "Agregar a la Flota"}
        </Button>
      </form>
    </div>
  );
}
