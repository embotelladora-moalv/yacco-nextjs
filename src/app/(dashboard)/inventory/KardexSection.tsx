"use client";

import { useState } from "react";
import { Product, KardexLog } from "@/core/entities/Inventory";
import { getKardexAction } from "./actions";
import {
  Package,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  FileBox,
} from "lucide-react";
import { toast } from "sonner";

interface KardexSectionProps {
  products: Product[];
}

export function KardexSection({ products }: KardexSectionProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleProductChange = async (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setLogs([]);
      return;
    }

    setIsLoading(true);
    const result = await getKardexAction(productId);
    setIsLoading(false);

    if (result.success) {
      setLogs(result.data || []); // <-- Añadimos el fallback aquí
    } else {
      toast.error("Error", { description: result.error });
      setLogs([]);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* HEADER BÚSQUEDA */}
      <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <History className="h-6 w-6 text-blue-600" />
            Kardex de Inventario
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Audita las entradas y salidas históricas de cada producto.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            Seleccionar Producto (SKU)
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">-- Buscar SKU --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS */}
      <div className="p-0">
        {!selectedProductId ? (
          // ESTADO VACÍO (Igual a tu imagen)
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <FileBox className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700">
              Selecciona un producto
            </h3>
            <p className="text-slate-500 font-medium mt-1">
              Usa el buscador de arriba para ver el historial de movimientos.
            </p>
          </div>
        ) : isLoading ? (
          // ESTADO CARGANDO
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">Cargando historial...</p>
          </div>
        ) : logs.length === 0 ? (
          // SIN MOVIMIENTOS
          <div className="py-16 text-center text-slate-500 font-medium">
            No hay movimientos registrados para este producto.
          </div>
        ) : (
          // TABLA DE KARDEX
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Operación</th>
                  <th className="px-6 py-4">Fase</th>
                  <th className="px-6 py-4">Movimiento</th>
                  <th className="px-6 py-4">Stock Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">
                        {log.referenceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {log.phase === "FILLED"
                        ? "Llenos (Venta)"
                        : "Vacíos (Envases)"}
                    </td>
                    <td className="px-6 py-4 font-black">
                      {log.type === "IN" ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <ArrowUpRight className="h-4 w-4" /> +{log.quantity}
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <ArrowDownRight className="h-4 w-4" /> -{log.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {log.newStock} u.
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
