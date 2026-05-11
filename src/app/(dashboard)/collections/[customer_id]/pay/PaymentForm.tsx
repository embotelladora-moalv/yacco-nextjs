"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerPaymentAction } from "../../actions";
import { Customer } from "@/core/entities/CRM";
import { User } from "@/core/entities/User";
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
  FileText,
  ArrowRight,
  CheckCircle2,
  Save,
} from "lucide-react";
import {
  paymentSchema as debtPaymentSchema,
  PaymentFormValues as DebtPaymentFormValues,
} from "@/core/validations/paymentSchema";

interface PaymentFormProps {
  customer: Customer;
  users: User[]; // Para saber quién registra el cobro
}

export function PaymentForm({ customer, users }: PaymentFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const currentDebt = customer.debtAmount || 0;
  const todayStr = new Date().toISOString().split("T")[0];

  const form = useForm<DebtPaymentFormValues>({
    resolver: zodResolver(debtPaymentSchema) as any,
    defaultValues: {
      customerId: customer.id,
      amount: currentDebt, // Por defecto sugerimos pagar todo
      date: todayStr,
      paymentMethod: "TRANSFER",
      reference: "",
      receivedById: "",
      notes: "",
    },
  });

  const watchAmount = form.watch("amount");
  const remainingDebt = Math.max(0, currentDebt - (Number(watchAmount) || 0));

  const onSubmit = async (values: DebtPaymentFormValues) => {
    if (values.amount > currentDebt) {
      toast.error("Monto excedido", {
        description: "No puedes cobrar más de lo que el cliente debe.",
      });
      return;
    }

    setIsPending(true);
    const result = await registerPaymentAction(values);
    setIsPending(false);

    if (result.success) {
      toast.success("Pago registrado exitosamente", {
        description: `Se descontaron S/ ${values.amount} de la deuda.`,
      });
      router.push("/collections");
      router.refresh();
    } else {
      toast.error("Error al registrar pago", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
          <BadgeDollarSign className="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Registrar Amortización
          </h2>
          <p className="text-emerald-300 font-medium text-sm mt-0.5">
            Ingreso de dinero y descuento de deuda en cuenta corriente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* PANEL IZQUIERDO: RESUMEN DEL CLIENTE */}
        <div className="bg-slate-50 p-8 border-r border-slate-100 flex flex-col justify-between">
          <div className="space-y-6">
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

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                Deuda Actual
              </p>
              <p className="text-3xl font-black text-red-600">
                S/ {currentDebt.toFixed(2)}
              </p>
            </div>

            <ArrowRight className="h-6 w-6 text-slate-300 mx-auto rotate-90 md:rotate-0" />

            <div
              className={`p-4 rounded-xl border transition-colors ${remainingDebt === 0 ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-widest mb-1 ${remainingDebt === 0 ? "text-emerald-600" : "text-orange-600"}`}
              >
                Deuda Restante
              </p>
              <p
                className={`text-3xl font-black ${remainingDebt === 0 ? "text-emerald-700" : "text-orange-700"}`}
              >
                S/ {remainingDebt.toFixed(2)}
              </p>
              {remainingDebt === 0 && (
                <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Deuda Saldada
                </p>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: FORMULARIO */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-8 md:col-span-2 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Monto a Pagar (S/) *
              </Label>
              <Input
                {...form.register("amount")}
                type="number"
                step="0.10"
                min="0.1"
                max={currentDebt}
                className="h-14 text-2xl font-black text-emerald-600 border-2 border-emerald-100 bg-emerald-50/30 focus:border-emerald-500"
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
                className="h-14 border-slate-200 font-bold text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" /> Método de Pago
              </Label>
              <select
                {...form.register("paymentMethod")}
                className="w-full h-14 px-4 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
              >
                <option value="TRANSFER">Transferencia / Yape / Plin</option>
                <option value="CASH">Efectivo Físico</option>
                <option value="CHECK">Cheque</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> Nº Operación /
                Referencia
              </Label>
              <Input
                {...form.register("reference")}
                placeholder="Ej: 00123994"
                className="h-14 border-slate-200 font-medium"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-purple-500" /> Cajero /
                Recibido Por *
              </Label>
              <select
                {...form.register("receivedById")}
                className="w-full h-14 px-4 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
              >
                <option value="">-- Seleccione quién recibe --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.receivedById && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.receivedById.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Observaciones Extras
              </Label>
              <Input
                {...form.register("notes")}
                placeholder="Ej: Pago parcial correspondiente a la factura F001..."
                className="h-12 border-slate-200"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="font-bold text-slate-500 h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-10 shadow-lg shadow-slate-900/20 h-12 rounded-xl"
            >
              {isPending ? (
                "Registrando..."
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" /> Confirmar Pago
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
