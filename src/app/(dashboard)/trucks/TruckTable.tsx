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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Edit,
  Trash2,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Truck as TruckEntity } from "@/core/entities/Truck";
import { deleteTruckAction } from "./actions";
import Link from "next/link";
import { toast } from "sonner";

export function TruckTable({ initialData }: { initialData: TruckEntity[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState(initialData);

  const filteredData = useMemo(() => {
    return data.filter(
      (t) =>
        t.plateNumber.toLowerCase().includes(query.toLowerCase()) ||
        t.alias.toLowerCase().includes(query.toLowerCase()),
    );
  }, [data, query]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este vehículo de la flota?")) return;
    const res = await deleteTruckAction(id);
    if (res.success) {
      setData((prev) => prev.filter((t) => t.id !== id));
      toast.success("Vehículo eliminado");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por Placa o Alias..."
            className="pl-10"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-12 text-center font-bold">N°</TableHead>
              <TableHead className="font-bold">Placa / Identificador</TableHead>
              <TableHead className="font-bold">Capacidad Máx.</TableHead>
              <TableHead className="font-bold text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((truck, idx) => (
              <TableRow key={truck.id} className="group">
                <TableCell className="text-center font-bold text-slate-400">
                  {page * rowsPerPage + idx + 1}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900">
                      {truck.plateNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {truck.alias}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700">
                      {truck.capacity}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      Bidones (20L)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Link href={`/trucks/${truck.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(truck.id)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
        <p className="text-xs text-slate-500 font-medium">
          Página <span className="font-bold text-slate-900">{page + 1}</span> de{" "}
          {totalPages || 1}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Mostrar:</span>
            <select
              className="h-8 px-2 rounded-md border text-xs font-bold"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
