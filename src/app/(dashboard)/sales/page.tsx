import { salesRepository } from "@/services/repositories/salesRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { SalesListClient } from "./SalesListClient";
import { ShoppingCart, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  // Reemplaza la línea donde llamas a getRecentSales(100) por esto:
  const [sales, customers, products] = await Promise.all([
    salesRepository.getPaginatedSales(10), // <-- Arrancamos solo con la Página 1
    customerRepository.getAllCustomers(),
    inventoryRepository.getAllProducts(),
  ]);

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

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* MÉTRICAS RÁPIDAS */}
          <div className="flex gap-4 bg-slate-900 p-4 rounded-2xl text-white shadow-xl">
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
                Digital
              </p>
              <p className="text-xl font-bold text-blue-400">
                S/ {totalDigital.toFixed(2)}
              </p>
            </div>
          </div>

          {/* BOTÓN NUEVA VENTA */}
          <Link href="/sales/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-full px-8 rounded-2xl shadow-lg shadow-emerald-600/20">
              <Plus className="mr-2 h-5 w-5" /> Nueva Venta
            </Button>
          </Link>
        </div>
      </div>

      <SalesListClient
        sales={sales}
        customers={customers}
        products={products}
      />
    </div>
  );
}
