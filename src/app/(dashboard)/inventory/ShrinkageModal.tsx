"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  shrinkageSchema,
  ShrinkageFormValues,
} from "@/core/validations/inventorySchemas";
import { registerShrinkageAction } from "./actions";
import { Product, ProductionBatch } from "@/core/entities/Inventory";
import { ShrinkageReason } from "@/core/entities/SystemSettings";
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
import {
  AlertTriangle,
  Package,
  Layers,
  FileText,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface ShrinkageModalProps {
  products: Product[];
  batches: ProductionBatch[];
  wasteReasons: ShrinkageReason[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function ShrinkageModal({
  products,
  batches,
  wasteReasons,
  open,
  onOpenChange,
  showTrigger = true,
}: ShrinkageModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const form = useForm<ShrinkageFormValues>({
    resolver: zodResolver(shrinkageSchema) as unknown as Resolver<ShrinkageFormValues>,
    defaultValues: {
      productId: "",
      lotNumber: "",
      quantity: 0,
      phase: "FILLED",
      reasonId: "",
      isRecyclable: false,
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedPhase = form.watch("phase");
  const selectedReasonId = form.watch("reasonId");

  // Filtrar lotes disponibles para el producto seleccionado
  const productBatches = useMemo(() => {
    if (!selectedProductId) return [];
    return batches.filter((b) => b.productId === selectedProductId && b.currentStock > 0);
  }, [selectedProductId, batches]);

  // Actualizar el toggle de reciclable según el motivo seleccionado
  useEffect(() => {
    if (selectedReasonId) {
      const reason = wasteReasons.find((r) => r.id === selectedReasonId);
      if (reason) {
        form.setValue("isRecyclable", reason.isRecyclableDefault);
      }
    }
  }, [selectedReasonId, wasteReasons, form]);

  // Limpiar lote si cambia a phase EMPTY
  useEffect(() => {
    if (selectedPhase === "EMPTY") {
      form.setValue("lotNumber", "");
    }
  }, [selectedPhase, form]);

  const selectedBatch = useMemo(() => {
    const lotNum = form.watch("lotNumber");
    return productBatches.find((b) => b.lotNumber === lotNum);
  }, [form.watch("lotNumber"), productBatches]);

  const availableStock = useMemo(() => {
    if (selectedPhase === "EMPTY") {
      const product = products.find((p) => p.id === selectedProductId);
      return product?.stockEmpty || 0;
    } else {
      return selectedBatch?.currentStock || 0;
    }
  }, [selectedPhase, selectedProductId, selectedBatch, products]);

  const onSubmit = async (values: ShrinkageFormValues) => {
    setIsPending(true);
    try {
      const result = await registerShrinkageAction(values);
      if (result.success) {
        toast.success("Merma registrada correctamente");
        form.reset();
        setIsOpen(false);
      } else {
        toast.error("Error", { description: result.error });
      }
    } catch (error: any) {
      toast.error("Error crítico", { description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-xl font-bold">
            <Trash2 className="mr-2 h-4 w-4" /> Registrar Merma
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-xl bg-white rounded-[2.5rem] overflow-hidden border-0 p-0 shadow-2xl">
        <DialogHeader className="bg-red-600 p-8 text-white">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <Trash2 className="h-7 w-7" />
            Merma de Planta
          </DialogTitle>
          <DialogDescription className="text-red-100 font-medium">
            Registra pérdidas físicas en el inventario por rotura o falla técnica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Fase */}
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Fase del Producto</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => form.setValue("phase", "FILLED")}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition-all ${
                    selectedPhase === "FILLED"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  LLENO
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("phase", "EMPTY")}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition-all ${
                    selectedPhase === "EMPTY"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  VACÍO
                </button>
              </div>
            </div>

            {/* Producto */}
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Producto</Label>
              <select
                {...form.register("productId")}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none"
              >
                <option value="">Seleccione...</option>
                {products.filter(p => p.isActive).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Lote (Solo si es Lleno) */}
            {selectedPhase === "FILLED" && (
              <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                <Label className="font-bold text-slate-700 ml-1">Lote de Producción</Label>
                <select
                  {...form.register("lotNumber")}
                  disabled={!selectedProductId}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none disabled:opacity-50"
                >
                  <option value="">Seleccione Lote...</option>
                  {productBatches.map((b) => (
                    <option key={b.lotNumber} value={b.lotNumber}>
                      {b.lotNumber} ({b.currentStock} u. disponibles)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="font-bold text-slate-700 ml-1">Motivo de Merma</Label>
              <select
                {...form.register("reasonId")}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none"
              >
                <option value="">Seleccione Motivo...</option>
                {wasteReasons.filter(r => r.phase === selectedPhase).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cantidad y Reciclable */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-3 bg-red-50 p-6 rounded-[2rem] border border-red-100">
              <Label className="font-black text-red-600 text-xs uppercase tracking-widest ml-1 flex justify-between">
                Cantidad Perdida
                <span className="text-red-400">Disp: {availableStock}</span>
              </Label>
              <Input
                {...form.register("quantity")}
                type="number"
                placeholder="0"
                className="h-12 text-3xl font-black bg-transparent border-0 border-b-2 border-red-200 rounded-none focus:ring-0 focus:border-red-600 transition-all text-red-700 placeholder:text-red-200"
              />
            </div>

            {selectedPhase === "FILLED" && (
              <div className="w-full sm:w-48 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-center gap-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${form.watch("isRecyclable") ? "text-emerald-500" : "text-slate-300"}`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase">¿Recuperar Envase?</span>
                </div>
                <Switch
                  checked={form.watch("isRecyclable")}
                  onCheckedChange={(val) => form.setValue("isRecyclable", val)}
                />
                <p className="text-[9px] text-center text-slate-400 font-medium">
                  Si se marca, la unidad sale de llenos pero entra a vacíos.
                </p>
              </div>
            )}
          </div>

          {form.formState.errors.lotNumber && (
             <p className="text-xs text-red-500 font-bold italic ml-2">
               {form.formState.errors.lotNumber.message}
             </p>
          )}

          <div className="pt-4 flex gap-3">
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
              disabled={isPending || (availableStock <= 0 && form.watch("quantity") > 0)}
              className="flex-[2] h-12 bg-red-600 hover:bg-red-700 font-black text-white rounded-xl shadow-xl shadow-red-200 transition-all disabled:opacity-50"
            >
              {isPending ? "Procesando..." : "Confirmar Merma"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
