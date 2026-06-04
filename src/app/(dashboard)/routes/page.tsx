import { dailyRouteRepository } from "@/services/repositories/dailyRouteRepository";
import { truckRepository } from "@/services/repositories/truckRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { Button } from "@/components/ui/button";
import { Plus, MapPinned } from "lucide-react";
import Link from "next/link";
import { RouteDashboard } from "./RouteDashboard";

export default async function RoutesPage() {
  // 1. Obtenemos las rutas activas, y los catálogos de camiones y usuarios
  const [activeRoutes, trucks, users] = await Promise.all([
    dailyRouteRepository.getActiveRoutes(),
    truckRepository.getAll(),
    userRepository.getAll(),
  ]);

  // 2. "Unimos" (Join) la información para la vista
  const enrichedRoutes = activeRoutes.map((route) => {
    const truck = trucks.find((t) => t.id === route.truckId);
    const driver = users.find((u) => u.id === route.driverId);
    const assistant = users.find((u) => u.id === route.assistantId);

    return {
      ...route,
      truckAlias: truck?.alias || "Camión Desconocido",
      truckPlate: truck?.plateNumber || "N/A",
      driverName: driver ? `${driver.name} ${driver.lastName}` : "Sin asignar",
      assistantName: assistant
        ? `${assistant.name} ${assistant.lastName}`
        : null,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <MapPinned className="h-8 w-8 text-blue-600" />
            Monitoreo de Rutas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Control en tiempo real de despachos y unidades en calle.
          </p>
        </div>
        <Link href="/routes/new">
          <Button className="bg-blue-700 hover:bg-blue-800 shadow-md h-11 px-6">
            <Plus className="mr-2 h-5 w-5" /> Aperturar Nueva Ruta
          </Button>
        </Link>
      </div>

      <RouteDashboard activeRoutes={enrichedRoutes} />
    </div>
  );
}
