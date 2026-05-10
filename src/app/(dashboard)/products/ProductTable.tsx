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
  Loader2,
  Edit,
  Trash2,
  Package,
} from "lucide-react";
import { Product, ProductCategory } from "@/core/entities/Product";
import { productSearchService } from "@/services/search/productSearchService";
import Link from "next/link";
import { deleteProductAction } from "./actions";

export function ProductTable({ initialData }: { initialData: Product[] }) {
  const [data, setData] = useState<Product[]>(initialData);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    const result = await productSearchService.searchProducts({
      query,
      category,
      page,
      hitsPerPage: rowsPerPage,
    });

    if (result.data.length > 0 || query !== "") {
      setData(result.data);
      setTotalPages(result.totalPages);
    } else if (query === "" && category === "ALL") {
      setData(initialData.slice(page * rowsPerPage, (page + 1) * rowsPerPage));
      setTotalPages(Math.ceil(initialData.length / rowsPerPage));
    }
    setIsLoading(false);
  }, [query, category, page, rowsPerPage, initialData]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [fetchResults]);

  const getCategoryLabel = (cat: ProductCategory) => {
    const labels: Record<ProductCategory, string> = {
      REFILL: "Recarga (Solo Líquido)",
      COMPLETE_PRODUCT: "Producto Completo",
      ACCESSORY: "Accesorio",
      BOX: "Caja",
    };
    return labels[cat] || cat;
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "¿Seguro que deseas eliminar este producto? Se ocultará del catálogo.",
      )
    ) {
      const res = await deleteProductAction(id);
      if (res.success) {
        setData((prev) => prev.filter((p) => p.id !== id));
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por Nombre o SKU..."
              className="pl-10 border-slate-200 focus-visible:ring-blue-600"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-auto gap-2">
              <Filter className="h-4 w-4" />
              {category === "ALL"
                ? "Todas las Categorías"
                : getCategoryLabel(category)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  setCategory("ALL");
                  setPage(0);
                }}
              >
                Todas las Categorías
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("REFILL");
                  setPage(0);
                }}
              >
                Recargas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("COMPLETE_PRODUCT");
                  setPage(0);
                }}
              >
                Productos Completos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("ACCESSORY");
                  setPage(0);
                }}
              >
                Accesorios
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategory("BOX");
                  setPage(0);
                }}
              >
                Cajas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0">
            <TableRow>
              <TableHead className="font-extrabold text-slate-700 w-12 text-center">
                N°
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Producto / SKU
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Clasificación
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-center">
                Llenos
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-center">
                Vacíos
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-right">
                Precio Base
              </TableHead>
              <TableHead className="font-extrabold text-slate-700 text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((product, index) => (
                <TableRow
                  key={product.id}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="text-center font-bold text-slate-400">
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">
                        {product.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wider">
                        {product.sku} | {product.volumeCapacity}{" "}
                        {product.unitOfMeasure}
                        {product.hasTap && " | CON CAÑO"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-slate-200 ${
                        product.category === "REFILL"
                          ? "bg-cyan-50 text-cyan-700"
                          : product.category === "COMPLETE_PRODUCT"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {getCategoryLabel(product.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                      {product.stockFilled || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {product.stockEmpty || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold tracking-tight text-slate-900">
                    S/ {(product.basePrice || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/products/${product.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-48 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="h-8 w-8 text-slate-200" />
                    <p>No se encontraron productos.</p>
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
    </div>
  );
}
