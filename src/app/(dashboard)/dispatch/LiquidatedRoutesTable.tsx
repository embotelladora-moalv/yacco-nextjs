"use client";

import React, { useState, useMemo, useRef, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Filter,
  User,
  Truck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  Calendar,
  ReceiptText,
  Clock,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPeruDateTime } from "@/core/utils/dateUtils";

interface LiquidatedRoutesTableProps {
  liquidatedRoutes: any[];
  users?: any[];
  products?: any[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  currentCursors: string;
  currentLimit: number;
  currentDriverId: string;
  currentStartDate: string;
  currentEndDate: string;
}

export function LiquidatedRoutesTable({
  liquidatedRoutes,
  users,
  products,
  nextCursor,
  hasMore,
  totalCount,
  currentCursors,
  currentLimit,
  currentDriverId,
  currentStartDate,
  currentEndDate,
}: LiquidatedRoutesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // --- FILTROS LOCALES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Cerrar filtros al clickear fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDriverName = (id: string) => {
    if (!id) return "Sin Chofer";
    return users?.find((u) => u.id === id)?.name || "Chofer Desconocido";
  };

  const getAssistantName = (id: string) => {
    if (!id) return "Sin Auxiliar";
    return users?.find((u) => u.id === id)?.name || "Auxiliar Desconocido";
  };

  // --- LÓGICA DE NAVEGACIÓN Y FILTRADO ---
  const cursorArray = currentCursors ? currentCursors.split(",") : [];
  const currentPage = cursorArray.length + 1;
  const totalPages = Math.ceil(totalCount / currentLimit);

  const navigate = (params: {
    limit?: number;
    cursor?: string;
    clearCursors?: boolean;
  }) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (params.limit) searchParams.set("limit", String(params.limit));

    if (params.clearCursors) {
      searchParams.delete("cursor");
    } else if (params.cursor !== undefined) {
      searchParams.set("cursor", params.cursor);
    }

    startTransition(() => {
      router.push(`${pathname}?${searchParams.toString()}`);
    });
  };

  const filteredRoutes = useMemo(() => {
    return liquidatedRoutes.filter((r) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        r.manifestNumber?.toLowerCase().includes(searchLower) ||
        r.truckPlate?.toLowerCase().includes(searchLower) ||
        getDriverName(r.driverId).toLowerCase().includes(searchLower)
      );
    });
  }, [liquidatedRoutes, searchQuery]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* HEADER DE LA TABLA */}
      <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-blue-500" />
            Historial de Liquidaciones
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Mostrando {filteredRoutes.length} de {totalCount} rutas cerradas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Buscar por placa, chofer o #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 w-full md:w-[280px] bg-white border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 w-11 rounded-2xl transition-all ${
                showFilters
                  ? "bg-blue-50 border-blue-200 text-blue-600 ring-4 ring-blue-50"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-5 w-5" />
            </Button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 p-4 animate-in fade-in zoom-in duration-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">
                  Filtrar por
                </p>
                <div className="space-y-1">
                  <button className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center justify-between">
                    Estado: Todos
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  </button>
                  <button className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Fecha: Últimos 30 días
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUERPO DE LA TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Manifiesto
              </th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Vehículo y Personal
              </th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Tiempos
              </th>
              <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Rendimiento
              </th>
              <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Caja Declarada
              </th>
              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">
                      Sin liquidaciones
                    </p>
                    <p className="text-xs text-slate-300">
                      No se encontraron resultados para tu búsqueda
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRoutes.map((dispatch) => (
                <tr
                  key={dispatch.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">
                        {dispatch.manifestNumber}
                      </span>
                      <Badge className="w-fit mt-1 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50 font-bold text-[10px] px-2 py-0">
                        LIQUIDADO
                      </Badge>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <Truck className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                          {dispatch.truckPlate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-800 leading-none">
                            {getDriverName(dispatch.driverId)}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400">
                            {getAssistantName(dispatch.assistantId)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-slate-600 space-y-1">
                    <p className="flex items-center gap-1 text-slate-800 font-bold">
                      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1 rounded uppercase">
                        Sal
                      </span>
                      {formatPeruDateTime(dispatch.dispatchDate)}
                    </p>
                    <p className="flex items-center gap-1 text-slate-500">
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-1 rounded uppercase">
                        Liq
                      </span>
                      {formatPeruDateTime(dispatch.liquidatedAt || dispatch.liquidationDate)}
                    </p>
                  </td>

                  {/* HOVER TOOLTIP INTERACTIVO CON DISEÑO PURO */}
                  <td className="px-6 py-4 text-center">
                    <div className="relative group/tooltip inline-block cursor-help">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center justify-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                              Venta
                            </span>
                            <span className="text-xs font-black text-emerald-600">
                              {dispatch.items?.reduce(
                                (s: number, i: any) => s + (i.quantitySold || 0),
                                0,
                              ) || 0}
                            </span>
                          </div>
                          <div className="h-6 w-px bg-slate-100 mx-3" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                              Merma
                            </span>
                            <span className="text-xs font-black text-red-500">
                              {dispatch.items?.reduce(
                                (s: number, i: any) => s + (i.wasteQuantity || 0),
                                0,
                              ) || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tooltip con Glassmorphism */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 hidden group-hover/tooltip:block z-50">
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-2">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                            Detalle Carga
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-white/60">Cargado:</span>
                              <span className="font-bold">
                                {dispatch.items?.reduce(
                                  (s: number, i: any) =>
                                    s + (i.quantityLoaded || 0),
                                  0,
                                ) || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Retorno:</span>
                              <span className="font-bold text-blue-400">
                                {dispatch.items?.reduce(
                                  (s: number, i: any) =>
                                    s + (i.quantityReturnedFull || 0),
                                  0,
                                ) || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="w-3 h-3 bg-slate-900/95 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-white/10" />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="flex items-center gap-1 text-xs font-black text-slate-800">
                        S/ {dispatch.cashReported?.toFixed(2) || "0.00"}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-blue-500">
                        <Badge
                          variant="outline"
                          className="px-1 py-0 border-blue-100 text-blue-500 text-[8px] bg-blue-50/50"
                        >
                          Digital: S/{" "}
                          {dispatch.digitalPaymentsReported?.toFixed(2) ||
                            "0.00"}
                        </Badge>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/dispatch/${dispatch.id}`)
                      }
                      className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN ESTILO MODERN */}
      <div className="px-8 py-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-bold text-slate-400">
          Página {currentPage} de {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1 || isPending}
            onClick={() => {
              const newCursors = cursorArray.slice(0, -1).join(",");
              navigate({ cursor: newCursors });
            }}
            className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <Button
            variant="outline"
            disabled={currentPage === totalPages || isPending}
            onClick={() => {
              const lastItem = filteredRoutes[filteredRoutes.length - 1];
              const newCursors = currentCursors
                ? `${currentCursors},${lastItem.id}`
                : lastItem.id;
              navigate({ cursor: newCursors });
            }}
            className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
