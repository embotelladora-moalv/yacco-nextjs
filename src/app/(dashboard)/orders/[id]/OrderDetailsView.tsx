"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  User,
  Calendar,
  CreditCard,
  Banknote,
  MapPin,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react";

export function OrderDetailsView({ order, customer }: any) {
  // Función auxiliar para traducir el método de pago
  const translatePaymentMethod = (method: string) => {
    const methods: any = {
      CASH: "Efectivo",
      YAPE: "Yape / Plin",
      TRANSFER: "Transferencia Bancaria",
      CREDIT: "Crédito (Deuda)",
    };
    return methods[method] || method;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUMNA IZQUIERDA: DATOS GENERALES Y CLIENTE */}
      <div className="lg:col-span-1 space-y-6">
        {/* Estado Operativo */}
        <Card className="p-6 rounded-3xl shadow-sm border-slate-100 bg-white">
          <div className="flex items-center gap-3 mb-4 text-slate-700">
            <Receipt className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-lg">Resumen Operativo</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-dashed">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Estado Logístico
              </span>
              {order.status === "DELIVERED" && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Entregado
                </Badge>
              )}
              {order.status === "RESERVED" && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">
                  <Clock className="h-3 w-3 mr-1" /> Reserva
                </Badge>
              )}
              {order.status === "ASSIGNED" && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                  <Truck className="h-3 w-3 mr-1" /> En Ruta
                </Badge>
              )}
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-dashed">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Tipo de Venta
              </span>
              <span className="text-sm font-bold text-slate-700">
                {order.type === "PLANT_SALE"
                  ? "Venta en Planta"
                  : order.type === "ROUTE_SALE"
                    ? "Venta en Ruta"
                    : "Pedido a Domicilio"}
              </span>
            </div>

            <div className="flex justify-between items-center pb-1">
              <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Fecha
              </span>
              <span className="text-sm font-bold text-slate-700">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Datos del Cliente */}
        <Card className="p-6 rounded-3xl shadow-sm border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-lg">Facturar a</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {customer?.type === "COMPANY" ? "Razón Social" : "Nombres"}
              </p>
              <p className="font-black text-lg leading-tight">
                {customer?.name || "Cliente Desconocido"}
              </p>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {customer?.type === "COMPANY" ? "RUC" : "DNI"}
                </p>
                <p className="font-mono text-sm text-blue-100">
                  {customer?.documentId || "N/A"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs border-slate-600 text-slate-300"
              >
                Deuda Global: S/ {customer?.debtAmount.toFixed(2) || "0.00"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <div className="space-y-3">
          <Button className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold h-12">
            <Printer className="h-4 w-4 mr-2" /> Imprimir Comprobante Interno
          </Button>

          {order.status === "RESERVED" && (
            <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold h-12 shadow-md">
              <MapPin className="h-4 w-4 mr-2" /> Asignar a Ruta de Entrega
            </Button>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: DETALLE DE PRODUCTOS Y TOTALES */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-8 rounded-3xl shadow-sm border-slate-100 bg-white">
          <h3 className="font-black text-xl text-slate-800 mb-6 border-b pb-4">
            Detalle de la Orden
          </h3>

          {/* Tabla de Items */}
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase px-2 pb-2 border-b">
              <div className="col-span-6">Producto</div>
              <div className="col-span-2 text-center">Cant.</div>
              <div className="col-span-2 text-right">Precio</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            {order.items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center text-sm font-bold text-slate-700 px-2 py-1"
              >
                <div className="col-span-6 flex flex-col">
                  <span>{item.productName}</span>
                </div>
                <div className="col-span-2 text-center bg-slate-50 py-1 rounded-md">
                  {item.quantity}
                </div>
                <div className="col-span-2 text-right">
                  S/ {item.unitPrice.toFixed(2)}
                </div>
                <div className="col-span-2 text-right text-slate-900 font-black">
                  S/ {item.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Totales y Finanzas */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3 w-full md:w-1/2">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-slate-600">Método:</span>
                <span className="font-black text-slate-800">
                  {translatePaymentMethod(order.paymentMethod)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Banknote className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-slate-600">Estado:</span>
                {order.paymentStatus === "PAID" && (
                  <span className="text-green-600 font-black bg-green-100 px-2 py-0.5 rounded">
                    PAGADO TOTAL
                  </span>
                )}
                {order.paymentStatus === "PARTIAL" && (
                  <span className="text-amber-600 font-black bg-amber-100 px-2 py-0.5 rounded">
                    A CUENTA (PARCIAL)
                  </span>
                )}
                {order.paymentStatus === "PENDING" && (
                  <span className="text-red-600 font-black bg-red-100 px-2 py-0.5 rounded">
                    DEUDA (CRÉDITO)
                  </span>
                )}
              </div>
            </div>

            <div className="w-full md:w-auto space-y-2 text-right border-t md:border-t-0 pt-4 md:pt-0">
              {order.paymentStatus === "PARTIAL" && (
                <div className="flex justify-between md:justify-end gap-6 text-sm font-bold text-slate-500">
                  <span>Adelanto pagado:</span>
                  <span>S/ {order.amountPaid.toFixed(2)}</span>
                </div>
              )}
              {["PARTIAL", "PENDING"].includes(order.paymentStatus) && (
                <div className="flex justify-between md:justify-end gap-6 text-sm font-bold text-red-500">
                  <span>Saldo a Crédito:</span>
                  <span>
                    S/ {(order.totalAmount - order.amountPaid).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between md:justify-end gap-6 text-2xl font-black text-blue-700 pt-2 border-t border-slate-200 mt-2">
                <span>TOTAL:</span>
                <span>S/ {order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
