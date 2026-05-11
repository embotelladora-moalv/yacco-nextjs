import { orderRepository } from "@/services/repositories/orderRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { notFound } from "next/navigation";
import { OrderDetailClient } from "./OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Consultamos el pedido primero
  const order = await orderRepository.getOrderById(id);
  if (!order) notFound();

  // Consultamos el resto de datos en paralelo
  const [customer, products, manifest] = await Promise.all([
    customerRepository.getCustomerById(order.customerId),
    inventoryRepository.getAllProducts(),
    order.manifestId
      ? dispatchRepository.getManifestById(order.manifestId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto pb-10 pt-4 px-4 sm:px-6">
      <OrderDetailClient
        order={order}
        customer={customer}
        products={products}
        manifest={manifest}
      />
    </div>
  );
}
