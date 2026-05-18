"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Receipt,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { emitirComprobanteAction } from "@/app/actions/sunatActions";
import Link from "next/link";

interface EmitReceiptButtonProps {
  saleId: string;
  customerDocument: string;
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
    pdfUrl: string; // <-- AÑADIDO EL PDF
  } | null>(null);

  const isRuc =
    customerDocument.length === 11 &&
    (customerDocument.startsWith("10") || customerDocument.startsWith("20"));
  const documentType = isRuc ? "01" : "03";
  const label = isRuc ? "Emitir Factura" : "Emitir Boleta";
  const Icon = isRuc ? FileText : Receipt;

  // FUNCIÓN PARA CONVERTIR RUTAS INTERNAS EN URLS PÚBLICAS DE DESCARGA
  const getStorageUrl = (path: string) => {
    if (!path) return "#";
    if (path.startsWith("http")) return path;
    return `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
  };

  const handleEmit = async () => {
    if (
      !window.confirm(
        `¿Estás seguro de emitir una ${isRuc ? "Factura" : "Boleta"} electrónica a la SUNAT para este ticket?`,
      )
    )
      return;

    setIsEmitting(true);
    // Pasamos el ID dentro de un arreglo para soportar la acción de consolidación
    const result = await emitirComprobanteAction([saleId], documentType);
    setIsEmitting(false);

    if (result.success) {
      toast.success("Comprobante emitido con éxito", {
        description: `Se generó el documento ${result.documentId}`,
      });
      setSuccessData({
        id: result.documentId as string,
        xmlUrl: result.xmlUrl as string,
        cdrUrl: result.cdrUrl as string,
        pdfUrl: result.pdfUrl as string, // Capturamos el PDF de la respuesta
      });
    } else {
      toast.error("Error al emitir comprobante", { description: result.error });
    }
  };

  if (successData) {
    return (
      <div className="flex flex-col gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black text-emerald-900">
              {successData.id} Aceptada
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {successData.pdfUrl && (
                <a
                  href={getStorageUrl(successData.pdfUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
                >
                  Descargar PDF
                </a>
              )}
              {successData.xmlUrl && (
                <a
                  href={getStorageUrl(successData.xmlUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
                >
                  Descargar XML
                </a>
              )}
              {successData.cdrUrl && (
                <a
                  href={getStorageUrl(successData.cdrUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
                >
                  Descargar CDR
                </a>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/sales/${saleId}`}
          className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-center flex items-center justify-center gap-2 transition-colors"
        >
          Ver Detalles y Guía <ArrowRight className="h-3 w-3" />
        </Link>
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
