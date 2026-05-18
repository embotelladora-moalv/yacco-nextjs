// src/app/sales/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  Calendar,
  User,
  ArrowLeft,
  ReceiptText,
  FileText,
  FileCode,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SunatPanel from "@/components/sunat/SunatPanel";
import GrePanel from "@/components/sunat/GrePanel";
import { salesRepository } from "@/services/repositories/salesRepository";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function SaleDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const saleId = resolvedParams.id;

  // 1. Obtener la data limpia desde el repositorio maestro
  const detailData = await salesRepository.getSaleDetailFull(saleId);

  if (!detailData) {
    notFound();
  }

  const { saleData, customerData, sunatData, greData, trucks, drivers } =
    detailData;

  const formatDate = (isoString: string) => {
    if (!isoString) return "Sin fecha";
    const date = new Date(isoString);
    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Función auxiliar interna para construir URLs de descarga directas y públicas desde Firebase Storage
  const getStorageUrl = (path?: string) => {
    if (!path) return "#";
    if (path.startsWith("http")) return path;
    return `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* BARRA DE NAVEGACIÓN SUPERIOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
          </Link>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Comprobantes / Detalles
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Venta #{saleId.slice(-6).toUpperCase()}
            </h1>
          </div>
        </div>
      </div>

      {/* DISEÑO PRINCIPAL EN DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: RESUMEN DE COMPRA E ÍTEMS (8 Columnas) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            {/* Cabecera Informativa con Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl shadow-sm text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Cliente
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {customerData?.name || "Consumidor Final"}
                  </span>
                  <span className="text-xs text-slate-500 block font-medium">
                    {customerData?.documentNumber || "S/D"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl shadow-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Fecha de Registro
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatDate(saleData.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* TABLA DE PRODUCTOS DESPACHADOS */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Productos del Ticket
              </h3>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4 text-center">Cant.</th>
                      <th className="py-3 px-4 text-right">P. Unit</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {saleData.items?.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors font-medium text-slate-700"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-center bg-slate-50/30 font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right">
                          S/ {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          S/ {(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTAL COBRADO */}
            <div className="flex justify-end pt-2 border-t border-slate-50">
              <div className="text-right">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                  Total Cobrado
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  S/ {(saleData.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ACCESOS DIRECTOS DE DESCARGA (Solo si está emitido en SUNAT) */}
          {sunatData && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Descarga de Documentos Oficiales
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sunatData.pdfUrl && (
                  <a
                    href={getStorageUrl(sunatData.pdfUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-bold text-xs shadow-sm bg-white"
                  >
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>Descargar PDF</span>
                  </a>
                )}

                {sunatData.xmlUrl && (
                  <a
                    href={getStorageUrl(sunatData.xmlUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-bold text-xs shadow-sm bg-white"
                  >
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <span>Descargar XML</span>
                  </a>
                )}

                {sunatData.cdrUrl && (
                  <a
                    href={getStorageUrl(sunatData.cdrUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-bold text-xs shadow-sm bg-white"
                  >
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                      <Archive className="w-4 h-4" />
                    </div>
                    <span>Descargar CDR</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: PANELES INTERACTIVOS (FACTURACIÓN Y GUÍA DE REMISIÓN) (4 Columnas) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Panel Principal de SUNAT (Controla la Emisión y Estados) */}
          <SunatPanel
            saleId={saleId}
            customerDocument={customerData?.documentNumber}
            sunatData={sunatData}
          />

          {/* Panel de Guía de Remisión Electrónica */}
          <GrePanel
            saleId={saleId}
            customerLocations={customerData?.locations || []}
            trucks={trucks}
            drivers={drivers}
            sunatData={greData}
          />
        </div>
      </div>

      {/* PIE DE PÁGINA DE AUDITORÍA */}
      <div className="text-[10px] text-slate-400 font-medium text-center pt-6 border-t border-slate-100">
        EMBOTELLADORA MOALV S.A.C. <br /> Sistema de Gestión Tributaria
        Integrada
      </div>
    </div>
  );
}
