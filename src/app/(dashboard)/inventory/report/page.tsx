import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronLeft,
  Factory,
  Package,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Droplets,
  PackageOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlantContainerReportPage() {
  const products = await inventoryRepository.getAllProducts();

  // Filter for containers/bidones
  const bidones = products.filter(
    (p) => p.packagingType && p.packagingType.toLowerCase().includes("bidón")
  );

  // General aggregates
  const totalLlenos = bidones.reduce((sum, p) => sum + (p.stockFilled || 0), 0);
  const totalVacios = bidones.reduce((sum, p) => sum + (p.stockEmpty || 0), 0);
  const totalStock = totalLlenos + totalVacios;

  // With Tap Breakdown
  const bidonesConCanio = bidones.filter((p) => p.hasTap === true);
  const llenosConCanio = bidonesConCanio.reduce(
    (sum, p) => sum + (p.stockFilled || 0),
    0
  );
  const vaciosConCanio = bidonesConCanio.reduce(
    (sum, p) => sum + (p.stockEmpty || 0),
    0
  );

  // Without Tap Breakdown
  const bidonesSinCanio = bidones.filter((p) => p.hasTap === false);
  const llenosSinCanio = bidonesSinCanio.reduce(
    (sum, p) => sum + (p.stockFilled || 0),
    0
  );
  const vaciosSinCanio = bidonesSinCanio.reduce(
    (sum, p) => sum + (p.stockEmpty || 0),
    0
  );

  // Unclassified Breakdown
  const bidonesSinClasificar = bidones.filter(
    (p) => p.hasTap === null || p.hasTap === undefined
  );
  const llenosSinClasificar = bidonesSinClasificar.reduce(
    (sum, p) => sum + (p.stockFilled || 0),
    0
  );
  const vaciosSinClasificar = bidonesSinClasificar.reduce(
    (sum, p) => sum + (p.stockEmpty || 0),
    0
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10 opacity-50 translate-x-1/2 -translate-y-1/2"></div>

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
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200 shadow-inner">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Informe de Envases en Planta
            </h1>
            <p className="text-sm font-bold text-blue-600 mt-0.5 uppercase tracking-tight flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5" /> Estado situacional y control físico
            </p>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl shadow-sm z-10"
          id="btn-return-to-kardex"
        >
          <Link href="/inventory">Volver a Inventario</Link>
        </Button>
      </div>

      {/* TARJETAS DE INDICADORES PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta 1: Total Llenos */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <Droplets className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-black text-slate-600 text-xs uppercase tracking-wider">
              Bidones Llenos (Listos)
            </h3>
          </div>
          <p className="text-4xl font-black text-slate-900 mt-2">
            {totalLlenos}{" "}
            <span className="text-sm font-bold text-slate-400">unidades</span>
          </p>
          <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Listos para despacho
          </p>
        </div>

        {/* Tarjeta 2: Total Vacíos */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <PackageOpen className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-black text-slate-600 text-xs uppercase tracking-wider">
              Bidones Vacíos (Retorno)
            </h3>
          </div>
          <p className="text-4xl font-black text-slate-900 mt-2">
            {totalVacios}{" "}
            <span className="text-sm font-bold text-slate-400">unidades</span>
          </p>
          <p className="text-[11px] font-bold text-blue-600 mt-2 flex items-center gap-1">
            <Factory className="w-3.5 h-3.5" /> Disponibles para producción
          </p>
        </div>

        {/* Tarjeta 3: Total Stock */}
        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
          <Package className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Package className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-black text-slate-300 text-xs uppercase tracking-wider">
              Total Envases en Planta
            </h3>
          </div>
          <p className="text-4xl font-black text-white mt-2">
            {totalStock}{" "}
            <span className="text-sm font-bold text-slate-500">unidades</span>
          </p>
          <p className="text-[11px] font-bold text-slate-400 mt-2">
            Suma de llenos y vacíos en almacén
          </p>
        </div>
      </div>

      {/* DESGLOSE POR TIPO DE CAÑO */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-400" /> Desglose Técnico de Envases
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Con Caño */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                Con Caño (C)
              </span>
              <p className="text-xs text-slate-500 font-bold mt-2.5">
                Bidones equipados con grifo
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-200/60 pt-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Llenos</p>
                <p className="text-xl font-black text-slate-800">{llenosConCanio}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Vacíos</p>
                <p className="text-xl font-black text-slate-800">{vaciosConCanio}</p>
              </div>
            </div>
          </div>

          {/* Sin Caño */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                Sin Caño (N)
              </span>
              <p className="text-xs text-slate-500 font-bold mt-2.5">
                Bidones normales lisos
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-200/60 pt-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Llenos</p>
                <p className="text-xl font-black text-slate-800">{llenosSinCanio}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Vacíos</p>
                <p className="text-xl font-black text-slate-800">{vaciosSinCanio}</p>
              </div>
            </div>
          </div>

          {/* Sin Clasificar */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md flex items-center gap-1 w-fit">
                <HelpCircle className="w-3 h-3" /> Sin Clasificar
              </span>
              <p className="text-xs text-slate-500 font-bold mt-2.5">
                Configuración hasTap sin definir
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-200/60 pt-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Llenos</p>
                <p className="text-xl font-black text-slate-800">{llenosSinClasificar}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Vacíos</p>
                <p className="text-xl font-black text-slate-800">{vaciosSinClasificar}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS EN PLANTA */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-400" /> Detalle por Producto
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
            {bidones.length} Productos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/20">
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Nombre Comercial</th>
                <th className="px-6 py-4">Configuración Caño</th>
                <th className="px-6 py-4 text-right">Llenos</th>
                <th className="px-6 py-4 text-right">Vacíos</th>
                <th className="px-6 py-4 text-right">Stock Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {bidones.map((item) => {
                const totalRowStock = (item.stockFilled || 0) + (item.stockEmpty || 0);
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-black text-slate-900 tracking-wide uppercase">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 text-slate-800">{item.name}</td>
                    <td className="px-6 py-4">
                      {item.hasTap === true ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                          Con Caño
                        </span>
                      ) : item.hasTap === false ? (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                          Sin Caño
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit">
                          <HelpCircle className="w-3 h-3" /> No definido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      {item.stockFilled}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                      {item.stockEmpty}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {totalRowStock}
                    </td>
                  </tr>
                );
              })}

              {/* Fila de Totales */}
              <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                <td className="px-6 py-4" colSpan={3}>
                  TOTALES EN PLANTA
                </td>
                <td className="px-6 py-4 text-right text-emerald-700 text-base">
                  {totalLlenos}
                </td>
                <td className="px-6 py-4 text-right text-blue-700 text-base">
                  {totalVacios}
                </td>
                <td className="px-6 py-4 text-right text-slate-900 text-base">
                  {totalStock}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTA DE COLA DE CLIENTES Y OBSERVACIONES */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 flex gap-4 items-start">
        <AlertCircle className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-black text-blue-900 text-sm">
            Control de Envases en Clientes
          </h4>
          <p className="text-xs text-blue-700 font-medium mt-1 leading-relaxed">
            ⚠️ <strong>Bidones en clientes: pendiente</strong> (se acumula con la operación, actualmente se encuentra en 0 tras el reinicio general de balances contables).
          </p>
        </div>
      </div>
    </div>
  );
}
