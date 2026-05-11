import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { adminDb } from "@/services/firebase/admin";
import { NewDispatchForm } from "../NewDispatchForm";

export const dynamic = "force-dynamic";

export default async function NewDispatchPage() {
  const products = await inventoryRepository.getAllProducts();

  let drivers: any[] = [];
  let trucks: any[] = [];
  let busyPlates: string[] = [];
  let busyDrivers: string[] = [];

  try {
    // Consultamos Choferes, Camiones y los Despachos Actuales al mismo tiempo
    const [usersSnapshot, trucksSnapshot, recentDispatches] = await Promise.all(
      [
        adminDb
          .collection("users")
          .where("roles", "array-contains", "DRIVER")
          .where("isActive", "==", true)
          .get(),
        adminDb.collection("trucks").where("isActive", "==", true).get(),
        dispatchRepository.getRecentDispatches(),
      ],
    );

    // Extraemos qué camiones y choferes están "Ocupados" ahora mismo
    const activeDispatches = recentDispatches.filter(
      (d) => d.status === "ON_ROUTE" || d.status === "PENDING",
    );
    busyPlates = activeDispatches.map((d) => d.truckPlate);

    // Un chofer ocupado puede ser titular o auxiliar, bloqueamos ambos
    activeDispatches.forEach((d) => {
      if (d.driverId) busyDrivers.push(d.driverId);
      if (d.assistantId) busyDrivers.push(d.assistantId);
    });

    drivers = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });

    trucks = trucksSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });
  } catch (error) {
    console.error("Error al obtener catálogos de despacho:", error);
  }

  return (
    <div className="pb-10 pt-6 px-4 sm:px-0">
      <NewDispatchForm
        drivers={drivers}
        products={products}
        trucks={trucks}
        busyPlates={busyPlates} // <-- Pasamos las placas ocupadas
        busyDrivers={busyDrivers} // <-- Pasamos los choferes ocupados
      />
    </div>
  );
}
