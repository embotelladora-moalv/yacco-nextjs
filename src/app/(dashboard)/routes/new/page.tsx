import { truckRepository } from "@/services/repositories/truckRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { OpenRouteForm } from "./OpenRouteForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewRoutePage() {
  // Obtenemos camiones y TODOS los usuarios activos
  const [trucks, allUsers] = await Promise.all([
    truckRepository.getAll(),
    userRepository.getAll(), // Cambiamos a getAll para poder filtrar en memoria
  ]);

  // El responsable de la ruta DEBE ser un chofer
  const drivers = allUsers.filter((u) => u.roles?.includes("DRIVER"));

  // El auxiliar puede ser alguien con rol ASSISTANT, o también otro DRIVER
  const assistants = allUsers.filter(
    (u) => u.roles?.includes("ASSISTANT") || u.roles?.includes("DRIVER"),
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <Link href="/routes">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver a Monitoreo
          </Button>
        </Link>
      </div>

      <OpenRouteForm
        trucks={trucks}
        drivers={drivers}
        assistants={assistants} // Pasamos la nueva lista
      />
    </div>
  );
}
