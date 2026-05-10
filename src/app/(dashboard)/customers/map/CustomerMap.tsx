"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Navigation,
  User,
  Building2,
  Loader2,
} from "lucide-react";

// IMPORTACIÓN DINÁMICA DE LEAFLET: Esto evita el error de "window is not defined"
const DynamicMap = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
      <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
      <p className="font-bold text-slate-500">Cargando cartografía...</p>
    </div>
  ),
});

interface PinData {
  customerId: string;
  customerName: string;
  customerType: string;
  debtAmount: number;
  locationId: string;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
}

export function CustomerMap({ pins }: { pins: PinData[] }) {
  const [search, setSearch] = useState("");

  const filteredPins = pins.filter(
    (pin) =>
      pin.customerName.toLowerCase().includes(search.toLowerCase()) ||
      pin.address.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
      {/* SIDEBAR DE CLIENTES */}
      <Card className="w-full lg:w-96 flex flex-col shadow-sm border-slate-200 overflow-hidden shrink-0 bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente o calle..."
              className="pl-10 border-slate-200 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredPins.map((pin) => (
            <div
              key={`${pin.customerId}-${pin.locationId}`}
              className="p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-slate-800 text-sm flex items-center gap-2">
                  {pin.customerType === "COMPANY" ? (
                    <Building2 className="h-4 w-4 text-purple-600" />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                  {pin.customerName}
                </span>
                {pin.debtAmount > 0 && (
                  <Badge className="bg-red-50 text-red-700 border-red-200 px-1.5 py-0 text-[10px]">
                    Deuda
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mb-3 leading-relaxed">
                {pin.address}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 group-hover:border-blue-200/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-white px-2 py-1 rounded-md border">
                  {pin.locationName}
                </span>
                {/* En un futuro, este botón puede centrar el mapa en estas coordenadas */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-bold text-blue-700 hover:bg-blue-100 px-3"
                >
                  <Navigation className="h-3 w-3 mr-1" /> Ver en mapa
                </Button>
              </div>
            </div>
          ))}

          {filteredPins.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
              <MapPin className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                No hay clientes con coordenadas registradas.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* LIENZO DEL MAPA INTERACTIVO (LEAFLET) */}
      <Card className="flex-1 shadow-sm border-slate-200 bg-slate-50 relative overflow-hidden flex flex-col rounded-3xl">
        <DynamicMap pins={filteredPins} />
      </Card>
    </div>
  );
}
