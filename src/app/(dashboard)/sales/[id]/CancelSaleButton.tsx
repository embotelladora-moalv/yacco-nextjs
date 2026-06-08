"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { XCircle, Loader2 } from "lucide-react";
import { cancelSaleAction } from "../actions";
import { useRouter } from "next/navigation";

interface CancelSaleButtonProps {
  saleId: string;
  isBilled?: boolean;
  sunatDocumentId?: string | null;
  status: string;
  manifestStatus?: string;
}

export function CancelSaleButton({
  saleId,
  isBilled,
  sunatDocumentId,
  status,
  manifestStatus,
}: CancelSaleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isCancelled = status === "CANCELLED";
  const isLiquidated = manifestStatus === "LIQUIDATED";
  const cannotCancel = isCancelled || ((isBilled || !!sunatDocumentId) && isLiquidated);

  let tooltipMessage = "";
  if (isCancelled) tooltipMessage = "Esta venta ya fue anulada.";
  else if ((isBilled || sunatDocumentId) && isLiquidated) {
    tooltipMessage = "Venta facturada y manifest liquidado. Requiere nota de crédito (Fase B).";
  }

  const handleCancel = () => {
    if (!reason.trim()) {
      toast.error("Debe ingresar un motivo para la anulación.");
      return;
    }

    startTransition(async () => {
      const result = await cancelSaleAction(saleId, reason.trim(), isLiquidated);
      if (result.success) {
        toast.success(
          isLiquidated
            ? "Venta anulada correctamente (Ajuste Post-Liquidación)."
            : "Venta anulada correctamente."
        );
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error("Error al anular venta", { description: result.error });
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setReason("");
      }}
    >
      <DialogTrigger asChild>
        <div className="relative group">
          <Button
            variant="destructive"
            disabled={cannotCancel}
            className="bg-red-600 hover:bg-red-700 text-white font-black h-9 px-4 rounded-xl shadow-lg shadow-red-600/10 flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" /> Anular Venta
          </Button>
          {cannotCancel && tooltipMessage && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded-lg text-center font-bold z-50 shadow-md">
              {tooltipMessage}
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-600" /> Anular Venta #{saleId.slice(-6).toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-medium pt-2">
            {isLiquidated ? (
              <span className="text-amber-600 font-bold block bg-amber-50 p-3 rounded-2xl border border-amber-100">
                ADVERTENCIA: El manifiesto ya fue liquidado. Esta anulación se registrará como un ajuste administrativo y el stock volverá al almacén de planta, no al camión.
              </span>
            ) : (
              "Esta acción revertirá permanentemente la venta, actualizando el inventario, la deuda del cliente y sus saldos de envases."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">
              Motivo de Anulación <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Error en los productos registrados..."
              className="min-h-[100px] border-slate-200 focus-visible:ring-emerald-500 rounded-xl"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="font-bold rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason.trim() || isPending}
            onClick={handleCancel}
            className="font-black rounded-xl"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Anulando...
              </>
            ) : (
              isLiquidated ? "Confirmar Ajuste Administrativo" : "Confirmar Anulación"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
