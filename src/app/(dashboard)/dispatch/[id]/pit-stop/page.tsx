import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
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
  const salesSnap = await adminDb
    .collection("sales")
    .where("manifestId", "==", manifestId)
    .get();

  // 🔥 SOLUCIÓN: Serialización segura de las fechas de Firebase a formato ISO (String)
  const sales = salesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      deliveredAt: data.deliveredAt?.toDate?.()?.toISOString() || null,
    };
  });

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
