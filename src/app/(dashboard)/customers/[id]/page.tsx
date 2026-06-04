import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { notFound } from "next/navigation";
import { CustomerProfileClient } from "./CustomerProfileClient";
import { adminDb } from "@/services/firebase/admin";

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

  // 2. Traer ventas no facturadas de ESTE cliente
  const salesSnapshot = await adminDb
    .collection("sales")
    .where("customerId", "==", resolvedParams.id)
    .where("isBilled", "==", false)
    .get();

  const pendingSales = salesSnapshot.docs.map((doc) => ({
    id: doc.id,
    issueDate: doc.data().issueDate,
    totalAmount: doc.data().totalAmount,
    // Puedes agregar doc.data().description si lo tienes
  }));

  return (
    <CustomerProfileClient
      customer={customer}
      products={products}
      pendingSales={pendingSales} // <-- Aquí se lo pasas
    />
  );
}
