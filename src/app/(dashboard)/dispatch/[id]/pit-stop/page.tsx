import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { salesRepository } from "@/services/repositories/salesRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound } from "next/navigation";
import { PitStopClient } from "./PitStopClient";

export const dynamic = "force-dynamic";

export default async function PitStopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const manifestId = resolvedParams.id;

  // 1. Buscamos el camión y productos
  const manifest = await dispatchRepository.getDispatchById(manifestId);
  if (!manifest) notFound();

  const products = await inventoryRepository.getAllProducts();

  // 2. Buscamos el personal (Choferes y Auxiliares)
  const usersSnap = await adminDb.collection("users").get();
  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name || "Sin nombre",
    role: doc.data().role || "USER",
  }));

  // 3. Buscamos las ventas de este camión
  const sales = await salesRepository.getSalesByManifestIds([manifestId]);

  return (
    <div className="max-w-5xl mx-auto pb-10 pt-4 px-4 sm:px-6">
      <PitStopClient
        manifest={manifest}
        products={products}
        users={users}
        sales={sales}
      />
    </div>
  );
}
