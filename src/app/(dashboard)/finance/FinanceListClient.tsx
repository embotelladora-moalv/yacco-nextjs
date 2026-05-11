"use client";

import { useState, useMemo } from "react";
import { CashMovement } from "@/core/entities/Finance";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Calendar,
  CreditCard,
  Banknote,
  Search,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface FinanceListProps {
  movements: CashMovement[];
}

export function FinanceListClient({ movements }: FinanceListProps) {
  // --- ESTADOS DE FILTROS ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">(
    "ALL",
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Extraer categorías únicas para el filtro dinámico
  const uniqueCategories = useMemo(() => {
    const cats = new Set(movements.map((m) => m.categoryName));
    return Array.from(cats);
  }, [movements]);

  // --- LÓGICA DE FILTRADO (Escalable a backend si es necesario) ---
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchType = filterType === "ALL" || m.type === filterType;
      const matchCategory =
        filterCategory === "ALL" || m.categoryName === filterCategory;
      return matchType && matchCategory;
    });
  }, [movements, filterType, filterCategory]);

  // --- CÁLCULOS DE MÉTRICAS (Basados en todos los datos, no solo la página actual) ---
  const totalIncome = movements
    .filter((m) => m.type === "INCOME")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = movements
    .filter((m) => m.type === "EXPENSE")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  // --- LÓGICA DE PAGINACIÓN ---
  const totalItems = filteredMovements.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovements = filteredMovements.slice(startIndex, endIndex);

  // Handlers
  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Volver a la página 1 al cambiar el tamaño
  };

  const handleFilterApply = () => {
    setCurrentPage(1); // Resetear a página 1 al filtrar
    setIsFilterOpen(false);
  };

  // Utilidades UI
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-3 w-3" />;
      case "DIGITAL":
      case "TRANSFER":
      case "CARD":
        return <CreditCard className="h-3 w-3" />;
      default:
        return <Wallet className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-emerald-800 font-black text-xs uppercase tracking-widest">
              Ingresos Extras
            </span>
            <div className="h-8 w-8 rounded-full bg-emerald-200/50 flex items-center justify-center text-emerald-700">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <span className="text-3xl font-black text-emerald-900">
            S/ {totalIncome.toFixed(2)}
          </span>
        </div>

        <div className="bg-red-50 rounded-2xl p-6 border border-red-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-red-800 font-black text-xs uppercase tracking-widest">
              Gastos Operativos
            </span>
            <div className="h-8 w-8 rounded-full bg-red-200/50 flex items-center justify-center text-red-700">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <span className="text-3xl font-black text-red-900">
            S/ {totalExpense.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between text-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-black text-xs uppercase tracking-widest">
              Balance Neto
            </span>
            <Wallet className="h-5 w-5 text-blue-400" />
          </div>
          <span
            className={`text-3xl font-black ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            S/ {balance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS Y TABLA */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Header con Botón de Filtros Pop-up */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <FileText className="h-5 w-5 text-blue-500" /> Historial de
            Movimientos
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Filtros{" "}
            {(filterType !== "ALL" || filterCategory !== "ALL") && (
              <span className="flex h-2 w-2 rounded-full bg-blue-500 ml-1" />
            )}
          </button>

          {/* POP-UP (Dropdown) DE FILTROS */}
          {isFilterOpen && (
            <div className="absolute top-16 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                <span className="font-black text-xs uppercase tracking-widest text-slate-500">
                  Filtrar Movimientos
                </span>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Tipo de Flujo
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-bold bg-white"
                  >
                    <option value="ALL">Todos los flujos</option>
                    <option value="INCOME">Solo Ingresos (+)</option>
                    <option value="EXPENSE">Solo Gastos (-)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Categoría
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-bold bg-white"
                  >
                    <option value="ALL">Todas las categorías</option>
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleFilterApply}
                  className="w-full bg-slate-900 text-white font-bold h-10 rounded-lg mt-2 hover:bg-slate-800 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-16 text-center">Nº</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Categoría / Motivo</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-slate-400 font-medium"
                  >
                    <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    No se encontraron movimientos.
                  </td>
                </tr>
              ) : (
                currentMovements.map((movement, index) => (
                  <tr
                    key={movement.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 text-center font-bold text-slate-300">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(movement.date as unknown as string)}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-bold uppercase text-slate-400">
                        {getPaymentIcon(movement.paymentMethod)}{" "}
                        {movement.paymentMethod}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1
                        ${movement.type === "INCOME" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}
                      `}
                      >
                        {movement.type === "INCOME" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {movement.categoryName}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      <span
                        className="font-medium text-xs leading-relaxed max-w-[300px] truncate block"
                        title={movement.description}
                      >
                        {movement.description}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-base font-black ${movement.type === "INCOME" ? "text-emerald-600" : "text-slate-900"}`}
                      >
                        {movement.type === "INCOME" ? "+" : "-"} S/{" "}
                        {movement.amount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 3. FOOTER CON PAGINACIÓN */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">Mostrar</span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="h-8 px-2 border border-slate-200 rounded-md text-xs font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs font-medium text-slate-400">
              Mostrando {totalItems === 0 ? 0 : startIndex + 1} -{" "}
              {Math.min(endIndex, totalItems)} de {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || totalItems === 0}
              className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center px-3 h-8 bg-slate-50 border border-slate-200 rounded text-xs font-black text-slate-700">
              Página {totalPages === 0 ? 0 : currentPage} de {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalItems === 0}
              className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
