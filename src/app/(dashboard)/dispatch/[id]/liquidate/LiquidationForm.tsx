"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  liquidationManifestSchema,
  LiquidationManifestFormValues,
} from "@/core/validations/dispatchSchemas";
import { formatToPeruDatetimeLocal, formatPeruDateTime } from "@/core/utils/dateUtils";
import { liquidateDispatchAction } from "../../actions";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Save,
  Trash2,
  Plus,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
  Package,
  X,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShrinkageReason } from "@/core/entities/SystemSettings";
import { Switch } from "@/components/ui/switch";

interface LiquidationFormProps {
  manifest: any;
  products: Product[];
  sales: any[];
  wasteReasons: ShrinkageReason[];
}

export function LiquidationForm({
  manifest,
  products,
  sales,
  wasteReasons,
}: LiquidationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtramos solo los Pit Stops que tienen rendición o vacíos para el historial rápido
  const pitStopsHistory = useMemo(() => {
    return (manifest.pitStopsHistory || []).filter(
      (p: any) =>
        (p.cashHandover || 0) > 0 || (p.returnedEmpties || []).length > 0,
    );
  }, [manifest.pitStopsHistory]);

  // 1. MAPA DE VENTAS POR LOTE (Para cálculo estricto de cuadre)
  const salesItemsMap = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((sale: any) => {
      (sale.items || []).forEach((item: any) => {
        const key = `${item.productId}_${item.lotNumber}`;
        if (!map[key]) map[key] = 0;
        map[key] += item.quantity;
      });
    });
    return map;
  }, [sales]);

  // 2. SUGERENCIAS AUTOMÁTICAS: Consolidamos lo cargado vs lo vendido en boletas
  const suggestedItems = useMemo(() => {
    const loadedItems = manifest.items || [];

    return loadedItems.map((loaded: any) => {
      const key = `${loaded.productId}_${loaded.lotNumber}`;
      const sold = salesItemsMap[key] || 0;
      const returnedFull = Math.max(0, loaded.quantityLoaded - sold);

      return {
        productId: loaded.productId,
        lotNumber: loaded.lotNumber,
        quantityLoaded: loaded.quantityLoaded,
        quantityReturnedFull: returnedFull,
        waste: [], // Inicialmente vacío
      };
    });
  }, [manifest.items, salesItemsMap]);

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

    const result = Object.keys(emptiesCount)
      .filter((id) => emptiesCount[id] > 0)
      .map((productId) => ({
        productId,
        quantityReturned: emptiesCount[productId],
      }));

    return result.length > 0 ? result : [];
  }, [sales, manifest.returnedEmpties]);

  const nowPeru = useMemo(() => formatToPeruDatetimeLocal(new Date()), []);
  const minDatePeru = useMemo(
    () => formatToPeruDatetimeLocal(new Date(manifest.dispatchDate)),
    [manifest.dispatchDate],
  );

  const form = useForm<LiquidationManifestFormValues>({
    resolver: zodResolver(liquidationManifestSchema) as any,
    defaultValues: {
      liquidationDate: nowPeru,
      items: suggestedItems,
      returnedEmpties: suggestedEmpties,
      cashReported: 0,
      digitalPaymentsReported: 0,
      notes: "",
    },
  });

  const {
    fields: itemFields,
  } = useFieldArray({ control: form.control, name: "items" });

  const {
    fields: emptyFields,
    append: appendEmpty,
    remove: removeEmpty,
  } = useFieldArray({ control: form.control, name: "returnedEmpties" });

  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "Producto desconocido";
  
  const onSubmit = async (values: LiquidationManifestFormValues) => {
    // Limpieza de datos antes de enviar
    const cleanedValues = {
      ...values,
      returnedEmpties: values.returnedEmpties.filter(
        (e) => e.productId !== "" && e.quantityReturned > 0,
      ),
      items: values.items.map(item => ({
        ...item,
        waste: item.waste.filter(w => w.quantity > 0 && w.reasonId !== "")
      }))
    };

    setIsSubmitting(true);
    try {
      const result = await liquidateDispatchAction(manifest.id, cleanedValues);
      if (result.success) {
        toast.success("Ruta liquidada correctamente");
        router.push("/dispatch");
        router.refresh();
      } else {
        toast.error(result.error || "Error al liquidar");
      }
    } catch (error: any) {
      toast.error("Error crítico: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. RESUMEN DE PIT STOPS (AUDITORÍA RÁPIDA) */}
      {pitStopsHistory.length > 0 && (
        <div className="space-y-4">
          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
            <h3 className="text-sm font-black tracking-widest text-orange-800 uppercase flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-orange-500" /> Paradas Previas
              Registradas Hoy ({pitStopsHistory.length})
            </h3>
            <div className="space-y-3">
              {pitStopsHistory.map((pit: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white p-3 rounded-xl border border-orange-100 text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {formatPeruDateTime(pit.createdAt)}
                  </div>
                  <div className="flex gap-4">
                    <span className="text-emerald-600 font-bold">
                      Rindió: S/ {pit.cashHandover || 0}
                    </span>
                    <span className="text-blue-600 font-bold">
                      Bajó Vacíos:{" "}
                      {pit.returnedEmpties?.reduce(
                        (s: number, e: any) => s + (e.quantity || e.quantityReturned || 0),
                        0,
                      ) || 0}
                      u.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. FORMULARIO PRINCIPAL */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* SECCIÓN A: CUADRE DE PRODUCTOS (LLENOS Y MERMAS) */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                Cuadre de Carga
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Indica qué productos regresan llenos y detalla las mermas (con motivo).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 lg:-mx-8">
            <Table className="w-full">
              <TableHeader className="bg-slate-50 border-y border-slate-100">
                <TableRow>
                  <TableHead className="pl-8 font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                    Producto y Lote
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                    Cargado
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-400 uppercase text-[10px] tracking-widest bg-blue-50/50">
                    Retorna Lleno
                  </TableHead>
                  <TableHead className="text-left font-bold text-slate-400 uppercase text-[10px] tracking-widest bg-red-50/50 min-w-[350px]">
                    Detalle de Mermas / Faltantes
                  </TableHead>
                  <TableHead className="pr-8 text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                    Vendido (Calc)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemFields.map((field, index) => (
                  <ItemRow 
                    key={field.id}
                    index={index}
                    form={form}
                    getProductName={getProductName}
                    wasteReasons={wasteReasons}
                    salesItemsMap={salesItemsMap}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* SECCIÓN B: RETORNO DE VACÍOS (ADICIONALES A PIT STOPS) */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Retorno de Vacíos
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Envases recolectados en ruta (se sugiere lo vendido hoy).
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendEmpty({ productId: "", quantityReturned: 0 })}
              className="rounded-xl border-slate-200 text-slate-600 font-bold"
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar Item
            </Button>
          </div>

          <div className="space-y-3">
            {emptyFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100"
              >
                <div className="flex-1">
                  <select
                    {...form.register(`returnedEmpties.${index}.productId`)}
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                  >
                    <option value="">Seleccionar Producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    placeholder="Cant."
                    {...form.register(`returnedEmpties.${index}.quantityReturned`, {
                      valueAsNumber: true,
                    })}
                    className="h-11 bg-white border-slate-200 rounded-xl font-black text-center"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeEmpty(index)}
                  className="h-11 w-11 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}

            {emptyFields.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-[2rem]">
                <p className="text-sm text-slate-400 font-medium">
                  No hay vacíos registrados. Haz clic en "Agregar Item".
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN C: CUADRE DE CAJA */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Save className="h-40 w-40 text-white" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <Save className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black text-white">Cuadre de Caja</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                  <Label className="text-white/40 font-black uppercase text-[10px] tracking-widest mb-2 block">
                    Efectivo en Sobre
                  </Label>
                  <div className="flex items-center">
                    <span className="text-white/40 font-black mr-2">S/</span>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("cashReported", { valueAsNumber: true })}
                      className="bg-transparent border-none text-2xl font-black text-white p-0 focus:ring-0"
                    />
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                  <Label className="text-white/40 font-black uppercase text-[10px] tracking-widest mb-2 block">
                    Digital (Yape/Transf)
                  </Label>
                  <div className="flex items-center">
                    <span className="text-white/40 font-black mr-2">S/</span>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("digitalPaymentsReported", {
                        valueAsNumber: true,
                      })}
                      className="bg-transparent border-none text-2xl font-black text-white p-0 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4">
                <Info className="h-6 w-6 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-200/80 font-medium leading-relaxed">
                  Verifica que los montos declarados coincidan con el dinero
                  físico recolectado. Esta acción es irreversible y afectará el
                  Kardex de planta.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-white/40 text-sm font-bold px-2">
                  <span>Ventas Esperadas:</span>
                  <span className="text-white font-black">
                    S/{" "}
                    {(manifest.cashExpected + manifest.digitalPaymentsExpected).toFixed(
                      2,
                    )}
                  </span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between items-center px-2">
                  <span className="text-white/60 font-black uppercase text-xs tracking-widest">
                    Total Declarado:
                  </span>
                  <span className="text-3xl font-black text-emerald-400">
                    S/{" "}
                    {(
                      (form.watch("cashReported") || 0) +
                      (form.watch("digitalPaymentsReported") || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">
              Fecha y hora de cierre
            </Label>
            <Input
              {...form.register("liquidationDate")}
              type="datetime-local"
              min={minDatePeru}
              max={nowPeru}
              className="h-11 border-slate-200"
            />
            <p className="text-xs text-slate-500 mt-1">
              Cierre seleccionado: <span className="font-semibold">{(() => {
                const val = form.watch("liquidationDate");
                if (!val) return "-";
                // Reformateo simple de YYYY-MM-DDTHH:mm a DD/MM/YYYY HH:mm
                const [date, time] = val.split("T");
                if (!date || !time) return "-";
                const [y, m, d] = date.split("-");
                return `${d}/${m}/${y} ${time}`;
              })()}</span>
            </p>
            {form.formState.errors.liquidationDate && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.liquidationDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-slate-700">
              Observaciones Finales (Opcional)
            </Label>
            <Input
              {...form.register("notes")}
              placeholder="Ej: Faltó cobrar en una bodega..."
              className="h-11 border-slate-200"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="h-12 px-8 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-all"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-200 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              "Procesando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Confirmar Liquidación
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTES PARA ORGANIZAR EL FORMULARIO
// =========================================================================

function ItemRow({ 
  index, 
  form, 
  getProductName, 
  wasteReasons,
  salesItemsMap
}: { 
  index: number; 
  form: UseFormReturn<LiquidationManifestFormValues>; 
  getProductName: (id: string) => string;
  wasteReasons: ShrinkageReason[];
  salesItemsMap: Record<string, number>;
}) {
  const item = form.watch(`items.${index}`);
  const qtyRet = form.watch(`items.${index}.quantityReturnedFull`) || 0;
  
  const waste = form.watch(`items.${index}.waste`) || [];
  const totalWaste = waste.reduce((sum, w) => sum + (w.quantity || 0), 0);
  
  const realSold = salesItemsMap[`${item.productId}_${item.lotNumber}`] || 0;
  const unreconciled = Math.max(0, item.quantityLoaded - realSold - qtyRet - totalWaste);
  const mathSold = item.quantityLoaded - qtyRet - totalWaste - unreconciled;

  return (
    <>
      <TableRow className="hover:bg-slate-50/30 align-top">
        <TableCell className="pl-8 py-4">
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm">
              {getProductName(item.productId)}
            </span>
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 w-fit px-1.5 rounded uppercase mt-1">
              Lote: {item.lotNumber}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-center font-black text-slate-400 py-4">
          {item.quantityLoaded}
        </TableCell>
        <TableCell className="text-center bg-blue-50/20 py-4">
          <Input
            type="number"
            {...form.register(`items.${index}.quantityReturnedFull`, {
              valueAsNumber: true,
            })}
            className="w-20 mx-auto h-9 text-center font-black border-blue-100 focus:ring-blue-100 bg-white"
          />
        </TableCell>
        <TableCell className="text-left bg-red-50/10 py-4">
          <WasteLinesInput 
            itemIndex={index} 
            form={form} 
            wasteReasons={wasteReasons} 
          />
        </TableCell>
        <TableCell className="pr-8 text-right py-4">
          <div className="flex flex-col items-end gap-1">
            <Badge
              className={`font-black ${
                mathSold < 0
                  ? "bg-red-500 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {mathSold} vendidos
            </Badge>
            <span className="text-[9px] font-bold text-slate-400">
              Venta Real: {realSold}
            </span>
          </div>
        </TableCell>
      </TableRow>
      {unreconciled > 0 && (
        <TableRow className="bg-orange-50/50">
          <TableCell colSpan={5} className="py-2 px-8">
            <div className="flex items-center gap-2 text-orange-600 text-xs font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Faltan {unreconciled} unidades sin justificar. El sistema las registrará como pérdida si no se clasifican como merma o retorno.
              </span>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function WasteLinesInput({ 
  itemIndex, 
  form, 
  wasteReasons 
}: { 
  itemIndex: number; 
  form: UseFormReturn<LiquidationManifestFormValues>;
  wasteReasons: ShrinkageReason[];
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `items.${itemIndex}.waste` as any,
  });

  const handleAddWaste = () => {
    append({ quantity: 0, reasonId: "", isRecyclable: false });
  };

  const handleReasonChange = (wIndex: number, reasonId: string) => {
    const reason = wasteReasons.find(r => r.id === reasonId);
    if (reason) {
      form.setValue(`items.${itemIndex}.waste.${wIndex}.isRecyclable` as any, reason.isRecyclableDefault);
    }
  };

  return (
    <div className="space-y-2">
      {fields.map((field, wIndex) => (
        <div key={field.id} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-red-100/50">
          <div className="flex-1">
            <select
              {...form.register(`items.${itemIndex}.waste.${wIndex}.reasonId` as any)}
              onChange={(e) => handleReasonChange(wIndex, e.target.value)}
              className="w-full h-8 bg-white border border-slate-200 rounded-md px-2 text-[11px] font-bold outline-none"
            >
              <option value="">Motivo...</option>
              {wasteReasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-16">
            <Input
              type="number"
              placeholder="Cant."
              {...form.register(`items.${itemIndex}.waste.${wIndex}.quantity` as any, { valueAsNumber: true })}
              className="h-8 bg-white border-slate-200 rounded-md font-black text-center text-xs"
            />
          </div>
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase">Recic.</span>
            <Switch 
              checked={form.watch(`items.${itemIndex}.waste.${wIndex}.isRecyclable` as any)}
              onCheckedChange={(val) => form.setValue(`items.${itemIndex}.waste.${wIndex}.isRecyclable` as any, val)}
              className="scale-75"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => remove(wIndex)}
            className="h-8 w-8 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAddWaste}
        className="text-[10px] font-bold text-red-500 hover:bg-red-50 h-7 rounded-md"
      >
        <Plus className="h-3 w-3 mr-1" /> Agregar merma
      </Button>
    </div>
  );
}
