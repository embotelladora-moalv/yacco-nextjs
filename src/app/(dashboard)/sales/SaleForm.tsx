"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saleSchema, SaleFormValues } from "@/core/validations/crmSchemas";
import { registerSaleAction } from "./actions";
import { PRICE_STEP } from "@/core/utils/priceConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  User,
  Package,
  Plus,
  Trash2,
  Save,
  Receipt,
  Store,
  Truck,
  Search,
  Check,
  ChevronDown,
  FileBadge2,
  AlertTriangle,
} from "lucide-react";
import { Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory";
import { resolvePrice, ItemSaleType } from "@/core/use-cases/sales/resolvePrice";

interface SaleFormProps {
  activeManifests: any[];
  customers: Customer[];
  products: Product[];
  initialOrder?: any;
  activeBatches?: any[];
}

export function SaleForm({
  activeManifests,
  customers,
  products,
  initialOrder,
  activeBatches = [],
}: SaleFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const initialCustomer = initialOrder
    ? customers.find((c) => c.id === initialOrder.customerId)
    : null;
  const [customerSearch, setCustomerSearch] = useState(
    initialCustomer ? initialCustomer.name : "",
  );
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(
    customers.slice(0, 10),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [prevTotal, setPrevTotal] = useState(0);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      saleType: initialOrder ? "ROUTE" : "PLANT",
      manifestId: initialOrder?.manifestId || "",
      customerId: initialOrder?.customerId || "",
      requiresBilling: initialCustomer?.alwaysRequiresBilling || false,
      requiresGuide: false,
      items: initialOrder?.items?.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        itemSaleType: "REFILL",
        description: `Recarga de ${products.find((p) => p.id === item.productId)?.name || "Producto"}`,
      })) || [
        {
          productId: "",
          quantity: 1,
          unitPrice: 0,
          itemSaleType: "REFILL",
          description: "",
        },
      ],
      returnedEmpties: [],
      paymentMethod: "CASH",
      cashReceived: 0,
      digitalReceived: 0,
      notes: initialOrder
        ? `Venta procesada desde Pedido ID: ${initialOrder.id.slice(-6).toUpperCase()}`
        : "",
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

  const watchSaleType = form.watch("saleType");
  const watchItems = form.watch("items");
  const watchCash = form.watch("cashReceived") || 0;
  const watchDigital = form.watch("digitalReceived") || 0;
  const watchPaymentMethod = form.watch("paymentMethod");
  const watchCustomerId = form.watch("customerId");

  useEffect(() => {
    if (customerSearch.length > 1) {
      const results = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.documentNumber.includes(customerSearch) ||
          c.alias?.toLowerCase().includes(customerSearch.toLowerCase()),
      );
      setFilteredCustomers(results);
    } else setFilteredCustomers(customers.slice(0, 10));
  }, [customerSearch, customers]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    form.setValue("customerId", customer.id, { shouldValidate: true });
    form.setValue("requiresBilling", customer.alwaysRequiresBilling || false, {
      shouldValidate: true,
    });
    setCustomerSearch(customer.name);
    setIsCustomerDropdownOpen(false);

    const items = form.getValues("items");
    items.forEach((item, index) => {
      if (item.productId)
        handleItemUpdate(
          index,
          item.productId,
          item.itemSaleType as string,
          customer.id,
        );
    });
  };

  const totalAmount = watchItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );
  const totalPaid =
    watchPaymentMethod === "CREDIT"
      ? 0
      : Number(watchCash) + Number(watchDigital);
  const newDebt = Math.max(0, totalAmount - totalPaid);

  useEffect(() => {
    const currentCash = form.getValues("cashReceived");
    const currentDigital = form.getValues("digitalReceived");

    if (watchPaymentMethod === "CASH") {
      if (currentCash === prevTotal || currentCash === 0)
        form.setValue("cashReceived", totalAmount, { shouldValidate: true });
      form.setValue("digitalReceived", 0, { shouldValidate: true });
    } else if (watchPaymentMethod === "DIGITAL") {
      if (currentDigital === prevTotal || currentDigital === 0)
        form.setValue("digitalReceived", totalAmount, { shouldValidate: true });
      form.setValue("cashReceived", 0, { shouldValidate: true });
    } else if (watchPaymentMethod === "CREDIT") {
      form.setValue("cashReceived", 0, { shouldValidate: true });
      form.setValue("digitalReceived", 0, { shouldValidate: true });
    }
    setPrevTotal(totalAmount);
  }, [totalAmount, watchPaymentMethod, form]);

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
      customer?.customPrices as any,
      product as any,
      itemType as ItemSaleType,
    );

    form.setValue(`items.${index}.unitPrice`, price, { shouldValidate: true });
    form.setValue(`items.${index}.description`, description, { shouldValidate: true });
  };

  const onSubmit = async (values: SaleFormValues) => {
    setIsPending(true);
    const cleanedValues = {
      ...values,
      items: values.items.filter((i) => i.productId && i.quantity > 0),
      returnedEmpties: values.returnedEmpties.filter(
        (e) => e.productId && e.quantity > 0,
      ),
      linkedOrderId: initialOrder?.id || undefined,
    };

    // 🔥 VALIDACIÓN DE MAQUILA EN PLANTA: Si es un producto maquila, es obligatorio seleccionar lote manualmente
    if (cleanedValues.saleType === "PLANT") {
      for (const item of cleanedValues.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product?.isMaquila && item.itemSaleType !== "BOTTLE" && !item.lotNumber) {
          toast.error("Seleccione un lote", {
            description: `Debe elegir un lote manualmente para el producto de maquila: ${product.name}`,
          });
          setIsPending(false);
          return;
        }
      }
    }

    // 🔥 NUEVA LÓGICA: Permitir guardar si al menos compró algo O si al menos devolvió un envase
    if (
      cleanedValues.items.length === 0 &&
      cleanedValues.returnedEmpties.length === 0
    ) {
      toast.error("Venta en blanco", {
        description:
          "Debe registrar al menos un producto o la devolución de un envase.",
      });
      setIsPending(false);
      return;
    }

    // 🔥 VALIDACIÓN CRÍTICA ANTES DE GUARDAR EN FIREBASE
    if (cleanedValues.saleType === "ROUTE" && cleanedValues.manifestId) {
      const manifest = activeManifests.find(
        (m) => m.id === cleanedValues.manifestId,
      );
      if (manifest) {
        const stockRequest: Record<string, number> = {};
        cleanedValues.items.forEach((item) => {
          if (item.itemSaleType !== "BOTTLE") {
            stockRequest[item.productId] =
              (stockRequest[item.productId] || 0) + item.quantity;
          }
        });

        for (const pId in stockRequest) {
          const totalNetLoaded =
            manifest.items
              ?.filter((i: any) => i.productId === pId)
              .reduce((a: number, b: any) => {
                return (
                  a +
                  (Number(b.quantityLoaded || 0) -
                    Number(b.quantityReturnedFull || 0) -
                    Number(b.wasteQuantity || 0))
                );
              }, 0) || 0;

          const totalSoldInSales = (manifest.sales || []).reduce(
            (sum: number, sale: any) => {
              const itemSum = (sale.items || [])
                .filter(
                  (i: any) =>
                    i.productId === pId && i.itemSaleType !== "BOTTLE",
                )
                .reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
              return sum + itemSum;
            },
            0,
          );

          const maxStock = Math.max(0, totalNetLoaded - totalSoldInSales);

          if (stockRequest[pId] > maxStock) {
            toast.error("Stock insuficiente", {
              description: `El camión solo posee ${maxStock} unidades disponibles de ${products.find((p) => p.id === pId)?.name}.`,
            });
            setIsPending(false);
            return;
          }
        }
      }
    }

    const result = await registerSaleAction(cleanedValues as any);
    setIsPending(false);

    if (result.success) {
      toast.success("Venta registrada exitosamente");
      form.reset();
      setCustomerSearch("");
      router.push(
        initialOrder ? `/dispatch/${initialOrder.manifestId}` : "/sales",
      );
      router.refresh();
    } else toast.error("Error al guardar", { description: result.error });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-5xl mx-auto">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
        <ShoppingCart className="h-8 w-8 text-emerald-400" />
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Registrar Venta Global
          </h2>
          <p className="text-slate-300 font-medium text-sm mt-0.5">
            Control centralizado (Planta / Ruta)
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="p-6 md:p-8 space-y-8"
      >
        {/* TIPO DE VENTA */}
        <div className="flex gap-4 p-1.5 bg-slate-100 rounded-xl w-fit flex-wrap border border-slate-200 shadow-inner">
          <button
            type="button"
            disabled={!!initialOrder}
            onClick={() => {
              form.setValue("saleType", "PLANT");
              form.setValue("manifestId", "");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${watchSaleType === "PLANT" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 disabled:opacity-40"}`}
          >
            <Store className="h-5 w-5" /> Venta en Planta
          </button>
          <button
            type="button"
            disabled={!!initialOrder}
            onClick={() => form.setValue("saleType", "ROUTE")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${watchSaleType === "ROUTE" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700 disabled:opacity-40"}`}
          >
            <Truck className="h-5 w-5" /> Venta en Ruta
          </button>
        </div>

        {/* DATOS CLIENTE Y COMPROBANTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="space-y-3 relative" ref={dropdownRef}>
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Buscar Cliente *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                disabled={!!initialOrder}
                placeholder="Escribe el nombre o documento..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setIsCustomerDropdownOpen(true);
                  if (e.target.value === "") form.setValue("customerId", "");
                }}
                onFocus={() => !initialOrder && setIsCustomerDropdownOpen(true)}
                className={`pl-10 h-12 font-bold text-slate-800 border-slate-300 disabled:bg-slate-100 ${isCustomerDropdownOpen ? "rounded-b-none rounded-t-xl border-b-0" : "rounded-xl"}`}
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>

            {isCustomerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-b-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-3 hover:bg-blue-50 border-b border-slate-50 cursor-pointer transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-blue-700">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">
                        {c.documentType}: {c.documentNumber}
                      </p>
                    </div>
                    {watchCustomerId === c.id && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" /> Camión / Manifiesto
              Asignado
            </Label>
            <select
              {...form.register("manifestId")}
              disabled={!!initialOrder || watchSaleType === "PLANT"}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 disabled:bg-slate-100"
            >
              <option value="">Seleccione ruta comercial...</option>
              {activeManifests.map((m) => (
                <option key={m.id} value={m.id}>
                  Placa: {m.truckPlate} - Manifiesto: {m.manifestNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* COMPROBANTES ELECTRÓNICOS SUNAT */}
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
          <Label className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
            <FileBadge2 className="h-4 w-4" /> Configuración Fiscal SUNAT
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="requiresBilling"
              control={form.control}
              render={({ field }) => (
                <div
                  onClick={() => field.onChange(!field.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${field.value ? "bg-white border-blue-500 shadow-md" : "bg-white/50 border-slate-200"}`}
                >
                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center border-2 ${field.value ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 bg-white"}`}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-800">
                      Generar Comprobante de Pago
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      Emisión en cola de Factura o Boleta Electrónica.
                    </p>
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        {/* LISTADO DE ITEMS DE COMPRA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" /> Detalle de
              Productos
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                appendItem({
                  productId: "",
                  quantity: 1,
                  unitPrice: 0,
                  itemSaleType: "REFILL",
                  description: "",
                })
              }
              className="h-8 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Añadir Producto
            </Button>
          </div>

          <div className="space-y-6">
            {itemFields.map((field, index) => {
              // 🔥 CÁLCULO DE STOCK MÁXIMO MATEMÁTICO REAL-TIME (Carga + Pits - Ventas - Otras Filas)
              let maxStock: number | undefined = undefined;
              if (watchSaleType === "ROUTE" && form.getValues("manifestId")) {
                const manifest = activeManifests.find(
                  (m) => m.id === form.getValues("manifestId"),
                );
                if (
                  manifest &&
                  form.getValues(`items.${index}.itemSaleType`) !== "BOTTLE"
                ) {
                  const pId = form.getValues(`items.${index}.productId`);

                  // A. Stock neto en camión (Carga inicial + recargas de pits - devoluciones llenos - mermas)
                  const totalNetLoaded =
                    manifest.items
                      ?.filter((i: any) => i.productId === pId)
                      .reduce((a: number, b: any) => {
                        return (
                          a +
                          (Number(b.quantityLoaded || 0) -
                            Number(b.quantityReturnedFull || 0) -
                            Number(b.wasteQuantity || 0))
                        );
                      }, 0) || 0;

                  // B. Descontamos lo vendido en todas las ventas ya guardadas de esta ruta (tanto pedidos cerrados como directas)
                  const totalSoldInSales = (manifest.sales || []).reduce(
                    (sum: number, sale: any) => {
                      const itemSum = (sale.items || [])
                        .filter(
                          (i: any) =>
                            i.productId === pId && i.itemSaleType !== "BOTTLE",
                        )
                        .reduce(
                          (s: number, i: any) => s + Number(i.quantity || 0),
                          0,
                        );
                      return sum + itemSum;
                    },
                    0,
                  );

                  const maxStockBase = totalNetLoaded - totalSoldInSales;

                  // C. Descontamos lo asignado en OTRAS filas de este mismo formulario para evitar vender el mismo stock
                  const alreadyAssignedInForm = form
                    .getValues("items")
                    .reduce((sum: number, item: any, i: number) => {
                      if (
                        i !== index &&
                        item.productId === pId &&
                        item.itemSaleType !== "BOTTLE"
                      ) {
                        return sum + Number(item.quantity || 0);
                      }
                      return sum;
                    }, 0);

                  maxStock = Math.max(0, maxStockBase - alreadyAssignedInForm);
                }
              }

              const selectedProductId = watchItems[index]?.productId;
              const selectedProduct = products.find((p) => p.id === selectedProductId);
              const showLotSelector =
                watchSaleType === "PLANT" &&
                selectedProduct?.isMaquila &&
                watchItems[index]?.itemSaleType !== "BOTTLE";

              const isOverStock =
                maxStock !== undefined &&
                Number(watchItems[index]?.quantity) > maxStock;

              return (
                <div
                  key={field.id}
                  className={`flex flex-col md:flex-row gap-3 items-center p-4 rounded-xl border transition-colors ${isOverStock ? "bg-red-50/50 border-red-200" : "bg-slate-50 md:bg-transparent md:border-none"}`}
                >
                  <div className={`w-full md:flex-1 grid grid-cols-1 ${showLotSelector ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
                    <select
                      {...form.register(`items.${index}.productId`)}
                      onChange={(e) => {
                        form.register(`items.${index}.productId`).onChange(e);
                        handleItemUpdate(
                          index,
                          e.target.value,
                          form.getValues(`items.${index}.itemSaleType`),
                        );
                        form.setValue(`items.${index}.lotNumber`, ""); // Reset lot when product changes
                      }}
                      className="w-full h-11 px-3 rounded-lg border text-sm font-bold bg-white"
                    >
                      <option value="">Seleccionar Producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      {...form.register(`items.${index}.itemSaleType`)}
                      onChange={(e) => {
                        form
                          .register(`items.${index}.itemSaleType`)
                          .onChange(e);
                        handleItemUpdate(
                          index,
                          form.getValues(`items.${index}.productId`),
                          e.target.value,
                        );
                      }}
                      className="w-full h-11 px-3 rounded-lg border text-sm font-bold bg-blue-50 text-blue-800"
                    >
                      <option value="REFILL">Recarga (Agua)</option>
                      <option value="FULL">Venta Nueva (Lleno)</option>
                      <option value="BOTTLE">Solo Envase (Vacío)</option>
                    </select>
                    {showLotSelector && (
                      <select
                        {...form.register(`items.${index}.lotNumber`)}
                        className="w-full h-11 px-3 rounded-lg border text-sm font-bold bg-purple-50 text-purple-800 border-purple-200"
                      >
                        <option value="">Seleccionar Lote *</option>
                        {(activeBatches || [])
                          .filter((b) => b.productId === selectedProductId)
                          .map((b) => (
                            <option key={b.id} value={b.lotNumber}>
                              {b.lotNumber} (Stock: {b.currentStock})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <div className="flex w-full md:w-auto gap-3 items-center justify-between">
                    <div className="w-20 relative">
                      <Input
                        {...form.register(`items.${index}.quantity`)}
                        type="number"
                        min="1"
                        max={maxStock !== undefined ? maxStock : undefined}
                        className={`h-11 text-center font-black bg-white ${isOverStock ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                      />
                      {/* INDICADOR VISUAL EN VIVO */}
                      {maxStock !== undefined && (
                        <span
                          className={`absolute -bottom-5 left-0 right-0 text-center text-[9px] font-black ${isOverStock ? "text-red-500 flex items-center justify-center gap-1" : "text-orange-500"}`}
                        >
                          {isOverStock && <AlertTriangle className="h-3 w-3" />}{" "}
                          Disp: {maxStock}
                        </span>
                      )}
                    </div>
                    <div className="w-28 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        S/
                      </span>
                      <Input
                        {...form.register(`items.${index}.unitPrice`)}
                        type="number"
                        step={PRICE_STEP}
                        min="0"
                        className="h-11 pl-8 font-black text-right bg-white"
                      />
                    </div>
                    <div className="w-24 text-right font-black text-slate-800 text-sm">
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
                      className="text-red-400 hover:text-red-600 bg-red-50 h-11 w-11 rounded-xl shrink-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RETORNO DE ENVASES VACÍOS */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" /> Envases Vacíos
              Devueltos
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => appendEmpty({ productId: "", quantity: 1 })}
              className="h-8 text-xs font-bold text-orange-700 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Añadir Envase Vacío
            </Button>
          </div>

          <div className="space-y-3">
            {emptyFields.length === 0 && (
              <p className="text-xs text-slate-400 font-medium bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                El cliente no está devolviendo envases vacíos en esta entrega.
              </p>
            )}
            {emptyFields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100"
              >
                <select
                  {...form.register(
                    `returnedEmpties.${index}.productId` as const,
                  )}
                  className="w-full sm:flex-1 h-11 px-3 rounded-lg border border-slate-200 text-sm font-bold bg-white focus:outline-none"
                >
                  <option value="">Seleccionar Envase...</option>
                  {products
                    .filter((p) => p.isReturnableContainer)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>

                <div className="flex w-full sm:w-auto items-center gap-2 justify-end">
                  <span className="text-xs font-bold text-slate-500 pl-2">
                    CANT:
                  </span>
                  <Input
                    type="number"
                    min="1"
                    {...form.register(
                      `returnedEmpties.${index}.quantity` as const,
                    )}
                    className="w-24 h-11 text-center font-black bg-white border-slate-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmpty(index)}
                    className="text-red-400 hover:text-red-600 bg-red-50 h-11 w-11 rounded-xl shrink-0"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FINANZAS Y CIERRE DE TICKET */}
        <div className="border-t pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-500" /> Condición Comercial
              de Cobro
            </Label>
            <select
              {...form.register("paymentMethod")}
              className="w-full h-12 px-4 rounded-xl border font-bold bg-white text-base text-slate-800 focus:outline-none"
            >
              <option value="CASH">Efectivo Completo</option>
              <option value="DIGITAL">
                Cobro Digital Completo (Yape/Plin/Transf.)
              </option>
              <option value="MIXED">Pago Mixto</option>
              <option value="CREDIT">
                Crédito Comercial (Cargar a Deuda Monetaria)
              </option>
            </select>
            {watchPaymentMethod !== "CREDIT" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div
                  className={`${watchPaymentMethod === "DIGITAL" ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <Label className="text-xs font-bold text-slate-500">
                    Monto Efectivo
                  </Label>
                  <Input
                    {...form.register("cashReceived")}
                    type="number"
                    step="0.10"
                    className="h-12 font-black text-lg bg-slate-50 border-emerald-200 text-emerald-800"
                  />
                </div>
                <div
                  className={`${watchPaymentMethod === "CASH" ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <Label className="text-xs font-bold text-slate-500">
                    Monto Digital
                  </Label>
                  <Input
                    {...form.register("digitalReceived")}
                    type="number"
                    step="0.10"
                    className="h-12 font-black text-lg bg-slate-50 border-blue-200 text-blue-800"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between shadow-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold text-sm">
                  Monto Total
                </span>
                <span className="text-xl font-bold">
                  S/ {totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <span className="text-slate-400 font-bold text-sm">
                  Importe Entregado
                </span>
                <span className="text-emerald-400 font-bold text-lg">
                  - S/ {totalPaid.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-end mt-6">
              <span className="font-black text-slate-400 uppercase tracking-widest text-xs">
                Saldo por Cobrar (Deuda)
              </span>
              <span
                className={`text-4xl font-black ${newDebt > 0 ? "text-red-400" : "text-white"}`}
              >
                S/ {newDebt.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 flex justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500 h-14 px-8 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 rounded-xl h-14 text-lg"
          >
            {isPending ? (
              "Procesando..."
            ) : (
              <>
                <Save className="mr-2 h-6 w-6" />{" "}
                {initialOrder ? "Cerrar Pedido y Facturar" : "Confirmar Venta"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
