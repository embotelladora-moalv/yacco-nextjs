import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { DispatchDashboard } from "./DispatchDashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    cursors?: string;
    limit?: string;
    driverId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function DispatchPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const cursorsParam = resolvedSearchParams.cursors || "";
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 10;
  const driverId = resolvedSearchParams.driverId || "ALL";
  const startDate = resolvedSearchParams.startDate || "";
  const endDate = resolvedSearchParams.endDate || "";

  const cursorArray = cursorsParam ? cursorsParam.split(",") : [];
  const currentCursor = cursorArray[cursorArray.length - 1];

  // 1. Ejecutamos consultas concurrentes en el servidor
  const [activeRoutes, paginatedLiquidated, totalCount, users, products] = await Promise.all([
    dispatchRepository.getActiveManifests(),
    dispatchRepository.listPaginated({
      pageSize: limit,
      cursor: currentCursor,
      status: "LIQUIDATED",
      driverId,
      startDate,
      endDate,
    }),
    dispatchRepository.getCount({
      status: "LIQUIDATED",
      driverId,
      startDate,
      endDate,
    }),
    userRepository.getAll(),
    inventoryRepository.getAllProducts(),
  ]);

  const { items: liquidatedRoutes, nextCursor, hasMore } = paginatedLiquidated;

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4">
      {/* 2. Enviamos la información limpia al cliente orquestador */}
      <DispatchDashboard
        activeRoutes={activeRoutes as any}
        liquidatedRoutes={liquidatedRoutes as any}
        users={users as any}
        products={products as any}
        nextCursor={nextCursor}
        hasMore={hasMore}
        totalCount={totalCount}
        currentCursors={cursorsParam}
        currentLimit={limit}
        currentDriverId={driverId}
        currentStartDate={startDate}
        currentEndDate={endDate}
      />
    </div>
  );
}
