"use client";

import React, { useMemo } from "react";
import { Product } from "@/core/entities/Inventory";
import {
  Clock,
  User,
  Wallet,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  MessageSquare,
  CheckCircle2,
  Milestone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { formatPeruDateTime } from "@/core/utils/dateUtils";

interface RouteTimelineProps {
  manifest: any;
  pitStops?: any[];
  products?: Product[];
  sales?: any[];
  users?: any[];
}

export function RouteTimeline({ 
  manifest, 
  pitStops = [],
  products,
  sales,
  users,
}: RouteTimelineProps) {
  const timelineEvents = useMemo(() => {
    const events: any[] = [];

    // 1. Salida (Carga Inicial)
    events.push({
      type: "START",
      date: new Date(manifest.dispatchDate),
      title: "Salida de Planta",
      description: `Ruta autorizada con placa ${manifest.truckPlate}.`,
      icon: <Truck className="h-4 w-4 text-white" />,
      color: "bg-blue-600 ring-blue-100",
    });

    // 2. Paradas (Pit Stops)
    pitStops.forEach((pit) => {
      let desc = pit.notes || "Parada técnica sin observaciones.";
      if (pit.cashHandover > 0) {
        desc += ` Rendición parcial de S/ ${pit.cashHandover}.`;
      }

      events.push({
        type: "PIT_STOP",
        date: new Date(pit.createdAt),
        title: "Parada en Ruta",
        description: desc,
        icon: <Milestone className="h-4 w-4 text-slate-500" />,
        color: "bg-slate-100 ring-slate-50",
      });
    });

    // 3. Liquidación (Si ya existe)
    const liquidationTime = manifest.liquidatedAt || manifest.liquidationDate;
    if (manifest.status === "LIQUIDATED" && liquidationTime) {
      events.push({
        type: "END",
        date: new Date(liquidationTime),
        title: "Cierre y Liquidación de Ruta",
        description:
          "El camión retornó a base. Caja cuadrada e inventario sincronizado.",
        icon: <ShieldCheck className="h-4 w-4 text-white" />,
        color: "bg-emerald-600 ring-emerald-100",
      });
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [manifest, pitStops]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 lg:p-8 shadow-sm">
      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
        <Clock className="h-6 w-6 text-blue-500" /> Bitácora Cronológica de la
        Ruta
      </h3>

      <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-8">
        {timelineEvents.map((event: any, index: number) => (
          <div key={index} className="relative">
            {/* Punto en la línea */}
            <div
              className={`absolute -left-[33px] top-0 h-8 w-8 rounded-full flex items-center justify-center ring-4 ${event.color}`}
            >
              {event.icon}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-black text-slate-800">
                  {event.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatPeruDateTime(event.date)}
                </p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
