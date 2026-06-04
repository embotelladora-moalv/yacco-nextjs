import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound } from "next/navigation";
import { DispatchDetailsClient } from "./DispatchDetailsClient";

export const dynamic = "force-dynamic";

import { serializeFirestoreData } from "@/services/firebase/serialization";

export default async function DispatchDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const manifestId = resolvedParams.id;

  const manifest = await dispatchRepository.getDispatchById(manifestId);
  if (!manifest) notFound();

  const products = await inventoryRepository.getAllProducts();

  // 🔥 NUEVO: Traemos a TODOS los usuarios para que el Timeline traduzca los IDs a Nombres
  const usersSnap = await adminDb.collection("users").get();
  const users = usersSnap.docs.map((doc) => {
    return serializeFirestoreData({
      id: doc.id,
      name: doc.data().name || "Sin nombre",
      role: doc.data().role || "USER",
    });
  });

  const driverName =
    users.find((u) => u.id === manifest.driverId)?.name || "Chofer Desconocido";

  const assignedOrders =
    await dispatchRepository.getOrdersByManifestId(manifestId);

  const salesSnap = await adminDb
    .collection("sales")
    .where("manifestId", "==", manifestId)
    .get();
  const sales = salesSnap.docs.map((doc) => {
    return serializeFirestoreData({
      id: doc.id,
      ...doc.data(),
    });
  });

  const customerIds = Array.from(
    new Set([
      ...assignedOrders.map((o) => o.customerId),
      ...sales.map((s) => s.customerId),
    ]),
  );
  let customersData = {};
  if (customerIds.length > 0) {
    customersData = await customerRepository.getCustomersByIds(customerIds);
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6">
      <DispatchDetailsClient
        manifest={manifest}
        products={products}
        driverName={driverName}
        orders={assignedOrders}
        customersData={customersData}
        sales={sales}
        users={users} // <-- Pasamos los usuarios al cliente
      />
    </div>
  );
}
