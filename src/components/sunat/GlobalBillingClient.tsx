"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  ReceiptText,
  Calendar,
  DollarSign,
  CheckSquare,
  Square,
  Loader2,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { emitirComprobanteAction } from "@/app/actions/sunatActions";
import { useRouter } from "next/navigation";

interface GlobalBillingClientProps {
  pendingSales: any[];
  customersData: Record<string, any>;
}

export default function GlobalBillingClient({
  pendingSales,
  customersData,
}: GlobalBillingClientProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const router = useRouter();

  // 1. Agrupar las ventas pendientes por Cliente
  const groupedSales = useMemo(() => {
    const groups: Record<string, any[]> = {};
    pendingSales.forEach((sale) => {
      if (!groups[sale.customerId]) {
        groups[sale.customerId] = [];
      }
      groups[sale.customerId].push(sale);
    });
    return groups;
  }, [pendingSales]);

  // 2. Manejador de selección múltiple
  const toggleSaleSelection = (saleId: string) => {
    setSelectedSales((prev) =>
      prev.includes(saleId)
        ? prev.filter((id) => id !== saleId)
        : [...prev, saleId],
    );
  };

  const selectAllCustomerSales = (customerId: string, salesIds: string[]) => {
    const allSelected = salesIds.every((id) => selectedSales.includes(id));
    if (allSelected) {
      // Deseleccionar todas las de este cliente
      setSelectedSales((prev) => prev.filter((id) => !salesIds.includes(id)));
    } else {
      // Seleccionar todas las de este cliente (sin duplicar)
      setSelectedSales((prev) => Array.from(new Set([...prev, ...salesIds])));
    }
  };

  // 3. Acción de Emisión Consolidada
  const handleConsolidar = async (customerId: string, tipo: "01" | "03") => {
    const salesToInvoice = pendingSales
      .filter(
        (s) => s.customerId === customerId && selectedSales.includes(s.id),
      )
      .map((s) => s.id);

    if (salesToInvoice.length === 0) {
      toast.error("Seleccione al menos un ticket para facturar.");
      return;
    }

    const customer = customersData[customerId];
    if (
      tipo === "01" &&
      (!customer?.documentNumber || customer.documentNumber.length !== 11)
    ) {
      toast.error(
        `Para emitir Factura, ${customer?.name} debe tener RUC válido (11 dígitos).`,
      );
      return;
    }

    setLoading(true);
    // Llamamos a la acción enviando el ARREGLO de IDs seleccionados
    const res = await emitirComprobanteAction(salesToInvoice, tipo);

    if (res.success) {
      toast.success(
        `¡Consolidación exitosa! Comprobante ${res.documentId} emitido.`,
      );
      setSelectedSales([]); // Limpiar selección
      router.refresh(); // Recargar datos
    } else {
      toast.error(res.error || "Error al emitir el comprobante.");
    }
    setLoading(false);
  };

  if (pendingSales.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] p-16 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-800">Todo al día</h3>
        <p className="text-slate-500 font-medium mt-2">
          No hay tickets de venta pendientes de facturación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedSales).map(([customerId, sales]) => {
        const customer = customersData[customerId] || {
          name: "Cliente Desconocido",
          documentNumber: "N/A",
          documentType: "DNI",
        };
        const customerSalesIds = sales.map((s) => s.id);
        const allSelected = customerSalesIds.every((id) =>
          selectedSales.includes(id),
        );

        // Calcular montos solo de los seleccionados de ESTE cliente
        const selectedAmount = sales
          .filter((s) => selectedSales.includes(s.id))
          .reduce((sum, s) => sum + s.totalAmount, 0);

        return (
          <div
            key={customerId}
            className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden"
          >
            {/* CABECERA DEL CLIENTE */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                      {customer.documentType}: {customer.documentNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {sales.length} tickets pendientes
                    </span>
                  </div>
                </div>
              </div>

              {/* PANEL DE CONSOLIDACIÓN (Solo aparece si hay tickets seleccionados para este cliente) */}
              {selectedAmount > 0 && (
                <div className="bg-white border border-blue-200 p-3 rounded-xl shadow-sm flex items-center gap-4 w-full md:w-auto animate-in fade-in slide-in-from-right-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      A Consolidar
                    </p>
                    <p className="text-lg font-black text-blue-600">
                      S/ {selectedAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleConsolidar(customerId, "03")}
                      disabled={loading}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Boleta"
                      )}
                    </Button>
                    <Button
                      onClick={() => handleConsolidar(customerId, "01")}
                      disabled={loading}
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Factura"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* TABLA DE TICKETS DEL CLIENTE */}
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <button
                        onClick={() =>
                          selectAllCustomerSales(customerId, customerSalesIds)
                        }
                        className="text-slate-400 hover:text-blue-600"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4">ID Ticket</th>
                    <th className="px-6 py-4">Fecha Emisión</th>
                    <th className="px-6 py-4 text-right">Monto (S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sales.map((sale) => {
                    const isSelected = selectedSales.includes(sale.id);
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => toggleSaleSelection(sale.id)}
                        className={`transition-colors cursor-pointer hover:bg-blue-50/50 ${isSelected ? "bg-blue-50/30" : ""}`}
                      >
                        <td className="px-6 py-3">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-700 flex items-center gap-2">
                          <ReceiptText className="w-4 h-4 text-slate-400" />#
                          {sale.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />{" "}
                          {sale.issueDate}
                        </td>
                        <td className="px-6 py-3 text-right font-black text-slate-900">
                          S/ {sale.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
