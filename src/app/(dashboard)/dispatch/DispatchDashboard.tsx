"use client";

import { DispatchManifest } from "@/core/entities/Dispatch";
import { Button } from "@/components/ui/button";
import { Map, Plus, Truck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ActiveRoutesCards } from "./ActiveRoutesCards";
import { LiquidatedRoutesTable } from "./LiquidatedRoutesTable";

interface DispatchDashboardProps {
  activeRoutes: any[];
  liquidatedRoutes: any[];
  users: any[];
  products: any[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  currentCursors: string;
  currentLimit: number;
  currentDriverId: string;
  currentStartDate: string;
  currentEndDate: string;
}

export function DispatchDashboard({
  activeRoutes,
  liquidatedRoutes,
  users,
  products,
  nextCursor,
  hasMore,
  totalCount,
  currentCursors,
  currentLimit,
  currentDriverId,
  currentStartDate,
  currentEndDate,
}: DispatchDashboardProps) {

  return (
    <div className="space-y-10 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Map className="h-8 w-8 text-orange-500" />
            Control de Rutas Comerciales
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitoreo satelital de camiones, balance de carga a bordo y
            auditoría de liquidación.
          </p>
        </div>

        <Button
          asChild
          className="bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20 h-12 rounded-xl px-6"
        >
          <Link href="/dispatch/new">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Despacho de Almacén
          </Link>
        </Button>
      </div>

      {/* SECCIÓN 1: UNIDADES EN RUTA */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 tracking-tight">
          <Truck className="h-5 w-5 text-blue-500" /> Unidades Activas en
          Reparto ({activeRoutes.length})
        </h2>
        <ActiveRoutesCards activeRoutes={activeRoutes} users={users} />
      </div>

      {/* SECCIÓN 2: HISTORIAL AVANZADO DE LIQUIDACIONES */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 tracking-tight border-b border-slate-100 pb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Historial de
          Auditoría e Indicadores Logísticos
        </h2>
        <LiquidatedRoutesTable
          liquidatedRoutes={liquidatedRoutes}
          users={users}
          products={products}
          nextCursor={nextCursor}
          hasMore={hasMore}
          totalCount={totalCount}
          currentCursors={currentCursors}
          currentLimit={currentLimit}
          currentDriverId={currentDriverId}
          currentStartDate={currentStartDate}
          currentEndDate={currentEndDate}
        />
      </div>
    </div>
  );
}
