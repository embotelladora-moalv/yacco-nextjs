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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface KardexSectionProps {
  products: Product[];
}

export function KardexSection({ products }: KardexSectionProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de paginación
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursorsStack, setCursorsStack] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadKardex = async (productId: string, cursor?: string, isNext?: boolean, isPrev?: boolean) => {
    setIsLoading(true);
    const result = await getKardexAction(productId, pageSize, cursor);
    setIsLoading(false);

    if (result.success) {
      setLogs(result.items || []);
      setNextCursor(result.nextCursor || null);
      setHasMore(result.hasMore || false);

      if (isNext && cursor) {
        setCursorsStack((prev) => [...prev, cursor]);
        setCurrentPage((prev) => prev + 1);
      } else if (isPrev) {
        setCursorsStack((prev) => prev.slice(0, -1));
        setCurrentPage((prev) => prev - 1);
      } else {
        // Carga inicial
        setCursorsStack([]);
        setCurrentPage(1);
      }
    } else {
      toast.error("Error", { description: result.error });
      setLogs([]);
      setNextCursor(null);
      setHasMore(false);
      setCursorsStack([]);
      setCurrentPage(1);
    }
  };

  const handleProductChange = async (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setLogs([]);
      setNextCursor(null);
      setHasMore(false);
      setCursorsStack([]);
      setCurrentPage(1);
      return;
    }
    await loadKardex(productId);
  };

  const handleNextPage = async () => {
    if (!hasMore || !nextCursor) return;
    await loadKardex(selectedProductId, nextCursor, true, false);
  };

  const handlePrevPage = async () => {
    if (currentPage === 1) return;
    const prevCursor = cursorsStack[cursorsStack.length - 2] || undefined;
    await loadKardex(selectedProductId, prevCursor, false, true);
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
          <div className="overflow-x-auto flex flex-col justify-between min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Operación</th>
                  <th className="px-6 py-4">Fase</th>
                  <th className="px-6 py-4">Movimiento</th>
                  <th className="px-6 py-4">Stock Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const displayBalance = log.resultingBalance !== undefined ? log.resultingBalance : log.newStock;
                  const displayDelta = log.delta !== undefined ? log.delta : (log.type === "IN" ? log.quantity : -log.quantity);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                        {log.userId || "Sistema"}
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
                        {displayDelta >= 0 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <ArrowUpRight className="h-4 w-4" /> +{Math.abs(displayDelta)}
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <ArrowDownRight className="h-4 w-4" /> -{Math.abs(displayDelta)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          {displayBalance} u.
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* CONTROLES DE PAGINACIÓN */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between mt-auto">
              <div className="text-xs font-bold text-slate-500">
                Página {currentPage}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 bg-white shadow-sm rounded-lg border-slate-200 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center px-4 h-8 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
                  Página {currentPage}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className="h-8 w-8 p-0 bg-white shadow-sm rounded-lg border-slate-200 hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
