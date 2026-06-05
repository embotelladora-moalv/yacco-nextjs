import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { orderRepository } from "@/services/repositories/orderRepository";
import { salesRepository } from "@/services/repositories/salesRepository";
import { Sale } from "@/core/entities/CRM";
import { SaleForm } from "../SaleForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    orderId?: string;
    manifestId?: string;
    customerId?: string;
  }>;
}

export default async function NewSalePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { orderId } = resolvedSearchParams;

  // 1. Consultas concurrentes base
  const [customers, products, activeManifests, initialOrder, activeBatches] =
    await Promise.all([
      customerRepository.getAllCustomers(),
      inventoryRepository.getAllProducts(),
      dispatchRepository.getActiveManifests(),
      orderId ? orderRepository.getOrderById(orderId) : Promise.resolve(null),
      inventoryRepository.getActiveBatches(),
    ]);

  // 2. 🔥 NUEVO: Traemos todas las ventas asociadas a los camiones activos para calcular el stock real remanente
  const manifestIds = activeManifests.map((m) => m.id);
  let allActiveSales: Sale[] = [];

  if (manifestIds.length > 0) {
    allActiveSales = await salesRepository.getSalesByManifestIds(manifestIds);
  }

  // 3. Cruzamos las ventas correspondientes dentro de cada manifiesto activo
  const manifestsWithSales = activeManifests.map((m) => ({
    ...m,
    sales: allActiveSales.filter((s) => s.manifestId === m.id),
  }));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link href="/sales">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <ChevronLeft className="h-4 w-4" /> Volver al Directorio
          </Button>
        </Link>
      </div>

      <SaleForm
        customers={customers}
        products={products}
        activeManifests={manifestsWithSales} // <-- Enviamos los camiones con sus ventas inyectadas
        initialOrder={initialOrder}
        activeBatches={activeBatches}
      />
    </div>
  );
}
