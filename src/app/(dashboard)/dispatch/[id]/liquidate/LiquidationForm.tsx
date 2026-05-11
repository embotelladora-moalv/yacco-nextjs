"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  liquidationManifestSchema,
  LiquidationManifestFormValues,
} from "@/core/validations/dispatchSchemas";
import { liquidateDispatchAction } from "../../actions";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Save,
  CheckCircle2,
  Package,
  DollarSign,
  ArrowDownToLine,
  ShoppingCart,
} from "lucide-react";

interface LiquidationFormProps {
  manifest: any;
  products: Product[];
  sales: any[];
}

export function LiquidationForm({
  manifest,
  products,
  sales,
}: LiquidationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const returnableProducts = products.filter((p) => p.isReturnableContainer);

  // =========================================================================
  // 1. INTELIGENCIA: CALCULAR SUGERENCIA DE LLENOS QUE REGRESAN
  // =========================================================================
  const suggestedItems = useMemo(() => {
    const soldByProduct = sales.reduce((acc: any, sale: any) => {
      (sale.items || []).forEach((item: any) => {
        if (!acc[item.productId]) acc[item.productId] = 0;
        acc[item.productId] += item.quantity || 0;
      });
      return acc;
    }, {});

    const remainingSold = { ...soldByProduct };

    return (manifest.items || []).map((item: any) => {
      let soldFromThisLot = 0;
      if (remainingSold[item.productId] > 0) {
        soldFromThisLot = Math.min(
          item.quantityLoaded,
          remainingSold[item.productId],
        );
        remainingSold[item.productId] -= soldFromThisLot;
      }

      const expectedReturn = item.quantityLoaded - soldFromThisLot;

      return {
        productId: item.productId,
        lotNumber: item.lotNumber || "GENERIC",
        quantityLoaded: item.quantityLoaded || 0,
        quantityReturnedFull: Math.max(0, expectedReturn),
        wasteQuantity: 0,
        _soldCalculated: soldFromThisLot,
      };
    });
  }, [manifest.items, sales]);

  // =========================================================================
  // 2. INTELIGENCIA: CALCULAR SUGERENCIA DE ENVASES VACÍOS
  // =========================================================================
  const suggestedEmpties = useMemo(() => {
    const emptiesCount: Record<string, number> = {};

    sales.forEach((sale: any) => {
      (sale.items || []).forEach((item: any) => {
        // Solo exigimos envase si el producto vendido está marcado como retornable
        const isReturnable = returnableProducts.some(
          (p) => p.id === item.productId,
        );
        if (isReturnable) {
          if (!emptiesCount[item.productId]) emptiesCount[item.productId] = 0;
          emptiesCount[item.productId] += item.quantity || 0;
        }
      });
    });

    const result = Object.keys(emptiesCount).map((productId) => ({
      productId,
      quantityReturned: emptiesCount[productId],
    }));

    // Si no vendió nada retornable, dejamos 1 fila vacía para que el UI se vea bien
    return result.length > 0
      ? result
      : [{ productId: "", quantityReturned: 0 }];
  }, [sales, returnableProducts]);

  // =========================================================================
  // INICIALIZACIÓN DEL FORMULARIO CON AMBAS SUGERENCIAS
  // =========================================================================
  const form = useForm<LiquidationManifestFormValues>({
    resolver: zodResolver(liquidationManifestSchema) as any,
    defaultValues: {
      items: suggestedItems,
      returnedEmpties: suggestedEmpties, // <-- AQUÍ SE PRECARGAN LOS VACÍOS ESPERADOS
      cashReported: 0,
      digitalPaymentsReported: 0,
      notes: "",
    },
  });

  const {
    fields: emptyFields,
    append: appendEmpty,
    remove: removeEmpty,
  } = useFieldArray({
    control: form.control,
    name: "returnedEmpties",
  });

  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "Producto desconocido";
  const getProductSku = (id: string) =>
    products.find((p) => p.id === id)?.sku || "SKU";

  const onSubmit = async (values: LiquidationManifestFormValues) => {
    const cleanedValues = {
      ...values,
      returnedEmpties: values.returnedEmpties.filter(
        (e) => e.productId !== "" && e.quantityReturned > 0,
      ),
    };

    setIsPending(true);
    const result = await liquidateDispatchAction(manifest.id, cleanedValues);
    setIsPending(false);

    if (result.success) {
      toast.success("Ruta liquidada exitosamente.");
      router.push(`/dispatch/${manifest.id}`);
      router.refresh();
    } else {
      toast.error("Error al liquidar", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-5xl mx-auto">
      <div className="bg-slate-900 p-8 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Liquidar Ruta: {manifest.manifestNumber}
            </h2>
            <p className="text-slate-300 font-medium text-sm mt-0.5">
              Placa: {manifest.truckPlate}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
        {/* SECCIÓN 1: RETORNO DE LLENOS */}
        <div className="space-y-4">
          <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2 border-b pb-2">
            <Package className="h-5 w-5 text-blue-600" /> 1. Cuadre de Llenos
            (Sugerido por sistema)
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Producto / Lote</th>
                  <th className="px-4 py-3 text-center">Llevó</th>
                  <th className="px-4 py-3 text-center text-emerald-600 bg-emerald-50">
                    <ShoppingCart className="inline h-4 w-4 mr-1" />
                    Vendido
                  </th>
                  <th className="px-4 py-3 text-center bg-blue-50 text-blue-700">
                    Regresa (Llenos)
                  </th>
                  <th className="px-4 py-3 text-center bg-red-50 text-red-700">
                    Merma (Rotos)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.getValues("items").map((item, index) => {
                  const suggested = suggestedItems[index];
                  return (
                    <tr
                      key={`${item.productId}-${item.lotNumber}`}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">
                          {getProductName(item.productId)}
                        </p>
                        <p className="text-xs font-black text-slate-400 uppercase">
                          {getProductSku(item.productId)} | Lote:{" "}
                          {item.lotNumber}
                        </p>
                        <input
                          type="hidden"
                          {...form.register(
                            `items.${index}.productId` as const,
                          )}
                        />
                        <input
                          type="hidden"
                          {...form.register(
                            `items.${index}.lotNumber` as const,
                          )}
                        />
                        <input
                          type="hidden"
                          {...form.register(
                            `items.${index}.quantityLoaded` as const,
                          )}
                        />
                      </td>
                      <td className="px-4 py-4 text-center font-black text-lg text-slate-700">
                        {item.quantityLoaded}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-lg text-emerald-600 bg-emerald-50/30">
                        {suggested._soldCalculated}
                      </td>
                      <td className="px-4 py-4 bg-blue-50/30">
                        <Input
                          {...form.register(
                            `items.${index}.quantityReturnedFull` as const,
                          )}
                          type="number"
                          min="0"
                          max={item.quantityLoaded}
                          className="w-24 mx-auto text-center font-black text-blue-700 border-blue-200"
                        />
                      </td>
                      <td className="px-4 py-4 bg-red-50/30">
                        <Input
                          {...form.register(
                            `items.${index}.wasteQuantity` as const,
                          )}
                          type="number"
                          min="0"
                          max={item.quantityLoaded}
                          className="w-24 mx-auto text-center font-black text-red-700 border-red-200"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN 2: RETORNO DE ENVASES VACÍOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-green-600" /> 2. Envases
              Vacíos Recolectados
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendEmpty({ productId: "", quantityReturned: 0 })
              }
              className="font-bold text-green-700 border-green-200 hover:bg-green-50"
            >
              Agregar Envase Adicional
            </Button>
          </div>

          <div className="grid gap-3">
            {emptyFields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row gap-4 items-center bg-green-50/50 p-4 rounded-xl border border-green-100"
              >
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs text-slate-500 font-bold">
                    Tipo de Envase (Producto)
                  </Label>
                  <select
                    {...form.register(
                      `returnedEmpties.${index}.productId` as const,
                    )}
                    className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium"
                  >
                    <option value="">-- Seleccione envase --</option>
                    {returnableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-32 space-y-1">
                  <Label className="text-xs text-slate-500 font-bold">
                    Cantidad
                  </Label>
                  <Input
                    {...form.register(
                      `returnedEmpties.${index}.quantityReturned` as const,
                    )}
                    type="number"
                    min="0"
                    className="h-11 font-black text-center text-green-700 border-green-200 bg-white"
                  />
                </div>
                {emptyFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeEmpty(index)}
                    className="mt-5 text-red-500 hover:bg-red-50"
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-green-600">
            * El sistema ha sugerido la cantidad de envases en base a las ventas
            registradas. Ajuste si hay diferencias.
          </p>
        </div>

        {/* SECCIÓN 3: CAJA Y FINANZAS */}
        <div className="space-y-4">
          <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2 border-b pb-2">
            <DollarSign className="h-5 w-5 text-orange-500" /> 3. Cuadre de Caja
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Efectivo Físico Entregado (S/)
              </Label>
              <Input
                {...form.register("cashReported")}
                type="number"
                step="0.10"
                min="0"
                className="h-14 text-2xl font-black text-green-700 bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Pagos Digitales (Yape/Plin/Transf.)
              </Label>
              <Input
                {...form.register("digitalPaymentsReported")}
                type="number"
                step="0.10"
                min="0"
                className="h-14 text-2xl font-black text-blue-700 bg-white border-slate-200"
              />
            </div>
          </div>
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

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-10"
          >
            {isPending ? (
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
