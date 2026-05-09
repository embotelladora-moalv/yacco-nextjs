// src/app/(dashboard)/products/page.tsx
import { productRepository } from "@/services/repositories/productRepository";
import { columns } from "./columns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";
import { setUserRole } from "@/services/firebase/admin-actions";

export const dynamic = "force-dynamic"; // Asegura que los datos siempre estén frescos

export default async function ProductsPage() {
  // Obtenemos los datos directamente desde el repositorio en el servidor
  const data = await productRepository.getActiveProducts();

  setUserRole("f6jOdeLUQqZUuYT4rsvhk98fG5b2", "ADMIN");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Catálogo de Productos
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona los bidones, botellas y cajas disponibles para producción.
          </p>
        </div>

        {/* Botón para ir a nuestro formulario */}
        <Link href="/products/new">
          <Button>+ Nuevo Producto</Button>
        </Link>
      </div>

      {/* Renderizamos nuestra tabla con los datos de Firebase */}
      <DataTable columns={columns} data={data} />
    </div>
  );
}
