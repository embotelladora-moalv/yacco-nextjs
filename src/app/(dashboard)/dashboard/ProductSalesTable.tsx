"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductSaleData {
  productId: string;
  productName: string;
  units: number;
  billed: number;
}

export function ProductSalesTable({ data }: { data: ProductSaleData[] }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          Ventas por producto (mes actual)
        </h2>
        <p className="text-sm text-slate-500">
          Desglose de unidades vendidas y monto facturado.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Producto
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">
                Unidades
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">
                Facturado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-slate-500"
                >
                  No hay ventas registradas en este mes.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="font-medium text-slate-900">
                    {row.productName}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.units.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-700">
                    S/ {row.billed.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
