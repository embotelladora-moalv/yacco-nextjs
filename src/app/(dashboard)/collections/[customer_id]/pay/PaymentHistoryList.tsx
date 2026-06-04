"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelPaymentAction } from "../../actions"; // Asegúrate de que esta ruta hacia tus Server Actions sea correcta
import {
  History,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Hash,
  Ban,
  AlertTriangle,
} from "lucide-react";

interface PaymentHistoryListProps {
  payments: any[];
}

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderMethod = (method: string) => {
    const methods: Record<string, string> = {
      TRANSFER: "Transferencia / Yape",
      CASH: "Efectivo",
      CHECK: "Cheque",
    };
    return methods[method] || method;
  };

  const handleCancelPayment = async (paymentId: string, customerId: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de anular este pago? El saldo volverá a ser deuda para el cliente y los tickets volverán a estar pendientes.",
      )
    ) {
      return;
    }

    setIsCancelling(paymentId);
    const result = await cancelPaymentAction(paymentId, customerId);
    setIsCancelling(null);

    if (result.success) {
      toast.success("Pago anulado", {
        description: "La deuda ha sido recalculada correctamente.",
      });
    } else {
      toast.error("Error al anular", { description: result.error });
    }
  };

  if (payments.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
        <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 font-bold">
          No hay abonos registrados todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2">
        <History className="h-4 w-4" /> Historial de Abonos Recientes
      </h3>

      <div className="grid gap-3">
        {payments.map((payment) => {
          const isCancelled = payment.status === "CANCELLED";

          return (
            <div
              key={payment.id}
              className={`bg-white border rounded-[1.5rem] overflow-hidden shadow-sm transition-all ${
                isCancelled ? "border-red-200 opacity-75" : "border-slate-200"
              }`}
            >
              {/* CABECERA DEL PAGO */}
              <div
                onClick={() => toggleExpand(payment.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                      isCancelled
                        ? "bg-red-50 border-red-100"
                        : "bg-emerald-50 border-emerald-100"
                    }`}
                  >
                    {isCancelled ? (
                      <Ban className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-black ${
                        isCancelled
                          ? "text-red-600 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      S/ {payment.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {new Date(payment.createdAt).toLocaleDateString("es-PE", {
                        timeZone: "America/Lima",
                      })}{" "}
                      {renderMethod(payment.paymentMethod)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      Estado
                    </p>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isCancelled
                          ? "text-red-600 bg-red-50"
                          : "text-emerald-600 bg-emerald-50"
                      }`}
                    >
                      {isCancelled ? "ANULADO" : "ACTIVO"}
                    </span>
                  </div>
                  {expandedId === payment.id ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* DETALLE EXPANDIBLE (FIFO MEMORY) */}
              {expandedId === payment.id && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-50 bg-slate-50/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Distribución del Abono:
                  </p>
                  <div className="space-y-2">
                    {payment.appliedTo?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3 text-slate-400" />
                          <span className="font-bold text-slate-600">
                            Ticket #{item.saleId.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-black text-slate-900">
                          S/ {item.amountApplied.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {payment.notes && (
                    <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1">
                        Observaciones:
                      </p>
                      <p className="text-xs font-medium text-slate-600 italic">
                        {payment.notes}
                      </p>
                    </div>
                  )}

                  {/* BOTÓN DE ANULAR (Solo si no está anulado ya) */}
                  {!isCancelled && (
                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() =>
                          handleCancelPayment(payment.id, payment.customerId)
                        }
                        disabled={isCancelling === payment.id}
                        className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isCancelling === payment.id ? (
                          "Procesando..."
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3" /> Anular Pago
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
