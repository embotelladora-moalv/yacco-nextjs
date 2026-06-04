"use client";

import { useState, useRef, useEffect } from "react";
import { Sale, Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory";
import { fetchPaginatedSalesAction } from "./actions";
import {
  ShoppingCart,
  Calendar,
  CreditCard,
  Banknote,
  ArrowDownToLine,
  ReceiptText,
  User,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { EmitReceiptButton } from "@/components/shared/EmitReceiptButton";
import Link from "next/link";

interface SalesListProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
}

export function SalesListClient({
  sales: initialSales,
  customers,
  products,
}: SalesListProps) {
  // --- ESTADOS DE DATOS ---
  const [salesList, setSalesList] = useState<Sale[]>(initialSales);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // --- PAGINACIÓN ESCALABLE (CURSORES) ---
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialSales.length === 10);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([
    undefined,
  ]);

  // --- FILTROS Y BÚSQUEDA ---
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Cierra el popup de filtros si se hace clic afuera
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

  // --- HELPERS ---
  const getCustomer = (id: string) => customers.find((c) => c.id === id);
  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "Producto";

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPaymentMethod = (method: string) => {
    const methods: Record<string, { icon: any; label: string; color: string }> =
      {
        CASH: {
          icon: Banknote,
          label: "Efectivo",
          color: "text-emerald-600 bg-emerald-50",
        },
        DIGITAL: {
          icon: CreditCard,
          label: "Digital",
          color: "text-blue-600 bg-blue-50",
        },
        MIXED: {
          icon: ReceiptText,
          label: "Mixto",
          color: "text-purple-600 bg-purple-50",
        },
        CREDIT: {
          icon: ArrowDownToLine,
          label: "Crédito",
          color: "text-red-600 bg-red-50",
        },
      };
    const config = methods[method] || {
      icon: Banknote,
      label: method,
      color: "text-slate-600 bg-slate-100",
    };
    const Icon = config.icon;
    return (
      <span
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold w-max ${config.color}`}
      >
        <Icon className="h-3 w-3" /> {config.label}
      </span>
    );
  };

  // --- LÓGICA DEL SERVIDOR ---
  const loadPage = async (
    pageIndex: number,
    cursor?: string,
    filter = paymentFilter,
    size = pageSize,
  ) => {
    setIsLoading(true);
    const result = await fetchPaginatedSalesAction(size, cursor, filter);
    if (result.success && result.sales) {
      setSalesList(result.sales);
      setCurrentPage(pageIndex);
      setHasMore(result.sales.length === size);
    }
    setIsLoading(false);
  };

  const handleNextPage = () => {
    const lastSale = salesList[salesList.length - 1];
    if (!lastSale) return;
    const nextCursor = lastSale.createdAt as unknown as string;
    setCursorStack((prev) => {
      const newStack = [...prev];
      newStack[currentPage] = nextCursor;
      return newStack;
    });
    loadPage(currentPage + 1, nextCursor);
  };

  const handlePrevPage = () => {
    if (currentPage === 1) return;
    const prevCursor = cursorStack[currentPage - 2];
    loadPage(currentPage - 1, prevCursor);
  };

  const applyFilters = (newFilter: string) => {
    setPaymentFilter(newFilter);
    setCursorStack([undefined]);
    setShowFilters(false);
    loadPage(1, undefined, newFilter);
  };

  const displaySales = salesList.filter((sale) => {
    const cName = (getCustomer(sale.customerId)?.name || "").toLowerCase();
    const sId = sale.id.toLowerCase();
    return (
      cName.includes(searchTerm.toLowerCase()) ||
      sId.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative min-h-[500px]">
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2rem]">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      )}

      {/* TOOLBAR */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o #ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`font-bold rounded-xl flex items-center gap-2 px-5 py-2.5 h-auto ${paymentFilter !== "ALL" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "text-slate-600"}`}
          >
            <Filter className="h-4 w-4" /> Filtros
            {paymentFilter !== "ALL" && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 ml-1"></span>
            )}
          </Button>

          {/* POP-UP FILTROS */}
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-20 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">
                Método de Pago
              </div>
              {["ALL", "CASH", "DIGITAL", "MIXED", "CREDIT"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => applyFilters(filter)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${paymentFilter === filter ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {filter === "ALL"
                    ? "Todos los métodos"
                    : filter === "CASH"
                      ? "Solo Efectivo"
                      : filter === "DIGITAL"
                        ? "Solo Digital"
                        : filter === "MIXED"
                          ? "Mixtos"
                          : "Créditos (Deudas)"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="flex-1 overflow-x-auto">
        {displaySales.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingCart className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800">No hay ventas</h3>
            <p className="text-slate-500 font-medium mt-2">
              No se encontraron tickets con los filtros actuales.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-16 text-center">#</th>
                <th className="px-6 py-4">Fecha y Ticket</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Pago</th>
                {/* NUEVA COLUMNA ESTADO SUNAT */}
                <th className="px-6 py-4 text-center">Estado SUNAT</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displaySales.map((sale, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                const isExpanded = expandedSaleId === sale.id;
                const customer = getCustomer(sale.customerId);

                // Propiedades asumiendo que agregamos el registro de SUNAT en la base de datos
                const sunatDocId = (sale as any).sunatDocumentId;
                const isBilled = (sale as any).isBilled;

                // 🔥 SOLUCIÓN: Si no existe 'totalAmount', lo calculamos sumando los productos
                const totalAmountCalculated =
                  sale.totalAmount ??
                  sale.items?.reduce(
                    (sum, item) =>
                      sum + Number(item.quantity) * Number(item.unitPrice),
                    0,
                  ) ??
                  0;

                return (
                  <React.Fragment key={sale.id}>
                    {/* FILA PRINCIPAL */}
                    <tr
                      onClick={() =>
                        setExpandedSaleId(isExpanded ? null : sale.id)
                      }
                      className={`transition-colors cursor-pointer ${isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/50"}`}
                    >
                      <td className="px-6 py-4 text-center font-black text-slate-300">
                        {globalIndex}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {formatDate(sale.createdAt as unknown as string)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-black tracking-widest mt-1">
                          #{sale.id.substring(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          {customer?.name || "Cliente Desconocido"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {renderPaymentMethod(sale.paymentMethod)}
                        {sale.paymentMethod === "CREDIT" &&
                          (sale as any).remainingBalance > 0 && (
                            <div className="text-[10px] font-bold text-red-500 mt-1">
                              Deuda: S/{" "}
                              {(sale as any).remainingBalance.toFixed(2)}
                            </div>
                          )}
                      </td>

                      {/* CELDA DE BADGE DE SUNAT */}
                      <td className="px-6 py-4 text-center">
                        {isBilled ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="h-3 w-3" /> Facturado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                            <Clock className="h-3 w-3" /> Pendiente
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-black text-slate-900">
                          {/* 🔥 USAMOS LA VARIABLE CALCULADA */}
                          S/ {totalAmountCalculated.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 mx-auto" />
                        ) : (
                          <ChevronDown className="h-5 w-5 mx-auto" />
                        )}
                      </td>
                    </tr>

                    {/* ACORDEÓN DE DETALLES Y SUNAT */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row gap-8">
                            {/* LADO IZQUIERDO: PRODUCTOS */}
                            <div className="flex-1 space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Package className="h-4 w-4" /> Detalle de
                                Productos
                              </h4>
                              <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                    <tr>
                                      <th className="py-2 px-3 text-left">
                                        Cant.
                                      </th>
                                      <th className="py-2 px-3 text-left">
                                        Producto
                                      </th>
                                      <th className="py-2 px-3 text-right">
                                        P. Unit
                                      </th>
                                      <th className="py-2 px-3 text-right">
                                        Subtotal
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {sale.items.map((item, idx) => (
                                      <tr
                                        key={idx}
                                        className="font-medium text-slate-700"
                                      >
                                        <td className="py-2 px-3">
                                          {item.quantity}
                                        </td>
                                        <td className="py-2 px-3">
                                          {getProductName(item.productId)}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          S/ {item.unitPrice.toFixed(2)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold">
                                          S/{" "}
                                          {(
                                            item.quantity * item.unitPrice
                                          ).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* LADO DERECHO: FACTURACIÓN SUNAT */}
                            <div className="w-full lg:w-72 space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ReceiptText className="h-4 w-4" /> Comprobante
                                Electrónico
                              </h4>

                              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                                {isBilled ? (
                                  <div className="text-center space-y-3">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                                    <div>
                                      <p className="text-sm font-black text-slate-900">
                                        Enviado a SUNAT
                                      </p>
                                      <p className="text-xs font-bold text-emerald-600 bg-emerald-50 py-1 px-2 mt-1 rounded-md inline-block uppercase tracking-wider border border-emerald-100">
                                        {sunatDocId}
                                      </p>
                                    </div>
                                    <Button
                                      asChild
                                      variant="outline"
                                      className="w-full mt-2 font-bold text-slate-600"
                                    >
                                      <Link href={`/sales/${sale.id}`}>
                                        Ver Documentos (PDF/XML)
                                      </Link>
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-xs text-slate-500 font-medium text-center mb-2">
                                      Este ticket está pendiente de emisión
                                      tributaria o guía.
                                    </p>

                                    {/* BOTÓN RÁPIDO DE FACTURACIÓN */}
                                    <EmitReceiptButton
                                      saleId={sale.id}
                                      customerDocument={
                                        customer?.documentNumber || ""
                                      }
                                    />

                                    <div className="relative py-2">
                                      <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                      </div>
                                      <div className="relative flex justify-center">
                                        <span className="bg-slate-50 px-2 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                                          O también
                                        </span>
                                      </div>
                                    </div>

                                    {/* NUEVO BOTÓN PARA IR DIRECTO A DETALLES (GUÍAS) */}
                                    <Button
                                      asChild
                                      variant="outline"
                                      className="w-full font-bold text-slate-700 bg-white border-slate-300 hover:bg-slate-100"
                                    >
                                      <Link href={`/sales/${sale.id}`}>
                                        Ver Detalles y Emitir Guía (GRE)
                                      </Link>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER: PAGINACIÓN ESCALABLE */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto rounded-b-[2rem]">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCursorStack([undefined]);
              loadPage(1, undefined, paymentFilter, Number(e.target.value));
            }}
            className="border border-slate-200 bg-white rounded-md px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
            disabled={currentPage === 1 || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center px-4 h-8 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-md">
            Página {currentPage}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasMore || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
