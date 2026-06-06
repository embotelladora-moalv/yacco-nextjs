import { customerRepository } from "@/services/repositories/customerRepository";
import { CollectionsClient } from "./CollectionsClient";
import { HandCoins, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    cursors?: string;
    limit?: string;
    q?: string;
  }>;
}

export default async function CollectionsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const cursorsParam = resolvedSearchParams.cursors || "";
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 10;
  const q = resolvedSearchParams.q || "";

  // Descomponemos la pila de cursores de la URL
  const cursorArray = cursorsParam ? cursorsParam.split(",") : [];
  const currentCursor = cursorArray[cursorArray.length - 1];

  const paginatedData = await customerRepository.listDebtorsPaginated({
    pageSize: limit,
    cursor: currentCursor,
    search: q,
  });

  const { items: debtors, nextCursor, hasMore, totalCount, totalDebtAmount } = paginatedData;

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-red-500" />
            Módulo de Cobranzas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de cuentas por cobrar y registro de amortizaciones de
            clientes.
          </p>
        </div>
        <div className="flex shrink-0">
          <Button
            asChild
            variant="outline"
            className="font-bold rounded-xl h-10 px-5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm"
          >
            <Link href="/collections/history" className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              Historial de Cobranzas
            </Link>
          </Button>
        </div>
      </div>

      {/* DASHBOARD CLIENTE */}
      <CollectionsClient
        debtors={debtors}
        nextCursor={nextCursor}
        hasMore={hasMore}
        currentCursors={cursorsParam}
        currentLimit={limit}
        currentSearch={q}
        totalCount={totalCount}
        totalDebtAmount={totalDebtAmount}
      />
    </div>
  );
}
