import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { notFound } from "next/navigation";
import { CustomerProfileClient } from "./CustomerProfileClient";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  // Consultamos al cliente y al catálogo de productos en paralelo
  const [customer, products] = await Promise.all([
    customerRepository.getCustomerById(resolvedParams.id),
    inventoryRepository.getAllProducts(),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6">
      <CustomerProfileClient customer={customer} products={products} />
    </div>
  );
}
