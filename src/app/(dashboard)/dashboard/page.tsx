import { getMonthlyRevenueAction, getProductSalesAction } from "./actions";
import { RevenueChart } from "./RevenueChart";
import { ProductSalesTable } from "./ProductSalesTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await getMonthlyRevenueAction(6);
  const productsResult = await getProductSalesAction();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Resumen de métricas operativas</p>
      </div>

      <div className="grid gap-6">
        {result.success && result.data ? (
          <RevenueChart data={result.data} />
        ) : (
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-200 text-red-700">
            {result.error || "No se pudieron cargar los datos del dashboard"}
          </div>
        )}

        {productsResult.success && productsResult.data ? (
          <ProductSalesTable data={productsResult.data} />
        ) : (
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-200 text-red-700">
            {productsResult.error || "No se pudieron cargar las ventas por producto"}
          </div>
        )}
      </div>
    </div>
  );
}
