"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productionBatchSchema,
  ProductionBatchValues,
} from "@/core/validations/productionSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { registerProductionAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save, Factory } from "lucide-react";

export function ProductionForm({ products }: { products: any[] }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProductionBatchValues>({
    resolver: zodResolver(productionBatchSchema),
    defaultValues: {
      productId: "",
      quantityProduced: 0,
      productionDate: new Date().toISOString().split("T")[0], // Formato YYYY-MM-DD
      managerId: "USER_CURRENT_ID", // Reemplazar con el ID de sesión cuando integres Auth
      isTollManufacturing: false,
      brandId: "",
      notes: "",
    },
  });

  const isMaquila = form.watch("isTollManufacturing");

  const onSubmit = async (values: ProductionBatchValues) => {
    setIsLoading(true);
    const result = await registerProductionAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success("Producción registrada", {
        description: "El Kardex ha sido actualizado exitosamente.",
      });
      router.push("/production");
      router.refresh(); // Forzamos a Next.js a actualizar la tabla y los gráficos
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-2xl mx-auto">
      <div className="bg-blue-700 p-6 text-white flex items-center gap-3">
        <Factory className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-black">Nuevo Lote de Producción</h2>
          <p className="text-blue-100 text-sm">Embotelladora Moalv S.a.C.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selector de Producto */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-700 font-bold">
              Producto Finalizado
            </Label>
            <select
              {...form.register("productId")}
              className="w-full h-11 px-3 rounded-lg border-gray-200 border bg-slate-50 focus:ring-blue-600 focus:border-blue-600 outline-none transition-colors"
            >
              <option value="">Seleccione envase producido...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {form.formState.errors.productId && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.productId.message}
              </p>
            )}
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-bold">
              Cantidad (Unidades)
            </Label>
            <Input
              type="number"
              {...form.register("quantityProduced", { valueAsNumber: true })}
              className="h-11 text-lg font-black text-blue-700 bg-blue-50/50 border-blue-100 focus-visible:ring-blue-600"
            />
            {form.formState.errors.quantityProduced && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.quantityProduced.message}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-bold">
              Fecha de Producción
            </Label>
            <Input
              type="date"
              {...form.register("productionDate")}
              className="h-11 focus-visible:ring-blue-600"
            />
            {form.formState.errors.productionDate && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.productionDate.message}
              </p>
            )}
          </div>

          {/* Switch de Maquila */}
          <div className="md:col-span-2 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                className="text-base font-bold text-gray-900 cursor-pointer"
                htmlFor="maquila-switch"
              >
                Producción de Maquila
              </Label>
              <p className="text-xs text-gray-500">
                Active si este lote pertenece a otra marca/cliente.
              </p>
            </div>
            <Switch
              id="maquila-switch"
              checked={isMaquila}
              onCheckedChange={(val: boolean) =>
                form.setValue("isTollManufacturing", val)
              }
            />
          </div>

          {/* Input Condicional: Nombre de Marca */}
          {isMaquila && (
            <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-gray-700 font-bold">
                Nombre de la Marca / Cliente
              </Label>
              <Input
                {...form.register("brandId")}
                placeholder="Ej: Agua Pura Vida"
                className="h-11 focus-visible:ring-blue-600"
              />
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-base font-bold shadow-lg shadow-blue-900/20"
        >
          <Save className="mr-2 h-5 w-5" /> Confirmar Lote y Actualizar Kardex
        </Button>
      </form>
    </div>
  );
}
