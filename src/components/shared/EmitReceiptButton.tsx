"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Receipt, Loader2, CheckCircle2 } from "lucide-react";
import { emitirComprobanteAction } from "@/app/actions/sunatActions"; // Ajusta tu ruta

interface EmitReceiptButtonProps {
  saleId: string;
  customerDocument: string; // Para decidir automáticamente Factura vs Boleta
}

export function EmitReceiptButton({
  saleId,
  customerDocument,
}: EmitReceiptButtonProps) {
  const [isEmitting, setIsEmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    xmlUrl: string;
    cdrUrl: string;
  } | null>(null);

  // Lógica: Si el cliente tiene RUC (11 dígitos, empieza en 10 o 20) es Factura (01), si no, Boleta (03)
  const isRuc =
    customerDocument.length === 11 &&
    (customerDocument.startsWith("10") || customerDocument.startsWith("20"));
  const documentType = isRuc ? "01" : "03";
  const label = isRuc ? "Emitir Factura" : "Emitir Boleta";
  const Icon = isRuc ? FileText : Receipt;

  const handleEmit = async () => {
    if (
      !window.confirm(
        `¿Estás seguro de emitir una ${isRuc ? "Factura" : "Boleta"} electrónica a la SUNAT para este ticket? Esta acción no se puede deshacer directamente.`,
      )
    ) {
      return;
    }

    setIsEmitting(true);
    const result = await emitirComprobanteAction(saleId, documentType);
    setIsEmitting(false);

    if (result.success) {
      toast.success("Comprobante emitido con éxito", {
        description: `Se generó el documento ${result.documentId}`,
      });
      setSuccessData({
        id: result.documentId as string,
        xmlUrl: result.xmlUrl as string,
        cdrUrl: result.cdrUrl as string,
      });
    } else {
      toast.error("Error al emitir comprobante", {
        description: result.error,
      });
    }
  };

  // Si ya se emitió con éxito en esta sesión, mostramos los enlaces de descarga
  if (successData) {
    return (
      <div className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl w-full sm:w-auto">
        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        <div className="flex-1">
          <p className="text-sm font-black text-emerald-900">
            {successData.id} Aceptada
          </p>
          <div className="flex items-center gap-3 mt-1">
            <a
              href={successData.xmlUrl}
              target="_blank"
              className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
            >
              Descargar XML
            </a>
            <a
              href={successData.cdrUrl}
              target="_blank"
              className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
            >
              Descargar CDR
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleEmit}
      disabled={isEmitting}
      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      {isEmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Procesando en SUNAT...
        </>
      ) : (
        <>
          <Icon className="h-4 w-4" /> {label}
        </>
      )}
    </button>
  );
}
