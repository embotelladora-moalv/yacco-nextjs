"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Factory,
  Calendar,
  PackagePlus,
  FileText,
  Save,
  ShieldCheck,
  Factory as FactoryIcon,
} from "lucide-react";

interface ProductionModalProps {
  products: Product[];
}

export function ProductionModal({ products }: ProductionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Solo productos que se pueden llenar (no accesorios)
  const producibleProducts = products.filter(
    (p) => p.operationalCategory !== "ACCESSORY",
  );

  const form = useForm<ProductionBatchFormValues>({
    resolver: zodResolver(productionBatchSchema) as any,
    defaultValues: {
      productId: "",
      quantityProduced: 0,
      productionDate: new Date().toISOString().split("T")[0],
      isTollManufacturing: false,
      brandName: "",
      notes: "",
    },
  });

  // Observamos el producto seleccionado para automatizar la Maquila
  const selectedProductId = form.watch("productId");

  useEffect(() => {
    const product = producibleProducts.find((p) => p.id === selectedProductId);

    if (product) {
      // Si el producto en el catálogo ya es Maquila, marcamos el lote automáticamente
      form.setValue("isTollManufacturing", product.isMaquila || false);
      form.setValue("brandName", product.brandName || "");
    } else {
      form.setValue("isTollManufacturing", false);
      form.setValue("brandName", "");
    }
  }, [selectedProductId, producibleProducts, form]);

  const isMaquila = form.watch("isTollManufacturing");
  const currentBrand = form.watch("brandName");

  const onSubmit = async (values: ProductionBatchFormValues) => {
    setIsPending(true);
    const result = await registerProductionAction(values);
    setIsPending(false);

    if (result.success) {
      toast.success("Producción registrada y stock actualizado");
      form.reset();
      setIsOpen(false);
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 font-bold shadow-md  px-6 rounded-xl transition-all">
          <Factory className="mr-2 h-4 w-4 text-orange-400" /> Declarar
          Producción
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl bg-white rounded-[2.5rem] overflow-hidden border-0 p-0 shadow-2xl">
        <DialogHeader className="bg-slate-900 p-8 text-white">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <FactoryIcon className="h-7 w-7 text-orange-400" />
            Orden de Llenado
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            El sistema descontará automáticamente los envases vacíos del
            inventario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Fecha */}
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">
                Fecha de Producción
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  {...form.register("productionDate")}
                  type="date"
                  className="h-11 pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Producto */}
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">
                Producto / SKU
              </Label>
              <div className="relative">
                <PackagePlus className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select
                  {...form.register("productId")}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none"
                >
                  <option value="">Seleccione SKU...</option>
                  {producibleProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isMaquila ? `(Maquila)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cantidad con visualización de impacto */}
          <div className="space-y-3 bg-blue-600 p-8 rounded-[2rem] shadow-lg shadow-blue-600/20 text-white">
            <Label className="font-black text-blue-100 text-sm uppercase tracking-widest ml-1">
              Unidades a Producir
            </Label>
            <Input
              {...form.register("quantityProduced")}
              type="number"
              min="1"
              placeholder="0"
              className="h-16 text-4xl font-black bg-transparent border-0 border-b-2 border-blue-400 rounded-none focus:ring-0 focus:border-white transition-all text-white placeholder:text-blue-400"
            />
            <p className="text-[10px] font-bold text-blue-200 italic flex items-center gap-1 mt-2">
              <ShieldCheck className="h-3 w-3" /> Se validará disponibilidad de
              envases vacíos antes de procesar.
            </p>
          </div>

          {/* Info de Maquila (Automática y Solo Lectura) */}
          {isMaquila && (
            <div className="p-5 bg-purple-50 border-2 border-purple-100 rounded-2xl flex items-center justify-between animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg text-white">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-tighter">
                    Lote de Maquila Detectado
                  </p>
                  <p className="text-lg font-black text-purple-900 leading-none">
                    {currentBrand}
                  </p>
                </div>
              </div>
              <BadgeCheck className="h-8 w-8 text-purple-200" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-bold text-slate-700 text-sm ml-1">
              Notas u Observaciones
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                {...form.register("notes")}
                placeholder="Ej: Turno mañana, operador Carlos..."
                className="h-11 pl-10 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-[2] h-12 bg-slate-900 hover:bg-slate-800 font-black text-white rounded-xl shadow-xl transition-all"
            >
              {isPending ? "Sincronizando..." : "Confirmar Producción"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BadgeCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
