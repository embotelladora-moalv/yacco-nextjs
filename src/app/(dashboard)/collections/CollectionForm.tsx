"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  paymentSchema,
  PaymentFormValues,
} from "@/core/validations/paymentSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerPaymentAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Wallet, Info, FileDigit } from "lucide-react";

export function CollectionForm({
  customersWithDebt,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customersWithDebt: any[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      customerId: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
      reference: "",
      notes: "",
      allocationMode: "FIFO",
      allocations: [],
    },
  });

  // Observamos qué cliente está seleccionado para mostrar su deuda real
  const selectedCustomerId = form.watch("customerId");
  const selectedCustomer = customersWithDebt.find(
    (c) => c.id === selectedCustomerId,
  );

  const onSubmit = async (values: PaymentFormValues) => {
    setIsLoading(true);
    const result = await registerPaymentAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success("Pago registrado exitosamente", {
        description: "Los pedidos más antiguos han sido amortizados.",
      });
      form.reset();
      router.refresh(); // Para que el selector actualice las deudas
    } else {
      toast.error("Atención", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-3">
        <Wallet className="h-6 w-6 text-green-400" />
        <div>
          <h2 className="text-xl font-black">Registrar Ingreso a Cuenta</h2>
          <p className="text-slate-400 text-sm">
            Amortización automática (Método FIFO)
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* SELECCIÓN DE CLIENTE Y DEUDA */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <Label className="font-bold text-slate-700">
            Seleccionar Cliente Moroso
          </Label>
          <select
            {...form.register("customerId")}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-800"
          >
            <option value="">Buscar cliente con deuda...</option>
            {customersWithDebt.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - Deuda: S/ {c.debtAmount.toFixed(2)}
              </option>
            ))}
          </select>
          {form.formState.errors.customerId && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.customerId.message}
            </p>
          )}

          {selectedCustomer && (
            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900">
                  Deuda Total Activa: S/{" "}
                  {selectedCustomer.debtAmount.toFixed(2)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  El sistema tomará el monto que ingreses y pagará
                  automáticamente los pedidos más antiguos de{" "}
                  <b>{selectedCustomer.name}</b> hasta agotar el fondo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* DETALLES DEL PAGO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">
              Monto a Amortizar (S/)
            </Label>
            <Input
              type="number"
              step="0.10"
              {...form.register("amount", { valueAsNumber: true })}
              className="h-12 font-black text-xl text-green-700 bg-green-50 border-green-200 focus-visible:ring-green-600"
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-slate-700">
              Método de Ingreso
            </Label>
            <select
              {...form.register("paymentMethod")}
              className="w-full h-12 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none font-medium"
            >
              <option value="CASH">Efectivo (Caja Física)</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="YAPE_PLIN">Yape / Plin</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="font-bold text-slate-700 flex items-center gap-2">
              <FileDigit className="h-4 w-4 text-slate-400" /> N° de Operación /
              Referencia (Opcional)
            </Label>
            <Input
              {...form.register("reference")}
              placeholder="Ej: 89456123 o 'Entregado a Juan'"
              className="h-11"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !selectedCustomer}
          className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-black shadow-lg shadow-green-900/20"
        >
          Procesar Pago y Actualizar Saldos
        </Button>
      </form>
    </div>
  );
}
