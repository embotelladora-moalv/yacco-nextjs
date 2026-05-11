"use client";

import { DispatchManifest } from "@/core/entities/Dispatch";
import { User } from "@/core/entities/User";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Plus,
  Map,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  Eye,
} from "lucide-react";
import Link from "next/link";

interface DispatchDashboardProps {
  dispatches: any[];
  users: any[]; // <-- Actualizado para coincidir exactamente con page.tsx
}

export function DispatchDashboard({
  dispatches,
  users,
}: DispatchDashboardProps) {
  // Separamos los despachos por estado
  const activeRoutes = dispatches.filter((d) => d.status === "ON_ROUTE");
  const liquidatedRoutes = dispatches.filter((d) => d.status === "LIQUIDATED");

  // Helper para buscar el nombre del chofer de forma segura
  const getDriverName = (id: string) => {
    if (!id) return "Sin Chofer Asignado";
    const driver = users?.find((u) => u.id === id);
    return driver?.name || "Chofer Desconocido";
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Map className="h-8 w-8 text-orange-500" />
            Control de Rutas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitoreo de camiones, carga asignada y liquidaciones.
          </p>
        </div>

        <Button
          asChild
          className="bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20"
        >
          <Link href="/dispatch/new">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Despacho
          </Link>
        </Button>
      </div>

      {/* SECCIÓN 1: CAMIONES EN RUTA (Tarjetas Destacadas) */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" /> Unidades en Ruta (
          {activeRoutes.length})
        </h2>

        {activeRoutes.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-bold">
              No hay camiones en ruta en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeRoutes.map((dispatch) => {
              // Calculamos el total de unidades cargadas para un resumen rápido
              // 1. Calculamos el total que salió de planta
              const totalLoaded =
                dispatch.items?.reduce(
                  (acc: number, item: any) => acc + (item.quantityLoaded || 0),
                  0,
                ) || 0;

              // 2. Calculamos cuánto se ha entregado (vendido) hasta el momento
              const totalDelivered =
                dispatch.items?.reduce(
                  (acc: number, item: any) => acc + (item.quantitySold || 0),
                  0,
                ) || 0;

              // 3. Calculamos el porcentaje para una barra visual (opcional)
              const progressPercentage =
                totalLoaded > 0
                  ? Math.round((totalDelivered / totalLoaded) * 100)
                  : 0;

              return (
                <div
                  key={dispatch.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Banner de Estado */}
                  <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                    <span className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="h-3 w-3" /> En Reparto
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {dispatch.manifestNumber}
                    </span>
                  </div>

                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">
                          {getDriverName(dispatch.driverId)}
                        </h3>
                        <p className="text-sm font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                          <Truck className="h-4 w-4" /> Placa:{" "}
                          {dispatch.truckPlate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold uppercase">
                          Salida
                        </p>
                        <p
                          className="text-lg font-black text-slate-800"
                          suppressHydrationWarning
                        >
                          {formatTime(dispatch.dispatchDate)}
                        </p>
                      </div>
                    </div>

                    {/* SECCIÓN DE CARGA ACTUALIZADA CON PROGRESO */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-end mb-2">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">
                          Progreso de Entrega:
                        </p>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {progressPercentage}%
                        </span>
                      </div>

                      <p className="text-2xl font-black text-slate-800">
                        {totalDelivered} / {totalLoaded}{" "}
                        <span className="text-sm font-bold text-slate-500">
                          unidades entregadas
                        </span>
                      </p>

                      {/* Barra de progreso visual para impacto rápido */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-100">
                        <div
                          className="bg-blue-600 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción Doble */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button
                      asChild
                      variant="outline"
                      className="w-1/2 bg-white font-bold text-slate-700 border-slate-200 hover:bg-slate-100"
                    >
                      <Link href={`/dispatch/${dispatch.id}`}>
                        <Eye className="mr-2 h-4 w-4 text-blue-500" /> Detalles
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="w-1/2 bg-slate-900 hover:bg-slate-800 font-bold text-white shadow-md"
                    >
                      <Link href={`/dispatch/${dispatch.id}/liquidate`}>
                        <DollarSign className="mr-2 h-4 w-4 text-green-400" />{" "}
                        Liquidar
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: HISTORIAL DE LIQUIDADOS (Tabla Simple) */}
      <div className="pt-8 space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" /> Últimas Rutas
          Liquidadas
        </h2>

        {liquidatedRoutes.length === 0 ? (
          <p className="text-slate-500 font-medium py-4">
            No hay registros de liquidaciones recientes.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Manifiesto</th>
                  <th className="px-6 py-4">Chofer / Placa</th>
                  <th className="px-6 py-4">Horario</th>
                  <th className="px-6 py-4">Caja Reportada</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liquidatedRoutes.map((dispatch) => (
                  <tr
                    key={dispatch.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {dispatch.manifestNumber}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {getDriverName(dispatch.driverId)}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {dispatch.truckPlate}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="font-medium text-slate-700"
                        suppressHydrationWarning
                      >
                        Salida: {formatTime(dispatch.dispatchDate)}
                      </p>
                      <p
                        className="text-xs text-slate-500"
                        suppressHydrationWarning
                      >
                        Regreso:{" "}
                        {dispatch.liquidatedAt
                          ? formatTime(dispatch.liquidatedAt)
                          : "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-black text-green-700">
                      S/ {dispatch.realCashReceived?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-max">
                        <CheckCircle2 className="h-3 w-3" /> Cuadrado
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="font-bold text-blue-600 hover:bg-blue-50"
                      >
                        <Link href={`/dispatch/${dispatch.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> Ver
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
