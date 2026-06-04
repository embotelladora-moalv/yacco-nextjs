import { orderRepository } from "@/services/repositories/orderRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { OrdersDashboardClient } from "./OrdersDashboardClient";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks } from "lucide-react";
import Link from "next/link";
import { Customer } from "@/core/entities/CRM";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    cursors?: string;
    limit?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const cursorsParam = resolvedSearchParams.cursors || "";
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 10;

  // Descomponemos la pila de cursores de la URL
  const cursorArray = cursorsParam ? cursorsParam.split(",") : [];
  const currentCursor = cursorArray[cursorArray.length - 1];

  // Consultas en paralelo para optimizar la carga
  const [paginatedOrders, manifests, products] = await Promise.all([
    orderRepository.listPaginated({
      pageSize: limit,
      cursor: currentCursor,
      status: "PENDING",
    }),
    dispatchRepository.getRecentDispatches(),
    inventoryRepository.getAllProducts(),
  ]);

  const { items: pendingOrders, nextCursor, hasMore } = paginatedOrders;

  // Resolvemos N+1 de los clientes en lote
  const customerIds = Array.from(
    new Set(pendingOrders.map((o) => o.customerId).filter(Boolean)),
  ) as string[];

  const customersData =
    customerIds.length > 0
      ? await customerRepository.getCustomersByIds(customerIds)
      : {};

  const customers = Object.values(customersData) as Customer[];

  // Filtramos solo los camiones que pueden recibir pedidos (PENDING o ON_ROUTE)
  const activeManifests = manifests.filter(
    (m) => m.status === "PENDING" || m.status === "ON_ROUTE",
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-orange-500" />
            Control de Pedidos
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Asigna las reservas telefónicas o de WhatsApp a las rutas del día.
          </p>
        </div>

        <Button
          asChild
          className="bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg shadow-slate-900/20 px-6 rounded-xl"
        >
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" /> Tomar Nuevo Pedido
          </Link>
        </Button>
      </div>

      <OrdersDashboardClient
        pendingOrders={pendingOrders}
        customers={customers}
        activeManifests={activeManifests}
        products={products}
        nextCursor={nextCursor}
        hasMore={hasMore}
        currentCursors={cursorsParam}
        currentLimit={limit}
      />
    </div>
  );
}
