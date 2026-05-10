"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  ProductFormValues,
} from "@/core/validations/inventorySchemas";
import { saveProductAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Asegúrate de tener: npx shadcn add switch
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PackagePlus, Save } from "lucide-react";

interface ProductFormProps {
  packagingTypes: string[];
  initialData?: any; // <-- Agrega esto
}

export function ProductForm({ packagingTypes, initialData }: ProductFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: initialData || {
      name: "",
      sku: "",
      operationalCategory: "FULL_PRODUCT",
      packagingType: packagingTypes[0] || "",
      volume: 20,
      unit: "L",
      hasTap: false,
      isReturnableContainer: true, // <-- Actualizado según el schema
      priceRefill: 0,
      priceFull: 0,
      priceEmpty: 0,
      initialStockEmpty: 0,
      initialStockFilled: 0,
      isActive: true,
    },
  });

  // Observamos si es retornable para mostrar u ocultar campos de precios
  const isReturnable = form.watch("isReturnableContainer");

  const onSubmit = async (values: ProductFormValues) => {
    setIsPending(true);
    const result = await saveProductAction(values, initialData?.id);
    setIsPending(false);

    if (result.success) {
      toast.success("Producto registrado exitosamente");
      router.push("/inventory");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
      {/* HEADER AZUL CLAVADO A TU DISEÑO */}
      <div className="bg-blue-600 p-6 sm:p-8 text-white flex items-center gap-4">
        <PackagePlus className="h-10 w-10 opacity-90" />
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Registrar Nuevo Producto
          </h2>
          <p className="text-blue-100 font-medium text-sm mt-0.5">
            Catálogo Maestro Moalv S.a.C.
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="p-6 sm:p-10 space-y-10"
      >
        {/* SECCIÓN: IDENTIFICACIÓN */}
        <div className="space-y-6">
          <h3 className="text-sm font-black tracking-widest text-slate-800 uppercase border-b pb-2">
            Identificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">
                Nombre del Producto
              </label>
              <Input
                {...form.register("name")}
                placeholder="Ej: Bidón 20L con Caño"
                className="h-12 text-base"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">
                Código SKU
              </label>
              <Input
                {...form.register("sku")}
                placeholder="Ej: BID-20L-C"
                className="h-12 text-base uppercase"
              />
              {form.formState.errors.sku && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.sku.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN: CLASIFICACIÓN TÉCNICA */}
        <div className="space-y-6">
          <h3 className="text-sm font-black tracking-widest text-slate-800 uppercase border-b pb-2">
            Clasificación Técnica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">
                Categoría Operativa
              </label>
              <select
                {...form.register("operationalCategory")}
                className="w-full h-12 px-3 rounded-md border border-slate-200 bg-white text-base"
              >
                <option value="FULL_PRODUCT">
                  Producto Completo (Envase + Líquido)
                </option>
                <option value="EMPTY_CONTAINER">Solo Envase (Vacío)</option>
                <option value="ACCESSORY">Accesorio (Ej: Surtidor)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">
                Tipo de Empaque
              </label>
              <select
                {...form.register("packagingType")}
                className="w-full h-12 px-3 rounded-md border border-slate-200 bg-white text-base"
              >
                {packagingTypes.length > 0 ? (
                  packagingTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))
                ) : (
                  <option value="Bidón">Bidón (Defecto)</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">
                  Volumen/Capacidad
                </label>
                <Input
                  {...form.register("volume")}
                  type="number"
                  min="0"
                  step="0.1"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">
                  Unidad
                </label>
                <select
                  {...form.register("unit")}
                  className="w-full h-12 px-3 rounded-md border border-slate-200 bg-white text-base"
                >
                  <option value="L">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="Gal">Galones (Gal)</option>
                </select>
              </div>
            </div>

            {/* Switches de configuración */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <label className="text-sm font-bold text-slate-900 cursor-pointer">
                  ¿Tiene Caño Dispensor?
                </label>
                <Controller
                  name="hasTap"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <label className="text-sm font-bold text-slate-900 block">
                    Envase Retornable
                  </label>
                  <span className="text-xs text-slate-500 font-medium">
                    Genera deuda de envase al cliente.
                  </span>
                </div>
                <Controller
                  name="isReturnableContainer"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: FINANZAS */}
        <div className="space-y-6">
          <h3 className="text-sm font-black tracking-widest text-slate-800 uppercase border-b pb-2">
            Tarifario Comercial
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            {/* Si es retornable, mostramos el precio de Recarga */}
            {isReturnable && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Precio de Recarga (S/)
                </label>
                <p className="text-[10px] text-slate-500 font-medium leading-tight mb-2">
                  Exige un envase vacío a cambio.
                </p>
                <Input
                  {...form.register("priceRefill")}
                  type="number"
                  step="0.10"
                  min="0"
                  className="h-12 text-lg font-black text-blue-700 border-slate-200"
                />
              </div>
            )}

            {/* Precio Full (Aplica para todo, retornable o descartable) */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                Precio Completo (S/)
              </label>
              <p className="text-[10px] text-slate-500 font-medium leading-tight mb-2">
                {isReturnable
                  ? "Líquido + Envase nuevo. No exige vacío."
                  : "Precio de venta al público."}
              </p>
              <Input
                {...form.register("priceFull")}
                type="number"
                step="0.10"
                min="0"
                className="h-12 text-lg font-black text-green-700 border-green-200 bg-green-50/50"
              />
            </div>

            {/* Si es retornable, mostramos el precio del envase vacío (Penalidad/Venta Directa) */}
            {isReturnable && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Precio Envase Vacío (S/)
                </label>
                <p className="text-[10px] text-slate-500 font-medium leading-tight mb-2">
                  Para penalidad por pérdida o venta.
                </p>
                <Input
                  {...form.register("priceEmpty")}
                  type="number"
                  step="0.10"
                  min="0"
                  className="h-12 text-lg font-black text-orange-700 border-slate-200"
                />
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN SUBMIT */}
        <div className="pt-6">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 font-black shadow-lg shadow-blue-600/20"
          >
            {isPending ? (
              "Procesando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Guardar Producto en Moalv
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
