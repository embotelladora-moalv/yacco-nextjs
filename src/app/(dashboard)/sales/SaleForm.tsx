"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saleSchema, SaleFormValues } from "@/core/validations/crmSchemas";
import { registerSaleAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  User,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  Save,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory";

interface SaleFormProps {
  manifestId: string; // ID de la ruta/camión actual
  customers: Customer[]; // Lista de clientes para seleccionar
  products: Product[]; // Catálogo de productos
}

export function SaleForm({ manifestId, customers, products }: SaleFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      manifestId: manifestId,
      customerId: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      returnedEmpties: [],
      paymentMethod: "CASH",
      cashReceived: 0,
      digitalReceived: 0,
      notes: "",
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });
  const {
    fields: emptyFields,
    append: appendEmpty,
    remove: removeEmpty,
  } = useFieldArray({ control: form.control, name: "returnedEmpties" });

  // ---------------------------------------------------------
  // CÁLCULOS EN TIEMPO REAL (React Hook Form Watch)
  // ---------------------------------------------------------
  const watchItems = form.watch("items");
  const watchCash = form.watch("cashReceived") || 0;
  const watchDigital = form.watch("digitalReceived") || 0;
  const watchPaymentMethod = form.watch("paymentMethod");

  // Calcular el Total de la Venta
  const totalAmount = watchItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice || 0),
    0,
  );

  // Calcular Total Pagado y Deuda
  const totalPaid =
    watchPaymentMethod === "CREDIT"
      ? 0
      : Number(watchCash) + Number(watchDigital);
  const newDebt = Math.max(0, totalAmount - totalPaid);

  const onSubmit = async (values: SaleFormValues) => {
    setIsPending(true);

    // Limpiar arrays (quitar filas vacías si el usuario las dejó a medias)
    const cleanedValues = {
      ...values,
      items: values.items.filter((i) => i.productId && i.quantity > 0),
      returnedEmpties: values.returnedEmpties.filter(
        (e) => e.productId && e.quantity > 0,
      ),
    };

    if (cleanedValues.items.length === 0) {
      toast.error("Error", {
        description: "La venta debe tener al menos un producto.",
      });
      setIsPending(false);
      return;
    }

    const result = await registerSaleAction(cleanedValues);
    setIsPending(false);

    if (result.success) {
      toast.success("Venta registrada exitosamente");
      router.refresh();
      // Opcional: router.push(`/dispatch/${manifestId}`) para volver al manifiesto
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  // Helper para autocompletar el precio cuando eligen un producto
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      // Asumimos un precio base, en una app real podría venir de una lista de precios
      form.setValue(`items.${index}.unitPrice`, 10); // Precio default sugerido
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
        <ShoppingCart className="h-8 w-8 text-emerald-400" />
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Registrar Venta
          </h2>
          <p className="text-slate-300 font-medium text-sm mt-0.5">
            Manifiesto: {manifestId.substring(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
        {/* SECCIÓN 1: CLIENTE */}
        <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" /> 1. Seleccionar Cliente *
          </Label>
          <select
            {...form.register("customerId")}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
          >
            <option value="">Seleccione un cliente de la ruta...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.alias ? `(${c.alias})` : ""}
              </option>
            ))}
          </select>
          {form.formState.errors.customerId && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.customerId.message}
            </p>
          )}
        </div>

        {/* SECCIÓN 2: PRODUCTOS ENTREGADOS (LLENOS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" /> 2. Productos
              Entregados
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                appendItem({ productId: "", quantity: 1, unitPrice: 0 })
              }
              className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-3 w-3 mr-1" /> Añadir Producto
            </Button>
          </div>

          <div className="space-y-3">
            {itemFields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start">
                <div className="flex-1">
                  <select
                    {...form.register(`items.${index}.productId`)}
                    onChange={(e) => {
                      form.register(`items.${index}.productId`).onChange(e);
                      handleProductSelect(index, e.target.value);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                  >
                    <option value="">Seleccionar Producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <Input
                    {...form.register(`items.${index}.quantity`)}
                    type="number"
                    min="1"
                    placeholder="Cant."
                    className="h-10 text-center font-bold"
                  />
                </div>
                <div className="w-32 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    S/
                  </span>
                  <Input
                    {...form.register(`items.${index}.unitPrice`)}
                    type="number"
                    step="0.10"
                    min="0"
                    className="h-10 pl-8 font-bold text-right"
                  />
                </div>
                <div className="w-24 flex items-center justify-end h-10 px-2 font-black text-slate-800">
                  S/{" "}
                  {(
                    Number(watchItems[index]?.quantity || 0) *
                    Number(watchItems[index]?.unitPrice || 0)
                  ).toFixed(2)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="h-10 w-10 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {form.formState.errors.items &&
            !Array.isArray(form.formState.errors.items) && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.items.message}
              </p>
            )}
        </div>

        {/* SECCIÓN 3: ENVASES DEVUELTOS */}
        <div className="space-y-4 bg-orange-50/50 p-5 rounded-2xl border border-orange-100">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-black text-orange-800 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> 3. Retorno de Envases Vacíos
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => appendEmpty({ productId: "", quantity: 1 })}
              className="h-7 text-xs text-orange-700 hover:bg-orange-100"
            >
              <Plus className="h-3 w-3 mr-1" /> Añadir Vacío
            </Button>
          </div>

          <div className="space-y-2">
            {emptyFields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <select
                  {...form.register(`returnedEmpties.${index}.productId`)}
                  className="flex-1 h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm"
                >
                  <option value="">¿Qué envase devolvió?</option>
                  {products
                    .filter((p) => p.isReturnableContainer)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <Input
                  {...form.register(`returnedEmpties.${index}.quantity`)}
                  type="number"
                  min="1"
                  placeholder="Cant."
                  className="w-24 h-10 text-center border-orange-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmpty(index)}
                  className="h-10 w-10 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {emptyFields.length === 0 && (
              <p className="text-xs text-orange-600/70 italic font-medium">
                El cliente no devolvió envases en esta venta (Generará deuda de
                envases).
              </p>
            )}
          </div>
        </div>

        {/* SECCIÓN 4: PAGOS Y TOTALES */}
        <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-500" /> 4. Método de Pago
            </Label>
            <select
              {...form.register("paymentMethod")}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 font-bold"
            >
              <option value="CASH">Efectivo</option>
              <option value="DIGITAL">Digital (Yape/Plin/Transferencia)</option>
              <option value="MIXED">Mixto (Efectivo + Digital)</option>
              <option value="CREDIT">Crédito (Añadir a Deuda)</option>
            </select>

            {watchPaymentMethod !== "CREDIT" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div
                  className={`space-y-2 ${watchPaymentMethod === "DIGITAL" ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Banknote className="h-3 w-3" /> Efectivo
                  </Label>
                  <Input
                    {...form.register("cashReceived")}
                    type="number"
                    step="0.10"
                    min="0"
                    className="h-11 font-bold bg-green-50 border-green-200 text-green-800"
                  />
                  {form.formState.errors.cashReceived && (
                    <p className="text-[10px] text-red-500 font-bold">
                      {form.formState.errors.cashReceived.message}
                    </p>
                  )}
                </div>
                <div
                  className={`space-y-2 ${watchPaymentMethod === "CASH" ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Digital
                  </Label>
                  <Input
                    {...form.register("digitalReceived")}
                    type="number"
                    step="0.10"
                    min="0"
                    className="h-11 font-bold bg-blue-50 border-blue-200 text-blue-800"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium text-sm">
                  Total Venta
                </span>
                <span className="text-xl font-bold">
                  S/ {totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium text-sm">
                  Total Pagado
                </span>
                <span className="text-emerald-400 font-bold text-lg">
                  - S/ {totalPaid.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4">
              <span className="font-black text-slate-300 uppercase tracking-widest text-xs">
                Deuda Generada
              </span>
              <span
                className={`text-3xl font-black ${newDebt > 0 ? "text-red-400" : "text-white"}`}
              >
                S/ {newDebt.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="pt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 shadow-lg shadow-blue-600/20 rounded-xl h-12"
          >
            {isPending ? (
              "Procesando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Confirmar Venta
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
