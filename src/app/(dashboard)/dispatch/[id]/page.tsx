// src/app/(dashboard)/dispatch/[id]/page.tsx

import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound } from "next/navigation";
import { DispatchDetailsClient } from "./DispatchDetailsClient";

export default async function DispatchDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  // 1. Buscamos el Manifiesto
  const manifest = await dispatchRepository.getDispatchById(resolvedParams.id);
  if (!manifest) notFound();

  // SANITIZACIÓN DE FIREBASE PARA NEXT.JS
  // Convertimos las clases Timestamp de Firebase a strings planos
  const safeManifest = {
    ...manifest,
    liquidatedAt: manifest.liquidatedAt?.toDate
      ? manifest.liquidatedAt.toDate().toISOString()
      : manifest.liquidatedAt,
  };

  // 2. Buscamos los Productos (Para poder mostrar los nombres en lugar de solo IDs)
  const products = await inventoryRepository.getAllProducts();

  // 3. Buscamos al Chofer Responsable
  let driverName = "Chofer Desconocido";
  try {
    const driverDoc = await adminDb
      .collection("users")
      .doc(manifest.driverId)
      .get();
    if (driverDoc.exists) {
      driverName = driverDoc.data()?.name || driverName;
    }
  } catch (error) {
    console.error("Error al obtener chofer:", error);
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6">
      <DispatchDetailsClient
        manifest={safeManifest} // Pasamos el objeto limpio y serializado
        products={products}
        driverName={driverName}
      />
    </div>
  );
}
