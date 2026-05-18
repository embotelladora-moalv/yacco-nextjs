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
  Users,
  RefreshCw,
} from "lucide-react";

interface RouteTimelineProps {
  manifest: any;
  products: Product[];
  sales: any[];
  users: any[];
}

export function RouteTimeline({
  manifest,
  products,
  sales,
  users,
}: RouteTimelineProps) {
  const pitStops = manifest.pitStopsHistory || [];

  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "Producto";
  const getUserName = (id: string) =>
    users?.find((u) => u.id === id)?.name || "No modificado";

  const timelineEvents = useMemo(() => {
    const events = [];
    if (manifest.dispatchDate) {
      events.push({
        type: "START",
        date: new Date(manifest.dispatchDate),
        title: "Salida de Planta de Llenado",
        description: "El camión inició ruta con la carga base autorizada.",
        icon: <Milestone className="h-4 w-4 text-white" />,
        color: "bg-blue-600 ring-blue-100",
      });
    }
    pitStops.forEach((pit: any, idx: number) => {
      events.push({
        type: "PIT_STOP",
        date: new Date(pit.createdAt),
        title: `Pit Stop #${idx + 1} - Auditoría en Ruta`,
        icon: <RefreshCw className="h-4 w-4 text-white" />,
        color: "bg-orange-500 ring-orange-100",
        data: pit,
      });
    });
    if (manifest.status === "LIQUIDATED" && manifest.liquidatedAt) {
      events.push({
        type: "END",
        date: new Date(manifest.liquidatedAt),
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
          <div
            key={index}
            className="relative animate-in fade-in slide-in-from-left-3"
          >
            <span
              className={`absolute -left-[33px] top-0.5 rounded-full flex h-6 w-6 items-center justify-center ring-4 ${event.color}`}
            >
              {event.icon}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="font-black text-slate-900 text-sm sm:text-base">
                {event.title}
              </h4>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 border px-2 py-0.5 rounded-md w-max">
                {/* 🔥 CORRECCIÓN FECHA Y HORA */}
                {event.date.toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            {event.description && (
              <p className="text-xs font-medium text-slate-500 mt-1">
                {event.description}
              </p>
            )}
            {event.type === "PIT_STOP" && (
              <div className="mt-3 bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4 text-xs">
                <div className="flex flex-wrap gap-4 text-slate-600 font-bold border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    Chofer:{" "}
                    <span className="text-slate-900 font-black">
                      {getUserName(event.data.driverId)}
                    </span>
                  </div>
                  {event.data.assistantId && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      Auxiliar:{" "}
                      <span className="text-slate-900 font-black">
                        {getUserName(event.data.assistantId)}
                      </span>
                    </div>
                  )}
                </div>
                {(event.data.cashHandover > 0 ||
                  event.data.additionalPettyCash > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-100">
                    {event.data.cashHandover > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" />{" "}
                          Efectivo Dejado:
                        </span>
                        <span className="font-black text-emerald-700">
                          S/ {Number(event.data.cashHandover).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {event.data.additionalPettyCash > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <ArrowUpFromLine className="h-3.5 w-3.5 text-orange-500" />{" "}
                          Nueva Caja Chica:
                        </span>
                        <span className="font-black text-orange-700">
                          S/ {Number(event.data.additionalPettyCash).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {event.data.newItems?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                        ↑ Nueva Carga subida
                      </p>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-0.5">
                        {event.data.newItems.map((i: any, k: number) => (
                          <p
                            key={k}
                            className="font-bold text-slate-700 truncate"
                          >
                            {i.quantityRequested || i.quantity}u.{" "}
                            <span className="font-medium capitalize text-slate-500">
                              {getProductName(i.productId)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {event.data.returnedFulls?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                        ↓ Llenos Bajados (Mermas)
                      </p>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-0.5">
                        {event.data.returnedFulls.map((i: any, k: number) => (
                          <p
                            key={k}
                            className="font-bold text-slate-700 truncate"
                          >
                            {i.quantity}u.{" "}
                            <span className="font-medium capitalize text-slate-500">
                              {getProductName(i.productId)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {event.data.returnedEmpties?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                        ↓ Vacíos Descargados
                      </p>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-0.5">
                        {event.data.returnedEmpties.map((i: any, k: number) => (
                          <p
                            key={k}
                            className="font-bold text-slate-700 truncate"
                          >
                            {i.quantity}u.{" "}
                            <span className="font-medium capitalize text-slate-500">
                              {getProductName(i.productId)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {event.data.notes && (
                  <div className="text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-100 flex items-start gap-1.5 font-medium">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>"{event.data.notes}"</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
