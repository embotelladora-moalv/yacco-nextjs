"use client";

import { useState, useEffect } from "react";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import {
  Truck,
  User,
  Map as MapIcon,
  ChevronLeft,
  Package,
  RefreshCw,
  Download,
  Clock,
  CheckCircle2,
  CheckSquare,
  Trash2,
  Store,
  Wallet,
  CreditCard,
  Target,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { doc, onSnapshot } from "firebase/firestore";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { db } from "@/services/firebase/config";
import {
  confirmOrderDeliveryAction,
  unassignOrdersBulkAction,
} from "../../orders/actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RouteTimeline } from "./RouteTimeline";

interface Props {
  manifest: any;
  products: Product[];
  driverName: string;
  orders: any[];
  customersData: Record<string, any>;
  sales: any[];
  users: any[];
}

export function DispatchDetailsClient({
  manifest,
  products,
  driverName,
  orders,
  customersData,
  sales,
  users,
}: Props) {
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [truckLocation, setTruckLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedOrderForSale, setSelectedOrderForSale] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    method: "CASH",
    cash: 0,
    digital: 0,
  });

  useEffect(() => {
    if (manifest.status !== "ON_ROUTE") return;
    const unsubscribe = onSnapshot(
      doc(db, "liveTracking", manifest.id),
      (docSnap) => {
        if (docSnap.exists()) {
          setTruckLocation({
            lat: docSnap.data().latitude,
            lng: docSnap.data().longitude,
          });
        }
      },
    );
    return () => unsubscribe();
  }, [manifest.id, manifest.status]);

  // =========================================================================
  // CÁLCULOS MATEMÁTICOS MAESTROS EN TIEMPO REAL
  // =========================================================================

  const initialPettyCash = Number(manifest.initialPettyCash) || 0;
  const cashHandedOver = Number(manifest.cashAdvances) || 0;
  const totalSalesCash = sales.reduce(
    (sum, s) => sum + (Number(s.cashReceived) || 0),
    0,
  );
  const totalSalesDigital = sales.reduce(
    (sum, s) => sum + (Number(s.digitalReceived) || 0),
    0,
  );
  const currentCashOnHand = initialPettyCash + totalSalesCash - cashHandedOver;

  // 🔥 CORRECCIÓN: LLENOS A BORDO (Cargado - Devuelto en Pits - Vendido)
  const safeItems = manifest.items || [];
  const fullsOnBoard = safeItems.reduce((acc: any, item: any) => {
    if (!acc[item.productId]) {
      acc[item.productId] = {
        total: 0,
        product: products.find((p) => p.id === item.productId),
      };
    }
    // Restamos lo que ya dejó en la planta (Mermas o Retornos)
    acc[item.productId].total +=
      (item.quantityLoaded || 0) -
      (item.quantityReturnedFull || 0) -
      (item.wasteQuantity || 0);
    return acc;
  }, {});

  sales.forEach((sale) => {
    (sale.items || []).forEach((item: any) => {
      // Solo restamos si es venta de líquido (No "Solo Envase")
      if (item.itemSaleType !== "BOTTLE" && fullsOnBoard[item.productId]) {
        fullsOnBoard[item.productId].total -= item.quantity;
      }
    });
  });
  const activeFulls = Object.values(fullsOnBoard).filter(
    (g: any) => g.total > 0,
  );
  const totalFullsCount = activeFulls.reduce(
    (sum: number, g: any) => sum + g.total,
    0,
  );

  // 🔥 HISTÓRICO TOTAL DE VACÍOS (Todo lo recogido en el día)
  const historicalEmptiesCount = sales.reduce((sum, sale) => {
    return (
      sum +
      (sale.returnedEmpties || []).reduce(
        (acc: number, e: any) => acc + e.quantity,
        0,
      )
    );
  }, 0);

  // 🔥 INVENTARIO FÍSICO ACTUAL A BORDO (Histórico - Ya entregados en Pits)
  const emptiesOnBoard: Record<string, any> = {};
  sales.forEach((sale) => {
    (sale.returnedEmpties || []).forEach((e: any) => {
      if (!emptiesOnBoard[e.productId]) {
        emptiesOnBoard[e.productId] = {
          total: 0,
          product: products.find((p) => p.id === e.productId),
        };
      }
      emptiesOnBoard[e.productId].total += e.quantity;
    });
  });
  (manifest.returnedEmpties || []).forEach((e: any) => {
    if (emptiesOnBoard[e.productId]) {
      emptiesOnBoard[e.productId].total -=
        e.quantityReturned || e.quantity || 0;
    }
  });

  const activeEmpties = Object.values(emptiesOnBoard).filter(
    (g: any) => g.total > 0,
  );
  const totalEmptiesCount = activeEmpties.reduce(
    (sum: number, g: any) => sum + g.total,
    0,
  );

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const progressPercent =
    totalOrders === 0 ? 0 : Math.round((deliveredOrders / totalOrders) * 100);
  const directSales = sales.filter((s) => !s.linkedOrderId);

  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "Producto";

  const toggleOrderSelection = (id: string) =>
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((oId) => oId !== id) : [...prev, id],
    );

  const handleUnassignBulk = async () => {
    if (selectedOrders.length === 0) return;
    setIsUnassigning(true);
    const result = await unassignOrdersBulkAction(selectedOrders, manifest.id);
    setIsUnassigning(false);
    if (result.success) {
      toast.success(
        `${selectedOrders.length} pedidos devueltos a la bandeja general.`,
      );
      setSelectedOrders([]);
    } else toast.error("Error", { description: result.error });
  };

  const handleConfirmSale = async () => {
    if (!selectedOrderForSale) return;
    setIsPending(true);
    const result = await confirmOrderDeliveryAction(selectedOrderForSale.id, {
      method: paymentData.method,
      cash: paymentData.cash,
      digital: paymentData.digital,
      driverId: manifest.driverId,
      returnedEmpties: [],
    });
    setIsPending(false);
    if (result.success) {
      toast.success("Entrega confirmada y venta registrada.");
      setSaleModalOpen(false);
      setPaymentData({ method: "CASH", cash: 0, digital: 0 });
    } else toast.error("Error", { description: result.error });
  };

  // 🔥 FORMATO DE FECHA Y HORA
  const dispatchDate = new Date(manifest.dispatchDate);
  const formattedDate = dispatchDate.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="rounded-full"
            >
              <Link href="/dispatch">
                <ChevronLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Detalles del Despacho
              </h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                ID: {manifest.id}
              </p>
            </div>
          </div>
          {manifest.status === "ON_ROUTE" && (
            <Button
              asChild
              className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl h-11 px-6 shadow-md shadow-orange-500/10"
            >
              <Link href={`/dispatch/${manifest.id}/pit-stop`}>
                <RefreshCw className="mr-2 h-4 w-4" /> Parada en Pits (Gestión
                Avanzada)
              </Link>
            </Button>
          )}
        </div>

        {/* DASHBOARD KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-blue-500" /> Progreso
              </span>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                {progressPercent}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">
                {deliveredOrders}{" "}
                <span className="text-sm text-slate-400">/ {totalOrders}</span>
              </p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Efectivo
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">
                S/ {currentCashOnHand.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Caja: {initialPettyCash.toFixed(2)} | Rendido:{" "}
                {cashHandedOver.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-purple-500" /> Digital
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">
                S/ {totalSalesDigital.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Yape / Plin / Transf.
              </p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-orange-500" /> Balance
                Físico
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xl font-black text-slate-900 flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3 text-orange-500" />{" "}
                  {totalFullsCount}
                </p>
                <p className="text-[10px] text-slate-400">Llenos a Bordo</p>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <p className="text-xl font-black text-slate-900 flex items-center gap-1">
                  <ArrowUpFromLine className="h-3 w-3 text-emerald-500" />{" "}
                  {totalEmptiesCount}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">
                  Total Hoy: {historicalEmptiesCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE GRID: INFO + INVENTARIO Y MAPA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col xl:flex-row justify-between xl:items-center border-b pb-4 mb-4 gap-2">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase w-max ${manifest.status === "ON_ROUTE" ? "bg-blue-600 text-white" : "bg-green-100 text-green-700"}`}
                >
                  {manifest.status === "ON_ROUTE" ? "En Progreso" : "Liquidado"}
                </span>
                <p className="text-sm font-black text-slate-800">
                  {formattedDate}
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Vehículo
                    </p>
                    <p className="font-black text-slate-900">
                      ({manifest.truckPlate})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Chofer
                    </p>
                    <p className="font-bold text-slate-700">{driverName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-xl text-white space-y-6">
              <div>
                <h3 className="font-black text-sm uppercase flex items-center gap-2 mb-4 text-slate-400">
                  <ArrowDownToLine className="h-4 w-4 text-orange-400" /> Llenos
                  Disponibles
                </h3>
                <div className="space-y-3">
                  {activeFulls.length === 0 ? (
                    <p className="text-slate-500 text-xs">
                      Sin stock de llenos.
                    </p>
                  ) : (
                    activeFulls.map((g: any) => (
                      <div
                        key={g.product?.id}
                        className="flex justify-between border-b border-slate-800 pb-2"
                      >
                        <p className="font-bold text-slate-200 text-sm">
                          {g.product?.name}
                        </p>
                        <span className="text-lg font-black text-orange-400">
                          {g.total} u.
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="flex flex-col gap-0.5 mb-4">
                  <h3 className="font-black text-sm uppercase flex items-center gap-2 text-slate-400">
                    <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />{" "}
                    Vacíos a bordo
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 ml-6 tracking-wide">
                    Recogidos hoy ({historicalEmptiesCount}u) - Entregados a
                    planta
                  </span>
                </div>
                <div className="space-y-3">
                  {activeEmpties.length === 0 ? (
                    <p className="text-slate-500 text-xs">
                      Sin vacíos físicos a bordo.
                    </p>
                  ) : (
                    activeEmpties.map((g: any) => (
                      <div
                        key={g.product?.id}
                        className="flex justify-between border-b border-slate-800 pb-2"
                      >
                        <p className="font-bold text-slate-200 text-sm">
                          {g.product?.name}
                        </p>
                        <span className="text-lg font-black text-emerald-400">
                          {g.total} u.
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-slate-100 rounded-[2rem] h-full min-h-[300px] border border-slate-200 shadow-inner overflow-hidden">
              {truckLocation ? (
                <Map
                  defaultCenter={truckLocation}
                  defaultZoom={15}
                  mapId="DEMO_MAP_ID"
                  disableDefaultUI={true}
                >
                  <AdvancedMarker position={truckLocation}>
                    <Pin
                      background={"#2563eb"}
                      glyphColor={"#fff"}
                      borderColor={"#1e40af"}
                    />
                  </AdvancedMarker>
                </Map>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 font-bold">
                  Esperando señal GPS...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <RouteTimeline
            manifest={manifest}
            products={products}
            sales={sales}
            users={users}
          />
        </div>

        {directSales.length > 0 && (
          <div className="bg-orange-50/50 rounded-[2rem] border border-orange-100 shadow-sm p-6 lg:p-8 mt-6">
            <div className="flex items-center gap-3 border-b border-orange-200 pb-4 mb-6">
              <ShoppingCart className="h-6 w-6 text-orange-500" />
              <h3 className="text-xl font-black text-slate-800">
                Ventas Directas (Al Paso)
              </h3>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase">
                {directSales.length} Ventas
              </span>
            </div>
            <div className="space-y-4">
              {directSales.map((sale) => {
                const customer = customersData[sale.customerId];
                return (
                  <div
                    key={sale.id}
                    className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl gap-4"
                  >
                    <div className="flex-1 w-full flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Store className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">
                          {customer?.name || "Cliente Desconocido"}
                        </h4>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                          Venta directa en calle/oficina
                        </p>
                      </div>
                    </div>
                    <div className="hidden md:block text-xs font-bold text-slate-400 max-w-[200px] truncate">
                      {sale.items
                        .map(
                          (i: any) =>
                            `${i.quantity}x ${getProductName(i.productId)}`,
                        )
                        .join(", ")}
                    </div>
                    <div className="w-full md:w-auto flex justify-end">
                      <span className="font-black text-lg text-slate-800">
                        S/ {sale.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 lg:p-8 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <MapIcon className="h-6 w-6 text-blue-500" />
              <h3 className="text-xl font-black text-slate-800">
                Ruta de Entregas y Guías
              </h3>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black uppercase">
                {orders.length} Paradas
              </span>
            </div>
            {selectedOrders.length > 0 && (
              <Button
                onClick={handleUnassignBulk}
                disabled={isUnassigning}
                variant="destructive"
                size="sm"
                className="font-bold"
              >
                <Trash2 className="h-4 w-4 mr-2" />{" "}
                {isUnassigning
                  ? "Procesando..."
                  : `Desasignar (${selectedOrders.length})`}
              </Button>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">
              No hay pedidos asignados a este camión.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const customer = customersData[order.customerId];
                const location =
                  customer?.locations?.find(
                    (l: any) => l.id === order.locationId,
                  ) || customer?.locations?.[0];
                const isSelected = selectedOrders.includes(order.id);
                const isDelivered = order.status === "DELIVERED";

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col md:flex-row items-center justify-between bg-slate-50 border ${isSelected ? "border-blue-400 ring-1" : "border-slate-100"} p-4 rounded-2xl gap-4 hover:border-blue-200 transition-all`}
                  >
                    <div className="flex-1 w-full flex items-center gap-4">
                      {!isDelivered && (
                        <button
                          onClick={() => toggleOrderSelection(order.id)}
                          className={`h-6 w-6 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 bg-white"}`}
                        >
                          {isSelected && <CheckSquare className="h-4 w-4" />}
                        </button>
                      )}
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isDelivered ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}
                      >
                        {isDelivered ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Package className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">
                          {customer?.name || "Cliente Desconocido"}
                        </h4>
                        <p className="text-xs font-bold text-slate-500">
                          {location?.address || "Dirección no registrada"}
                        </p>
                      </div>
                    </div>
                    <div className="hidden md:block text-xs font-bold text-slate-400 max-w-[200px] truncate">
                      {order.items
                        .map(
                          (i: any) =>
                            `${i.quantity}x ${getProductName(i.productId)}`,
                        )
                        .join(", ")}
                    </div>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-end sm:items-center justify-end shrink-0 gap-3">
                      {order.guideDocumentId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                            {order.guideDocumentId}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold border-slate-300"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Descargar
                          </Button>
                        </div>
                      ) : order.guideRequested ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                          <Clock className="h-3.5 w-3.5 animate-spin" />{" "}
                          SUNAT...
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2.5 py-1 rounded-md tracking-wider">
                          Sin Guía
                        </span>
                      )}
                      {!isDelivered && (
                        <Button
                          size="sm"
                          asChild
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-9 px-4 rounded-xl shadow-md"
                        >
                          <Link
                            href={`/sales/new?orderId=${order.id}&manifestId=${manifest.id}&customerId=${order.customerId}`}
                          >
                            <Store className="mr-1.5 h-4 w-4" /> Registrar
                            Entrega
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={saleModalOpen} onOpenChange={setSaleModalOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <Store className="h-6 w-6 text-emerald-500" />
                <h3 className="font-black text-lg text-slate-800">
                  Confirmar Entrega Rápida
                </h3>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-700 uppercase">
                  Método de Pago
                </Label>
                <select
                  value={paymentData.method}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, method: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl border font-bold bg-white focus:outline-none"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="DIGITAL">Digital (Yape/Plin)</option>
                  <option value="CREDIT">Crédito</option>
                </select>
                {paymentData.method !== "CREDIT" && (
                  <div>
                    <Label className="text-xs font-black text-slate-700 uppercase mt-2">
                      Monto
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        S/
                      </span>
                      <Input
                        type="number"
                        value={
                          paymentData.method === "CASH"
                            ? paymentData.cash
                            : paymentData.digital
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPaymentData({
                            ...paymentData,
                            cash: paymentData.method === "CASH" ? val : 0,
                            digital: paymentData.method === "DIGITAL" ? val : 0,
                          });
                        }}
                        className="pl-8 h-11 font-black text-lg bg-emerald-50 border-emerald-200 text-emerald-800 focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              <Button
                disabled={isPending}
                onClick={handleConfirmSale}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base mt-4 rounded-xl shadow-lg"
              >
                {isPending ? "Procesando..." : "Confirmar Venta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </APIProvider>
  );
}
