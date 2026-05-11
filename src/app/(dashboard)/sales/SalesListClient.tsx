"use client";

import { Sale, Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory";
import {
  ShoppingCart,
  Calendar,
  CreditCard,
  Banknote,
  ArrowDownToLine,
  ReceiptText,
  User,
} from "lucide-react";

interface SalesListProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
}

export function SalesListClient({
  sales,
  customers,
  products,
}: SalesListProps) {
  const getCustomerName = (id: string) => {
    return customers.find((c) => c.id === id)?.name || "Cliente Desconocido";
  };

  const getProductName = (id: string) => {
    return products.find((p) => p.id === id)?.name || "Producto";
  };

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
    switch (method) {
      case "CASH":
        return (
          <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
            <Banknote className="h-3 w-3" /> Efectivo
          </span>
        );
      case "DIGITAL":
        return (
          <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold">
            <CreditCard className="h-3 w-3" /> Digital
          </span>
        );
      case "MIXED":
        return (
          <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-md text-xs font-bold">
            <ReceiptText className="h-3 w-3" /> Mixto
          </span>
        );
      case "CREDIT":
        return (
          <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold">
            <ArrowDownToLine className="h-3 w-3" /> Crédito (Deuda)
          </span>
        );
      default:
        return method;
    }
  };

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center shadow-sm">
        <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-800">
          No hay ventas registradas
        </h3>
        <p className="text-slate-500 font-medium mt-2">
          Las ventas aparecerán aquí cuando los choferes las registren en ruta.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Fecha y Ticket</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Productos (Resumen)</th>
              <th className="px-6 py-4">Método de Pago</th>
              <th className="px-6 py-4 text-right">Total Venta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => {
              const totalItems = sale.items.reduce(
                (acc, curr) => acc + curr.quantity,
                0,
              );

              return (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {formatDate(sale.createdAt as unknown as string)}{" "}
                    </div>
                    <div className="text-[10px] text-slate-400 font-black tracking-widest mt-1">
                      #{sale.id.substring(0, 8).toUpperCase()}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <User className="h-4 w-4 text-blue-500" />
                      {getCustomerName(sale.customerId)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md inline-block">
                      {totalItems} unidades
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[200px]">
                      {sale.items
                        .map(
                          (i) =>
                            `${i.quantity}x ${getProductName(i.productId)}`,
                        )
                        .join(", ")}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {renderPaymentMethod(sale.paymentMethod)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="text-lg font-black text-slate-900">
                      S/ {sale.totalAmount.toFixed(2)}
                    </div>
                    {sale.paymentMethod !== "CREDIT" &&
                      sale.cashReceived + sale.digitalReceived <
                        sale.totalAmount && (
                        <div className="text-[10px] font-bold text-red-500 mt-0.5">
                          Deuda: S/{" "}
                          {(
                            sale.totalAmount -
                            (sale.cashReceived + sale.digitalReceived)
                          ).toFixed(2)}
                        </div>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
