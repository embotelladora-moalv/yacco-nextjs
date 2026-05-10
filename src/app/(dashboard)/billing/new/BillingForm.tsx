"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  billingSchema,
  BillingFormValues,
} from "@/core/validations/billingSchema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { emitInvoiceAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, User, ShoppingCart, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BillingForm({
  customers,
  allUnbilledOrders,
}: {
  customers: any[];
  allUnbilledOrders: any[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema) as any,
    defaultValues: {
      customerId: "",
      type: "BOLETA",
      orderIds: [],
      totalAmount: 0,
      issueDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedOrderIds = form.watch("orderIds");

  // Filtramos los pedidos sin facturar que pertenecen al cliente seleccionado
  const availableOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return allUnbilledOrders.filter((o) => o.customerId === selectedCustomerId);
  }, [selectedCustomerId, allUnbilledOrders]);

  // Manejador para seleccionar/deseleccionar pedidos y recalcular el total
  const toggleOrder = (orderId: string, amount: number) => {
    const currentList = [...selectedOrderIds];
    const currentIndex = currentList.indexOf(orderId);

    let newTotal = form.getValues("totalAmount");

    if (currentIndex > -1) {
      currentList.splice(currentIndex, 1);
      newTotal -= amount;
    } else {
      currentList.push(orderId);
      newTotal += amount;
    }

    form.setValue("orderIds", currentList);
    form.setValue("totalAmount", newTotal);
  };

  const onSubmit = async (values: BillingFormValues) => {
    setIsLoading(true);
    const result = await emitInvoiceAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success("Comprobante emitido con éxito", {
        description: "Conectando con facturador electrónico...",
      });
      router.push("/billing");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-3">
        <FileText className="h-6 w-6 text-blue-400" />
        <div>
          <h2 className="text-xl font-black">Emisión de Comprobante / Guía</h2>
          <p className="text-slate-400 text-sm">
            Facturación Electrónica SUNAT
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-blue-600" /> Seleccionar Cliente
            </Label>
            <select
              {...form.register("customerId")}
              onChange={(e) => {
                form.register("customerId").onChange(e);
                form.setValue("orderIds", []); // Limpiamos selección al cambiar cliente
                form.setValue("totalAmount", 0);
              }}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-bold"
            >
              <option value="">Buscar cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "COMPANY" ? "RUC" : "DNI"}{" "}
                  {c.documentId})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-slate-700">
              Tipo de Documento
            </Label>
            <select
              {...form.register("type")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-800"
            >
              <option value="BOLETA">Boleta de Venta Electrónica</option>
              <option value="FACTURA">Factura Electrónica</option>
              <option value="GUIA_REMISION">Guía de Remisión Remitente</option>
              <option value="NOTA_CREDITO">Nota de Crédito</option>
            </select>
          </div>
        </div>

        {/* LISTA DE PEDIDOS PENDIENTES DE FACTURAR */}
        <div className="space-y-4">
          <Label className="font-bold flex items-center gap-2 text-slate-700 text-lg">
            <ShoppingCart className="h-5 w-5 text-slate-400" /> Pedidos por
            Facturar (Consolidación)
          </Label>

          {selectedCustomerId ? (
            availableOrders.length > 0 ? (
              <div className="grid gap-3">
                {availableOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrder(order.id, order.totalAmount)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-blue-200"}`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            ID: {order.id.slice(-6)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white"
                          >
                            {new Date(order.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          {order.items.length} producto(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-slate-900">
                          S/ {order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">
                  Este cliente no tiene pedidos pendientes de facturación.
                </p>
              </div>
            )
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">
                Selecciona un cliente para ver sus pedidos.
              </p>
            </div>
          )}
          {form.formState.errors.orderIds && (
            <p className="text-xs text-red-500 font-bold">
              {form.formState.errors.orderIds.message}
            </p>
          )}
        </div>

        {/* TOTAL Y EMISIÓN */}
        <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center shadow-lg gap-6 mt-8">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4" /> Importe Total a Facturar
            </p>
            <p className="text-4xl font-black tracking-tighter">
              S/ {form.watch("totalAmount").toFixed(2)}
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || selectedOrderIds.length === 0}
            className="w-full md:w-auto h-14 px-8 bg-blue-600 hover:bg-blue-500 text-lg font-black shadow-xl shadow-blue-900/50"
          >
            Emitir Comprobante a SUNAT
          </Button>
        </div>
      </form>
    </div>
  );
}
