"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  cashMovementSchema,
  CashMovementFormValues,
} from "@/core/validations/financeSchemas";
import { registerCashMovementAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  FileText,
  Banknote,
  Truck,
  Save,
} from "lucide-react";
import { FinanceCategory } from "@/core/entities/Finance";
import { DispatchManifest } from "@/core/entities/Dispatch";

interface FinanceFormProps {
  categories: FinanceCategory[];
  activeManifests: DispatchManifest[];
}

export function FinanceForm({ categories, activeManifests }: FinanceFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];

  const form = useForm<CashMovementFormValues>({
    resolver: zodResolver(cashMovementSchema) as any,
    defaultValues: {
      type: "EXPENSE", // Por defecto es un gasto (es lo más común)
      categoryId: "",
      categoryName: "",
      amount: 0,
      description: "",
      paymentMethod: "CASH",
      manifestId: "",
      date: todayStr,
    },
  });

  const watchType = form.watch("type");

  // Filtramos las categorías según el tipo seleccionado
  const availableCategories = categories.filter((c) => c.type === watchType);

  const onSubmit = async (values: CashMovementFormValues) => {
    setIsPending(true);

    // Auto-completar el nombre de la categoría para el historial
    const selectedCategory = categories.find((c) => c.id === values.categoryId);
    const finalValues = {
      ...values,
      categoryName: selectedCategory?.name || "Sin Categoría",
    };

    const result = await registerCashMovementAction(finalValues);
    setIsPending(false);

    if (result.success) {
      toast.success("Movimiento registrado exitosamente");
      router.push("/finance");
      router.refresh();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div
        className={`p-6 text-white flex items-center gap-4 transition-colors ${watchType === "INCOME" ? "bg-emerald-600" : "bg-red-600"}`}
      >
        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
          <Wallet className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {watchType === "INCOME" ? "Registrar Ingreso" : "Registrar Gasto"}
          </h2>
          <p className="text-white/80 font-medium text-sm mt-0.5">
            Ingresa los detalles del comprobante o ticket.
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="p-6 md:p-8 space-y-8"
      >
        {/* TIPO DE MOVIMIENTO (TABS VISUALES) */}
        <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              form.setValue("type", "EXPENSE");
              form.setValue("categoryId", ""); // Resetear categoría al cambiar de tipo
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              watchType === "EXPENSE"
                ? "bg-white text-red-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowDownRight className="h-4 w-4" /> Es una Salida (Gasto)
          </button>
          <button
            type="button"
            onClick={() => {
              form.setValue("type", "INCOME");
              form.setValue("categoryId", "");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              watchType === "INCOME"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" /> Es un Ingreso Extra
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CATEGORÍA */}
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Motivo / Categoría
              *
            </Label>
            <select
              {...form.register("categoryId")}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold"
            >
              <option value="">Seleccione un motivo...</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.categoryId && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>

          {/* MONTO */}
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-500" /> Monto (S/) *
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                S/
              </span>
              <Input
                {...form.register("amount")}
                type="number"
                step="0.10"
                min="0.1"
                className={`h-12 pl-10 font-black text-xl border-slate-200 ${watchType === "INCOME" ? "text-emerald-600" : "text-red-600"}`}
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* FECHA */}
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" /> Fecha del Recibo
              *
            </Label>
            <Input
              {...form.register("date")}
              type="date"
              className="h-12 border-slate-200 font-bold"
            />
          </div>

          {/* MÉTODO DE PAGO */}
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-500" /> Método de Pago
            </Label>
            <select
              {...form.register("paymentMethod")}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 font-bold"
            >
              <option value="CASH">Efectivo de Caja Chica</option>
              <option value="TRANSFER">Transferencia / Yape / Plin</option>
              <option value="CARD">Tarjeta</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
        </div>

        {/* DESCRIPCIÓN */}
        <div className="space-y-3 border-t border-slate-100 pt-6">
          <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
            Descripción Detallada *
          </Label>
          <Input
            {...form.register("description")}
            placeholder="Ej: Peaje de ida por Panamericana Sur - Factura F001-233"
            className="h-12 border-slate-200"
          />
          {form.formState.errors.description && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        {/* VÍNCULO LOGÍSTICO (OPCIONAL) */}
        {watchType === "EXPENSE" && activeManifests.length > 0 && (
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3 mt-6">
            <Label className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
              <Truck className="h-4 w-4" /> Vincular a Camión en Ruta (Opcional)
            </Label>
            <p className="text-[10px] font-medium text-blue-600 mb-2">
              Si este gasto lo hizo un chofer con el dinero de su caja chica,
              selecciónalo aquí para que se descuente en su liquidación de hoy.
            </p>
            <select
              {...form.register("manifestId")}
              className="w-full h-12 px-4 rounded-xl border border-blue-200 bg-white font-bold text-slate-700"
            >
              <option value="">
                No vincular a ninguna ruta (Gasto de Planta)
              </option>
              {activeManifests.map((m) => (
                <option key={m.id} value={m.id}>
                  Camión {m.truckPlate} - Manifiesto {m.manifestNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* BOTONES */}
        <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500 h-12 px-6"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className={`text-white font-black px-10 shadow-lg rounded-xl h-12 ${watchType === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"}`}
          >
            {isPending ? (
              "Guardando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Registrar Movimiento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
