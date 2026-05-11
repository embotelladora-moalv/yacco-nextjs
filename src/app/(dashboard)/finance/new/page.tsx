import { financeRepository } from "@/services/repositories/financeRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { FinanceForm } from "../FinanceForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewFinancePage() {
  // Obtenemos los catálogos necesarios
  const [categories, manifests] = await Promise.all([
    financeRepository.getActiveCategories(),
    dispatchRepository.getRecentDispatches(), // Traemos los últimos manifiestos
  ]);

  // Filtramos solo los camiones que están actualmente en ruta o pendientes,
  // ya que no se deberían registrar viáticos a un camión que ya fue liquidado.
  const activeManifests = manifests.filter(
    (m) => m.status === "ON_ROUTE" || m.status === "PENDING",
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full bg-white shadow-sm border border-slate-200"
        >
          <Link href="/finance">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
        </Button>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Volver a Finanzas
        </span>
      </div>

      <FinanceForm categories={categories} activeManifests={activeManifests} />
    </div>
  );
}
