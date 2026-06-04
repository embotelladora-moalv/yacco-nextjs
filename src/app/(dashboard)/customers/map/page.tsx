import { customerRepository } from "@/services/repositories/customerRepository";
import { MapPin } from "lucide-react";
import { CustomerMap } from "./CustomerMap";

export default async function CustomerMapPage() {
  const customers = await customerRepository.getAll();

  // Extraemos solo las ubicaciones que tengan coordenadas registradas
  const mapPins = customers.flatMap((customer) =>
    customer.locations
      .filter((loc) => loc.latitude && loc.longitude)
      .map((loc) => ({
        customerId: customer.id,
        customerName: customer.name,
        customerType: customer.type,
        debtAmount: customer.debtAmount,
        locationId: loc.id,
        locationName: loc.name,
        address: loc.address,
        latitude: loc.latitude!,
        longitude: loc.longitude!,
        isDefault: loc.isDefault,
      })),
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 max-w-7xl mx-auto pb-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-blue-600" />
            Mapa de Clientes
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Geolocalización de cartera para planificación de rutas Moalv S.a.C.
          </p>
        </div>
      </div>

      {/* Pasamos los pines calculados a la vista del cliente */}
      <CustomerMap pins={mapPins} />
    </div>
  );
}
