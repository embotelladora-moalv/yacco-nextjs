"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  ProductFormValues,
} from "@/core/validations/inventorySchemas";
import { saveProductAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PackagePlus, Save, Info, Factory, Tag } from "lucide-react";

interface ProductFormProps {
  packagingTypes: string[];
  maquilaBrands: string[]; // <-- Opción A: Viene de systemSettings
  initialData?: any;
}

export function ProductForm({
  packagingTypes,
  maquilaBrands,
  initialData,
}: ProductFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: initialData || {
      name: "",
      sku: "",
      operationalCategory: "FULL_PRODUCT",
      packagingType: packagingTypes[0] || "",
      isMaquila: false,
      brandName: "",
      volume: 20,
      unit: "L",
      hasTap: false,
      isReturnableContainer: true,
      priceRefill: 0,
      priceFull: 0,
      priceEmpty: 0,
      initialStockEmpty: 0,
      initialStockFilled: 0,
      isActive: true,
    },
  });

  // Suscripciones en tiempo real para UI dinámica
  const category = form.watch("operationalCategory");
  const isMaquila = form.watch("isMaquila");
  const isReturnable = form.watch("isReturnableContainer");

  const isAccessory = category === "ACCESSORY";

  const onSubmit = async (values: ProductFormValues) => {
    setIsPending(true);
    const result = await saveProductAction(values, initialData?.id);
    setIsPending(false);

    if (result.success) {
      toast.success("Producto guardado correctamente");
      router.push("/inventory");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <PackagePlus className="h-7 w-7 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Configurar Producto
          </h2>
          <p className="text-slate-400 font-medium text-sm mt-0.5">
            Defina las especificaciones técnicas y comerciales.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
        {/* SECCIÓN 1: IDENTIDAD Y TIPO */}
        <div className="space-y-6">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
            <Info className="h-4 w-4" /> 1. Clasificación Básica
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-2">
              <Label className="font-bold">Categoría Operativa</Label>
              <select
                {...form.register("operationalCategory")}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="FULL_PRODUCT">Producto Líquido (Lleno)</option>
                <option value="EMPTY_CONTAINER">Solo Envase (Vacío)</option>
                <option value="ACCESSORY">Accesorio o Complemento</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Tipo de Empaque</Label>
              <select
                {...form.register("packagingType")}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-medium"
              >
                {packagingTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* SWITCH MAQUILA */}
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 md:col-span-2">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isMaquila ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400"}`}
                >
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <Label className="font-black text-slate-700">
                    Producto de Maquila
                  </Label>
                  <p className="text-[10px] text-slate-500 font-medium italic">
                    Activar si envasas para una marca externa.
                  </p>
                </div>
              </div>
              <Controller
                name="isMaquila"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {isMaquila && (
              <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                <Label className="font-bold text-purple-700 flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Seleccionar Marca del Cliente
                </Label>
                <select
                  {...form.register("brandName")}
                  className="w-full h-11 px-4 rounded-xl border-2 border-purple-100 bg-purple-50/30 font-black text-purple-900"
                >
                  <option value="">-- Elija una marca de la lista --</option>
                  {maquilaBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN 2: ESPECIFICACIONES (SOLO SI NO ES ACCESORIO) */}
        {!isAccessory && (
          <div className="space-y-6">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Tag className="h-4 w-4" /> 2. Ficha Técnica del Líquido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold">Nombre Comercial</Label>
                <Input
                  {...form.register("name")}
                  placeholder="Ej: Bidón 20L Premium"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">SKU Único</Label>
                <Input
                  {...form.register("sku")}
                  className="h-11 rounded-xl uppercase font-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Capacidad</Label>
                  <Input
                    {...form.register("volume")}
                    type="number"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Unidad</Label>
                  <select
                    {...form.register("unit")}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="L">Litros (L)</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Label className="font-bold">¿Es Retornable?</Label>
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
        )}

        {/* SECCIÓN 3: PRECIOS Y TARIFAS */}
        <div className="space-y-6">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
            <Save className="h-4 w-4" /> 3. Tarifario Moalv
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
            {isReturnable && !isAccessory && (
              <div className="space-y-2">
                <Label className="text-blue-700 font-black">
                  Precio Recarga
                </Label>
                <Input
                  {...form.register("priceRefill")}
                  type="number"
                  step="0.1"
                  className="h-12 text-lg font-black border-blue-200"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-emerald-700 font-black">Precio Full</Label>
              <Input
                {...form.register("priceFull")}
                type="number"
                step="0.1"
                className="h-12 text-lg font-black border-emerald-200"
              />
            </div>
            {isReturnable && !isAccessory && (
              <div className="space-y-2">
                <Label className="text-orange-700 font-black">
                  Precio Envase Vacío
                </Label>
                <Input
                  {...form.register("priceEmpty")}
                  type="number"
                  step="0.1"
                  className="h-12 text-lg font-black border-orange-200"
                />
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-900/20"
        >
          {isPending ? "Guardando..." : "Confirmar y Registrar"}
        </Button>
      </form>
    </div>
  );
}
