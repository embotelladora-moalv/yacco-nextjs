"use client";

import { useState, useEffect } from "react";
import { Customer } from "@/core/entities/CRM";
import { useRouter, usePathname } from "next/navigation";
import {
  HandCoins,
  Search,
  User,
  Phone,
  ArrowRight,
  ShieldAlert,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface CollectionsClientProps {
  debtors: Customer[];
  nextCursor: string | null;
  hasMore: boolean;
  currentCursors: string;
  currentLimit: number;
  currentSearch: string;
  totalCount: number;
  totalDebtAmount: number;
}

export function CollectionsClient({
  debtors,
  nextCursor,
  hasMore,
  currentCursors,
  currentLimit,
  currentSearch,
  totalCount,
  totalDebtAmount,
}: CollectionsClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState(currentSearch);

  const cursorArray = currentCursors ? currentCursors.split(",") : [];
  const currentPage = cursorArray.length + 1;
  const pageSize = currentLimit;

  const navigate = (params: { q?: string; cursors?: string; limit?: number }) => {
    const query = new URLSearchParams();
    const newSearch = params.q !== undefined ? params.q : currentSearch;
    if (newSearch) {
      query.set("q", newSearch);
    }
    const newCursors = params.cursors !== undefined ? params.cursors : currentCursors;
    if (newCursors) {
      query.set("cursors", newCursors);
    }
    const newLimit = params.limit !== undefined ? params.limit : currentLimit;
    query.set("limit", String(newLimit));

    router.push(`${pathname}?${query.toString()}`);
  };

  // Debounce for search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== currentSearch) {
        navigate({ q: searchQuery, cursors: "" }); // Reset cursors when searching
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleNextPage = () => {
    if (!hasMore || !nextCursor) return;
    const nextCursors = currentCursors ? `${currentCursors},${nextCursor}` : nextCursor;
    navigate({ cursors: nextCursors });
  };

  const handlePrevPage = () => {
    if (currentPage === 1) return;
    const prevCursors = cursorArray.slice(0, -1).join(",");
    navigate({ cursors: prevCursors });
  };

  const filteredDebtors = debtors;
  const totalDebt = totalDebtAmount;

  return (
    <div className="space-y-6">
      {/* TARJETA DE RESUMEN GLOBAL */}
      <div className="bg-red-50 border border-red-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-sm font-black text-red-800 uppercase tracking-widest">
              Cuentas por Cobrar
            </h2>
            <p className="text-red-600 font-medium text-sm mt-1">
              Total de dinero pendiente de recaudo en calle.
            </p>
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto bg-white/60 p-4 rounded-2xl border border-red-100/50">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
            Deuda Total Activa
          </p>
          <p className="text-4xl font-black text-red-600">
            S/ {totalDebt.toFixed(2)}
          </p>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y TABLA */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, alias o RUC/DNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white border-slate-200 font-medium rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Cliente / Empresa</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-right">Deuda Actual</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDebtors.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-16 text-center text-slate-400 font-medium"
                  >
                    <HandCoins className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    {searchQuery
                      ? "No se encontraron clientes morosos con esa búsqueda."
                      : "¡Excelente! No hay clientes con deudas activas."}
                  </td>
                </tr>
              ) : (
                filteredDebtors.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base">
                            {customer.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                              {customer.documentType}: {customer.documentNumber}
                            </span>
                            {customer.alias && (
                              <span className="text-xs font-bold text-blue-600">
                                {customer.alias}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                          <User className="h-3 w-3 text-slate-400" />{" "}
                          {customer.contactName || "Sin contacto"}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                          <Phone className="h-3 w-3 text-slate-400" />{" "}
                          {customer.contactPhone || "Sin teléfono"}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="text-xl font-black text-red-600">
                        S/ {customer.debtAmount?.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Button
                        asChild
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-md"
                      >
                        <Link href={`/collections/${customer.id}/pay`}>
                          <BadgeDollarSign className="mr-2 h-4 w-4 text-green-400" />{" "}
                          Registrar Pago
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER: PAGINACIÓN ESCALABLE */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto rounded-b-[2rem]">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => {
                navigate({ limit: Number(e.target.value), cursors: "" });
              }}
              className="border border-slate-200 bg-white rounded-md px-2 py-1 font-bold text-slate-700 focus:outline-none shadow-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>registros</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 bg-white shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-4 h-8 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-md shadow-sm">
              Página {currentPage}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasMore || !nextCursor}
              className="h-8 w-8 p-0 bg-white shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
