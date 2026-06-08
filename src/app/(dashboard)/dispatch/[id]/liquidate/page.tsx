import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { financeRepository } from "@/services/repositories/financeRepository";
import { settingsRepository } from "@/services/repositories/settingsRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LiquidationForm } from "./LiquidationForm";

import { serializeFirestoreData } from "@/services/firebase/serialization";

export default async function LiquidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  // 1. Obtener el Manifiesto
  const manifest = await dispatchRepository.getManifestById(resolvedParams.id);
  if (!manifest || manifest.status === "LIQUIDATED") {
    notFound();
  }

  // 2. Obtener los Productos y Motivos
  const [products, settings] = await Promise.all([
    inventoryRepository.getAllProducts(),
    settingsRepository.getSettings(),
  ]);

  const wasteReasons = (settings.routeWasteReasons || []).filter(r => r.isActive);

  // 3. Obtener Ventas asociadas a este camión (Para sugerir el retorno automático)
  const salesSnapshot = await adminDb
    .collection("sales")
    .where("manifestId", "==", resolvedParams.id)
    .get();

  // SOLUCIÓN DEFINITIVA: Usamos el serializador recursivo para limpiar todos los Timestamps (date, dateProcess, etc)
  const sales = salesSnapshot.docs
    .map((doc) => serializeFirestoreData({ id: doc.id, ...doc.data() }))
    .filter((sale: any) => sale.status === "COMPLETED"); // Filtrar en memoria para no requerir índice compuesto

  // 4. Obtener Gastos (Opcional, para el cuadre de caja futuro)
  const expenses = await financeRepository.getMovementsByManifest(
    resolvedParams.id,
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full bg-white shadow-sm border border-slate-200"
        >
          <Link href={`/dispatch/${resolvedParams.id}`}>
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
        </Button>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Volver a la Hoja de Ruta
        </span>
      </div>

      {/* PASAMOS LAS VENTAS AL FORMULARIO */}
      <LiquidationForm 
        manifest={manifest} 
        products={products} 
        sales={sales} 
        wasteReasons={wasteReasons}
      />
    </div>
  );
}
