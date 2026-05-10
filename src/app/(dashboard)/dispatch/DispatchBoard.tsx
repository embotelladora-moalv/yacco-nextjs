"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { assignOrderAction } from "./actions";
import { toast } from "sonner";
import { Navigation, Clock, Package, MapPin } from "lucide-react";

interface DispatchBoardProps {
  pendingOrders: any[];
  availableRoutes: any[];
}

export function DispatchBoard({
  pendingOrders,
  availableRoutes,
}: DispatchBoardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAssign = async (orderId: string, formData: FormData) => {
    const routeId = formData.get("routeId") as string;

    if (!routeId) {
      toast.error("Selecciona un camión primero");
      return;
    }

    setLoadingId(orderId);
    const result = await assignOrderAction(orderId, routeId);
    setLoadingId(null);

    if (result.success) {
      toast.success("Pedido asignado a la ruta");
    } else {
      toast.error(result.error);
    }
  };

  if (availableRoutes.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center flex flex-col items-center">
        <Navigation className="h-12 w-12 text-amber-400 mb-4" />
        <h3 className="font-black text-amber-800 text-xl">
          No hay camiones en ruta
        </h3>
        <p className="text-amber-700 mt-2">
          Para asignar pedidos, primero debes aperturar una ruta en el módulo de
          Logística.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {pendingOrders.length > 0 ? (
        pendingOrders.map((order) => (
          <Card
            key={order.id}
            className="p-0 overflow-hidden shadow-sm border-slate-200 rounded-3xl flex flex-col"
          >
            <div className="bg-slate-900 p-4 text-white flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm uppercase tracking-widest text-slate-300">
                  En Espera
                </span>
              </div>
              <span className="font-black text-lg">
                S/ {order.totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="p-5 flex-1 space-y-4 bg-white">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Cliente
                </p>
                <p className="font-black text-slate-800 text-lg leading-tight">
                  {order.customerName}
                </p>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="text-sm font-medium leading-snug">
                  {order.customerAddress}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Contenido del Pedido
                </p>
                <ul className="text-xs font-bold text-slate-700 space-y-1">
                  {order.items.map((item: any, idx: number) => (
                    <li key={idx}>
                      • {item.quantity}x {item.productName}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <form
                action={(formData) => handleAssign(order.id, formData)}
                className="flex flex-col gap-3"
              >
                <select
                  name="routeId"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seleccionar unidad de reparto...
                  </option>
                  {availableRoutes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.truckAlias} ({route.plateNumber})
                    </option>
                  ))}
                </select>

                <Button
                  type="submit"
                  disabled={loadingId === order.id}
                  className="w-full bg-blue-700 hover:bg-blue-800 font-bold"
                >
                  {loadingId === order.id
                    ? "Asignando..."
                    : "Enviar a este Camión"}
                </Button>
              </form>
            </div>
          </Card>
        ))
      ) : (
        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="bg-green-50 p-4 rounded-full mb-4">
            <Package className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="font-black text-slate-700 text-xl">Bandeja Limpia</h3>
          <p className="text-slate-500 font-medium mt-1">
            No hay pedidos pendientes por asignar.
          </p>
        </div>
      )}
    </div>
  );
}
