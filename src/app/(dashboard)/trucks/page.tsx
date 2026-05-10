import { truckRepository } from "@/services/repositories/truckRepository";
import { TruckTable } from "./TruckTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function TrucksPage() {
  const trucks = await truckRepository.getAll();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Flota de Camiones
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de unidades de transporte Moalv S.a.C.
          </p>
        </div>
        <Link href="/trucks/new">
          <Button className="bg-blue-700 shadow-md">
            <Plus className="mr-2 h-5 w-5" /> Registrar Camión
          </Button>
        </Link>
      </div>
      <TruckTable initialData={trucks} />
    </div>
  );
}
