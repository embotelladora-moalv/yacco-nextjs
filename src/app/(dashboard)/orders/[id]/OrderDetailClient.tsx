"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Edit,
  Calendar,
  MapPin,
  User,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrderDetailProps {
  order: any;
  customer: any;
  products: any[];
  manifest: any | null;
}

export function OrderDetailClient({
  order,
  customer,
  products,
  manifest,
}: OrderDetailProps) {
  const router = useRouter();

  const getProductName = (id: string) => {
    return products.find((p) => p.id === id)?.name || "Producto desconocido";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const statusConfig = {
    PENDING: {
      label: "Pendiente",
      color: "bg-orange-100 text-orange-700",
      icon: Clock,
    },
    ASSIGNED: {
      label: "Asignado a Ruta",
      color: "bg-blue-100 text-blue-700",
      icon: Truck,
    },
    DELIVERED: {
      label: "Entregado",
      color: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: "Cancelado",
      color: "bg-slate-100 text-slate-500",
      icon: AlertCircle,
    },
  };

  const currentStatus = statusConfig[order.status as keyof typeof statusConfig];
  const location = customer?.locations.find(
    (l: any) => l.id === order.locationId,
  );

  return (
    <div className="space-y-6">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full bg-white border shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">
                Pedido #{order.id.substring(0, 6).toUpperCase()}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${currentStatus.color}`}
              >
                <currentStatus.icon className="h-3 w-3" /> {currentStatus.label}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Registrado el {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none font-bold rounded-xl border-slate-200"
          >
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          {order.status === "PENDING" && (
            <Button
              asChild
              className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
            >
              <Link href={`/orders/${order.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Editar Pedido
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: CLIENTE Y PRODUCTOS */}
        <div className="lg:col-span-2 space-y-6">
          {/* TARJETA DE PRODUCTOS */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" /> Detalle del
                Pedido
              </h3>
            </div>
            <div className="p-8">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="pb-4">Producto</th>
                    <th className="pb-4 text-center">Cantidad</th>
                    <th className="pb-4 text-right">Precio Unit.</th>
                    <th className="pb-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.items.map((item: any, idx: number) => (
                    <tr key={idx} className="group">
                      <td className="py-4">
                        <p className="font-bold text-slate-800">
                          {getProductName(item.productId)}
                        </p>
                      </td>
                      <td className="py-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-black">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium text-slate-500">
                        S/ {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-4 text-right font-black text-slate-900">
                        S/ {(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Total Estimado
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    S/{" "}
                    {order.items
                      .reduce(
                        (acc: number, item: any) =>
                          acc + item.quantity * item.unitPrice,
                        0,
                      )
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA DE NOTAS */}
          {order.notes && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
              <h4 className="text-amber-800 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" /> Notas de Entrega
              </h4>
              <p className="text-amber-900 font-medium">{order.notes}</p>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: LOGÍSTICA Y CLIENTE */}
        <div className="space-y-6">
          {/* INFO CLIENTE */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="h-3 w-3" /> Datos de Entrega
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-black text-slate-900">
                  {customer?.name}
                </p>
                <p className="text-xs font-bold text-blue-600 uppercase">
                  {customer?.alias || "Sin alias"}
                </p>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl">
                <MapPin className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-slate-800">
                    {location?.name}
                  </p>
                  <p className="text-sm text-slate-600 font-medium">
                    {location?.address}
                  </p>
                  {location?.reference && (
                    <p className="text-xs text-slate-400 italic mt-1">
                      "{location.reference}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm font-bold text-slate-600 px-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Entrega: {formatDate(order.expectedDeliveryDate)}</span>
              </div>
            </div>
          </div>

          {/* ESTADO LOGÍSTICO */}
          <div
            className={`rounded-[2rem] border p-6 shadow-sm ${manifest ? "bg-blue-600 text-white" : "bg-slate-100 border-slate-200 text-slate-500"}`}
          >
            <h3
              className={`font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2 ${manifest ? "text-blue-200" : "text-slate-400"}`}
            >
              <Truck className="h-3 w-3" /> Estatus Logístico
            </h3>
            {manifest ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-blue-200 uppercase">
                  Asignado al Camión:
                </p>
                <p className="text-2xl font-black">{manifest.truckPlate}</p>
                <div className="flex items-center gap-2 text-sm font-bold bg-white/10 p-2 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-blue-300 animate-pulse" />
                  Manifiesto: {manifest.manifestNumber}
                </div>
                <Button
                  asChild
                  variant="link"
                  className="text-white p-0 h-auto font-black text-xs hover:text-blue-100 underline decoration-2"
                >
                  <Link href={`/dispatch/${manifest.id}`}>
                    Ver Hoja de Ruta completa
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="font-bold text-sm italic">
                  Pendiente de asignación a un camión.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 bg-white border-none text-slate-900 font-black text-xs h-8"
                >
                  <Link href="/orders">Ir al Control Logístico</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
