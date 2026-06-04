"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  advancedPitStopSchema,
  AdvancedPitStopFormValues,
} from "@/core/validations/dispatchSchemas";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  Users,
  Package,
  Trash2,
  Plus,
  Save,
  ChevronLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  AlertTriangle,
  Info,
  Clock,
  History,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { advancedReloadDispatchAction } from "../../actions";

interface Props {
  manifest: any;
  products: Product[];
  users: { id: string; name: string; role: string }[];
  sales: any[];
}

export function PitStopClient({ manifest, products, users, sales }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const TRUCK_CAPACITY = 120;

  const initialPettyCash = Number(manifest.initialPettyCash) || 0;
  const accumulatedAdditionalCash = Number(manifest.additionalPettyCash) || 0;
  const totalCashFromSales = sales
    .filter((s) => s.paymentMethod === "CASH" || s.paymentMethod === "MIXED")
    .reduce((sum, s) => sum + (Number(s.cashReceived) || 0), 0);
  const cashAlreadyHandedOver = Number(manifest.cashAdvances) || 0;
  const expectedCashOnHand =
    initialPettyCash +
    accumulatedAdditionalCash +
    totalCashFromSales -
    cashAlreadyHandedOver;

  const safeItems = manifest.items || [];
  const fullsOnBoard = safeItems.reduce((acc: any, item: any) => {
    if (!acc[item.productId]) {
      acc[item.productId] = {
        total: 0,
        product: products.find((p) => p.id === item.productId),
      };
    }
    acc[item.productId].total +=
      (item.quantityLoaded || 0) -
      (item.quantityReturnedFull || 0) -
      (item.wasteQuantity || 0);
    return acc;
  }, {});

  sales.forEach((sale) => {
    (sale.items || []).forEach((item: any) => {
      if (item.itemSaleType !== "BOTTLE" && fullsOnBoard[item.productId]) {
        fullsOnBoard[item.productId].total -= item.quantity;
      }
    });
  });

  const activeFulls = Object.values(fullsOnBoard).filter(
    (g: any) => g.total > 0,
  );
  const currentStockOnBoard = activeFulls.reduce(
    (sum: number, g: any) => sum + g.total,
    0,
  );

  const totalHistoricalEmptiesCollected = useMemo(() => {
    return sales.reduce(
      (sum, sale) =>
        sum +
        (sale.returnedEmpties || []).reduce(
          (acc: number, e: any) => acc + (e.quantity || 0),
          0,
        ),
      0,
    );
  }, [sales]);

  const alreadyHandedOverEmpties = useMemo(() => {
    return (manifest.returnedEmpties || []).reduce(
      (sum: number, e: any) => sum + (e.quantityReturned || e.quantity || 0),
      0,
    );
  }, [manifest.returnedEmpties]);

  const suggestedEmpties = useMemo(() => {
    const emptiesCount: Record<string, number> = {};
    sales.forEach((sale: any) => {
      (sale.returnedEmpties || []).forEach((e: any) => {
        if (!emptiesCount[e.productId]) emptiesCount[e.productId] = 0;
        emptiesCount[e.productId] += e.quantity || 0;
      });
    });
    (manifest.returnedEmpties || []).forEach((e: any) => {
      if (emptiesCount[e.productId] !== undefined) {
        emptiesCount[e.productId] -= e.quantityReturned || e.quantity || 0;
      }
    });
    return Object.keys(emptiesCount)
      .filter((id) => emptiesCount[id] > 0)
      .map((productId) => ({ productId, quantity: emptiesCount[productId] }));
  }, [sales, manifest.returnedEmpties]);

  const form = useForm<AdvancedPitStopFormValues>({
    resolver: zodResolver(advancedPitStopSchema) as any,
    defaultValues: {
      driverId: manifest.driverId || "",
      assistantId: manifest.assistantId || "",
      cashHandover: 0,
      additionalPettyCash: 0,
      returnedEmpties: suggestedEmpties,
      returnedFulls: [],
      newItems: [],
      notes: "",
    },
  });

  const {
    fields: emptyFields,
    append: appendEmpty,
    remove: removeEmpty,
  } = useFieldArray({ control: form.control, name: "returnedEmpties" });
  const {
    fields: fullFields,
    append: appendFull,
    remove: removeFull,
  } = useFieldArray({ control: form.control, name: "returnedFulls" });
  const {
    fields: newFields,
    append: appendNew,
    remove: removeNew,
  } = useFieldArray({ control: form.control, name: "newItems" });

  const watchDriverId = form.watch("driverId");
  const watchAssistantId = form.watch("assistantId");
  const watchNewItems = form.watch("newItems");
  const watchReturnedFulls = form.watch("returnedFulls");
  const watchCashHandover = form.watch("cashHandover");

  const projectedAdditions = watchNewItems.reduce(
    (sum, item) => sum + (Number(item.quantityRequested) || 0),
    0,
  );
  const projectedSubtractions = watchReturnedFulls.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
  const finalProjectedStock =
    currentStockOnBoard + projectedAdditions - projectedSubtractions;
  const isOverCapacity = finalProjectedStock > TRUCK_CAPACITY;
  const finalProjectedCash =
    expectedCashOnHand - (Number(watchCashHandover) || 0);

  const pitStopsHistory = manifest.pitStopsHistory || [];

  const onSubmit = async (values: AdvancedPitStopFormValues) => {
    setIsPending(true);
    for (const fullReturn of values.returnedFulls) {
      if (fullReturn.productId && fullReturn.quantity > 0) {
        const maxDisp = fullsOnBoard[fullReturn.productId]?.total || 0;
        if (fullReturn.quantity > maxDisp) {
          toast.error("Error de Inventario", {
            description: `Intentas devolver más ${products.find((p) => p.id === fullReturn.productId)?.name} de los que hay a bordo.`,
          });
          setIsPending(false);
          return;
        }
      }
    }

    const cleanValues = {
      ...values,
      returnedEmpties: values.returnedEmpties.filter(
        (i) => i.productId && i.quantity > 0,
      ),
      returnedFulls: values.returnedFulls.filter(
        (i) => i.productId && i.quantity > 0,
      ),
      newItems: values.newItems.filter(
        (i) => i.productId && i.quantityRequested > 0,
      ),
    };

    const result = await advancedReloadDispatchAction(manifest.id, cleanValues);
    setIsPending(false);

    if (result.success) {
      toast.success("Pit Stop registrado. KARDEX sincronizado.");
      router.push(`/dispatch/${manifest.id}`);
      router.refresh();
    } else toast.error("Error en Pit Stop", { description: result.error });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full hover:bg-slate-800 text-slate-300"
          >
            <Link href={`/dispatch/${manifest.id}`}>
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-orange-500" /> Pit Stop
              Avanzado
            </h2>
            <p className="text-slate-400 font-medium text-sm mt-1">
              Gestión de personal, efectivo e inventario a mitad de ruta.
            </p>
          </div>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-center">
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
            Camión
          </p>
          <p className="font-bold text-orange-400 text-lg">
            {manifest.truckPlate}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 px-8 pb-8 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Efectivo a Rendir
            </h4>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium">
                Debería tener:
              </p>
              <p className="text-2xl font-black text-white mt-1">
                S/ {expectedCashOnHand.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs font-medium">
                Proyección tras rendir:
              </p>
              <p className="text-lg font-bold text-emerald-300">
                S/ {Math.max(0, finalProjectedCash).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Package className="h-4 w-4" /> Capacidad (Llenos)
            </h4>
            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded font-bold">
              Máx: {TRUCK_CAPACITY} und.
            </span>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-slate-400 text-xs font-medium">
                Stock a bordo:
              </p>
              <p className="text-2xl font-black text-white mt-1">
                {currentStockOnBoard}{" "}
                <span className="text-sm font-medium text-slate-400">und.</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs font-medium">
                Proyección final:
              </p>
              <p
                className={`text-lg font-bold ${isOverCapacity ? "text-red-400" : "text-blue-300"}`}
              >
                {finalProjectedStock} und.
              </p>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, (currentStockOnBoard / TRUCK_CAPACITY) * 100)}%`,
              }}
            ></div>
            <div
              className={`h-full transition-all duration-500 ${isOverCapacity ? "bg-red-500" : "bg-emerald-400"}`}
              style={{
                width: `${Math.min(100, ((projectedAdditions - projectedSubtractions) / TRUCK_CAPACITY) * 100)}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 overflow-y-auto max-h-40">
          <h4 className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" /> Llenos Físicos a Bordo
          </h4>
          <div className="space-y-2">
            {activeFulls.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">
                El camión está vacío.
              </p>
            ) : (
              activeFulls.map((g: any) => (
                <div
                  key={g.product?.id}
                  className="flex justify-between items-center border-b border-slate-700/50 pb-1"
                >
                  <span className="text-xs font-bold text-slate-300">
                    {g.product?.name}
                  </span>
                  <span className="text-sm font-black text-orange-400">
                    {g.total} u.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="p-6 md:p-8 space-y-10"
      >
        {pitStopsHistory.length > 0 && (
          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
            <h3 className="text-sm font-black tracking-widest text-orange-800 uppercase flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-orange-500" /> Paradas Previas (
              {pitStopsHistory.length})
            </h3>
            <div className="space-y-3">
              {pitStopsHistory.map((pit: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white p-3 rounded-xl border border-orange-100 text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {/* 🔥 CORRECCIÓN FECHA Y HORA */}
                    {new Date(pit.createdAt).toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                  <div className="flex gap-4">
                    <span className="text-emerald-600 font-bold">
                      Rindió: S/ {pit.cashHandover || 0}
                    </span>
                    <span className="text-blue-600 font-bold">
                      Cargó: {pit.newItems?.length || 0} items
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
            <Users className="h-5 w-5 text-blue-600" /> 1. Tripulación y
            Efectivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="space-y-4 border-r border-slate-200 pr-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  Chofer Responsable *
                </Label>
                <select
                  {...form.register("driverId")}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 font-bold bg-white text-sm"
                >
                  <option value="">Seleccione Chofer</option>
                  {users.map((u) => (
                    <option
                      key={`d-${u.id}`}
                      value={u.id}
                      disabled={u.id === watchAssistantId}
                    >
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  Auxiliar / Pioneta
                </Label>
                <select
                  {...form.register("assistantId")}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 font-bold bg-white text-sm"
                >
                  <option value="">(Nadie) - Solo el Chofer</option>
                  {users.map((u) => (
                    <option
                      key={`a-${u.id}`}
                      value={u.id}
                      disabled={u.id === watchDriverId}
                    >
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4 pl-2">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownToLine className="h-4 w-4 text-emerald-500" />{" "}
                  Efectivo a Rendir
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    S/
                  </span>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    {...form.register("cashHandover")}
                    className="pl-8 h-12 font-black text-lg bg-emerald-50/50 border-emerald-200 text-emerald-800"
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpFromLine className="h-4 w-4 text-orange-500" /> Nueva
                  Caja Chica
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    S/
                  </span>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    {...form.register("additionalPettyCash")}
                    className="pl-8 h-11 font-black bg-orange-50/50 border-orange-200 text-orange-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600" /> 2. Descarga
            a Base (Retornos)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 border border-slate-200 shadow-inner p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                <div>
                  <Label className="font-black text-slate-800 text-xs uppercase tracking-wider">
                    Vacíos a Descargar
                  </Label>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    Recogió Hoy:{" "}
                    <span className="text-slate-600">
                      {totalHistoricalEmptiesCollected}u.
                    </span>{" "}
                    | Ya Entregó:{" "}
                    <span className="text-slate-600">
                      {alreadyHandedOverEmpties}u.
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => appendEmpty({ productId: "", quantity: 1 })}
                  className="h-7 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                {emptyFields.length === 0 && (
                  <p className="text-[11px] text-slate-500 font-medium text-center py-4 bg-white border rounded-xl">
                    Sin vacíos físicos a bordo para descargar.
                  </p>
                )}
                {emptyFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="flex gap-2 items-center bg-white p-2 rounded-xl border border-emerald-200 shadow-sm"
                  >
                    <select
                      {...form.register(
                        `returnedEmpties.${idx}.productId` as const,
                      )}
                      className="flex-1 h-10 px-2 rounded-lg border-none text-xs font-bold bg-slate-50 focus:outline-none"
                    >
                      <option value="">Seleccione Envase...</option>
                      {products
                        .filter((p) => p.isReturnableContainer)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      {...form.register(
                        `returnedEmpties.${idx}.quantity` as const,
                      )}
                      className="w-20 h-10 text-center font-black bg-emerald-50 text-emerald-700 border-none"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmpty(idx)}
                      className="h-10 w-10 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 shadow-inner p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <Label className="font-black text-slate-800 text-xs uppercase tracking-wider">
                  Llenos Devueltos (Mermas)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => appendFull({ productId: "", quantity: 1 })}
                  className="h-7 text-xs font-bold text-orange-700 hover:bg-orange-100"
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir
                </Button>
              </div>
              <div className="space-y-4 pt-2">
                {fullFields.length === 0 && (
                  <p className="text-xs text-slate-500 font-medium text-center py-4 bg-white border rounded-xl">
                    Sin devoluciones de llenos.
                  </p>
                )}
                {fullFields.map((field, idx) => {
                  const selectedProductId = form.watch(
                    `returnedFulls.${idx}.productId`,
                  );
                  const maxAvailable =
                    fullsOnBoard[selectedProductId]?.total || 0;
                  const isOverStock =
                    Number(form.watch(`returnedFulls.${idx}.quantity`)) >
                    maxAvailable;
                  return (
                    <div
                      key={field.id}
                      className={`flex gap-2 items-center p-2 rounded-xl border shadow-sm transition-all ${isOverStock ? "bg-red-50 border-red-300" : "bg-white border-slate-200"}`}
                    >
                      <select
                        {...form.register(
                          `returnedFulls.${idx}.productId` as const,
                        )}
                        className="flex-1 h-10 px-2 rounded-lg border-none text-xs font-bold bg-slate-50 focus:outline-none"
                      >
                        <option value="">Seleccione Producto...</option>
                        {activeFulls.map((g: any) => (
                          <option key={g.product.id} value={g.product.id}>
                            {g.product.name} (Disp: {g.total})
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <Input
                          type="number"
                          min="1"
                          max={selectedProductId ? maxAvailable : undefined}
                          {...form.register(
                            `returnedFulls.${idx}.quantity` as const,
                          )}
                          className={`w-20 h-10 text-center font-black bg-slate-50 border-none ${isOverStock ? "text-red-600" : ""}`}
                        />
                        {selectedProductId && (
                          <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] font-black text-orange-500">
                            Max: {maxAvailable}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFull(idx)}
                        className="h-10 w-10 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-blue-600" /> 3. Nueva
              Carga
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendNew({ productId: "", quantityRequested: 1 })}
              className="font-bold text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <Plus className="h-4 w-4 mr-1" /> Cargar Producto
            </Button>
          </div>
          <div className="space-y-3">
            {newFields.length === 0 && (
              <div className="p-8 text-center bg-slate-50 border-dashed border border-slate-200">
                <p className="text-sm font-bold text-slate-500">
                  No se están cargando nuevos productos.
                </p>
              </div>
            )}
            {newFields.map((field, idx) => (
              <div
                key={field.id}
                className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm"
              >
                <select
                  {...form.register(`newItems.${idx}.productId` as const)}
                  className="flex-1 h-12 px-3 rounded-xl border-none font-bold bg-slate-50 text-sm"
                >
                  <option value="">¿Qué producto sube?</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl">
                  <span className="text-xs font-black text-slate-500 pl-3 uppercase">
                    CANT:
                  </span>
                  <Input
                    type="number"
                    min="1"
                    {...form.register(
                      `newItems.${idx}.quantityRequested` as const,
                    )}
                    className="w-24 h-10 text-center font-black text-lg bg-white border-none shadow-sm text-blue-700"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeNew(idx)}
                  className="h-12 w-12 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-8">
          <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
            Notas de Auditoría
          </Label>
          <Input
            {...form.register("notes")}
            placeholder="Ej: Cambio de camión..."
            className="h-12 bg-slate-50 border-slate-200 font-medium"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500 h-14 px-8 rounded-xl w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-12 shadow-xl shadow-orange-500/20 rounded-xl h-14 text-lg w-full sm:w-auto"
          >
            {isPending ? (
              "Procesando..."
            ) : (
              <>
                <Save className="mr-2 h-6 w-6" /> Confirmar Pit Stop
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
