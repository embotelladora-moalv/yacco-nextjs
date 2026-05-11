"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";

// Fix para los iconos de Leaflet en Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  value?: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
}

// Sub-componente para manejar eventos de clic y centrado
function LocationMarker({ value, onChange }: MapPickerProps) {
  const map = useMap();
  const isValidCoord =
    value &&
    typeof value.lat === "number" &&
    !isNaN(value.lat) &&
    typeof value.lng === "number" &&
    !isNaN(value.lng);

  useEffect(() => {
    if (isValidCoord) {
      map.flyTo([value.lat, value.lng], map.getZoom());
    }
  }, [value?.lat, value?.lng, map, isValidCoord]);

  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return isValidCoord ? (
    <Marker position={[value.lat, value.lng]} icon={icon} />
  ) : null;
}

export default function MapPicker({ value, onChange }: MapPickerProps) {
  const defaultCenter: [number, number] = [-12.046374, -77.042793]; // Centro de Lima
  const isValidCoord =
    value &&
    typeof value.lat === "number" &&
    !isNaN(value.lat) &&
    typeof value.lng === "number" &&
    !isNaN(value.lng);
  const center = isValidCoord
    ? ([value.lat, value.lng] as [number, number])
    : defaultCenter;

  const [inputText, setInputText] = useState("");

  // Sincronizar el cajón de texto si el usuario hace clic en el mapa
  useEffect(() => {
    if (isValidCoord) {
      setInputText(`${value.lat}, ${value.lng}`);
    }
  }, [value?.lat, value?.lng, isValidCoord]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    // Regex mágico: Extrae cualquier par de números decimales del texto pegado
    const matches = text.match(/-?\d+\.\d+/g);

    if (matches && matches.length >= 2) {
      const lat = parseFloat(matches[0]);
      const lng = parseFloat(matches[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        onChange({ lat, lng });
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* EL CAJÓN ÚNICO DE COORDENADAS */}
      <div className="relative">
        <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Pega aquí las coordenadas (Ej: -12.194477, -77.042897)"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
        />
      </div>

      <div className="h-[250px] w-full rounded-xl overflow-hidden border border-slate-200 z-0">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker value={value} onChange={onChange} />
        </MapContainer>
      </div>
    </div>
  );
}
