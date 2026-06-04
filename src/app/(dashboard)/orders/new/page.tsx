import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { OrderForm } from "../OrderForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewOrderPage() {
  // Obtenemos los datos necesarios para los selectores del formulario
  const [customers, products] = await Promise.all([
    customerRepository.getAllCustomers(),
    inventoryRepository.getAllProducts(),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-6">
      {/* Botón para volver al listado de pedidos */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full bg-white shadow-sm border border-slate-200"
        >
          <Link href="/orders">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
        </Button>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Volver a Pedidos
        </span>
      </div>

      {/* Renderizamos el formulario de reserva */}
      <OrderForm customers={customers} products={products} />
    </div>
  );
}
