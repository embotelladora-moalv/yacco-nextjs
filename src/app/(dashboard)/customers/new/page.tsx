import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { CustomerForm } from "../CustomerForm";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";

// 🔥 IMPORTANTE: Ajusta esta importación a la ruta real de tu función que obtiene los productos
// Asumo que tienes una función similar a la que usaste en la página de Ventas (SaleForm)

export default async function NewCustomerPage() {
  // 1. Obtenemos el catálogo de productos desde el servidor
  // (Puedes filtrar para que solo traiga los productos activos si lo deseas)
  const products = await inventoryRepository.getAllProducts();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <ChevronLeft className="h-4 w-4" /> Volver al Directorio
          </Button>
        </Link>
      </div>

      {/* 2. Le inyectamos los productos obtenidos al formulario */}
      <CustomerForm products={products} />
    </div>
  );
}
