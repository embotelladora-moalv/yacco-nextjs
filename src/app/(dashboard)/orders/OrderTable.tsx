"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { OrderStatus, PaymentStatus } from "@/core/entities/Order";
import Link from "next/link";

export function OrderTable({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState<any[]>(initialData);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Lógica de Filtrado Local Híbrida
  const filteredData = useMemo(() => {
    return data.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(query.toLowerCase()) ||
        order.customerName.toLowerCase().includes(query.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;
      const matchesPayment =
        paymentFilter === "ALL" || order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [data, query, statusFilter, paymentFilter]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  // Funciones de ayuda para estilos visuales
  const getStatusBadge = (status: OrderStatus) => {
    const config = {
      RESERVED: {
        color: "bg-amber-100 text-amber-700",
        label: "RESERVA",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      ASSIGNED: {
        color: "bg-blue-100 text-blue-700",
        label: "EN RUTA",
        icon: <ShoppingCart className="h-3 w-3 mr-1" />,
      },
      DELIVERED: {
        color: "bg-green-100 text-green-700",
        label: "ENTREGADO",
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
      },
      CANCELLED: {
        color: "bg-red-100 text-red-700",
        label: "ANULADO",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      },
    };
    const c = config[status];
    return (
      <Badge
        className={`${c.color} border-none shadow-sm flex items-center px-2 py-0.5 text-[10px] font-black`}
      >
        {c.icon} {c.label}
      </Badge>
    );
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    const config = {
      PAID: {
        color: "text-green-600 bg-green-50 border-green-200",
        label: "PAGADO",
      },
      PARTIAL: {
        color: "text-amber-600 bg-amber-50 border-amber-200",
        label: "PARCIAL",
      },
      PENDING: {
        color: "text-red-600 bg-red-50 border-red-200",
        label: "DEUDA",
      },
    };
    const c = config[status];
    return (
      <Badge variant="outline" className={`${c.color} font-black text-[10px]`}>
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por ID o Cliente..."
              className="pl-10 border-slate-200 focus-visible:ring-blue-600"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {/* Filtro Logístico */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 gap-2">
                <Filter className="h-4 w-4" /> Logística
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPage(0);
                  }}
                >
                  Todos los Estados
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("RESERVED");
                    setPage(0);
                  }}
                >
                  Reservas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("ASSIGNED");
                    setPage(0);
                  }}
                >
                  En Ruta
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("DELIVERED");
                    setPage(0);
                  }}
                >
                  Entregados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filtro Financiero */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 gap-2">
                <Filter className="h-4 w-4" /> Finanzas
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setPaymentFilter("ALL");
                    setPage(0);
                  }}
                >
                  Todas las Finanzas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setPaymentFilter("PAID");
                    setPage(0);
                  }}
                >
                  Pagados Completos
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setPaymentFilter("PENDING");
                    setPage(0);
                  }}
                >
                  Con Deuda (Crédito)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* TABLA DE PEDIDOS */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0">
            <TableRow>
              <TableHead className="w-12 text-center font-extrabold text-slate-700">
                N°
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Detalle del Pedido
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Cliente
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Estado Operativo
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-right">
                Importe / Finanzas
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((order, index) => (
                <TableRow
                  key={order.id}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="text-center font-bold text-slate-400">
                    {page * rowsPerPage + index + 1}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                        ID: {order.id.slice(-6)}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {order.items.length} producto(s)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm">
                        {order.customerName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {order.customerDocument}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>{getStatusBadge(order.status)}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-black text-slate-900">
                        S/ {order.totalAmount.toFixed(2)}
                      </span>
                      {getPaymentBadge(order.paymentStatus)}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/orders/${order.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-blue-700 hover:bg-blue-50 font-bold px-3"
                        >
                          <Eye className="h-4 w-4 mr-1.5" /> Ver
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-48 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShoppingCart className="h-8 w-8 text-slate-200" />
                    <p>No se encontraron registros de ventas.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* CONTROLES INFERIORES: PAGINACIÓN Y SELECTOR DE ÍTEMS */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
        <p className="text-xs text-slate-500 font-medium">
          Mostrando página{" "}
          <span className="font-bold text-slate-900">{page + 1}</span> de{" "}
          {totalPages || 1}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Mostrar:</span>
            <select
              className="h-8 px-2 rounded-md border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="shadow-sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || totalPages === 0}
              className="shadow-sm"
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
