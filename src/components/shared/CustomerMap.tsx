"use client";

import { useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Customer } from "@/core/entities/Customer";
import {
  getDistanceInKm,
  calculateOptimalRoute,
  Point,
} from "@/core/utils/geoUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Navigation, Droplet, UserPlus } from "lucide-react";

const iconDefault = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconNearby = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconSelected = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function CustomerMap({ customers }: { customers: Customer[] }) {
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 1. Lógica de Cercanía: Detectar vecinos del cliente seleccionado
  const nearbyIds = useMemo(() => {
    if (!activeId) return [];
    const active = customers.find((c) => c.id === activeId);
    if (!active?.locations[0]) return [];

    return customers
      .filter((c) => {
        if (c.id === activeId) return false;
        const d = getDistanceInKm(
          active.locations[0].latitude,
          active.locations[0].longitude,
          c.locations[0].latitude,
          c.locations[0].longitude,
        );
        return d <= 2; // Radio de 2KM
      })
      .map((c) => c.id);
  }, [activeId, customers]);

  // 2. Lógica de Ruta Óptima
  const optimalRoute = useMemo(() => {
    const selectedPoints: Point[] = routeIds.map((id) => {
      const c = customers.find((cust) => cust.id === id)!;
      return {
        id: c.id,
        name: c.alias,
        lat: c.locations[0].latitude,
        lng: c.locations[0].longitude,
      };
    });
    return calculateOptimalRoute(selectedPoints);
  }, [routeIds, customers]);

  const toggleInRoute = (id: string) => {
    setRouteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="relative h-[700px] w-full rounded-3xl overflow-hidden border shadow-2xl">
      {/* PANEL LATERAL DE RUTA */}
      <div className="absolute top-4 right-4 z-[1000] w-64 bg-white/90 backdrop-blur-md p-4 rounded-2xl border shadow-xl">
        <h3 className="text-sm font-black flex items-center gap-2 mb-3">
          <Truck className="h-4 w-4 text-blue-700" /> RUTA ACTUAL (
          {routeIds.length})
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {optimalRoute.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-2 text-[10px] font-bold p-2 bg-blue-50 rounded-lg"
            >
              <span className="bg-blue-700 text-white w-4 h-4 flex items-center justify-center rounded-full text-[8px]">
                {idx + 1}
              </span>
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
        <Button
          className="w-full text-[10px] bg-blue-700 h-8 uppercase font-bold"
          disabled={routeIds.length < 2}
          onClick={() => window.print()}
        >
          Exportar Hoja de Ruta
        </Button>
      </div>

      <MapContainer
        center={[-8.38, -74.55]}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Dibujar la línea de la ruta */}
        {optimalRoute.length > 1 && (
          <Polyline
            positions={optimalRoute.map((p) => [p.lat, p.lng])}
            color="#1d4ed8"
            weight={4}
            opacity={0.6}
            dashArray="10, 10"
          />
        )}

        {customers.map((c) => {
          const isSelected = routeIds.includes(c.id);
          const isNearby = nearbyIds.includes(c.id);
          const icon = isSelected
            ? iconSelected
            : isNearby
              ? iconNearby
              : iconDefault;

          return c.locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.latitude, loc.longitude]}
              icon={icon}
              eventHandlers={{ click: () => setActiveId(c.id) }}
            >
              <Popup>
                <div className="min-w-[150px] p-1">
                  <p className="font-black text-sm">{c.alias}</p>
                  <p className="text-[10px] text-gray-500 mb-2 uppercase">
                    {c.categoryTag}
                  </p>
                  <div className="flex gap-1 mb-3">
                    <Badge className="text-[9px] bg-blue-100 text-blue-800">
                      <Droplet className="h-2 w-2 mr-1" />{" "}
                      {c.stats.loanedBottles}
                    </Badge>
                  </div>
                  <Button
                    variant={isSelected ? "destructive" : "default"}
                    className="w-full h-7 text-[9px] font-bold uppercase"
                    onClick={() => toggleInRoute(c.id)}
                  >
                    {isSelected ? "Quitar de Ruta" : "Agregar a Ruta"}
                  </Button>
                </div>
              </Popup>
            </Marker>
          ));
        })}
      </MapContainer>
    </div>
  );
}
