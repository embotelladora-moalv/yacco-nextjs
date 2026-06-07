"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DebtorData {
  id: string;
  name: string;
  alias?: string;
  debtAmount: number;
}

interface VolumeData {
  customerId: string;
  customerName: string;
  total: number;
}

interface TopCustomersTablesProps {
  debtors: DebtorData[];
  volumes: VolumeData[];
}

export function TopCustomersTables({ debtors, volumes }: TopCustomersTablesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tabla Top Deudores */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Top deudores</h2>
          <p className="text-sm text-slate-500">Clientes con mayor saldo pendiente.</p>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Deuda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                    No hay clientes con deuda.
                  </TableCell>
                </TableRow>
              ) : (
                debtors.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-slate-900">
                      {row.name} {row.alias && <span className="text-slate-500 font-normal">({row.alias})</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      S/ {row.debtAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tabla Top Clientes del mes (Volumen) */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Top clientes del mes</h2>
          <p className="text-sm text-slate-500">Clientes con mayor facturación este mes.</p>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Comprado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volumes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                    No hay ventas registradas en este mes.
                  </TableCell>
                </TableRow>
              ) : (
                volumes.map((row) => (
                  <TableRow key={row.customerId}>
                    <TableCell className="font-medium text-slate-900">
                      {row.customerName}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-700">
                      S/ {row.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}