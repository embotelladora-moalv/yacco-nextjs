"use client";

import { useState } from "react";
import {
  Loader2,
  FileText,
  CheckSquare,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { emitirComprobanteAction } from "@/app/actions/sunatActions";

// Definimos la estructura básica que necesitamos de una venta
interface PendingSale {
  id: string;
  issueDate: string;
  totalAmount: number;
  description?: string; // Opcional, para mostrar de qué es la venta
}

interface ConsolidateBillingPanelProps {
  customerId: string;
  customerName: string;
  pendingSales: PendingSale[];
}

export default function ConsolidateBillingPanel({
  customerId,
  customerName,
  pendingSales,
}: ConsolidateBillingPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manejar selección de checkboxes
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Seleccionar o deseleccionar todos
  const toggleAll = () => {
    if (selectedIds.length === pendingSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingSales.map((s) => s.id));
    }
  };

  const handleEmitirConsolidado = async (tipo: "01" | "03") => {
    if (selectedIds.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Llamamos a la acción que ya programamos, pasándole TODOS los IDs seleccionados
    const res = await emitirComprobanteAction(selectedIds, tipo);

    if (res.success) {
      setSuccess(
        `Comprobante ${res.documentId} emitido con éxito agrupando ${selectedIds.length} pedidos.`,
      );
      // Opcional: recargar la página para que desaparezcan de la lista de pendientes
      setTimeout(() => window.location.reload(), 2000);
    } else {
      setError(res.error || "Ocurrió un error al emitir.");
    }
    setLoading(false);
  };

  if (pendingSales.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl text-gray-500 text-sm text-center border border-gray-200">
        No hay pedidos pendientes de facturación para este cliente.
      </div>
    );
  }

  const totalSelectedAmount = pendingSales
    .filter((s) => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-600" />
        Facturación Consolidada: {customerName}
      </h3>

      {/* Alertas */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Lista de Pedidos Pendientes */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
          <button
            onClick={toggleAll}
            className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
          >
            <CheckSquare className="w-4 h-4" />
            {selectedIds.length === pendingSales.length
              ? "Deseleccionar todos"
              : "Seleccionar todos"}
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {selectedIds.length} seleccionados (S/{" "}
            {totalSelectedAmount.toFixed(2)})
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {pendingSales.map((sale) => (
            <label
              key={sale.id}
              className={`flex items-center gap-3 p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.includes(sale.id) ? "bg-indigo-50/30" : ""}`}
            >
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                checked={selectedIds.includes(sale.id)}
                onChange={() => toggleSelection(sale.id)}
                disabled={loading}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  Pedido: {sale.id}
                </p>
                <p className="text-xs text-gray-500">Fecha: {sale.issueDate}</p>
              </div>
              <div className="font-semibold text-gray-800">
                S/ {sale.totalAmount.toFixed(2)}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-3">
        <button
          onClick={() => handleEmitirConsolidado("03")}
          disabled={loading || selectedIds.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `Boleta (${selectedIds.length})`
          )}
        </button>
        <button
          onClick={() => handleEmitirConsolidado("01")}
          disabled={loading || selectedIds.length === 0}
          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `Factura (${selectedIds.length})`
          )}
        </button>
      </div>
    </div>
  );
}
