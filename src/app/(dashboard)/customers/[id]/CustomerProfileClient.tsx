"use client";

import { Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Phone,
  User,
  Package,
  DollarSign,
  ChevronLeft,
  Calendar,
  Edit,
  Map as MapIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface CustomerProfileProps {
  customer: any; // El cliente con las fechas serializadas
  products: Product[];
}

export function CustomerProfileClient({
  customer,
  products,
}: CustomerProfileProps) {
  // Helper para obtener el nombre del producto
  const getProductName = (id: string) => {
    return products.find((p) => p.id === id)?.name || "Producto Desconocido";
  };

  // Formatear fechas
  const formatDate = (isoString?: string) => {
    if (!isoString) return "Sin registros";
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  };

  // Calcular totales (Asumiendo que agregaste debtAmount a tu entidad basándome en tu error anterior)
  const totalDebt = customer.debtAmount || 0;
  const totalContainersOwed =
    customer.containerBalances?.reduce(
      (acc: number, curr: any) => acc + curr.balance,
      0,
    ) || 0;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER: INFO PRINCIPAL                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full bg-slate-50 hover:bg-slate-100"
          >
            <Link href="/customers">
              <ChevronLeft className="h-6 w-6 text-slate-600" />
            </Link>
          </Button>
          <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">
                {customer.name}
              </h1>
              {customer.isActive ? (
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Activo
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-blue-600 mt-0.5 uppercase tracking-tight">
              {customer.alias || "Sin Alias Comercial"}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {customer.documentType}: {customer.documentNumber}
              </span>
              <div className="flex gap-1">
                {customer.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          asChild
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md"
        >
          <Link href={`/customers/${customer.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> Editar Cliente
          </Link>
        </Button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TARJETAS DE INDICADORES (KPIs)                                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Deuda de Envases */}
        <div
          className={`p-6 rounded-[2rem] border ${totalContainersOwed > 0 ? "bg-red-50 border-red-100" : "bg-white border-slate-200"} shadow-sm`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Package
              className={`h-5 w-5 ${totalContainersOwed > 0 ? "text-red-600" : "text-slate-400"}`}
            />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">
              Deuda de Envases
            </h3>
          </div>
          <p
            className={`text-4xl font-black ${totalContainersOwed > 0 ? "text-red-700" : "text-slate-800"}`}
          >
            {totalContainersOwed}{" "}
            <span className="text-base font-bold text-slate-500">unidades</span>
          </p>
          {totalContainersOwed > 0 && (
            <p className="text-xs font-bold text-red-500 mt-2">
              Requiere recojo en próxima visita.
            </p>
          )}
        </div>

        {/* KPI 2: Deuda Económica */}
        <div
          className={`p-6 rounded-[2rem] border ${totalDebt > 0 ? "bg-orange-50 border-orange-100" : "bg-white border-slate-200"} shadow-sm`}
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign
              className={`h-5 w-5 ${totalDebt > 0 ? "text-orange-600" : "text-emerald-500"}`}
            />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">
              Saldo Económico
            </h3>
          </div>
          <p
            className={`text-4xl font-black ${totalDebt > 0 ? "text-orange-700" : "text-emerald-600"}`}
          >
            S/ {totalDebt.toFixed(2)}
          </p>
          {totalDebt > 0 && (
            <p className="text-xs font-bold text-orange-600 mt-2">
              Saldo pendiente de cobro.
            </p>
          )}
        </div>

        {/* KPI 3: Última Actividad */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">
              Última Compra / Visita
            </h3>
          </div>
          <p className="text-lg font-black text-slate-800 mt-3">
            {formatDate(customer.lastSaleDate)}
          </p>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Registrado el: {formatDate(customer.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------------------------------------------------------- */}
        {/* COLUMNA IZQUIERDA: DETALLE DE CUENTA CORRIENTE (ENVASES)       */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-xl shadow-slate-900/10 text-white min-h-[300px]">
            <h3 className="font-black text-lg flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-blue-400" /> Detalle de Envases
              Prestados
            </h3>

            {!customer.containerBalances ||
            customer.containerBalances.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 opacity-60">
                <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-400" />
                <p className="font-medium">El cliente no debe envases.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customer.containerBalances.map((balance: any) => (
                  <div
                    key={balance.productId}
                    className="flex justify-between items-center border-b border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                        <AlertCircle
                          className={`h-4 w-4 ${balance.balance > 0 ? "text-red-400" : "text-slate-400"}`}
                        />
                      </div>
                      <p className="font-bold text-slate-200 text-sm">
                        {getProductName(balance.productId)}
                      </p>
                    </div>
                    <span
                      className={`text-xl font-black ${balance.balance > 0 ? "text-red-400" : "text-emerald-400"}`}
                    >
                      {balance.balance}{" "}
                      <span className="text-xs font-bold text-slate-500">
                        u.
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* COLUMNA DERECHA: SEDES / UBICACIONES (MAPA LISTA)              */}
        {/* ---------------------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-orange-500" /> Locales de Entrega (
            {customer.locations?.length || 0})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customer.locations?.map((loc: any, index: number) => (
              <div
                key={loc.id || index}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
              >
                {loc.isMain && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg">
                    Principal
                  </div>
                )}

                <h4 className="font-black text-slate-900 text-base mb-1">
                  {loc.name}
                </h4>

                <div className="space-y-2 mt-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="font-medium text-slate-600">{loc.address}</p>
                  </div>
                  {loc.reference && (
                    <p className="text-xs text-slate-500 italic pl-6">
                      {loc.reference}
                    </p>
                  )}

                  <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-bold">
                        {loc.contactName || "Sin encargado"}
                      </span>
                    </div>
                    {loc.contactPhone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium">{loc.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
