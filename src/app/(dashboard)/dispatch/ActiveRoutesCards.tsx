"use client";

import { Button } from "@/components/ui/button";
import { Truck, Clock, Eye, DollarSign, MapPin } from "lucide-react";
import Link from "next/link";

interface ActiveRoutesCardsProps {
  activeRoutes: any[];
  users: any[];
}

export function ActiveRoutesCards({
  activeRoutes,
  users,
}: ActiveRoutesCardsProps) {
  const getDriverName = (id: string) => {
    if (!id) return "Sin Chofer Asignado";
    return users?.find((u) => u.id === id)?.name || "Chofer Desconocido";
  };

  const formatTimeSafe = (isoString: string) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  };

  if (activeRoutes.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
        <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-400 font-bold text-sm">
          No hay camiones en ruta operando en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {activeRoutes.map((dispatch) => {
        const totalLoaded =
          dispatch.items?.reduce(
            (acc: number, item: any) => acc + (item.quantityLoaded || 0),
            0,
          ) || 0;
        const totalDelivered =
          dispatch.items?.reduce(
            (acc: number, item: any) => acc + (item.quantitySold || 0),
            0,
          ) || 0;
        const progressPercentage =
          totalLoaded > 0
            ? Math.round((totalDelivered / totalLoaded) * 100)
            : 0;

        return (
          <div
            key={dispatch.id}
            className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-200 transition-all"
          >
            <div className="bg-blue-50/60 px-6 py-3.5 border-b border-blue-100 flex justify-between items-center">
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 animate-pulse" /> En Reparto
              </span>
              <span className="text-xs font-black text-slate-400 bg-white border px-2.5 py-1 rounded-md">
                {dispatch.manifestNumber}
              </span>
            </div>

            <div className="p-6 flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight capitalize">
                  {getDriverName(dispatch.driverId)}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-slate-400" /> Placa:{" "}
                  <span className="text-slate-700 font-black">
                    {dispatch.truckPlate}
                  </span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  Fecha y Hora de Despacho
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {formatTimeSafe(dispatch.dispatchDate)}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-end mb-1.5">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    Avance de Despacho
                  </p>
                  <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {progressPercentage}%
                  </span>
                </div>
                <p className="text-xl font-black text-slate-800">
                  {totalDelivered} / {totalLoaded}{" "}
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                    unidades vendidas
                  </span>
                </p>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex gap-3">
              <Button
                asChild
                variant="outline"
                className="w-1/2 bg-white font-bold text-slate-700 border-slate-200 hover:bg-slate-100 rounded-xl h-11"
              >
                <Link href={`/dispatch/${dispatch.id}`}>
                  <Eye className="mr-1.5 h-4 w-4 text-blue-500" /> Ver Control
                </Link>
              </Button>
              <Button
                asChild
                className="w-1/2 bg-slate-900 hover:bg-slate-800 font-black text-white shadow-md rounded-xl h-11"
              >
                <Link href={`/dispatch/${dispatch.id}/liquidate`}>
                  <DollarSign className="mr-1.5 h-4 w-4 text-emerald-400" />{" "}
                  Liquidar
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
