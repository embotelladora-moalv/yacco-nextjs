import { salesRepository } from "@/services/repositories/salesRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { SalesListClient } from "./SalesListClient";
import { ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [sales, customers, products] = await Promise.all([
    salesRepository.getRecentSales(100), // Traemos los últimos 100 tickets
    customerRepository.getAllCustomers(),
    inventoryRepository.getAllProducts(),
  ]);

  // Calcular métricas rápidas del día o periodo cargado
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalCash = sales.reduce(
    (acc, sale) => acc + (sale.cashReceived || 0),
    0,
  );
  const totalDigital = sales.reduce(
    (acc, sale) => acc + (sale.digitalReceived || 0),
    0,
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER Y MÉTRICAS BÁSICAS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-emerald-500" />
            Historial de Ventas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Auditoría de todos los tickets generados en planta y en ruta.
          </p>
        </div>

        <div className="flex gap-4 bg-slate-900 p-4 rounded-2xl text-white shadow-xl shadow-slate-900/10 w-full md:w-auto">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Valor Vendido
            </p>
            <p className="text-2xl font-black text-emerald-400">
              S/ {totalRevenue.toFixed(2)}
            </p>
          </div>
          <div className="w-px bg-slate-700 mx-2"></div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Efectivo Recibido
            </p>
            <p className="text-xl font-bold">S/ {totalCash.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* TABLA DE VENTAS */}
      <SalesListClient
        sales={sales}
        customers={customers}
        products={products}
      />
    </div>
  );
}
