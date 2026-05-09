import { MapWrapper } from "./MapWrapper";
import { customerRepository } from "@/services/repositories/customerRepository";

export default async function MapPage() {
  // Seguimos obteniendo los datos en el servidor para mayor eficiencia
  const customers = await customerRepository.getAllActive();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">
          Mapa Logístico
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Visualización de red de distribución.
        </p>
      </div>

      <MapWrapper customers={customers} />
    </div>
  );
}
