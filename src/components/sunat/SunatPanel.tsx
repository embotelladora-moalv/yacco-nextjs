"use client";

import { useState } from "react";
import {
  FileText,
  FileCode,
  Archive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  RefreshCw,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  emitirComprobanteAction,
  anularComprobanteAction,
  consultarTicketBajaAction,
} from "@/app/actions/sunatActions";

interface SunatPanelProps {
  saleId: string;
  customerDocument?: string;
  sunatData?: {
    id: string;
    status: "ACCEPTED" | "VOID_PENDING" | "VOIDED" | "VOID_REJECTED";
    xmlUrl?: string;
    cdrUrl?: string;
    pdfUrl?: string;
  } | null;
}

export default function SunatPanel({
  saleId,
  customerDocument,
  sunatData,
}: SunatPanelProps) {
  const [loading, setLoading] = useState(false);

  // 1. Manejador para Emitir
  const handleEmitir = async (tipo: "01" | "03") => {
    setLoading(true);
    // Para DNI solo Boletas(03). Para RUC permite Facturas(01)
    if (tipo === "01" && customerDocument && customerDocument.length !== 11) {
      toast.error(
        "Para emitir Factura, el cliente debe tener RUC (11 dígitos).",
      );
      setLoading(false);
      return;
    }

    const res = await emitirComprobanteAction([saleId], tipo);

    if (res.success) {
      toast.success(`Comprobante ${res.documentId} emitido con éxito.`);
      window.location.reload();
    } else {
      toast.error(res.error || "Ocurrió un error al emitir.");
    }
    setLoading(false);
  };

  // 2. Manejador para Anular
  const handleAnular = async () => {
    if (!sunatData?.id) return;

    const motivo = window.prompt(
      "Ingrese el motivo de la anulación (Mínimo 3 caracteres):",
    );
    if (!motivo || motivo.length < 3) return;

    if (
      !window.confirm(
        `¿Está seguro de anular permanentemente el documento ${sunatData.id}?`,
      )
    )
      return;

    setLoading(true);
    const res = await anularComprobanteAction(sunatData.id, motivo);

    if (res.success) {
      toast.success(
        "Baja enviada a SUNAT. Consulte el ticket en unos segundos.",
      );
      window.location.reload();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  // 3. Manejador para Consultar Ticket
  const handleConsultarTicket = async () => {
    if (!sunatData?.id) return;

    setLoading(true);
    const res = await consultarTicketBajaAction(sunatData.id);

    if (res.success) {
      if (res.status === "ACCEPTED") {
        toast.success("La anulación fue aprobada por SUNAT.");
        window.location.reload();
      } else {
        toast.info(res.message || "Aún en proceso...");
      }
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  // ESTADO 1: SIN EMITIR
  if (!sunatData) {
    return (
      <div className="space-y-4 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
          Sin Comprobante
        </p>
        <p className="text-xs text-slate-400 font-medium px-4 mt-1 mb-4">
          Esta venta aún no ha sido emitida electrónicamente.
        </p>
        <div className="flex flex-col gap-2 px-6">
          <Button
            onClick={() => handleEmitir("03")}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Emitir Boleta (DNI)
          </Button>
          <Button
            onClick={() => handleEmitir("01")}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Emitir Factura (RUC)
          </Button>
        </div>
      </div>
    );
  }

  // ESTADO 2 Y 3: EMITIDO / ANULACIÓN EN PROCESO / ANULADO
  return (
    <div className="space-y-4">
      {/* HEADER DE ESTADO */}
      {sunatData.status === "ACCEPTED" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-black text-slate-900">
            Comprobante Aceptado
          </p>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide bg-white border border-emerald-100 px-2 py-0.5 rounded-md inline-block">
            {sunatData.id}
          </p>
        </div>
      )}

      {sunatData.status === "VOID_PENDING" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
          <p className="text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> Baja en proceso (SUNAT)
          </p>
          <Button
            onClick={handleConsultarTicket}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Consultar Ticket
          </Button>
        </div>
      )}

      {sunatData.status === "VOIDED" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center space-y-1">
          <XCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm font-black text-slate-900">Documento Anulado</p>
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide line-through decoration-red-400 decoration-2">
            {sunatData.id}
          </p>
        </div>
      )}

      {/* DESCARGA DE ARCHIVOS */}
      <div className="space-y-2 pt-2">
        <p className="text-xs text-slate-500 font-medium text-center mb-3">
          Archivos oficiales regulados por SUNAT:
        </p>

        <DownloadBtn
          url={sunatData.pdfUrl}
          icon={<FileText className="w-4 h-4 text-red-500" />}
          text="Representación Impresa (PDF)"
        />
        <DownloadBtn
          url={sunatData.xmlUrl}
          icon={<FileCode className="w-4 h-4 text-blue-500" />}
          text="XML Firmado Digitalmente"
        />
        <DownloadBtn
          url={sunatData.cdrUrl}
          icon={<Archive className="w-4 h-4 text-purple-500" />}
          text="Constancia de Recepción (CDR)"
        />
      </div>

      {/* BOTÓN DE ANULACIÓN (Solo visible si está Aceptado) */}
      {sunatData.status === "ACCEPTED" && (
        <div className="pt-4 border-t border-slate-100">
          <Button
            onClick={handleAnular}
            disabled={loading}
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs h-10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Solicitar Anulación (Dar de Baja)"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Sub-componente Botón de Descarga
function DownloadBtn({
  url,
  icon,
  text,
}: {
  url?: string;
  icon: React.ReactNode;
  text: string;
}) {
  if (!url) return null;
  const storageUrl = url.startsWith("http")
    ? url
    : `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(url)}?alt=media`;

  return (
    <a
      href={storageUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-bold text-xs"
    >
      {icon} {text}
    </a>
  );
}
