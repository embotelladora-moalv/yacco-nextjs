import { orderRepository } from "@/services/repositories/orderRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { OrderTable } from "./OrderTable";

export default async function OrdersPage() {
  // 1. Obtenemos pedidos y clientes en paralelo
  const [orders, customers] = await Promise.all([
    orderRepository.getAll(),
    customerRepository.getAll(),
  ]);

  // 2. "Enriquecemos" los pedidos para que la tabla muestre el nombre del cliente
  const enrichedOrders = orders.map((order) => {
    const customer = customers.find((c) => c.id === order.customerId);
    return {
      ...order,
      customerName: customer?.name || "Cliente Eliminado/Desconocido",
      customerDocument: customer?.documentId || "N/A",
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-blue-600" />
            Historial de Pedidos y Ventas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Control de facturación interna, reservas y ventas en ruta Moalv
            S.a.C.
          </p>
        </div>
        <Link href="/orders/new">
          <Button className="bg-blue-700 hover:bg-blue-800 shadow-md h-11 px-6">
            <Plus className="mr-2 h-5 w-5" /> Nueva Venta / Pedido
          </Button>
        </Link>
      </div>

      <OrderTable initialData={enrichedOrders} />
    </div>
  );
}
