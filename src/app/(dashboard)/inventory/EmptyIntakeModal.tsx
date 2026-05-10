"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerPurchaseAction } from "./actions";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowDownToLine, PackagePlus, Save } from "lucide-react";

interface EmptyIntakeModalProps {
  products: Product[];
}

// Un schema rápido solo para este modal
const intakeSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto"),
  quantity: z.coerce.number().min(1, "Debe ingresar al menos 1 envase"),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

export function EmptyIntakeModal({ products }: EmptyIntakeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Solo podemos ingresar "vacíos" de productos que manejan envases retornables
  const returnableProducts = products.filter((p) => p.isReturnableContainer);

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema) as any,
    defaultValues: {
      productId: "",
      quantity: 0,
    },
  });

  const onSubmit = async (values: IntakeFormValues) => {
    setIsPending(true);
    const result = await registerPurchaseAction(
      values.productId,
      values.quantity,
    );
    setIsPending(false);

    if (result.success) {
      toast.success("Ingreso de envases registrado exitosamente");
      form.reset();
      setIsOpen(false);
    } else {
      toast.error("Error al registrar", { description: result.error });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="font-bold border-slate-200 text-slate-700 shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors"
        >
          <ArrowDownToLine className="mr-2 h-4 w-4 text-green-600" /> Ingreso de
          Vacíos
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white rounded-3xl overflow-hidden border-0 p-0">
        <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100">
          <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ArrowDownToLine className="h-6 w-6 text-green-600" />
            Ingreso de Envases Nuevos
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Registre la compra o dotación de envases vacíos (Ej: Compra al
            proveedor).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2 text-slate-700">
              <PackagePlus className="h-4 w-4 text-slate-400" /> Tipo de Envase
              (Producto)
            </Label>
            <select
              {...form.register("productId")}
              className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">-- Seleccione el envase --</option>
              {returnableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            {form.formState.errors.productId && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.productId.message}
              </p>
            )}
          </div>

          <div className="space-y-2 bg-green-50 p-4 rounded-xl border border-green-100">
            <Label className="font-black text-green-900 text-lg">
              Cantidad Ingresada (Vacíos)
            </Label>
            <Input
              {...form.register("quantity")}
              type="number"
              min="1"
              className="h-14 text-2xl font-black text-green-700 border-green-200 bg-white"
            />
            {form.formState.errors.quantity && (
              <p className="text-xs text-red-500 font-bold">
                {form.formState.errors.quantity.message}
              </p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 font-black px-8"
            >
              {isPending ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Confirmar Ingreso
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
