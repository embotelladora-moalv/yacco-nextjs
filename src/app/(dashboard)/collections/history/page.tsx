import { salesRepository } from "@/services/repositories/salesRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { CollectionsHistoryClient } from "./CollectionsHistoryClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    limit?: string;
    cursors?: string;
  }>;
}

export default async function CollectionsHistoryPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const cursorsParam = resolvedSearchParams.cursors || "";
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 10;
  
  // Default to today's date in America/Lima timezone (sv-SE locale output format is YYYY-MM-DD)
  const todayInLima = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
  
  const startDate = resolvedSearchParams.startDate || todayInLima;
  const endDate = resolvedSearchParams.endDate || todayInLima;

  const cursorArray = cursorsParam ? cursorsParam.split(",") : [];
  const currentCursor = cursorArray[cursorArray.length - 1];

  // Fetch paginated payments, total count, metrics and users concurrently
  const [paginatedResult, totalCount, metrics, users] = await Promise.all([
    salesRepository.listPaymentsPaginated({
      pageSize: limit,
      cursor: currentCursor,
      startDate,
      endDate,
    }),
    salesRepository.getPaymentsCount({ startDate, endDate }),
    salesRepository.getActivePaymentsMetricsByDateRange({ startDate, endDate }),
    userRepository.getAll(),
  ]);

  const { items: payments, nextCursor, hasMore } = paginatedResult;

  // Fetch unique customer details only for the paginated items
  const uniqueCustomerIds = Array.from(new Set(payments.map((p) => p.customerId).filter(Boolean))) as string[];
  const customersMap = uniqueCustomerIds.length > 0
    ? await customerRepository.getCustomersByIds(uniqueCustomerIds)
    : {};

  // Enrich payments with customer name and recipient name
  const enrichedPayments = payments.map((payment) => {
    const customer = customersMap[payment.customerId];
    const user = users.find((u) => u.id === payment.receivedById);
    
    // Improved user name fallback mapping
    let receivedByName = "Usuario no registrado";
    if (user) {
      receivedByName = user.name;
    } else if (
      payment.receivedById === "ADMIN_DIRECT_PAYMENT" ||
      payment.receivedById === "ADMIN_SYS" ||
      payment.receivedById === "SYSTEM"
    ) {
      receivedByName = "Sistema";
    }

    return {
      ...payment,
      customerName: customer ? customer.name : "Cliente Desconocido",
      receivedByName,
    };
  });

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Link href="/collections" className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Volver a Cobranzas
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            Historial de Cobranzas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Visualización y auditoría de amortizaciones y abonos recibidos (no incluye ventas al contado).
          </p>
        </div>
      </div>

      <CollectionsHistoryClient
        key={`${startDate}_${endDate}_${cursorsParam}_${limit}`}
        payments={enrichedPayments}
        nextCursor={nextCursor}
        hasMore={hasMore}
        totalCount={totalCount}
        metrics={metrics}
        currentCursors={cursorsParam}
        currentLimit={limit}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
