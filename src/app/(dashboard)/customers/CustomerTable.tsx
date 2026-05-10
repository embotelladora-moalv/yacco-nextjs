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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Building2,
  User,
  Phone,
  Mail,
  Tag,
  AlertCircle,
  Users,
  MoreVertical,
  HandCoins,
  PackageSearch,
  History,
} from "lucide-react";
import { Customer, CustomerType } from "@/core/entities/Customer";
import { deleteCustomerAction } from "./actions";
import Link from "next/link";
import { toast } from "sonner";

export function CustomerTable({ initialData }: { initialData: Customer[] }) {
  const [data, setData] = useState<Customer[]>(initialData);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = useMemo(() => {
    return data.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.documentId.includes(query) ||
        customer.phone.includes(query) ||
        customer.tags.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase()),
        );
      const matchesType = typeFilter === "ALL" || customer.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [data, query, typeFilter]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "¿Seguro que deseas dar de baja a este cliente? Se mantendrá en el historial de facturación.",
      )
    ) {
      const res = await deleteCustomerAction(id);
      if (res.success) {
        setData((prev) => prev.filter((c) => c.id !== id));
        toast.success("Cliente dado de baja");
      } else {
        toast.error("No se pudo eliminar al cliente");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, RUC/DNI o etiqueta..."
              className="pl-10 border-slate-200 focus-visible:ring-blue-600"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 text-slate-600 border-slate-200"
              >
                <Filter className="h-4 w-4" />
                {typeFilter === "ALL"
                  ? "Todos los Tipos"
                  : typeFilter === "COMPANY"
                    ? "Empresas"
                    : "Personas"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  setTypeFilter("ALL");
                  setPage(0);
                }}
              >
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTypeFilter("COMPANY");
                  setPage(0);
                }}
              >
                Empresas (RUC)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTypeFilter("INDIVIDUAL");
                  setPage(0);
                }}
              >
                Personas (DNI)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0">
            <TableRow>
              <TableHead className="w-12 text-center font-extrabold text-slate-700">
                N°
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Cliente / Razón Social
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Contacto
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Clasificación
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-right">
                Saldo / Deuda
              </TableHead>
              <TableHead className="w-20 font-extrabold text-slate-700 text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((customer, index) => (
                <TableRow
                  key={customer.id}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="text-center font-bold text-slate-400">
                    {page * rowsPerPage + index + 1}
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-3 items-center">
                      <div
                        className={`p-2 rounded-lg ${customer.type === "COMPANY" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}
                      >
                        {customer.type === "COMPANY" ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 leading-tight">
                          {customer.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider">
                          {customer.type === "COMPANY" ? "RUC:" : "DNI:"}{" "}
                          {customer.documentId}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />{" "}
                        {customer.phone}
                      </span>
                      {customer.email && (
                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />{" "}
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {customer.tags.length > 0 ? (
                        customer.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 text-[10px] hover:bg-slate-200"
                          >
                            <Tag className="h-2.5 w-2.5 mr-1" /> {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Sin etiquetas
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    {customer.debtAmount > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="font-black text-red-600 flex items-center gap-1">
                          S/ {customer.debtAmount.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-red-400 uppercase font-bold flex items-center gap-1">
                          <AlertCircle className="h-2.5 w-2.5" /> Deuda Activa
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-400 text-sm">
                        Al día
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                          Opciones de Gestión
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <Link href={`/customers/${customer.id}/edit`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4 text-slate-500" />{" "}
                            Editar Perfil
                          </DropdownMenuItem>
                        </Link>

                        <Link href={`/collections?customerId=${customer.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <HandCoins className="mr-2 h-4 w-4 text-blue-600" />{" "}
                            Pagar Deuda / Adelanto
                          </DropdownMenuItem>
                        </Link>

                        <DropdownMenuItem className="cursor-pointer">
                          <PackageSearch className="mr-2 h-4 w-4 text-orange-600" />{" "}
                          Gestionar Envases
                        </DropdownMenuItem>

                        <DropdownMenuItem className="cursor-pointer">
                          <History className="mr-2 h-4 w-4 text-slate-500" />{" "}
                          Historial de Visitas
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(customer.id)}
                          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Dar de Baja
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <Users className="h-8 w-8 text-slate-200" />
                    <p>No se encontraron clientes en la cartera.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || totalPages === 0}
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
