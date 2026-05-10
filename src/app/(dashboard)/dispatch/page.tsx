import { orderRepository } from "@/services/repositories/orderRepository";
import { dailyRouteRepository } from "@/services/repositories/dailyRouteRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { truckRepository } from "@/services/repositories/truckRepository";
import { MapPin, Truck } from "lucide-react";
import { DispatchBoard } from "./DispatchBoard";

export default async function DispatchPage() {
  // 1. Cargamos datos masivos en paralelo
  const [allOrders, activeRoutes, customers, trucks] = await Promise.all([
    orderRepository.getAll(), // Filtraremos en memoria para ahorrar lecturas si la base es pequeña
    dailyRouteRepository.getActiveRoutes(),
    customerRepository.getAll(),
    truckRepository.getAll(),
  ]);

  // 2. Filtramos solo los pedidos que están esperando asignación
  const pendingOrders = allOrders
    .filter((order) => order.status === "RESERVED")
    .map((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      return {
        ...order,
        customerName: customer?.name || "Cliente Desconocido",
        customerAddress:
          customer?.locations?.[0]?.address || "Dirección no registrada",
      };
    });

  // 3. Preparamos las rutas activas con el alias del camión
  const availableRoutes = activeRoutes.map((route) => {
    const truck = trucks.find((t) => t.id === route.truckId);
    return {
      id: route.id,
      truckAlias: truck?.alias || "Camión sin nombre",
      plateNumber: truck?.plateNumber || "N/A",
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            Centro de Despacho
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Asignación de reservas telefónicas a las unidades en calle.
          </p>
        </div>
      </div>

      <DispatchBoard
        pendingOrders={pendingOrders}
        availableRoutes={availableRoutes}
      />
    </div>
  );
}
