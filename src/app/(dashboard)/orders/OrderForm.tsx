"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderAction, updateOrderAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  User,
  MapPin,
  Package,
  CalendarClock,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory";
import { resolvePrice, ItemSaleType } from "@/core/use-cases/sales/resolvePrice";
import { OrderFormValues, orderSchema } from "@/core/validations/orderSchema";
import { PRICE_STEP } from "@/core/utils/priceConfig";

interface OrderFormProps {
  customers: Customer[];
  products: Product[];
  initialData?: any; // Añade esta línea
}

export function OrderForm({
  customers,
  products,
  initialData,
}: OrderFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  // Inicializamos la fecha sugerida como HOY
  const todayStr = new Date().toISOString().split("T")[0];

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: initialData || {
      customerId: "",
      locationId: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0, itemSaleType: "REFILL", description: "" }],
      expectedDeliveryDate: todayStr,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const getPrimaryLocation = (customer: any) => {
    const locs = customer?.locations || [];
    return locs.find((l: any) => l.isMain || l.isDefault) || locs[0] || null;
  };

  useEffect(() => {
    const currentCustId = form.getValues("customerId");
    const currentLocId = form.getValues("locationId");
    if (currentCustId && !currentLocId) {
      const customer = customers.find((c) => c.id === currentCustId);
      if (customer) {
        const primary = getPrimaryLocation(customer);
        if (primary) {
          form.setValue("locationId", primary.id, { shouldValidate: true });
        }
      }
    }
  }, [customers, form]);

  // Escuchar al cliente seleccionado para mostrar sus sedes
  const selectedCustomerId = form.watch("customerId");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const availableLocations = selectedCustomer?.locations || [];

  const onSubmit = async (values: OrderFormValues) => {
    setIsPending(true);

    // Limpiar productos con campos vacíos o cantidad cero
    const cleanedValues = {
      ...values,
      items: values.items.filter((i) => i.productId && i.quantity > 0),
    };

    if (cleanedValues.items.length === 0) {
      toast.error("Error", {
        description: "El pedido debe tener al menos un producto.",
      });
      setIsPending(false);
      return;
    }

    // --- LÓGICA DE DECISIÓN: EDITAR O CREAR ---
    const isEditing = !!initialData?.id;

    const result = isEditing
      ? await updateOrderAction(initialData.id, cleanedValues)
      : await createOrderAction(cleanedValues);

    setIsPending(false);

    if (result.success) {
      toast.success(
        isEditing
          ? "Pedido actualizado correctamente."
          : "Pedido reservado y listo para despacho.",
      );

      router.push("/orders");
      router.refresh();
    } else {
      toast.error("Error al procesar el pedido", { description: result.error });
    }
  };

  const handleItemUpdate = (
    index: number,
    productId: string,
    itemType: string,
    specificCustomerId?: string,
  ) => {
    const customerId = specificCustomerId || form.getValues("customerId");
    const customer = customers.find((c) => c.id === customerId);
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    const { price, description } = resolvePrice(
      customer?.customPrices,
      product as any,
      itemType as ItemSaleType,
    );

    form.setValue(`items.${index}.unitPrice`, price, { shouldValidate: true });
    form.setValue(`items.${index}.description`, description, { shouldValidate: true });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <PhoneCall className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">Tomar Pedido</h2>
          <p className="text-slate-300 font-medium text-sm mt-0.5">
            Registra la reserva para armar la ruta logística.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
        {/* SECCIÓN 1: CLIENTE Y SEDE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Cliente *
            </Label>
            <select
              {...form.register("customerId")}
              onChange={(e) => {
                const newCustomerId = e.target.value;
                form.setValue("customerId", newCustomerId, { shouldValidate: true });
                form.setValue("locationId", ""); // Resetear la sede al cambiar de cliente

                const customer = customers.find((c) => c.id === newCustomerId);
                if (customer) {
                  const primary = getPrimaryLocation(customer);
                  if (primary) {
                    form.setValue("locationId", primary.id, { shouldValidate: true });
                  }
                }

                const items = form.getValues("items");
                items.forEach((item, index) => {
                  if (item.productId) {
                    handleItemUpdate(
                      index,
                      item.productId,
                      item.itemSaleType || "REFILL",
                      newCustomerId,
                    );
                  }
                });
              }}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value="">Buscar o seleccionar...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.alias ? `(${c.alias})` : ""}
                </option>
              ))}
            </select>
            {form.formState.errors.customerId && (
              <p className="text-[10px] text-red-500 font-bold">
                {form.formState.errors.customerId.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" /> Sede de Entrega *
            </Label>
            <select
              {...form.register("locationId")}
              disabled={!selectedCustomerId || availableLocations.length === 0}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white disabled:opacity-50 font-bold"
            >
              <option value="">
                {selectedCustomerId
                  ? "Seleccione el local..."
                  : "Primero elija un cliente"}
              </option>
              {availableLocations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} - {loc.address}
                </option>
              ))}
            </select>
            {form.formState.errors.locationId && (
              <p className="text-[10px] text-red-500 font-bold">
                {form.formState.errors.locationId.message}
              </p>
            )}
          </div>
        </div>

        {/* SECCIÓN 2: PRODUCTOS SOLICITADOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" /> Productos a
              Enviar
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                append({ productId: "", quantity: 1, unitPrice: 0, itemSaleType: "REFILL", description: "" })
              }
              className="h-7 text-xs text-blue-600 font-bold"
            >
              <Plus className="h-3 w-3 mr-1" /> Añadir Otro
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <select
                  {...form.register(`items.${index}.productId`)}
                  onChange={(e) => {
                    form.register(`items.${index}.productId`).onChange(e);
                    handleItemUpdate(
                      index,
                      e.target.value,
                      form.getValues(`items.${index}.itemSaleType`) || "REFILL",
                    );
                  }}
                  className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold"
                >
                  <option value="">Producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  {...form.register(`items.${index}.itemSaleType`)}
                  onChange={(e) => {
                    form.register(`items.${index}.itemSaleType`).onChange(e);
                    handleItemUpdate(
                      index,
                      form.getValues(`items.${index}.productId`),
                      e.target.value,
                    );
                  }}
                  className="w-44 h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold bg-blue-50 text-blue-800"
                >
                  <option value="REFILL">Recarga</option>
                  <option value="FULL">Venta Nueva</option>
                  <option value="BOTTLE">Solo Envase</option>
                </select>
                <Input
                  {...form.register(`items.${index}.quantity`)}
                  type="number"
                  min="1"
                  placeholder="Cant."
                  className="w-24 h-11 text-center font-black text-lg border-slate-200"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    S/
                  </span>
                  <Input
                    {...form.register(`items.${index}.unitPrice`)}
                    type="number"
                    step={PRICE_STEP}
                    min="0"
                    placeholder="Precio"
                    className="w-full h-11 pl-8 font-bold border-slate-200"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-11 w-11 text-red-400 hover:text-red-600 bg-slate-50 rounded-xl"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN 3: LOGÍSTICA Y NOTAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-500" /> Fecha Esperada
              *
            </Label>
            <Input
              {...form.register("expectedDeliveryDate")}
              type="date"
              className="h-11 border-slate-200 font-bold text-slate-800"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Notas para el Chofer (Opcional)
            </Label>
            <Input
              {...form.register("notes")}
              placeholder="Ej: Llamar al 999... al llegar, no tocar timbre"
              className="h-11 border-slate-200"
            />
          </div>
        </div>

        {/* BOTONES */}
        <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
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
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-10 shadow-lg shadow-slate-900/20 rounded-xl h-11"
          >
            {isPending ? (
              "Guardando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Reservar Pedido
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
