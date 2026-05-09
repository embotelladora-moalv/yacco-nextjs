"use client";

import { useState, useEffect, useCallback } from "react";
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
  Droplet,
  UserCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Customer } from "@/core/entities/Customer";
import { customerSearchService } from "@/services/search/customerSearchService";
import Link from "next/link";
// Asume que usas un Popover o DropdownMenu de Shadcn
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CustomerTable({ initialData }: { initialData: Customer[] }) {
  const [data, setData] = useState<Customer[]>(initialData);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const HITS_PER_PAGE = 10;

  // Lógica de Búsqueda Escalonada (Debounce)
  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    // Usamos el servicio escalable (Algolia o Firestore)
    const result = await customerSearchService.searchCustomers({
      query,
      category,
      page,
      hitsPerPage: HITS_PER_PAGE,
    });

    // Si el mock devuelve vacío, mantenemos initialData para visualización de prueba
    if (result.data.length > 0 || query !== "") {
      setData(result.data);
      setTotalPages(result.totalPages);
    }
    setIsLoading(false);
  }, [query, category, page]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 400); // Debounce de 400ms
    return () => clearTimeout(timeoutId);
  }, [fetchResults]);

  return (
    <div className="space-y-4">
      {/* BARRA DE HERRAMIENTAS: Búsqueda y Filtros Pop-up */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por Alias, RUC o Nombre..."
            className="pl-10 border-gray-200 focus-visible:ring-blue-600"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 w-full sm:w-auto gap-2">
              <Filter className="h-4 w-4" />
              {category === "ALL" ? "Todas las Zonas" : category}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  setCategory("ALL");
                  setPage(0);
                }}
              >
                Todas las Zonas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("Parque");
                  setPage(0);
                }}
              >
                Zona: Parque
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("Industrial");
                  setPage(0);
                }}
              >
                Zona: Industrial
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("Centro");
                  setPage(0);
                }}
              >
                Zona: Centro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/customers/new">
            <Button className="bg-blue-700 hover:bg-blue-800 shrink-0 shadow-md">
              + Nuevo
            </Button>
          </Link>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader className="bg-slate-50/80 backdrop-blur-md sticky top-0">
            <TableRow>
              <TableHead className="font-extrabold text-slate-700">
                Cliente / Identidad
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Zona
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-right">
                Deuda (S/)
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-right">
                Préstamos
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  {/* CUIDADO AQUÍ: Sin comentarios de barra doble */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                        {customer.alias}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
                        {customer.businessName}
                      </span>
                      <span className="text-[9px] font-mono text-blue-600/80">
                        {customer.documentNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-blue-700 border-blue-200 bg-blue-50/50"
                    >
                      {customer.categoryTag}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold tracking-tight ${customer.stats.currentDebt > 0 ? "text-red-600" : "text-slate-400"}`}
                  >
                    S/ {customer.stats.currentDebt.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 font-bold text-slate-700">
                      {customer.stats.loanedBottles}
                      <Droplet className="h-4 w-4 text-cyan-500" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/customers/${customer.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-48 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-8 w-8 text-slate-200" />
                    <p>No se encontraron resultados para la búsqueda.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINACIÓN */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-slate-500 font-medium">
          Mostrando página{" "}
          <span className="font-bold text-slate-900">{page + 1}</span> de{" "}
          {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="shadow-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || isLoading}
            className="shadow-sm"
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
