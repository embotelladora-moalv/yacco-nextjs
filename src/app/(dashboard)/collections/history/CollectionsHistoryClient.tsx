"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Calendar,
  BadgeDollarSign,
  TrendingUp,
  Ban,
  CheckCircle2,
  Loader2,
  User,
  Building,
  PiggyBank
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "YAPE_PLIN";
  bankId?: string | null;
  bankName?: string | null;
  receivedById: string;
  receivedByName: string;
  status: "ACTIVE" | "CANCELLED";
  allocationMode: "FIFO" | "DIRECTED";
  createdAt: string;
  date: string;
  notes?: string;
}

interface CollectionsHistoryClientProps {
  payments: Payment[];
  startDate: string;
  endDate: string;
}

export function CollectionsHistoryClient({
  payments,
  startDate: initialStartDate,
  endDate: initialEndDate,
}: CollectionsHistoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const applyFilters = (start: string, end: string) => {
    const query = new URLSearchParams();
    if (start) query.set("startDate", start);
    if (end) query.set("endDate", end);

    startTransition(() => {
      router.push(`${pathname}?${query.toString()}`);
    });
  };

  const handleClearFilters = () => {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
    setStartDate(today);
    setEndDate(today);
    applyFilters(today, today);
  };

  // Calculate totals
  const activePayments = payments.filter((p) => p.status === "ACTIVE");
  const totalAmount = activePayments.reduce((sum, p) => sum + p.amount, 0);

  const totalCash = activePayments
    .filter((p) => p.paymentMethod === "CASH")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalTransfer = activePayments
    .filter((p) => p.paymentMethod === "TRANSFER")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalYapePlin = activePayments
    .filter((p) => p.paymentMethod === "YAPE_PLIN")
    .reduce((sum, p) => sum + p.amount, 0);

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "CASH":
        return "Efectivo";
      case "TRANSFER":
        return "Transferencia";
      case "YAPE_PLIN":
        return "Yape/Plin";
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6 relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2rem]">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        </div>
      )}

      {/* FILTROS Y RANGO DE FECHAS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Rango de fechas:</span>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  applyFilters(e.target.value, endDate);
                }}
                className="w-full sm:w-40 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  applyFilters(startDate, e.target.value);
                }}
                className="w-full sm:w-40 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="font-bold rounded-xl h-10 px-5 text-xs text-slate-600 hover:text-red-600 border-slate-200 animate-in"
        >
          Hoy
        </Button>
      </div>

      {/* METRICAS DE RECAUDACIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL COBRADO */}
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
              Total Cobrado
            </p>
            <p className="text-2xl font-black text-red-600">
              S/ {totalAmount.toFixed(2)}
            </p>
            <p className="text-xs text-red-500 font-medium">
              {activePayments.length} pagos activos
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* EFECTIVO */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              Efectivo
            </p>
            <p className="text-2xl font-black text-emerald-600">
              S/ {totalCash.toFixed(2)}
            </p>
            <p className="text-xs text-emerald-500 font-medium">
              Recaudo físico
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <BadgeDollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* TRANSFERENCIA */}
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              Transferencias
            </p>
            <p className="text-2xl font-black text-blue-600">
              S/ {totalTransfer.toFixed(2)}
            </p>
            <p className="text-xs text-blue-500 font-medium">
              Cuentas bancarias
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Building className="h-6 w-6" />
          </div>
        </div>

        {/* YAPE / PLIN */}
        <div className="bg-purple-50 border border-purple-100 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
              Yape / Plin
            </p>
            <p className="text-2xl font-black text-purple-600">
              S/ {totalYapePlin.toFixed(2)}
            </p>
            <p className="text-xs text-purple-500 font-medium">
              Billeteras digitales
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
            <PiggyBank className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* TABLA DE COBROS */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4">Método / Banco</th>
                <th className="px-6 py-4">Recibido Por</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20 text-slate-300" />
                    No hay cobros registrados en este período.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const isCancelled = payment.status === "CANCELLED";

                  return (
                    <tr
                      key={payment.id}
                      className={`transition-colors hover:bg-slate-50/50 ${
                        isCancelled ? "opacity-50 line-through bg-slate-50/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {formatDateTime(payment.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900 block">
                          {payment.customerName}
                        </span>
                        {payment.notes && (
                          <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                            Nota: {payment.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-base font-black ${isCancelled ? "text-slate-400" : "text-red-600"}`}>
                          S/ {payment.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">
                        <div className="flex flex-col">
                          <span>{getPaymentMethodLabel(payment.paymentMethod)}</span>
                          {payment.paymentMethod === "TRANSFER" && payment.bankName && (
                            <span className="text-xs text-slate-400 font-medium">
                              {payment.bankName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{payment.receivedByName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isCancelled ? (
                          <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                            <Ban className="h-3 w-3" />
                            Anulado
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
