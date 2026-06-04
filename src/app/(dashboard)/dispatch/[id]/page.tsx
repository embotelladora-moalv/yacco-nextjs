import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound } from "next/navigation";
import { DispatchDetailsClient } from "./DispatchDetailsClient";

export const dynamic = "force-dynamic";

export default async function DispatchDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const manifestId = resolvedParams.id;

  const manifest = await dispatchRepository.getDispatchById(manifestId);
  if (!manifest) notFound();

  const safeManifest = {
    ...manifest,
    liquidatedAt: manifest.liquidatedAt?.toDate
      ? manifest.liquidatedAt.toDate().toISOString()
      : manifest.liquidatedAt,
  };

  const products = await inventoryRepository.getAllProducts();

  // 🔥 NUEVO: Traemos a TODOS los usuarios para que el Timeline traduzca los IDs a Nombres
  const usersSnap = await adminDb.collection("users").get();
  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name || "Sin nombre",
    role: doc.data().role || "USER",
  }));

  const driverName =
    users.find((u) => u.id === manifest.driverId)?.name || "Chofer Desconocido";

  const assignedOrders =
    await dispatchRepository.getOrdersByManifestId(manifestId);

  const salesSnap = await adminDb
    .collection("sales")
    .where("manifestId", "==", manifestId)
    .get();
  const sales = salesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      deliveredAt: data.deliveredAt?.toDate?.()?.toISOString() || null,
    } as any;
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
        manifest={safeManifest}
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
