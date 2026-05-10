"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  routeLoadSchema,
  RouteLoadFormValues,
} from "@/core/validations/routeLoadSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitTruckLoadAction } from "./actions";
import { toast } from "sonner";
import { PackageOpen, Plus, Trash2, ArrowUpRight } from "lucide-react";

interface LoadTruckFormProps {
  activeRoutes: any[]; // Rutas IN_PROGRESS (camiones disponibles para cargar)
  products: any[]; // Catálogo de productos con su stockFilled actual
}

export function LoadTruckForm({ activeRoutes, products }: LoadTruckFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RouteLoadFormValues>({
    resolver: zodResolver(routeLoadSchema),
    defaultValues: {
      routeId: "",
      items: [{ productId: "", quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (values: RouteLoadFormValues) => {
    setIsLoading(true);
    const result = await submitTruckLoadAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success("Carga registrada", {
        description: "Inventario transferido al camión exitosamente.",
      });
      form.reset({ routeId: "", items: [{ productId: "", quantity: 0 }] });
    } else {
      toast.error("Error en la carga", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div className="bg-blue-700 p-6 text-white flex items-center gap-3">
        <PackageOpen className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-black">
            Asignación de Inventario a Camión
          </h2>
          <p className="text-blue-100 text-sm">
            Transferencia de Planta a Ruta
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* SELECCIÓN DE RUTA/CAMIÓN */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <Label className="font-bold text-slate-700 text-base">
            Unidad a Cargar
          </Label>
          <select
            {...form.register("routeId")}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700"
          >
            <option value="">Seleccione el camión activo...</option>
            {activeRoutes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.truckAlias} (Chofer: {route.driverName})
              </option>
            ))}
          </select>
          {form.formState.errors.routeId && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.routeId.message}
            </p>
          )}
        </div>

        {/* LISTA DE PRODUCTOS A CARGAR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-bold text-slate-700 text-base">
              Detalle de Productos
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantity: 0 })}
              className="gap-2 font-bold text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" /> Agregar Ítem
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start">
                <div className="flex-1 space-y-1">
                  <select
                    {...form.register(`items.${index}.productId` as const)}
                    className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={p.stockFilled === 0}
                      >
                        {p.name} (Disp: {p.stockFilled})
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.items?.[index]?.productId && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.items[index]?.productId?.message}
                    </p>
                  )}
                </div>

                <div className="w-32 space-y-1">
                  <Input
                    type="number"
                    placeholder="Cant."
                    {...form.register(`items.${index}.quantity` as const, {
                      valueAsNumber: true,
                    })}
                    className="h-11 text-center font-bold"
                  />
                  {form.formState.errors.items?.[index]?.quantity && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.items[index]?.quantity?.message}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="h-11 w-11 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-blue-700 hover:bg-blue-800 text-lg font-bold shadow-lg shadow-blue-900/20"
        >
          <ArrowUpRight className="mr-2 h-6 w-6" /> Transferir a Unidad
        </Button>
      </form>
    </div>
  );
}
