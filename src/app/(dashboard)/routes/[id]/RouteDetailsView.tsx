"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Truck,
  User,
  Banknote,
  Package,
  Map as MapIcon,
  Clock,
  Navigation,
} from "lucide-react";

export function RouteDetailsView({
  route,
  truck,
  driver,
  assistant,
  inventory,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUMNA IZQUIERDA: INFO Y CARGA */}
      <div className="lg:col-span-1 space-y-6">
        {/* CARD: ESTADO Y PERSONAL */}
        <Card className="p-6 rounded-3xl shadow-sm border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <Badge className="bg-blue-600 font-bold uppercase px-3 py-1">
              En Progreso
            </Badge>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Salida
              </p>
              <p className="text-sm font-black text-slate-700">
                {new Date(route.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-3 rounded-2xl">
                <Truck className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Vehículo
                </p>
                <p className="font-bold text-slate-900">
                  {truck?.alias} ({truck?.plateNumber})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-2xl">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Chofer Responsable
                </p>
                <p className="font-bold text-slate-900">
                  {driver?.name}
                </p>
              </div>
            </div>

            {assistant && (
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Auxiliar
                  </p>
                  <p className="font-bold text-slate-900">
                    {assistant.name}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-dashed">
              <div className="bg-green-50 p-3 rounded-2xl">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Caja Chica Inicial
                </p>
                <p className="font-black text-lg text-green-700 font-mono">
                  S/ {route.initialCash.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* CARD: INVENTARIO ACTUAL EN CAMIÓN */}
        <Card className="p-6 rounded-3xl shadow-sm border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-blue-400" />
            <h3 className="font-black text-lg">Carga a Bordo</h3>
          </div>

          <div className="space-y-3">
            {inventory.length > 0 ? (
              inventory.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/5"
                >
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {item.sku}
                    </p>
                  </div>
                  <div className="bg-blue-600 px-3 py-1 rounded-lg font-black text-sm">
                    {item.quantity}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 text-sm py-4">
                Sin carga asignada
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* COLUMNA DERECHA: SEGUIMIENTO EN TIEMPO REAL (MAPA) */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="h-full min-h-[500px] rounded-3xl shadow-sm border-slate-100 overflow-hidden relative bg-slate-50 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
          <div className="absolute top-6 left-6 z-10 flex gap-2">
            <Badge className="bg-white/90 backdrop-blur text-slate-900 border-slate-200 shadow-sm flex gap-2 py-1.5 px-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mt-1" />
              Señal de GPS Activa
            </Badge>
          </div>

          <div className="flex flex-col items-center gap-4 text-slate-400">
            <div className="bg-white p-6 rounded-full shadow-xl">
              <MapIcon className="h-12 w-12 text-blue-600 animate-bounce" />
            </div>
            <div className="text-center">
              <h4 className="font-black text-slate-700 text-lg">
                Mapa en Tiempo Real
              </h4>
              <p className="max-w-xs text-sm">
                Esperando coordenadas desde la aplicación Flutter de{" "}
                {driver?.name}...
              </p>
            </div>
          </div>

          <div className="absolute bottom-6 right-6">
            <Button className="bg-slate-900 hover:bg-black font-bold gap-2">
              <Navigation className="h-4 w-4" /> Centrar en Camión
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
