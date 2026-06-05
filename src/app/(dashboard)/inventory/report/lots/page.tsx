import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronLeft,
  Factory,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Layers,
  CalendarClock,
} from "lucide-react";

export const dynamic = "force-dynamic";

type BatchStatus = "VIGENTE" | "POR_VENCER" | "VENCIDO" | "SIN_FECHA";

function getBatchStatus(expirationDate?: string | Date | null): BatchStatus {
  if (!expirationDate) return "SIN_FECHA";
  const exp = new Date(expirationDate);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "VENCIDO";
  if (diffDays <= 30) return "POR_VENCER";
  return "VIGENTE";
}

function formatDate(date?: string | Date | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntilExpiry(expirationDate?: string | Date | null): number | null {
  if (!expirationDate) return null;
  const exp = new Date(expirationDate);
  const now = new Date();
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const statusConfig: Record<BatchStatus, { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  VIGENTE: { label: "Vigente", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", icon: CheckCircle2 },
  POR_VENCER: { label: "Por Vencer", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", icon: Clock },
  VENCIDO: { label: "Vencido", bg: "bg-red-50", text: "text-red-700", border: "border-red-100", icon: XCircle },
  SIN_FECHA: { label: "Sin Fecha", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-100", icon: AlertTriangle },
};

export default async function StockByLotReportPage() {
  const [batches, products] = await Promise.all([
    inventoryRepository.getActiveBatches(),
    inventoryRepository.getAllProducts(),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Enrich batches with product data and status
  const enrichedBatches = batches
    .map((batch) => {
      const product = productMap.get(batch.productId);
      const status = getBatchStatus(batch.expirationDate);
      const daysLeft = getDaysUntilExpiry(batch.expirationDate);
      return {
        ...batch,
        productName: product?.name || "Producto Eliminado",
        productSku: product?.sku || "—",
        isMaquila: product?.isMaquila || false,
        status,
        daysLeft,
      };
    })
    .sort((a, b) => {
      // Sort: Vencido first, then Por Vencer, then Vigente, then Sin Fecha
      const order: Record<BatchStatus, number> = { VENCIDO: 0, POR_VENCER: 1, VIGENTE: 2, SIN_FECHA: 3 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      // Within same status, sort by expiration ascending
      const aExp = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
      const bExp = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
      return aExp - bExp;
    });

  // KPIs
  const totalActiveBatches = enrichedBatches.length;
  const totalLiveStock = enrichedBatches.reduce((sum, b) => sum + (b.currentStock || 0), 0);
  const expiredCount = enrichedBatches.filter((b) => b.status === "VENCIDO").length;
  const expiredStock = enrichedBatches.filter((b) => b.status === "VENCIDO").reduce((s, b) => s + (b.currentStock || 0), 0);
  const nearExpiryCount = enrichedBatches.filter((b) => b.status === "POR_VENCER").length;
  const nearExpiryStock = enrichedBatches.filter((b) => b.status === "POR_VENCER").reduce((s, b) => s + (b.currentStock || 0), 0);

  // Group by product for the summary section
  const stockByProduct = new Map<string, { name: string; sku: string; totalStock: number; batchCount: number }>();
  enrichedBatches.forEach((b) => {
    const existing = stockByProduct.get(b.productId);
    if (existing) {
      existing.totalStock += b.currentStock || 0;
      existing.batchCount += 1;
    } else {
      stockByProduct.set(b.productId, {
        name: b.productName,
        sku: b.productSku,
        totalStock: b.currentStock || 0,
        batchCount: 1,
      });
    }
  });

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -z-10 opacity-50 translate-x-1/2 -translate-y-1/2"></div>

        <div className="flex items-center gap-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200"
            id="btn-back-inventory"
          >
            <Link href="/inventory">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Link>
          </Button>
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center border border-purple-200 shadow-inner">
            <Layers className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Stock por Lote de Producción
            </h1>
            <p className="text-sm font-bold text-purple-600 mt-0.5 uppercase tracking-tight flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5" /> Trazabilidad FEFO — Estado vivo de lotes
            </p>
          </div>
        </div>

        <div className="flex gap-2 z-10">
          <Button
            asChild
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl shadow-sm"
            id="btn-return-to-report"
          >
            <Link href="/inventory/report">Informe de Planta</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl shadow-sm"
            id="btn-return-to-inventory"
          >
            <Link href="/inventory">Volver a Inventario</Link>
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Lotes activos */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-200 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
              <Layers className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-black text-slate-600 text-xs uppercase tracking-wider">
              Lotes Activos
            </h3>
          </div>
          <p className="text-4xl font-black text-slate-900 mt-2">
            {totalActiveBatches}{" "}
            <span className="text-sm font-bold text-slate-400">lotes</span>
          </p>
          <p className="text-[11px] font-bold text-purple-600 mt-2 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Con stock &gt; 0
          </p>
        </div>

        {/* Stock total vivo */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-black text-slate-600 text-xs uppercase tracking-wider">
              Stock Total Vivo
            </h3>
          </div>
          <p className="text-4xl font-black text-slate-900 mt-2">
            {totalLiveStock}{" "}
            <span className="text-sm font-bold text-slate-400">unidades</span>
          </p>
          <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Suma de todos los lotes
          </p>
        </div>

        {/* Por vencer */}
        <div className="bg-white p-6 rounded-[2rem] border border-amber-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-black text-amber-700 text-xs uppercase tracking-wider">
              Por Vencer (&lt;30 días)
            </h3>
          </div>
          <p className="text-4xl font-black text-amber-700 mt-2">
            {nearExpiryCount}{" "}
            <span className="text-sm font-bold text-amber-400">lotes</span>
          </p>
          <p className="text-[11px] font-bold text-amber-600 mt-2">
            {nearExpiryStock} unidades en riesgo
          </p>
        </div>

        {/* Vencidos */}
        <div className={`p-6 rounded-[2rem] shadow-sm relative overflow-hidden ${expiredCount > 0 ? "bg-red-50 border-2 border-red-200" : "bg-white border border-slate-200"}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${expiredCount > 0 ? "bg-red-100 border-red-200" : "bg-slate-50 border-slate-100"}`}>
              <XCircle className={`h-5 w-5 ${expiredCount > 0 ? "text-red-600" : "text-slate-400"}`} />
            </div>
            <h3 className={`font-black text-xs uppercase tracking-wider ${expiredCount > 0 ? "text-red-700" : "text-slate-600"}`}>
              Vencidos
            </h3>
          </div>
          <p className={`text-4xl font-black mt-2 ${expiredCount > 0 ? "text-red-700" : "text-slate-900"}`}>
            {expiredCount}{" "}
            <span className={`text-sm font-bold ${expiredCount > 0 ? "text-red-400" : "text-slate-400"}`}>lotes</span>
          </p>
          <p className={`text-[11px] font-bold mt-2 ${expiredCount > 0 ? "text-red-600" : "text-slate-400"}`}>
            {expiredStock} unidades vencidas
          </p>
        </div>
      </div>

      {/* RESUMEN POR PRODUCTO */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-400" /> Resumen de Stock por Producto
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/20">
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4 text-right">Lotes Activos</th>
                <th className="px-6 py-4 text-right">Stock Total (Lotes)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {Array.from(stockByProduct.entries()).map(([productId, data]) => (
                <tr key={productId} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-900 tracking-wide uppercase">
                    {data.sku}
                  </td>
                  <td className="px-6 py-4 text-slate-800">{data.name}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-md text-[10px] font-black">
                      {data.batchCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 text-base">
                    {data.totalStock}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                <td className="px-6 py-4" colSpan={2}>
                  TOTAL GENERAL
                </td>
                <td className="px-6 py-4 text-right text-purple-700">
                  {totalActiveBatches}
                </td>
                <td className="px-6 py-4 text-right text-slate-900 text-base">
                  {totalLiveStock}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DETALLADA POR LOTE */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-slate-400" /> Detalle por Lote (FEFO)
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
            {totalActiveBatches} Lotes Activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/20">
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Fecha Producción</th>
                <th className="px-6 py-4">Fecha Vencimiento</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Producido</th>
                <th className="px-6 py-4 text-right">Stock Vivo</th>
                <th className="px-6 py-4 text-right">Consumido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {enrichedBatches.map((batch) => {
                const cfg = statusConfig[batch.status];
                const StatusIcon = cfg.icon;
                const consumed = (batch.quantityProduced || 0) - (batch.currentStock || 0);
                const consumedPct = batch.quantityProduced > 0 ? Math.round((consumed / batch.quantityProduced) * 100) : 0;

                return (
                  <tr
                    key={batch.id}
                    className={`hover:bg-slate-50/30 transition-colors ${batch.status === "VENCIDO" ? "bg-red-50/30" : batch.status === "POR_VENCER" ? "bg-amber-50/20" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 tracking-wide">
                          {batch.lotNumber}
                        </span>
                        {batch.isMaquila && (
                          <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded mt-1 w-fit font-black uppercase">
                            Maquila
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{batch.productName}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase">
                          {batch.productSku}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(batch.productionDate)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(batch.expirationDate)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 ${cfg.bg} ${cfg.text} border ${cfg.border} px-2 py-0.5 rounded-md text-[10px] font-black uppercase`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        {batch.daysLeft !== null && batch.status !== "SIN_FECHA" && (
                          <span className={`text-[9px] font-bold ${batch.daysLeft < 0 ? "text-red-500" : batch.daysLeft <= 30 ? "text-amber-500" : "text-slate-400"}`}>
                            {batch.daysLeft < 0
                              ? `Hace ${Math.abs(batch.daysLeft)} días`
                              : `${batch.daysLeft} días restantes`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {batch.quantityProduced}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-black text-base ${batch.currentStock <= 5 ? "text-red-600" : "text-emerald-600"}`}>
                        {batch.currentStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-slate-600">{consumed}</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(consumedPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{consumedPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {enrichedBatches.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No hay lotes con stock activo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTA DE FEFO */}
      <div className="bg-purple-50/50 border border-purple-100 rounded-[2rem] p-6 flex gap-4 items-start">
        <Layers className="h-6 w-6 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-black text-purple-900 text-sm">
            Sistema FEFO (First-Expired, First-Out)
          </h4>
          <p className="text-xs text-purple-700 font-medium mt-1 leading-relaxed">
            Las ventas en planta y ruta consumen automáticamente del lote más próximo a vencer.
            Los productos de <strong>maquila</strong> requieren selección manual del lote al momento de la venta.
            El vencimiento predeterminado es de <strong>6 meses</strong> desde la fecha de producción y es editable al registrar producción.
          </p>
        </div>
      </div>
    </div>
  );
}
