import { orderRepository } from "@/services/repositories/orderRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { OrderForm } from "../../OrderForm";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  const [order, customers, products] = await Promise.all([
    orderRepository.getOrderById(resolvedParams.id),
    customerRepository.getAllCustomers(),
    inventoryRepository.getAllProducts(),
  ]);

  if (!order) notFound();

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-6">
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
          Volver / Editar Pedido
        </span>
      </div>

      <OrderForm
        customers={customers}
        products={products}
        initialData={order}
      />
    </div>
  );
}
