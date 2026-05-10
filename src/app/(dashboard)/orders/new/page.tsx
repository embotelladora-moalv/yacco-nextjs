import { customerRepository } from "@/services/repositories/customerRepository";
import { productRepository } from "@/services/repositories/productRepository";
import { OrderForm } from "./OrderForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewOrderPage() {
  // Obtenemos clientes y productos en paralelo para máxima velocidad
  const [customers, products] = await Promise.all([
    customerRepository.getAll(),
    productRepository.getAll(),
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-5xl mx-auto mb-6">
        <Link href="/orders">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver a Pedidos
          </Button>
        </Link>
      </div>

      {/* Pasamos la data al POS */}
      <OrderForm customers={customers} products={products} />
    </div>
  );
}
