import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { notFound } from "next/navigation";
import { CustomerProfileClient } from "./CustomerProfileClient";
import { adminDb } from "@/services/firebase/admin";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const customerId = resolvedParams.id;

  // Consultamos al cliente, catálogo de productos, logs de envases y usuarios del sistema en paralelo
  const [customer, products, containerLogs, users] = await Promise.all([
    customerRepository.getCustomerById(customerId),
    inventoryRepository.getAllProducts(),
    customerRepository.getContainerLogsByCustomerId(customerId, 50),
    userRepository.getAll(),
  ]);

  if (!customer) {
    notFound();
  }

  // 2. Traer ventas no facturadas de ESTE cliente
  const salesSnapshot = await adminDb
    .collection("sales")
    .where("customerId", "==", customerId)
    .where("isBilled", "==", false)
    .get();

  const pendingSales = salesSnapshot.docs.map((doc) => ({
    id: doc.id,
    issueDate: doc.data().issueDate,
    totalAmount: doc.data().totalAmount,
  }));

  // Mapear logs para resolver los nombres de los usuarios
  const userMap = new Map<string, string>();
  for (const u of users) {
    userMap.set(u.id, u.name);
  }

  const resolvedLogs = containerLogs.map((log) => {
    const rawDate = log.createdAt;
    let formattedDate = "";
    if (rawDate) {
      if (typeof rawDate === "string") {
        formattedDate = rawDate;
      } else if (rawDate instanceof Date) {
        formattedDate = rawDate.toISOString();
      } else {
        const dateObj = rawDate as unknown;
        if (dateObj && typeof dateObj === "object" && "toDate" in dateObj && typeof (dateObj as { toDate: () => Date }).toDate === "function") {
          formattedDate = (dateObj as { toDate: () => Date }).toDate().toISOString();
        } else {
          formattedDate = new Date(rawDate as unknown as string).toISOString();
        }
      }
    }

    return {
      ...log,
      createdAt: formattedDate,
      userName: userMap.get(log.userId) || log.userId || "Sistema",
    };
  });

  return (
    <CustomerProfileClient
      customer={customer}
      products={products}
      pendingSales={pendingSales}
      containerLogs={resolvedLogs}
    />
  );
}
