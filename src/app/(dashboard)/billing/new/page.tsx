import { customerRepository } from "@/services/repositories/customerRepository";
import { orderRepository } from "@/services/repositories/orderRepository";
import { BillingForm } from "./BillingForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewInvoicePage() {
  const [customers, allOrders] = await Promise.all([
    customerRepository.getAllCustomers(),
    orderRepository.getPendingOrders(),
  ]);

  // Extraemos solo los pedidos que NO tienen un billingId asociado (no facturados)
  // Nota: Deberíamos agregar 'billingId?: string' en la interfaz Order.ts para TS puro.
  const unbilledOrders = allOrders.filter((order) => !(order as any).billingId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link href="/billing">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <ChevronLeft className="h-4 w-4" /> Volver a Facturación
          </Button>
        </Link>
      </div>

      <BillingForm customers={customers} allUnbilledOrders={unbilledOrders} />
    </div>
  );
}
