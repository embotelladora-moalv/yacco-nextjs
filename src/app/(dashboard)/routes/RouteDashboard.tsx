"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, User, Banknote, Map, Clock, MapPin } from "lucide-react";
import Link from "next/link";

interface EnrichedRoute {
  id: string;
  date: Date;
  truckId: string;
  driverId: string;
  assistantId?: string;
  initialCash: number;
  status: string;
  truckAlias: string;
  truckPlate: string;
  driverName: string;
  assistantName: string | null;
}

export function RouteDashboard({
  activeRoutes,
}: {
  activeRoutes: EnrichedRoute[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoutes = activeRoutes.filter(
    (r) =>
      r.truckAlias.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.truckPlate.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalCashOnStreet = activeRoutes.reduce(
    (acc, route) => acc + route.initialCash,
    0,
  );

  return (
    <div className="space-y-6">
      {/* KPIs SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-500 uppercase">
            Vehículos en Ruta
          </span>
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            <span className="text-3xl font-black text-slate-900">
              {activeRoutes.length}
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-500 uppercase">
            Efectivo en Calle (Caja Chica)
          </span>
          <div className="flex items-center gap-3">
            <Banknote className="h-8 w-8 text-green-600" />
            <span className="text-3xl font-black text-slate-900">
              S/ {totalCashOnStreet.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* GRID DE RUTAS ACTIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col"
            >
              <div className="bg-slate-900 p-4 text-white flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-black text-lg">{route.truckAlias}</span>
                  <span className="text-xs text-slate-400 font-mono tracking-widest">
                    {route.truckPlate}
                  </span>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold">
                  EN RUTA
                </Badge>
              </div>

              <div className="p-5 flex-1 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <User className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Chofer
                      </span>
                      <span className="font-bold text-sm leading-tight">
                        {route.driverName}
                      </span>
                    </div>
                  </div>

                  {route.assistantName && (
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Auxiliar
                        </span>
                        <span className="font-bold text-sm leading-tight">
                          {route.assistantName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="bg-green-50 p-2 rounded-lg">
                      <Banknote className="h-4 w-4 text-green-700" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Caja Chica Entregada
                      </span>
                      <span className="font-black text-sm text-green-700">
                        S/ {route.initialCash.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reemplaza el contenedor de los botones inferiores por este: */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full bg-white text-slate-600 font-bold hover:text-blue-700 hover:bg-blue-50 border-slate-200"
                >
                  <MapPin className="mr-2 h-4 w-4" /> Mapa
                </Button>
                <Link href={`/routes/${route.id}`} className="w-full block">
                  <Button className="w-full bg-blue-700 hover:bg-blue-800 font-bold">
                    Detalles
                  </Button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
            <Map className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="font-black text-slate-700 text-lg">
              No hay camiones en ruta
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Apertura una nueva ruta para comenzar la distribución.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
