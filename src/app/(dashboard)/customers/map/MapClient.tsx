"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "lucide-react";

// Fix para los íconos por defecto de Leaflet en Next.js usando un ícono HTML moderno
const createCustomIcon = (isCompany: boolean, hasDebt: boolean) => {
  const colorClass = hasDebt
    ? "bg-red-500"
    : isCompany
      ? "bg-purple-600"
      : "bg-blue-600";
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 ${colorClass} text-white rounded-full shadow-lg border-2 border-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32], // El punto del ícono que apunta a la coordenada
    popupAnchor: [0, -32], // Dónde se abre el popup
  });
};

export default function MapClient({ pins }: { pins: any[] }) {
  // Coordenadas por defecto (Centro de Lima, ajústalo a la ciudad de tu planta)
  const defaultCenter: [number, number] = [-12.046374, -77.042793];

  // Si hay pines, centramos el mapa en el primer cliente
  const center =
    pins.length > 0
      ? ([pins[0].latitude, pins[0].longitude] as [number, number])
      : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full min-h-[500px] z-0 rounded-3xl"
    >
      {/* Capa base de OpenStreetMap (Gratuita) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Renderizar todos los clientes */}
      {pins.map((pin) => (
        <Marker
          key={`${pin.customerId}-${pin.locationId}`}
          position={[pin.latitude, pin.longitude]}
          icon={createCustomIcon(
            pin.customerType === "COMPANY",
            pin.debtAmount > 0,
          )}
        >
          <Popup className="rounded-xl overflow-hidden">
            <div className="p-1 min-w-[200px]">
              <div className="flex justify-between items-start mb-1">
                <strong className="text-sm font-black text-slate-800">
                  {pin.customerName}
                </strong>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                {pin.locationName} - {pin.address}
              </p>

              {pin.debtAmount > 0 && (
                <div className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold mb-2">
                  Deuda Pendiente: S/ {pin.debtAmount.toFixed(2)}
                </div>
              )}

              <button className="w-full bg-blue-700 text-white text-xs font-bold py-2 rounded-md hover:bg-blue-800 flex justify-center items-center gap-2 transition-colors">
                <Navigation size={14} /> Asignar a Ruta
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
