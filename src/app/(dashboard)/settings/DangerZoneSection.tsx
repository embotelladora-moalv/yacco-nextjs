"use client";

import { useState } from "react";
import { resetAndSeedDatabaseAction } from "./databaseActions";
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
import { AlertTriangle, DatabaseZap, Loader2 } from "lucide-react";

export function DangerZoneSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, setIsPending] = useState(false);

  const isFormValid = confirmText === "RESETEAR";

  const handleReset = async () => {
    if (!isFormValid) return;

    setIsPending(true);
    const result = await resetAndSeedDatabaseAction();
    setIsPending(false);

    if (result.success) {
      toast.success("¡Base de datos reseteada y repoblada con éxito!");
      setConfirmText("");
      setIsOpen(false);
      // Recargamos la ventana para asegurar que todo el estado del cliente se limpie
      window.location.reload();
    } else {
      toast.error("Error crítico", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden mt-8">
      <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <div>
          <h2 className="text-xl font-black text-red-900">
            Zona de Peligro (Desarrollo)
          </h2>
          <p className="text-sm font-medium text-red-700">
            Acciones destructivas para la base de datos.
          </p>
        </div>
      </div>

      <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h3 className="font-bold text-slate-800">
            Resetear Base de Datos y Sembrar Datos de Prueba
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-lg">
            Esto eliminará permanentemente todo el inventario, kardex, despachos
            y usuarios. Luego, insertará datos limpios para probar el sistema
            FIFO y las rutas.
          </p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setConfirmText(""); // Limpiamos al cerrar
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              className="font-black whitespace-nowrap shadow-lg shadow-red-500/20"
            >
              <DatabaseZap className="mr-2 h-4 w-4" /> Resetear Sistema
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md border-red-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" /> ¿Estás completamente
                seguro?
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-medium pt-2">
                Esta acción{" "}
                <span className="font-bold text-slate-900">
                  no se puede deshacer
                </span>
                . Se perderán todos los registros actuales de Moalv S.a.C.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">
                  Escribe{" "}
                  <span className="font-black text-slate-900 select-all">
                    RESETEAR
                  </span>{" "}
                  para confirmar:
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Escribe la palabra exacta..."
                  className="font-black text-center text-lg border-red-200 focus-visible:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!isFormValid || isPending}
                onClick={handleReset}
                className="font-black"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Destruyendo y Creando...
                  </>
                ) : (
                  <>
                    <DatabaseZap className="mr-2 h-4 w-4" /> Confirmar Reset
                    Total
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
