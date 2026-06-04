"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  ProductFormValues,
} from "@/core/validations/productSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save, PackagePlus } from "lucide-react";
import { saveProductAction, updateProductAction } from "../actions";

interface ProductFormProps {
  initialData?: any; // Si existe, estamos en modo Edición
}

export function ProductForm({ initialData }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          sku: initialData.sku,
          category: initialData.category,
          packagingType: initialData.packagingType,
          volumeCapacity: initialData.volumeCapacity,
          unitOfMeasure: initialData.unitOfMeasure,
          hasTap: initialData.hasTap,
          isReturnableContainer: initialData.isReturnableContainer,
          basePrice: initialData.basePrice,
        }
      : {
          name: "",
          sku: "",
          category: "COMPLETE_PRODUCT",
          packagingType: "JUG",
          volumeCapacity: 20,
          unitOfMeasure: "LITERS",
          hasTap: false,
          isReturnableContainer: true,
          basePrice: 0,
        },
  });

  const onSubmit = async (values: ProductFormValues) => {
    setIsLoading(true);
    // Si hay initialData, actualizamos; si no, creamos.
    const result = initialData
      ? await updateProductAction(initialData.id, values)
      : await saveProductAction(values);

    setIsLoading(false);

    if (result.success) {
      toast.success(initialData ? "Producto actualizado" : "Producto creado", {
        description: "Catálogo maestro Yacco actualizado.",
      });
      router.push("/products");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div className="bg-blue-700 p-6 text-white flex items-center gap-3">
        <PackagePlus className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-black">Registrar Nuevo Producto</h2>
          <p className="text-blue-100 text-sm">Catálogo Maestro Yacco</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* SECCIÓN 1: IDENTIFICACIÓN */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2">
            Identificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold">Nombre del Producto</Label>
              <Input
                {...form.register("name")}
                placeholder="Ej: Bidón 20L con Caño"
                className="h-11"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Código SKU</Label>
              <Input
                {...form.register("sku")}
                placeholder="Ej: BID-20L-C"
                className="h-11 font-mono uppercase"
              />
              {form.formState.errors.sku && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.sku.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CLASIFICACIÓN TÉCNICA */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2">
            Clasificación Técnica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold">Categoría Operativa</Label>
              <select
                {...form.register("category")}
                className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="REFILL">Recarga (Solo Líquido)</option>
                <option value="COMPLETE_PRODUCT">
                  Producto Completo (Envase + Líquido)
                </option>
                <option value="ACCESSORY">Accesorio / Surtidor</option>
                <option value="BOX">Caja de Agua</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Tipo de Empaque</Label>
              <select
                {...form.register("packagingType")}
                className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="JUG">Bidón (Jug)</option>
                <option value="BOTTLE">Botella</option>
                <option value="BOX">Caja</option>
                <option value="DISPENSER">Surtidor / Dispensador</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Volumen/Capacidad</Label>
                <Input
                  type="number"
                  {...form.register("volumeCapacity", { valueAsNumber: true })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Unidad</Label>
                <select
                  {...form.register("unitOfMeasure")}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  <option value="LITERS">Litros</option>
                  <option value="UNITS">Unidades</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <Label className="font-bold cursor-pointer" htmlFor="hasTap">
                  ¿Tiene Caño Dispensor?
                </Label>
                <Switch
                  id="hasTap"
                  checked={form.watch("hasTap")}
                  onCheckedChange={(val) => form.setValue("hasTap", val)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="space-y-0.5">
                  <Label
                    className="font-bold cursor-pointer"
                    htmlFor="isReturnable"
                  >
                    Envase Retornable
                  </Label>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Genera deuda de envase al cliente.
                  </p>
                </div>
                <Switch
                  id="isReturnable"
                  checked={form.watch("isReturnableContainer")}
                  onCheckedChange={(val) =>
                    form.setValue("isReturnableContainer", val)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: FINANZAS */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2">
            Finanzas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold">
                Precio Base de Venta Público (S/)
              </Label>
              <Input
                type="number"
                step="0.10"
                {...form.register("basePrice", { valueAsNumber: true })}
                className="h-11 text-lg font-black text-green-700 bg-green-50 border-green-200"
              />
              {form.formState.errors.basePrice && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.basePrice.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-blue-700 hover:bg-blue-800 text-lg font-bold shadow-lg shadow-blue-900/20"
        >
          <Save className="mr-2 h-6 w-6" /> Guardar Producto en Yacco
        </Button>
      </form>
    </div>
  );
}
