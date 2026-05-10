"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productionBatchSchema,
  ProductionBatchFormValues,
} from "@/core/validations/inventorySchemas";
import { registerProductionAction } from "./actions";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Factory, Calendar, PackagePlus, FileText, Save } from "lucide-react";

interface ProductionModalProps {
  products: Product[];
}

export function ProductionModal({ products }: ProductionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Filtramos para mostrar solo los productos que requieren producción (ej. no accesorios)
  const producibleProducts = products.filter(
    (p) => p.operationalCategory !== "ACCESSORY",
  );

  const form = useForm<ProductionBatchFormValues>({
    resolver: zodResolver(productionBatchSchema) as any,
    defaultValues: {
      productId: "",
      quantityProduced: 0,
      productionDate: new Date().toISOString().split("T")[0], // Fecha de hoy por defecto (YYYY-MM-DD)
      isTollManufacturing: false,
      brandId: "",
      notes: "",
    },
  });

  const isMaquila = form.watch("isTollManufacturing");

  const onSubmit = async (values: ProductionBatchFormValues) => {
    setIsPending(true);
    const result = await registerProductionAction(values);
    setIsPending(false);

    if (result.success) {
      toast.success("Lote de producción registrado exitosamente");
      form.reset();
      setIsOpen(false); // Cerramos el modal
    } else {
      toast.error("Error en producción", { description: result.error });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 font-bold shadow-md">
          <Factory className="mr-2 h-4 w-4 text-orange-400" /> Declarar
          Producción
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl bg-white rounded-3xl overflow-hidden border-0 p-0">
        <DialogHeader className="bg-slate-900 p-6">
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
            <Factory className="h-6 w-6 text-orange-400" />
            Declaración de Producción
          </DialogTitle>
          <DialogDescription className="text-slate-300 font-medium">
            Registre los lotes de llenado. El sistema descontará automáticamente
            los envases vacíos necesarios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Fecha de Producción */}
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" /> Fecha del Lote
              </Label>
              <Input
                {...form.register("productionDate")}
                type="date"
                className="h-11 font-medium border-slate-200"
              />
              {form.formState.errors.productionDate && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.productionDate.message}
                </p>
              )}
            </div>

            {/* Producto Seleccionado */}
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2 text-slate-700">
                <PackagePlus className="h-4 w-4 text-slate-400" /> Producto
                (SKU)
              </Label>
              <select
                {...form.register("productId")}
                className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Seleccione un producto --</option>
                {producibleProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              {form.formState.errors.productId && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.productId.message}
                </p>
              )}
            </div>
          </div>

          {/* Cantidad Producida */}
          <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <Label className="font-black text-blue-900 text-lg">
              Cantidad Producida (Unidades Llenas)
            </Label>
            <Input
              {...form.register("quantityProduced")}
              type="number"
              min="1"
              className="h-14 text-2xl font-black text-blue-700 border-blue-200"
            />
            {form.formState.errors.quantityProduced && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.quantityProduced.message}
              </p>
            )}
          </div>

          {/* Sección de Maquila */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-bold text-slate-800 text-base block">
                  ¿Es Producción de Maquila?
                </Label>
                <span className="text-xs text-slate-500 font-medium">
                  Llenado para otras marcas.
                </span>
              </div>
              <Controller
                name="isTollManufacturing"
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
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label className="font-bold text-slate-700">
                  Nombre de la Marca (Maquila)
                </Label>
                <Input
                  {...form.register("brandId")}
                  placeholder="Ej: Agua Vida, San Luis..."
                  className="h-11 border-slate-200"
                />
                {form.formState.errors.brandId && (
                  <p className="text-xs text-red-500 font-bold">
                    {form.formState.errors.brandId.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notas Adicionales */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <FileText className="h-4 w-4 text-slate-400" /> Notas del
              Encargado (Opcional)
            </Label>
            <Input
              {...form.register("notes")}
              placeholder="Observaciones sobre este lote..."
              className="h-11 border-slate-200"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-700 hover:bg-blue-800 font-black px-8"
            >
              {isPending ? (
                "Registrando..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Confirmar Lote
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
