"use client";

import { useState, useMemo } from "react";
import { Customer } from "@/core/entities/CRM";
import {
  Search,
  Filter,
  MoreHorizontal,
  User,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Tag,
  CheckCircle2,
  XCircle,
  Edit,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  // --- ESTADOS DE BÚSQUEDA Y FILTRADO ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- LÓGICA DE FILTRADO ---
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.alias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.documentNumber.includes(searchQuery);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => c.tags.includes(tag));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && c.isActive) ||
        (statusFilter === "INACTIVE" && !c.isActive);

      return matchesSearch && matchesTags && matchesStatus;
    });
  }, [customers, searchQuery, selectedTags, statusFilter]);

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedData = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Obtener todas las etiquetas únicas para el filtro
  const allTags = Array.from(new Set(customers.flatMap((c) => c.tags)));

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* --- BARRA DE HERRAMIENTAS (Búsqueda y Filtros) --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, alias o documento..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-11 border-slate-200 rounded-xl focus-visible:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* POPUP DE FILTROS */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-slate-200 font-bold text-slate-700 gap-2"
              >
                <Filter className="h-4 w-4 text-blue-500" /> Filtros
                {(selectedTags.length > 0 || statusFilter !== "ALL") && (
                  <span className="bg-blue-600 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">
                    {selectedTags.length + (statusFilter !== "ALL" ? 1 : 0)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-4 rounded-2xl shadow-xl border-slate-200"
              align="end"
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">
                    Estado
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["ALL", "ACTIVE", "INACTIVE"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          statusFilter === s
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {s === "ALL"
                          ? "Todos"
                          : s === "ACTIVE"
                            ? "Activos"
                            : "Inactivos"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">
                    Etiquetas / Zonas
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedTags.includes(tag)
                            ? "bg-blue-600 text-white"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        <Tag className="inline mr-1 h-3 w-3" /> {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTags([]);
                      setStatusFilter("ALL");
                    }}
                    className="text-xs font-bold"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 filas</option>
            <option value={20}>20 filas</option>
            <option value={50}>50 filas</option>
          </select>
        </div>
      </div>

      {/* --- TABLA --- */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b">
            <tr>
              <th className="px-6 py-4">Cliente / Alias</th>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4">Sedes</th>
              <th className="px-6 py-4">Saldos de Envases</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-20 text-center text-slate-400 font-medium italic"
                >
                  No se encontraron clientes con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedData.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">
                          {customer.name}
                        </p>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-tight">
                          {customer.alias || "Sin Alias"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {customer.documentType}: {customer.documentNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-bold">
                        {customer.locations.length}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        sedes
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(customer.containerBalances?.length ?? 0) === 0 ? (
                        <span className="text-[10px] font-bold text-slate-300 italic">
                          Sin deuda
                        </span>
                      ) : (
                        customer.containerBalances.map((b) => (
                          <span
                            key={b.productId}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${b.balance > 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600"}`}
                          >
                            {b.balance} u.
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {customer.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase">
                        <CheckCircle2 className="h-3 w-3" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 font-black text-[10px] uppercase">
                        <XCircle className="h-3 w-3" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-xl border-slate-200"
                      >
                        <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="flex items-center"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" /> Ver Ficha
                            CRM
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link
                            href={`/customers/${customer.id}/edit`}
                            className="flex items-center"
                          >
                            <Edit className="mr-2 h-4 w-4" /> Editar Datos
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- CONTROLES DE PAGINACIÓN --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Mostrando{" "}
          <span className="text-slate-900">{paginatedData.length}</span> de{" "}
          <span className="text-slate-900">{filteredCustomers.length}</span>{" "}
          clientes
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="h-9 w-9 rounded-xl border-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-4">
            <span className="text-sm font-black text-slate-900">
              {currentPage}
            </span>
            <span className="text-sm font-bold text-slate-400">/</span>
            <span className="text-sm font-bold text-slate-400">
              {totalPages || 1}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="h-9 w-9 rounded-xl border-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
