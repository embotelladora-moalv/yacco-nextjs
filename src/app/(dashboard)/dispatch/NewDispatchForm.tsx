"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  dispatchManifestSchema,
  DispatchManifestFormValues,
} from "@/core/validations/dispatchSchemas";
import { createDispatchAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Truck,
  User as UserIcon,
  Plus,
  Trash2,
  Save,
  Package,
  Wand2, // <-- Icono para la IA
} from "lucide-react";

interface NewDispatchFormProps {
  drivers: any[];
  products: any[];
  trucks: any[];
  busyPlates: string[];
  busyDrivers: string[];
}

export function NewDispatchForm({
  drivers,
  products,
  trucks,
  busyPlates,
  busyDrivers,
}: NewDispatchFormProps) {
  const [isPending, setIsPending] = useState(false);

  // ESTADOS PARA LA IA
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const router = useRouter();

  const availableProducts = products.filter((p) => p.stockFilled > 0);

  const form = useForm<DispatchManifestFormValues>({
    resolver: zodResolver(dispatchManifestSchema) as any,
    defaultValues: {
      driverId: "",
      assistantId: "",
      truckPlate: "",
      initialPettyCash: 0,
      items: [{ productId: "", quantityRequested: 1 }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // FUNCIÓN PARA CONSULTAR A GEMINI
  const askAI = async () => {
    const selectedPlate = form.getValues("truckPlate");
    const selectedTruck = trucks.find((t) => t.plateNumber === selectedPlate);

    // Validación 1: Necesitamos saber qué camión es para ver su capacidad
    if (!selectedTruck) {
      toast.error(
        "Por favor, selecciona un Vehículo primero para calcular su capacidad.",
      );
      return;
    }

    setIsAILoading(true);
    setAiSuggestion(null);

    try {
      const res = await fetch("/api/ai/analyze-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckCapacity: selectedTruck.capacity,
          destinationZone: form.getValues("notes") || "Ruta General",
          // Solo enviamos nombre y stock para ahorrar tokens y hacer la consulta ultra rápida
          products: availableProducts.map((p) => ({
            name: p.name,
            stockFilled: p.stockFilled,
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAiSuggestion(data.suggestion);
        toast.success("Análisis de IA completado");
      } else {
        toast.error("Error", { description: data.error });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión con Gemini");
    } finally {
      setIsAILoading(false);
    }
  };

  const onSubmit = async (values: DispatchManifestFormValues) => {
    const productIds = values.items.map((i) => i.productId);
    const hasDuplicates = new Set(productIds).size !== productIds.length;
    if (hasDuplicates) {
      toast.error("Error", {
        description:
          "Has seleccionado el mismo producto en varias líneas. Únelos en una sola.",
      });
      return;
    }

    setIsPending(true);
    const result = await createDispatchAction(values);
    setIsPending(false);

    if (result.success) {
      toast.success("Despacho registrado y autorizado.");
      router.push("/dispatch");
      router.refresh();
    } else {
      toast.error("Error al despachar", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
        <Truck className="h-10 w-10 text-orange-400" />
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Nuevo Manifiesto de Despacho
          </h2>
          <p className="text-slate-300 font-medium text-sm mt-0.5">
            Asignación de carga y vehículos a ruta.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* SECCIÓN 1: DATOS DEL VEHÍCULO Y EQUIPO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          {/* CHOFER */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <UserIcon className="h-4 w-4 text-slate-400" /> Chofer Titular
            </Label>
            <select
              {...form.register("driverId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="">-- Seleccione --</option>
              {drivers.map((d) => {
                const isBusy = busyDrivers.includes(d.id);
                return (
                  <option key={d.id} value={d.id} disabled={isBusy}>
                    {isBusy ? "🔴" : "🟢"} {d.name} {isBusy ? "(En Ruta)" : ""}
                  </option>
                );
              })}
            </select>
            {form.formState.errors.driverId && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.driverId.message}
              </p>
            )}
          </div>

          {/* AUXILIAR */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <UserIcon className="h-4 w-4 text-slate-400 opacity-50" />{" "}
              Auxiliar (Opc.)
            </Label>
            <select
              {...form.register("assistantId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="">-- Sin auxiliar --</option>
              {drivers.map((d) => {
                const isBusy = busyDrivers.includes(d.id);
                return (
                  <option key={`aux-${d.id}`} value={d.id} disabled={isBusy}>
                    {isBusy ? "🔴" : "🟢"} {d.name} {isBusy ? "(En Ruta)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* CAMIÓN */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <Truck className="h-4 w-4 text-blue-500" /> Vehículo / Placa
            </Label>
            <select
              {...form.register("truckPlate")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-bold text-slate-700"
            >
              <option value="">-- Seleccione --</option>
              {trucks.map((truck) => {
                const isBusy = busyPlates.includes(truck.plateNumber);
                return (
                  <option
                    key={truck.id}
                    value={truck.plateNumber}
                    disabled={isBusy}
                  >
                    {isBusy ? "🛑" : "✅"} {truck.plateNumber}{" "}
                    {truck.alias ? `- ${truck.alias}` : ""}{" "}
                    {isBusy ? "(EN RUTA)" : `(Cap: ${truck.capacity}u)`}
                  </option>
                );
              })}
            </select>
            {form.formState.errors.truckPlate && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.truckPlate.message}
              </p>
            )}
          </div>

          {/* CAJA CHICA */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              Caja Chica (S/)
            </Label>
            <Input
              {...form.register("initialPettyCash")}
              type="number"
              step="0.10"
              min="0"
              className="h-11 font-black text-green-700 bg-green-50 border-green-200"
            />
          </div>
        </div>

        {/* BOTÓN Y PANEL DE INTELIGENCIA ARTIFICIAL */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-2">
            <h3 className="text-sm font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" /> Carga Asignada
            </h3>

            <div className="flex gap-2 w-full sm:w-auto">
              {/* BOTÓN IA */}
              <Button
                type="button"
                variant="secondary"
                onClick={askAI}
                disabled={isAILoading}
                className="flex-1 sm:flex-none bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold border border-purple-200 shadow-sm"
              >
                {isAILoading ? (
                  "Analizando..."
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4 text-purple-600" /> Consultar
                    Asistente IA
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ productId: "", quantityRequested: 1 })}
                className="flex-1 sm:flex-none font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar Producto
              </Button>
            </div>
          </div>

          {/* PANEL DE RESPUESTA IA */}
          {aiSuggestion && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
              <h4 className="flex items-center gap-2 text-purple-900 font-black mb-2 uppercase text-xs tracking-widest">
                <Wand2 className="h-4 w-4" /> Sugerencia Estratégica
              </h4>
              <div className="text-sm text-purple-900 font-medium leading-relaxed whitespace-pre-wrap">
                {aiSuggestion}
              </div>
            </div>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all"
            >
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs text-slate-500 font-bold">
                  Producto (Stock Disponible)
                </Label>
                <select
                  {...form.register(`items.${index}.productId` as const)}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="">-- Seleccione el producto --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - {p.stockFilled} u. disp.
                    </option>
                  ))}
                </select>
                {form.formState.errors.items?.[index]?.productId && (
                  <p className="text-xs text-red-500 font-bold">
                    {form.formState.errors.items[index]?.productId?.message}
                  </p>
                )}
              </div>

              <div className="w-full sm:w-32 space-y-1">
                <Label className="text-xs text-slate-500 font-bold">
                  Cantidad
                </Label>
                <Input
                  {...form.register(
                    `items.${index}.quantityRequested` as const,
                  )}
                  type="number"
                  min="1"
                  className="h-11 font-black text-center border-slate-200"
                />
              </div>

              {fields.length > 1 && (
                <div className="pt-5 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => remove(index)}
                    className="w-full sm:w-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {form.formState.errors.items?.root && (
            <p className="text-sm text-red-500 font-bold">
              {form.formState.errors.items.root.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-bold text-slate-700">Notas Adicionales</Label>
          <Input
            {...form.register("notes")}
            placeholder="Ej: Llenar el tanque antes de salir a ruta..."
            className="h-11 border-slate-200 font-medium"
          />
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 shadow-lg shadow-orange-500/20"
          >
            {isPending ? (
              "Autorizando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Autorizar Salida
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
