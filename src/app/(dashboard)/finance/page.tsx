import { financeRepository } from "@/services/repositories/financeRepository";
import { FinanceListClient } from "./FinanceListClient";
import { Wallet, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const movements = await financeRepository.getRecentMovements(200); // Traemos los últimos 200 para el dashboard

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-blue-600" />
            Flujo de Caja y Finanzas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Control de gastos operativos, viáticos e ingresos extraordinarios.
          </p>
        </div>

        <Button
          asChild
          className="bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg shadow-slate-900/20 px-6 rounded-xl"
        >
          <Link href="/finance/new">
            <Plus className="mr-2 h-4 w-4" /> Registrar Movimiento
          </Link>
        </Button>
      </div>

      {/* DASHBOARD CLIENTE */}
      <FinanceListClient movements={movements} />
    </div>
  );
}
