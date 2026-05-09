import { productRepository } from "@/services/repositories/productRepository";
import { ProductionForm } from "./ProductionForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewProductionPage() {
  // Obtenemos todos los productos activos desde el servidor
  const products = await productRepository.getAll();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 pb-10 pt-6 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <Link href="/production">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver a Producción
          </Button>
        </Link>
      </div>

      {/* Pasamos los productos al componente de cliente */}
      <ProductionForm products={products} />
    </div>
  );
}
