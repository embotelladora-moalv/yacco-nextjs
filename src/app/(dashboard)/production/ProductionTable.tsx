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
import { Search, User, ChevronLeft, ChevronRight } from "lucide-react";

export function ProductionTable({
  initialData,
  products,
}: {
  initialData: any[];
  products: any[];
}) {
  const [filter, setFilter] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");

  // Estados de Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 1. Filtrar datos
  const filteredData = useMemo(() => {
    return initialData.filter((batch) => {
      const matchesSearch =
        batch.brandId?.toLowerCase().includes(filter.toLowerCase()) ||
        batch.notes?.toLowerCase().includes(filter.toLowerCase());
      const matchesProduct =
        productFilter === "ALL" || batch.productId === productFilter;
      return matchesSearch && matchesProduct;
    });
  }, [initialData, filter, productFilter]);

  // 2. Paginar datos filtrados
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Resetear página si cambian los filtros
  const handleFilterChange = (val: string, type: "search" | "product") => {
    if (type === "search") setFilter(val);
    if (type === "product") setProductFilter(val);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-3 rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por marca o notas..."
              className="pl-10"
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value, "search")}
            />
          </div>
          <select
            className="h-10 px-3 rounded-md border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none"
            value={productFilter}
            onChange={(e) => handleFilterChange(e.target.value, "product")}
          >
            <option value="ALL">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Registros por Página */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Mostrar:</span>
          <select
            className="h-10 px-2 rounded-md border border-gray-200 text-sm font-bold text-gray-700 outline-none"
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
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-bold text-gray-600">
                Fecha / Lote
              </TableHead>
              <TableHead className="font-bold text-gray-600">
                Producto
              </TableHead>
              <TableHead className="font-bold text-gray-600 text-right">
                Cantidad
              </TableHead>
              <TableHead className="font-bold text-gray-600 text-center">
                Tipo
              </TableHead>
              <TableHead className="font-bold text-gray-600">
                Responsable
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((batch) => {
                const product = products.find((p) => p.id === batch.productId);
                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          {new Date(batch.productionDate).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">
                          ID: {batch.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-700">
                        {product?.name || "Desconocido"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-base font-black text-blue-700">
                        +{batch.quantityProduced}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {batch.isTollManufacturing ? (
                        <Badge className="bg-amber-100 text-amber-700">
                          Maquila: {batch.brandId}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-blue-700 border-blue-200"
                        >
                          Propia
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="h-3.5 w-3.5" /> {batch.managerId}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-gray-400 italic"
                >
                  No hay registros que coincidan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* CONTROLES DE PAGINACIÓN */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-gray-500 font-medium">
          Mostrando{" "}
          <span className="font-bold text-gray-900">
            {page * rowsPerPage + 1}
          </span>{" "}
          a{" "}
          <span className="font-bold text-gray-900">
            {Math.min((page + 1) * rowsPerPage, filteredData.length)}
          </span>{" "}
          de {filteredData.length} registros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-xs font-bold px-2">
            {page + 1} / {totalPages || 1}
          </span>
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
  );
}
