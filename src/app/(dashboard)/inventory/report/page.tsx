import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { customerRepository } from "@/services/repositories/customerRepository";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronLeft,
  Factory,
  Package,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Droplets,
  PackageOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlantContainerReportPage() {
  const [products, customers] = await Promise.all([
    inventoryRepository.getAllProducts(),
    customerRepository.getAllCustomers(),
  ]);

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

  // Calcular agregados de envases en clientes
  let totalEnCirculacion = 0;
  const productCirculationMap = new Map<string, number>();

  interface Debtor {
    id: string;
    name: string;
    alias?: string;
    totalOwed: number;
    balances: { productId: string; name: string; balance: number }[];
  }

  const debtorsList: Debtor[] = [];
  const surplusCustomers: { id: string; name: string; totalSurplus: number }[] = [];

  for (const customer of customers) {
    let customerTotalOwed = 0;
    let customerTotalSurplus = 0;
    const activeBalances: { productId: string; name: string; balance: number }[] = [];

    if (customer.containerBalances) {
      for (const bal of customer.containerBalances) {
        if (bal.balance > 0) {
          customerTotalOwed += bal.balance;
          const pName = products.find((p) => p.id === bal.productId)?.name || "Producto Desconocido";
          activeBalances.push({
            productId: bal.productId,
            name: pName,
            balance: bal.balance,
          });

          // Acumulado por producto
          const currentProdTotal = productCirculationMap.get(bal.productId) || 0;
          productCirculationMap.set(bal.productId, currentProdTotal + bal.balance);
        } else if (bal.balance < 0) {
          customerTotalSurplus += Math.abs(bal.balance);
        }
      }
    }

    if (customerTotalOwed > 0) {
      debtorsList.push({
        id: customer.id,
        name: customer.name,
        alias: customer.alias,
        totalOwed: customerTotalOwed,
        balances: activeBalances,
      });
      totalEnCirculacion += customerTotalOwed;
    }

    if (customerTotalSurplus > 0) {
      surplusCustomers.push({
        id: customer.id,
        name: customer.name,
        totalSurplus: customerTotalSurplus,
      });
    }
  }

  // Ordenar deudores de mayor a menor deuda
  debtorsList.sort((a, b) => b.totalOwed - a.totalOwed);
  const topDebtors = debtorsList.slice(0, 10);

  // Convertir mapa de circulación a una lista con nombres
  const circulationByProduct = Array.from(productCirculationMap.entries()).map(([productId, totalCirculation]) => {
    const prod = products.find((p) => p.id === productId);
    return {
      productId,
      sku: prod?.sku || "N/A",
      name: prod?.name || "Producto Desconocido",
      hasTap: prod?.hasTap,
      totalCirculation,
    };
  });

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
              Informe de Envases
            </h1>
            <p className="text-sm font-bold text-blue-600 mt-0.5 uppercase tracking-tight flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5" /> Estado situacional y control físico (Planta y Clientes)
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

      {/* TARJETAS DE INDICADORES PRINCIPALES - PLANTA */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-widest px-2">
          Envases en Planta (Almacén)
        </h2>
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
      </div>

      {/* DESGLOSE POR TIPO DE CAÑO */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-400" /> Desglose Técnico de Envases en Planta
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
            <Package className="h-5 w-5 text-slate-400" /> Detalle por Producto en Planta
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

      <hr className="border-slate-200/60" />

      {/* SECCIÓN CONTROL DE ENVASES EN CLIENTES */}
      <div className="space-y-6">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-widest px-2">
          Control de Envases en Clientes (Circulación)
        </h2>

        {totalEnCirculacion === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-black text-slate-800">Sin envases en circulación</h3>
              <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                Aún no hay envases en circulación registrados en la cuenta corriente de los clientes. Se acumularán con la operación comercial o ajustes manuales de saldos.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards de Clientes & Cuadre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta En Circulación */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-black text-slate-600 text-xs uppercase tracking-wider">
                    Envases en Circulación (Clientes)
                  </h3>
                </div>
                <p className="text-4xl font-black text-slate-900 mt-2">
                  {totalEnCirculacion}{" "}
                  <span className="text-sm font-bold text-slate-400">unidades</span>
                </p>
                <p className="text-[11px] font-bold text-blue-600 mt-2">
                  Total prestado acumulado en todos los clientes
                </p>
              </div>

              {/* Tarjeta Cuadre Global */}
              <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="font-black text-slate-300 text-xs uppercase tracking-wider">
                    Suma Total en Movimiento
                  </h3>
                </div>
                <p className="text-4xl font-black text-white mt-2">
                  {totalStock + totalEnCirculacion}{" "}
                  <span className="text-sm font-bold text-slate-500">unidades</span>
                </p>
                <p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed">
                  En planta: <strong className="text-white">{totalStock}</strong> + En clientes: <strong className="text-white">{totalEnCirculacion}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tabla Desglose por Producto */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">
                    Desglose en Clientes por Producto
                  </h3>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/20">
                        <th className="px-5 py-3">SKU</th>
                        <th className="px-5 py-3">Nombre</th>
                        <th className="px-5 py-3 text-right">En Clientes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {circulationByProduct.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/30">
                          <td className="px-5 py-3 font-black text-slate-900 tracking-wide uppercase">
                            {item.sku}
                          </td>
                          <td className="px-5 py-3 text-slate-800">{item.name}</td>
                          <td className="px-5 py-3 text-right font-black text-blue-600">
                            {item.totalCirculation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ranking de Deudores */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">
                    Top 10 Clientes con más Envases
                  </h3>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/20">
                        <th className="px-5 py-3">Cliente</th>
                        <th className="px-5 py-3 text-right">Envases prestados</th>
                        <th className="px-5 py-3 text-center">Ficha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {topDebtors.map((debtor) => (
                        <tr key={debtor.id} className="hover:bg-slate-50/30">
                          <td className="px-5 py-3">
                            <p className="font-black text-slate-900">{debtor.name}</p>
                            {debtor.alias && (
                              <p className="text-[10px] text-slate-400 font-bold">{debtor.alias}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-black text-red-600">
                            {debtor.totalOwed}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <Link
                              href={`/customers/${debtor.id}`}
                              className="inline-flex items-center justify-center font-bold text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Ver Ficha
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Clientes con saldo a favor */}
            {surplusCustomers.length > 0 && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6">
                <h4 className="font-black text-emerald-900 text-sm">
                  Clientes con Devoluciones Excedentes (Saldo a Favor)
                </h4>
                <p className="text-xs text-emerald-700 font-medium mt-1 leading-relaxed">
                  Hay {surplusCustomers.length} clientes que han devuelto más envases de los registrados en su poder:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {surplusCustomers.map((sc) => (
                    <Link
                      key={sc.id}
                      href={`/customers/${sc.id}`}
                      className="bg-white border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm hover:bg-emerald-50"
                    >
                      {sc.name} (-{sc.totalSurplus} u.)
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
