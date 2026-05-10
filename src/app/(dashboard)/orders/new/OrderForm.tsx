"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderSchema, OrderFormValues } from "@/core/validations/orderSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitOrderAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Plus,
  Trash2,
  User,
  Wallet,
  Calculator,
  MapPin,
  Package,
  RotateCcw,
  Wrench,
  AlertTriangle,
  Phone,
  Info,
} from "lucide-react";
import { Customer } from "@/core/entities/Customer";

interface OrderFormProps {
  customers: Customer[];
  products: any[];
}

export function OrderForm({ customers, products }: OrderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: {
      customerId: "",
      locationId: "",
      type: "PLANT_SALE",
      status: "DELIVERED",
      items: [
        {
          productId: "",
          productName: "",
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
          isReplacement: false,
        },
      ],
      returnedDrums: {},
      loanedAccessories: {},
      totalAmount: 0,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      amountPaid: 0,
      scheduledDate: new Date().toISOString().split("T")[0],
    } as any,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchType = form.watch("type");
  const watchCustomerId = form.watch("customerId");
  const watchLocationId = form.watch("locationId");
  const watchItems = form.watch("items");
  const paymentStatus = form.watch("paymentStatus");

  // Estados derivados para simplificación de UI
  const isReservation = watchType === "PRE_ORDER";
  const isDirectSale = watchType === "PLANT_SALE" || watchType === "ROUTE_SALE";
  const selectedCustomer = customers.find((c) => c.id === watchCustomerId);
  const selectedLocation = selectedCustomer?.locations.find(
    (l) => l.id === watchLocationId,
  );

  useEffect(() => {
    let newTotal = 0;
    watchItems.forEach((item, index) => {
      const sub = item.isReplacement
        ? 0
        : (item.quantity || 0) * (item.unitPrice || 0);
      if (item.subtotal !== sub) form.setValue(`items.${index}.subtotal`, sub);
      newTotal += sub;
    });

    if (form.getValues("totalAmount") !== newTotal) {
      form.setValue("totalAmount", newTotal);
      if (paymentStatus === "PAID") form.setValue("amountPaid", newTotal);
    }
  }, [watchItems, paymentStatus, form]);

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product && selectedCustomer) {
      const finalPrice =
        selectedCustomer.customPrices?.[productId] ?? product.basePrice;
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.unitPrice`, finalPrice);
    }
  };

  const onSubmit = async (values: OrderFormValues) => {
    // Validación de Stock para Ventas Directas
    if (isDirectSale) {
      for (const item of values.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product && item.quantity > product.stockFilled) {
          toast.error(`Stock insuficiente para ${product.name}`, {
            description: `Disponible: ${product.stockFilled} unidades.`,
          });
          return;
        }
      }
    }

    setIsLoading(true);
    const result = await submitOrderAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success(isReservation ? "Reserva guardada" : "Venta realizada");
      router.push("/orders");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-6xl mx-auto mb-10">
      <div
        className={`p-6 text-white flex items-center gap-3 ${isReservation ? "bg-amber-600" : "bg-slate-900"}`}
      >
        <ShoppingCart className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-black">
            {isReservation
              ? "Registro de Reserva (Preventa)"
              : "Venta Directa / POS"}
          </h2>
          <p className="text-white/70 text-sm">
            Gestión de operaciones Moalv S.a.C.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* SECCIÓN 1: CLIENTE Y CANAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2">
              Canal de Operación
            </Label>
            <select
              {...form.register("type")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 outline-none font-bold"
            >
              <option value="PLANT_SALE">Venta en Planta (Stock Real)</option>
              <option value="ROUTE_SALE">Venta en Ruta (Stock Real)</option>
              <option value="PRE_ORDER">Reserva Telefónica (Preventa)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-blue-600" /> Cliente
            </Label>
            <select
              {...form.register("customerId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 outline-none font-bold"
            >
              <option value="">Seleccione...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4 text-red-500" /> Punto de Entrega
            </Label>
            <select
              {...form.register("locationId")}
              disabled={!watchCustomerId}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 outline-none"
            >
              <option value="">Ubicación...</option>
              {selectedCustomer?.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} - {loc.address}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECCIÓN 2: PRODUCTOS Y STOCK */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-bold text-lg">Productos</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productId: "",
                  productName: "",
                  quantity: 1,
                  unitPrice: 0,
                  subtotal: 0,
                  isReplacement: false,
                })
              }
              className="gap-2 font-bold text-blue-700"
            >
              <Plus className="h-4 w-4" /> Añadir
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const product = products.find(
                (p) => p.id === watchItems[index]?.productId,
              );
              const isOverStock =
                isDirectSale &&
                product &&
                watchItems[index]?.quantity > product.stockFilled;

              return (
                <div
                  key={field.id}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-2xl border transition-all ${isOverStock ? "border-red-300 bg-red-50" : "bg-white border-slate-100"}`}
                >
                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">
                      Producto
                    </Label>
                    <select
                      {...form.register(`items.${index}.productId` as const)}
                      onChange={(e) =>
                        handleProductSelect(index, e.target.value)
                      }
                      className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm font-bold"
                    >
                      <option value="">Seleccionar...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stockFilled})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">
                      Cantidad
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`items.${index}.quantity` as const, {
                        valueAsNumber: true,
                      })}
                      className={`h-10 font-bold text-center ${isOverStock ? "border-red-500 text-red-700" : ""}`}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">
                      P. Unit.
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`items.${index}.unitPrice` as const, {
                        valueAsNumber: true,
                      })}
                      className="h-10 font-bold text-right"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col items-center justify-center">
                    {!isReservation && (
                      <>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          ¿Garantía?
                        </Label>
                        <Checkbox
                          checked={watchItems[index]?.isReplacement}
                          onCheckedChange={(c) =>
                            form.setValue(`items.${index}.isReplacement`, !!c)
                          }
                        />
                      </>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between gap-2">
                    <div className="text-right flex-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">
                        Subtotal
                      </Label>
                      <p className="font-black">
                        S/ {(watchItems[index]?.subtotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-slate-300 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isOverStock && (
                    <div className="md:col-span-12 text-[10px] font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Solo hay{" "}
                      {product.stockFilled} unidades disponibles para venta
                      inmediata.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN 3: SIMPLIFICACIÓN - Solo mostrar si NO es reserva */}
        {!isReservation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                <RotateCcw className="h-4 w-4 text-blue-600" /> Retorno de
                Envases
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">
                  Bidones 20L recibidos
                </span>
                <Input
                  type="number"
                  className="w-20 h-9 text-center font-bold"
                />
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-orange-600" /> Préstamos
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">
                  Surtidores entregados
                </span>
                <Input
                  type="number"
                  className="w-20 h-9 text-center font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 4: FINANZAS SIMPLIFICADAS PARA RESERVA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
          <div className="space-y-4">
            <Label className="font-bold flex items-center gap-2 text-slate-700 text-lg">
              <Wallet className="h-5 w-5 text-slate-400" /> Pago
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <select
                {...form.register("paymentMethod")}
                className="h-11 px-3 rounded-md border font-bold"
              >
                <option value="CASH">Efectivo</option>
                <option value="YAPE">Yape / Plin</option>
                <option value="CREDIT">Crédito</option>
              </select>
              {!isReservation && (
                <select
                  {...form.register("paymentStatus")}
                  className="h-11 px-3 rounded-md border font-bold"
                >
                  <option value="PAID">Pagado</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              )}
            </div>
            {isReservation && (
              <div className="flex gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 text-xs font-medium">
                <Info className="h-4 w-4 shrink-0" /> Las reservas se registran
                sin pago adelantado por defecto.
              </div>
            )}
          </div>

          <div
            className={`p-8 rounded-3xl text-white flex flex-col justify-between shadow-2xl ${isReservation ? "bg-amber-700" : "bg-slate-900"}`}
          >
            <div>
              <p className="text-xs font-bold text-white/50 uppercase mb-2">
                Total a {isReservation ? "cobrar en entrega" : "pagar ahora"}
              </p>
              <p className="text-6xl font-black tracking-tighter">
                S/ {form.watch("totalAmount").toFixed(2)}
              </p>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full h-16 text-xl font-black mt-8 shadow-xl ${isReservation ? "bg-amber-500 hover:bg-amber-400 text-amber-950" : "bg-blue-600 hover:bg-blue-500"}`}
            >
              {isLoading
                ? "Procesando..."
                : isReservation
                  ? "Confirmar Reserva"
                  : "Confirmar Venta"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
