import { dailyRouteRepository } from "@/services/repositories/dailyRouteRepository";
import { productRepository } from "@/services/repositories/productRepository";
import { truckRepository } from "@/services/repositories/truckRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { LoadTruckForm } from "./LoadTruckForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function LoadTruckPage() {
  // 1. Obtenemos toda la data necesaria en paralelo para que la página cargue rápido
  const [activeRoutes, products, trucks, users] = await Promise.all([
    dailyRouteRepository.getActiveRoutes(),
    productRepository.getAll(),
    truckRepository.getAll(),
    userRepository.getAll(),
  ]);

  // 2. Enriquecemos las rutas activas para mostrar nombres amigables en el select
  const enrichedRoutes = activeRoutes.map((route) => {
    const truck = trucks.find((t) => t.id === route.truckId);
    const driver = users.find((u) => u.id === route.driverId);

    return {
      id: route.id,
      truckAlias: truck?.alias || "Vehículo sin identificar",
      driverName: driver ? `${driver.name} ${driver.lastName}` : "Sin asignar",
    };
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-3xl mx-auto mb-6">
        <Link href="/routes">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver al Monitoreo
          </Button>
        </Link>
      </div>

      {/* 3. Pasamos la data procesada a nuestro formulario interactivo */}
      <LoadTruckForm activeRoutes={enrichedRoutes} products={products} />
    </div>
  );
}
