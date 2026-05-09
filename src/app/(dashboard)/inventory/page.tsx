// src/app/(dashboard)/inventory/page.tsx
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Esto asegura que la tabla siempre traiga datos frescos y no use caché antigua
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  // Traemos los datos directamente desde Firebase Admin (Servidor)
  const data = await inventoryRepository.getKardex();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Kardex de Planta
          </h1>
          <p className="text-gray-500 mt-1">
            Visualiza el stock en tiempo real de productos terminados (llenos).
          </p>
        </div>

        {/* Botón directo para ir a registrar producción si falta stock */}
        <Link href="/production/new">
          <Button>+ Registrar Lote</Button>
        </Link>
      </div>

      {/* Renderizamos la tabla */}
      <DataTable columns={columns} data={data} />
    </div>
  );
}
