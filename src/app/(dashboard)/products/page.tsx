import { productRepository } from "@/services/repositories/productRepository";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ProductTable } from "./ProductTable";

export default async function ProductsPage() {
  // Obtenemos el catálogo inicial (Idealmente la primera página)
  const initialProducts = await productRepository.getAll();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de SKUs, recargas, envases y accesorios de Moalv S.a.C.
          </p>
        </div>
        <Link href="/products/new">
          <Button className="bg-blue-700 hover:bg-blue-800 shadow-md">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Producto
          </Button>
        </Link>
      </div>

      <ProductTable initialData={initialProducts} />
    </div>
  );
}
