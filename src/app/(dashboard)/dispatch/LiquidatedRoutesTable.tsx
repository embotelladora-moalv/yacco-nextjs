"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
  AlertCircle,
  X,
  Package,
  ArrowDownToLine,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface LiquidatedRoutesTableProps {
  liquidatedRoutes: any[];
  users: any[];
  products: any[];
}

export function LiquidatedRoutesTable({
  liquidatedRoutes,
  users,
  products,
}: LiquidatedRoutesTableProps) {
  // --- FILTROS Y ESTADOS ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Filtros Avanzados
  const [selectedDriverId, setSelectedDriverId] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Cerrar filtros al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    }
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

  // --- FILTRADO AVANZADO MATEMÁTICO ---
  const filteredRoutes = useMemo(() => {
    return liquidatedRoutes.filter((r) => {
      const matchesSearch =
        r.manifestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.truckPlate?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDriver =
        selectedDriverId === "ALL" || r.driverId === selectedDriverId;

      let matchesDates = true;
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        const dispatchTime = new Date(r.dispatchDate);
        if (dispatchTime < start) matchesDates = false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`);
        const dispatchTime = new Date(r.dispatchDate);
        if (dispatchTime > end) matchesDates = false;
      }

      return matchesSearch && matchesDriver && matchesDates;
    });
  }, [liquidatedRoutes, searchQuery, selectedDriverId, startDate, endDate]);

  // Paginación estructural
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  const paginatedData = filteredRoutes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const activeFiltersCount =
    (selectedDriverId !== "ALL" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative min-h-[500px]">
      {/* TOOLBAR AL ESTILO CRM CLIENTES */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por # manifiesto o placa de camión..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-800"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`font-bold rounded-xl flex items-center gap-2 px-5 py-2.5 h-auto ${activeFiltersCount > 0 ? "border-orange-200 bg-orange-50 text-orange-700" : "text-slate-600"}`}
          >
            <Filter className="h-4 w-4" /> Filtros Avanzados
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center ml-1 font-black">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 z-20 space-y-4 animate-in fade-in slide-in-from-top-2">
              {/* FILTRO POR CHOFER */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Users className="h-3 w-3" /> Chofer Responsable
                </div>
                <select
                  value={selectedDriverId}
                  onChange={(e) => {
                    setSelectedDriverId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Choferes</option>
                  {users
                    .filter((u) => u.roles?.includes("DRIVER") || u.roles?.includes("ADMIN"))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* FILTRO POR RANGO DE FECHAS */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Rango de Fecha (Salida)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full h-9 px-2 rounded-lg border text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full h-9 px-2 rounded-lg border text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-black text-slate-400 hover:text-orange-600 mt-2 border-t pt-2 rounded-none"
                onClick={() => {
                  setSelectedDriverId("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Limpiar Parámetros de Búsqueda
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* RENDERIZADO DE TABLA ESTILO CRM */}
      <div className="flex-1 overflow-x-auto">
        {paginatedData.length === 0 ? (
          <div className="p-16 text-center">
            <ReceiptText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800">
              Sin liquidaciones
            </h3>
            <p className="text-slate-500 font-medium mt-2">
              No se encontraron registros históricos con los criterios actuales.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-16 text-center">#</th>
                <th className="px-6 py-4">Manifiesto e Información</th>
                <th className="px-6 py-4">Chofer / Auxiliar</th>
                <th className="px-6 py-4">
                  Horario de Ruta (Salida y Regreso)
                </th>
                <th className="px-6 py-4 text-center">Carga Retornada</th>
                <th className="px-6 py-4 text-right">Efectivo Rendido</th>
                <th className="px-6 py-4 text-center">Estado Auditoría</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((dispatch, index) => {
                const globalIndex =
                  (currentPage - 1) * itemsPerPage + index + 1;

                // Cálculo rápido de mermas o devoluciones físicas para el Tooltip nativo
                const totalReturnedFulls =
                  dispatch.items?.reduce(
                    (sum: number, i: any) =>
                      sum + (i.quantityReturnedFull || 0),
                    0,
                  ) || 0;
                const totalWastes =
                  dispatch.items?.reduce(
                    (sum: number, i: any) => sum + (i.wasteQuantity || 0),
                    0,
                  ) || 0;

                return (
                  <tr
                    key={dispatch.id}
                    className="transition-colors hover:bg-slate-50/50 group"
                  >
                    <td className="px-6 py-4 text-center font-black text-slate-300">
                      {globalIndex}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 uppercase text-sm">
                        {dispatch.manifestNumber || "S/N"}
                      </div>
                      <div className="text-[10px] font-black text-orange-600 tracking-wider uppercase mt-0.5 flex items-center gap-1">
                        <Truck className="h-3 w-3 text-slate-400" /> Placa:{" "}
                        {dispatch.truckPlate}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-black text-xs uppercase">
                          {getDriverName(dispatch.driverId).substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-xs capitalize leading-tight">
                            {getDriverName(dispatch.driverId)}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                            Aux: {getAssistantName(dispatch.assistantId)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-600 space-y-1">
                      <p className="flex items-center gap-1 text-slate-800 font-bold">
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1 rounded uppercase">
                          Sal
                        </span>
                        {formatDateTime(dispatch.dispatchDate)}
                      </p>
                      <p className="flex items-center gap-1 text-slate-500">
                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-1 rounded uppercase">
                          Liq
                        </span>
                        {formatDateTime(dispatch.liquidatedAt)}
                      </p>
                    </td>

                    {/* HOVER TOOLTIP INTERACTIVO CON DISEÑO PURO */}
                    <td className="px-6 py-4 text-center">
                      <div className="relative group/tooltip inline-block">
                        <span className="cursor-help bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-black border border-slate-200 flex items-center gap-1 mx-auto w-max">
                          <Package className="h-3.5 w-3.5 text-slate-400" /> F:{" "}
                          {totalReturnedFulls} | M: {totalWastes}
                        </span>

                        {/* Dropdown de desglose flotante al hacer hover */}
                        <div className="absolute hidden group-hover/tooltip:block z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white p-3 rounded-xl text-xs w-60 shadow-2xl border border-slate-800 text-left animate-in fade-in slide-in-from-bottom-1 duration-150">
                          <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5">
                            Rendición de Carga Física
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {dispatch.items?.map((item: any, idx: number) => {
                              const name =
                                products.find((p) => p.id === item.productId)
                                  ?.name || "Producto";
                              if (
                                (item.quantityReturnedFull || 0) === 0 &&
                                (item.wasteQuantity || 0) === 0
                              )
                                return null;
                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center gap-2 font-medium border-b border-slate-800/40 pb-1"
                                >
                                  <span className="text-slate-300 truncate capitalize text-[11px]">
                                    {name}
                                  </span>
                                  <span className="font-mono text-[11px] shrink-0 text-orange-400 font-bold">
                                    {item.quantityReturnedFull || 0}L /{" "}
                                    {item.wasteQuantity || 0}M
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="text-base font-black text-slate-900">
                        S/{" "}
                        {(
                          dispatch.realCashReceived ||
                          dispatch.cashReported ||
                          0
                        ).toFixed(2)}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{" "}
                        Cuadrado
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-slate-100 rounded-full"
                      >
                        <Link href={`/dispatch/${dispatch.id}`}>
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER GENERAL DE LA TABLA */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto rounded-b-[2rem]">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-200 bg-white rounded-md px-2 py-1 font-bold text-slate-700 focus:outline-none shadow-sm text-xs"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>registros por página</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 bg-white shadow-sm rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center px-4 h-8 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
            Página {currentPage} de {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 w-8 p-0 bg-white shadow-sm rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
