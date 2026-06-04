"use client";

import { useState } from "react";
import { Order } from "@/core/entities/Order";
import { Customer } from "@/core/entities/CRM";
import { DispatchManifest } from "@/core/entities/Dispatch";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  assignOrderToManifestAction,
  assignOrdersBulkAction,
  deleteOrderAction,
} from "./actions";
import {
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  User,
  CheckSquare,
  Edit,
  Trash2,
  FileBadge2, // <-- Icono para la guía
} from "lucide-react";
import Link from "next/link";

interface OrdersDashboardProps {
  pendingOrders: Order[];
  customers: Customer[];
  activeManifests: DispatchManifest[];
  products: Product[];
}

export function OrdersDashboardClient({
  pendingOrders,
  customers,
  activeManifests,
  products,
}: OrdersDashboardProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkManifestId, setBulkManifestId] = useState("");

  // 🔥 NUEVO ESTADO: ¿Generar guías para estos pedidos al asignar?
  const [generateGuides, setGenerateGuides] = useState(false);

  const getCustomerData = (customerId: string, locationId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    const location = customer?.locations.find((l) => l.id === locationId);
    return { customer, location };
  };

  const getProductName = (productId: string) => {
    return (
      products.find((p) => p.id === productId)?.name || "Producto Desconocido"
    );
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id)
        ? prev.filter((orderId) => orderId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map((o) => o.id));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkManifestId || selectedOrders.length === 0) return;
    setIsAssigning(true);

    // 🔥 ENVIAMOS EL NUEVO PARÁMETRO AL ACTION
    const result = await assignOrdersBulkAction(
      selectedOrders,
      bulkManifestId,
      generateGuides,
    );
    setIsAssigning(false);

    if (result.success) {
      toast.success(`${selectedOrders.length} pedidos asignados al camión.`);
      if (generateGuides)
        toast.success("Las guías (GRE) se están generando en segundo plano.");

      setSelectedOrders([]);
      setBulkManifestId("");
      setGenerateGuides(false);
    } else {
      toast.error("Error en asignación masiva", { description: result.error });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas eliminar este pedido por completo?",
      )
    ) {
      const result = await deleteOrderAction(id);
      if (result.success) {
        toast.success("Pedido eliminado.");
        setSelectedOrders((prev) => prev.filter((orderId) => orderId !== id));
      } else {
        toast.error("Error al eliminar", { description: result.error });
      }
    }
  };

  if (pendingOrders.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-2xl font-black text-slate-800">Todo al día</h3>
        <p className="text-slate-500 font-medium mt-2">
          No hay pedidos pendientes por asignar. ¡Excelente trabajo!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" /> Pendientes (
              {pendingOrders.length})
            </h2>

            {pendingOrders.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${selectedOrders.length === pendingOrders.length ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 bg-white"}`}
                >
                  {selectedOrders.length === pendingOrders.length && (
                    <CheckSquare className="h-3 w-3" />
                  )}
                </div>
                Seleccionar Todo
              </button>
            )}
          </div>

          {/* 🔥 BARRA DE ASIGNACIÓN MASIVA ACTUALIZADA CON SWITCH DE GUÍA */}
          {selectedOrders.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-in fade-in zoom-in duration-200 w-full sm:w-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-black text-blue-800 whitespace-nowrap">
                  {selectedOrders.length} Seleccionados
                </span>

                <select
                  value={bulkManifestId}
                  onChange={(e) => setBulkManifestId(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-blue-200 text-sm font-bold bg-white w-full sm:w-auto"
                >
                  <option value="">A qué camión...</option>
                  {activeManifests.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.truckPlate}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between border-t sm:border-t-0 sm:border-l border-blue-200 pt-3 sm:pt-0 sm:pl-4">
                {/* Switch de SUNAT */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={generateGuides}
                      onChange={(e) => setGenerateGuides(e.target.checked)}
                    />
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors ${generateGuides ? "bg-orange-500" : "bg-slate-300"}`}
                    ></div>
                    <div
                      className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${generateGuides ? "transform translate-x-4" : ""}`}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <FileBadge2 className="h-3 w-3 text-orange-500" /> Emitir
                    Guías
                  </span>
                </label>

                <Button
                  onClick={handleBulkAssign}
                  disabled={isAssigning || !bulkManifestId}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6"
                >
                  {isAssigning ? "Asignando..." : "Despachar"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* ... EL RESTO DEL CÓDIGO DEL BUCLE DE PEDIDOS SE MANTIENE IGUAL ... */}
          {pendingOrders.map((order) => {
            const { customer, location } = getCustomerData(
              order.customerId,
              order.locationId,
            );
            const isSelected = selectedOrders.includes(order.id);
            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border ${isSelected ? "border-blue-500 ring-1 ring-blue-500 shadow-md" : "border-slate-200 shadow-sm"} p-5 flex flex-col md:flex-row gap-6 transition-all`}
              >
                <div className="flex items-start pt-1">
                  <button
                    onClick={() => toggleOrderSelection(order.id)}
                    className={`h-6 w-6 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 bg-slate-50"}`}
                  >
                    {isSelected && <CheckSquare className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight flex items-center gap-2">
                        {customer?.name || "Cliente Desconocido"}
                      </h3>
                      <p className="text-sm font-bold text-blue-600">
                        {location?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{location?.address}</p>
                    </div>
                  </div>
                </div>
                <div className="md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  <div className="space-y-2 mb-4">
                    <ul className="text-xs font-medium text-slate-500 space-y-1">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between border-b border-slate-50 pb-1"
                        >
                          <span className="font-bold text-slate-700">
                            {item.quantity}x
                          </span>
                          <span>{getProductName(item.productId)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto flex justify-end items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(order.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-slate-500 hover:text-blue-600 font-bold h-8"
                    >
                      <Link href={`/orders/${order.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" /> Rutas Activas
        </h2>
        <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-xl shadow-slate-900/10 text-white space-y-4">
          {activeManifests.length === 0 ? (
            <p className="text-slate-400 text-sm font-medium">
              No hay camiones en ruta.
            </p>
          ) : (
            activeManifests.map((manifest) => (
              <div
                key={manifest.id}
                className="bg-slate-800/50 p-4 rounded-xl border border-slate-700"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-blue-400">
                    {manifest.truckPlate}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {manifest.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
