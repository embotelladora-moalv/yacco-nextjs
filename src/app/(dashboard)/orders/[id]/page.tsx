import { orderRepository } from "@/services/repositories/orderRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { OrderDetailsView } from "./OrderDetailsView";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Obtenemos el pedido
  const order = await orderRepository.getById(id);
  if (!order) notFound();

  // 2. Obtenemos los datos del cliente asociado
  const customer = await customerRepository.getById(order.customerId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 pt-6 px-4">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Detalles de la Operación
          </h1>
          <p className="text-sm text-slate-500 font-medium italic">
            ID de Transacción: {order.id}
          </p>
        </div>
      </div>

      <OrderDetailsView order={order} customer={customer} />
    </div>
  );
}
