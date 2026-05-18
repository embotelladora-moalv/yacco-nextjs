"use client";

import { useState } from "react";
import {
  Truck,
  FileText,
  FileCode,
  Archive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  MapPin,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  emitirGuiaRemisionAction,
  consultarTicketGreAction,
} from "@/app/actions/sunatActions";

interface GrePanelProps {
  saleId: string;
  customerLocations: any[];
  trucks: any[];
  drivers: any[];
  sunatData?: {
    id: string;
    status: "VOID_PENDING" | "ACCEPTED" | "REJECTED";
    xmlUrl?: string;
    cdrUrl?: string;
    pdfUrl?: string; // Para el futuro generador de PDF de guías
  } | null;
}

export default function GrePanel({
  saleId,
  customerLocations,
  trucks,
  drivers,
  sunatData,
}: GrePanelProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("0"); // Índice de la sucursal

  const handleEmitir = async () => {
    if (!selectedTruck) return toast.error("Debe seleccionar un vehículo.");
    if (!selectedDriver) return toast.error("Debe seleccionar un conductor.");

    setLoading(true);
    // Llamamos a la acción que programamos previamente
    const res = await emitirGuiaRemisionAction(
      saleId,
      selectedTruck,
      selectedDriver,
      Number(selectedLocation),
    );

    if (res.success) {
      toast.success(
        `Guía ${res.documentId} enviada a SUNAT. Obteniendo ticket...`,
      );
      window.location.reload();
    } else {
      toast.error(res.error || "Error al emitir la Guía.");
    }
    setLoading(false);
  };

  const handleConsultarTicket = async () => {
    if (!sunatData?.id) return;
    setLoading(true);

    const res = await consultarTicketGreAction(sunatData.id);

    if (res.success) {
      if (res.status === "ACCEPTED") {
        toast.success("¡Guía Aceptada por SUNAT!");
        window.location.reload();
      } else {
        toast.info(res.message || "Aún en proceso...");
      }
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const getStorageUrl = (url?: string) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(url)}?alt=media`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
        <Truck className="w-5 h-5 text-orange-500" /> Guía de Remisión (GRE)
      </h3>

      {!sunatData ? (
        <div className="space-y-4 flex-1">
          <p className="text-xs text-slate-500 font-medium mb-2">
            Configure el despacho para generar la Guía Electrónica:
          </p>

          <div className="space-y-3">
            {/* DESTINO */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Punto de Llegada
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-orange-400"
              >
                {customerLocations.map((loc, index) => (
                  <option key={index} value={index}>
                    {loc.name} - {loc.address}{" "}
                    {loc.ubigeo ? `(Ubigeo: ${loc.ubigeo})` : "(SIN UBIGEO)"}
                  </option>
                ))}
              </select>
            </div>

            {/* CAMIÓN */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Truck className="w-3 h-3" /> Vehículo (Placa)
              </label>
              <select
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-orange-400"
              >
                <option value="">Seleccione camión...</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.alias} ({t.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* CHOFER */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <User className="w-3 h-3" /> Conductor (DNI)
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-orange-400"
              >
                <option value="">Seleccione chofer...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (DNI: {d.documentNumber || "FALTA"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleEmitir}
            disabled={loading}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Emitir Guía de Remisión"
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {sunatData.status === "ACCEPTED" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-black text-slate-900">Guía Aceptada</p>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide bg-white border border-emerald-100 px-2 py-0.5 rounded-md inline-block">
                {sunatData.id}
              </p>
            </div>
          )}

          {sunatData.status === "VOID_PENDING" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
              <p className="text-xs font-bold text-amber-800">
                Ticket API REST Generado. Procesando...
              </p>
              <Button
                onClick={handleConsultarTicket}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Consultar Estado de Guía
              </Button>
            </div>
          )}

          {sunatData.status === "REJECTED" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-1" />
              <p className="text-sm font-black text-slate-900">
                Guía Rechazada
              </p>
              <p className="text-[10px] font-bold text-red-600 mt-1">
                Revisa los datos (DNI/Placa/Ubigeo)
              </p>
            </div>
          )}

          {/* DESCARGAS */}
          {sunatData.status === "ACCEPTED" && (
            <div className="space-y-2 mt-4">
              <p className="text-xs text-slate-500 font-medium text-center mb-2">
                Archivos de la Guía:
              </p>
              {sunatData.xmlUrl && (
                <a
                  href={getStorageUrl(sunatData.xmlUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-bold text-xs"
                >
                  <FileCode className="w-4 h-4 text-blue-500" /> XML GRE Firmado
                </a>
              )}
              {sunatData.cdrUrl && (
                <a
                  href={getStorageUrl(sunatData.cdrUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-bold text-xs"
                >
                  <Archive className="w-4 h-4 text-purple-500" /> Constancia
                  (CDR) GRE
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
