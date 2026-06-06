"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerPaymentAction } from "../../actions";
import { Customer, Sale } from "@/core/entities/CRM";
import { User } from "@/core/entities/User";
import { Bank } from "@/core/entities/Bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  User as UserIcon,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  CheckCircle2,
  Save,
} from "lucide-react";
import {
  paymentBaseSchema,
  PaymentFormValues as DebtPaymentFormValues,
} from "@/core/validations/paymentSchema";

// Hacemos que el campo receivedById sea opcional a nivel de formulario y validamos bankId si es TRANSFER
import { z } from "zod";
const formSchema = paymentBaseSchema
  .extend({
    receivedById: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === "TRANSFER" && (!data.bankId || data.bankId.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "El banco es obligatorio para transferencias",
      path: ["bankId"],
    }
  )
  .superRefine((data, ctx) => {
    if (data.allocationMode === "DIRECTED") {
      const activeAllocations = data.allocations?.filter((a) => a.amount > 0) || [];
      if (activeAllocations.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe asignar al menos una venta con monto mayor a 0 en el modo dirigido",
          path: ["allocations"],
        });
      } else {
        const sum = activeAllocations.reduce((acc, curr) => acc + curr.amount, 0);
        if (Math.abs(sum - data.amount) > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La suma de las asignaciones (S/ ${sum.toFixed(2)}) debe ser igual al monto total (S/ ${data.amount.toFixed(2)})`,
            path: ["amount"],
          });
        }
      }
    }
  });

interface PaymentFormProps {
  customer: Customer;
  users: User[];
  pendingSales: Sale[]; // <-- Agregado para ver el detalle FIFO
  banks: Bank[];
}

export function PaymentForm({
  customer,
  users,
  pendingSales,
  banks,
}: PaymentFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const currentDebt = customer.debtAmount || 0;
  const todayStr = new Date().toISOString().split("T")[0];

  const form = useForm<DebtPaymentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: customer.id,
      amount: currentDebt, // Sugerimos pagar todo por defecto
      date: todayStr,
      paymentMethod: "CASH",
      bankId: "",
      bankName: "",
      reference: "",
      receivedById: "", // Puede quedar vacío
      notes: "",
      allocationMode: "FIFO",
      allocations: [],
    },
  });

  const watchAmount = form.watch("amount");
  const watchPaymentMethod = form.watch("paymentMethod");
  const watchAllocationMode = form.watch("allocationMode");
  const remainingDebt = Math.max(0, currentDebt - (Number(watchAmount) || 0));

  const [directedState, setDirectedState] = useState<
    Record<string, { checked: boolean; amount: number }>
  >({});

  const selectedCount = Object.values(directedState).filter((v) => v.checked).length;

  useEffect(() => {
    if (pendingSales && pendingSales.length > 0) {
      const initial: Record<string, { checked: boolean; amount: number }> = {};
      pendingSales.forEach((sale) => {
        const balance = sale.remainingBalance ?? sale.totalAmount;
        initial[sale.id] = { checked: false, amount: balance };
      });
      setDirectedState(initial);
    }
  }, [pendingSales]);

  useEffect(() => {
    if (watchAllocationMode === "FIFO") {
      form.setValue("allocations", []);
      form.setValue("amount", currentDebt);
      setDirectedState((prev) => {
        const resetState: Record<string, { checked: boolean; amount: number }> = {};
        Object.keys(prev).forEach((k) => {
          resetState[k] = { ...prev[k], checked: false };
        });
        return resetState;
      });
    }
  }, [watchAllocationMode, currentDebt, form]);

  useEffect(() => {
    if (watchPaymentMethod !== "TRANSFER") {
      form.setValue("bankId", "");
      form.setValue("bankName", "");
    }
  }, [watchPaymentMethod, form]);

  const handleCheckboxChange = (saleId: string, checked: boolean) => {
    const nextState = {
      ...directedState,
      [saleId]: {
        ...directedState[saleId],
        checked,
      },
    };
    setDirectedState(nextState);
    updateFormAllocations(nextState);
  };

  const handleAmountChange = (saleId: string, amountVal: number) => {
    const sale = pendingSales.find((s) => s.id === saleId);
    if (!sale) return;
    const max = sale.remainingBalance ?? sale.totalAmount;
    const clampedAmount = Math.max(0, Math.min(max, amountVal));

    const nextState = {
      ...directedState,
      [saleId]: {
        ...directedState[saleId],
        amount: clampedAmount,
      },
    };
    setDirectedState(nextState);
    updateFormAllocations(nextState);
  };

  const updateFormAllocations = (state: Record<string, { checked: boolean; amount: number }>) => {
    const activeAllocations = Object.entries(state)
      .filter(([, val]) => val.checked && val.amount > 0)
      .map(([saleId, val]) => ({ saleId, amount: val.amount }));

    const sum = activeAllocations.reduce((acc, curr) => acc + curr.amount, 0);

    form.setValue("allocations", activeAllocations);
    form.setValue("amount", Number(sum.toFixed(2)));
  };

  const onSubmit = async (values: DebtPaymentFormValues) => {
    if (values.amount > currentDebt) {
      toast.error("Monto excedido", {
        description: "No puedes cobrar más de lo que el cliente debe.",
      });
      return;
    }

    if (values.allocationMode === "DIRECTED") {
      const activeAllocations = values.allocations?.filter((a) => a.amount > 0) || [];
      if (activeAllocations.length === 0) {
        toast.error("Error en pago dirigido", {
          description: "Debe seleccionar y asignar al menos un ticket con monto mayor a 0.",
        });
        return;
      }
    }

    setIsPending(true);
    const selectedBank = banks.find((b) => b.id === values.bankId);
    const result = await registerPaymentAction({
      ...values,
      bankName: selectedBank ? selectedBank.name : undefined,
    });
    setIsPending(false);

    if (result.success) {
      const descriptionText =
        values.allocationMode === "DIRECTED"
          ? `Se aplicó el pago dirigido de S/ ${values.amount.toFixed(2)} a las ventas seleccionadas.`
          : `Se descontaron S/ ${values.amount.toFixed(2)} de la deuda mediante FIFO.`;
      toast.success("Pago registrado exitosamente", {
        description: descriptionText,
      });
      router.push("/collections");
      router.refresh();
    } else {
      toast.error("Error al registrar pago", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
          <BadgeDollarSign className="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Registrar Amortización
          </h2>
          <p className="text-emerald-300 font-medium text-sm mt-0.5">
            Ingreso de dinero y descuento de deuda usando conciliación FIFO.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* PANEL IZQUIERDO: RESUMEN Y DETALLE FIFO */}
        <div className="bg-slate-50 p-8 border-r border-slate-100 flex flex-col gap-8">
          {/* 1. Resumen del Cliente */}
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Cliente
              </p>
              <h3 className="font-black text-slate-800 text-lg leading-tight">
                {customer.name}
              </h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                {customer.documentType}: {customer.documentNumber}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                  Deuda Actual
                </p>
                <p className="text-2xl font-black text-red-600">
                  S/ {currentDebt.toFixed(2)}
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border transition-colors ${remainingDebt === 0 ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-widest mb-1 ${remainingDebt === 0 ? "text-emerald-600" : "text-orange-600"}`}
              >
                Deuda Post-Pago
              </p>
              <p
                className={`text-2xl font-black ${remainingDebt === 0 ? "text-emerald-700" : "text-orange-700"}`}
              >
                S/ {remainingDebt.toFixed(2)}
              </p>
              {remainingDebt === 0 && (
                <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Cuenta Saldada
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-200 w-full" />

          {/* 2. Detalle de Tickets */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4" />{" "}
              {watchAllocationMode === "DIRECTED"
                ? "Ventas Seleccionadas"
                : "Tickets Pendientes (FIFO)"}
            </h3>

            {pendingSales.length === 0 ? (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-emerald-600">
                  No hay tickets pendientes.
                </p>
              </div>
            ) : watchAllocationMode === "DIRECTED" ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {pendingSales.map((sale) => {
                  const maxAmount = sale.remainingBalance ?? sale.totalAmount;
                  const itemState = directedState[sale.id] || { checked: false, amount: maxAmount };
                  
                  return (
                    <div
                      key={sale.id}
                      className={`border p-3 rounded-xl shadow-sm transition-all ${
                        itemState.checked ? "bg-emerald-50/40 border-emerald-300" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={itemState.checked}
                            onChange={(e) => handleCheckboxChange(sale.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                            #{sale.id.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(sale.createdAt).toLocaleDateString("es-PE")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1 gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          Saldo: S/ {maxAmount.toFixed(2)}
                        </span>
                        
                        {itemState.checked && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-slate-400">S/</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={maxAmount}
                              value={itemState.amount}
                              onChange={(e) => handleAmountChange(sale.id, Number(e.target.value))}
                              className="w-20 h-7 text-right text-xs font-bold border border-slate-300 rounded px-1 text-emerald-700 bg-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {pendingSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                        #{sale.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString("es-PE")}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 mt-1 flex justify-between">
                      <span>Saldo:</span>
                      <span className="text-red-500">
                        S/{" "}
                        {(sale.remainingBalance ?? sale.totalAmount).toFixed(2)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {watchAllocationMode === "DIRECTED" && selectedCount === 0 && (
              <p className="text-xs text-red-500 font-bold mt-2">
                * Debe seleccionar al menos un ticket para pago dirigido.
              </p>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: FORMULARIO */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-8 lg:col-span-2 space-y-8 flex flex-col justify-between"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Modo de Cobro *
              </Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => form.setValue("allocationMode", "FIFO")}
                  className={`py-3 px-4 text-xs font-black rounded-lg transition-all ${
                    watchAllocationMode === "FIFO"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800 bg-transparent"
                  }`}
                >
                  Pago a cuenta (FIFO)
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("allocationMode", "DIRECTED")}
                  className={`py-3 px-4 text-xs font-black rounded-lg transition-all ${
                    watchAllocationMode === "DIRECTED"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800 bg-transparent"
                  }`}
                >
                  Pago dirigido a tickets
                </button>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-emerald-500" /> Monto a
                Pagar (S/) *
              </Label>
              <Input
                {...form.register("amount", { valueAsNumber: true })}
                type="number"
                step="0.10"
                min="0.1"
                max={currentDebt}
                readOnly={watchAllocationMode === "DIRECTED"}
                className={`h-16 text-3xl font-black border-2 bg-emerald-50/50 focus:border-emerald-500 transition-all ${
                  watchAllocationMode === "DIRECTED"
                    ? "text-slate-600 border-slate-200 bg-slate-50"
                    : "text-emerald-600 border-emerald-100"
                }`}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" /> Fecha de Pago *
              </Label>
              <Input
                {...form.register("date")}
                type="date"
                className="h-12 border-slate-200 font-bold text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" /> Método de Pago
              </Label>
              <select
                {...form.register("paymentMethod")}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="YAPE_PLIN">Yape / Plin</option>
              </select>
            </div>

            {watchPaymentMethod === "TRANSFER" && (
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-500" /> Banco de Destino *
                </Label>
                <select
                  {...form.register("bankId")}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
                >
                  <option value="">-- Seleccionar Banco --</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.accountNumber ? `(${b.accountNumber})` : ""}
                    </option>
                  ))}
                </select>
                {form.formState.errors.bankId && (
                  <p className="text-xs text-red-500 font-bold">
                    {form.formState.errors.bankId.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> Nº Ref. /
                Operación
              </Label>
              <Input
                {...form.register("reference")}
                placeholder="Ej: 00123994"
                className="h-12 border-slate-200 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-purple-500" /> Recibido Por
                (Opcional)
              </Label>
              <select
                {...form.register("receivedById")}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
              >
                <option value="">-- Pago Directo / Sin Cajero --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 italic">
                Si el admin recibió directo por Yape, dejar vacío.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Observaciones Extras
              </Label>
              <Input
                {...form.register("notes")}
                placeholder="Ej: Abono Yape a la cuenta de la empresa..."
                className="h-12 border-slate-200"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end gap-4 mt-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="font-bold text-slate-500 h-14 px-6 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || (watchAllocationMode === "DIRECTED" && selectedCount === 0)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-10 shadow-lg shadow-slate-900/20 h-14 rounded-xl disabled:opacity-50"
            >
              {isPending ? (
                "Registrando..."
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />{" "}
                  {watchAllocationMode === "DIRECTED"
                    ? "Aplicar Abono Dirigido"
                    : "Aplicar Abono (FIFO)"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
