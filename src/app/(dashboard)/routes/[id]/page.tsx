import { dailyRouteRepository } from "@/services/repositories/dailyRouteRepository";
import { productRepository } from "@/services/repositories/productRepository";
import { truckRepository } from "@/services/repositories/truckRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { RouteDetailsView } from "./RouteDetailsView";

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Carga de datos en paralelo
  const [route, allProducts, allTrucks, allUsers] = await Promise.all([
    dailyRouteRepository.getRouteById(id),
    productRepository.getAll(),
    truckRepository.getAll(),
    userRepository.getAll(),
  ]);

  if (!route) notFound();

  // 2. Enriquecimiento de datos
  const truck = allTrucks.find((t) => t.id === route.truckId);
  const driver = allUsers.find((u) => u.id === route.driverId);
  const assistant = allUsers.find((u) => u.id === route.assistantId);

  // Mapear el inventario actual (ID -> Nombre y Cantidad)
  const inventoryDetails = Object.entries(route.currentInventory || {}).map(
    ([productId, quantity]) => {
      const product = allProducts.find((p) => p.id === productId);
      return {
        id: productId,
        name: product?.name || "Producto desconocido",
        sku: product?.sku || "N/A",
        quantity: quantity as number,
      };
    },
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/routes">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Detalles del Despacho
          </h1>
          <p className="text-sm text-slate-500 font-medium italic">
            ID: {route.id}
          </p>
        </div>
      </div>

      <RouteDetailsView
        route={route}
        truck={truck}
        driver={driver}
        assistant={assistant}
        inventory={inventoryDetails}
      />
    </div>
  );
}
