// src/app/billing/page.tsx
import { ReceiptText, AlertCircle } from "lucide-react";
import GlobalBillingClient from "./GlobalBillingClient";
import { getPendingBillingDataAction } from "./actions";

export default async function BillingPage() {
  // Llamamos a la lógica separada
  const { success, pendingSales, customersData } =
    await getPendingBillingDataAction();

  if (!success) {
    return (
      <div className="p-10 text-center text-red-500 flex flex-col items-center">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p className="font-bold text-lg">
          Error al cargar la base de datos de facturación.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center border border-indigo-200">
          <ReceiptText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Facturación Global
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Consolide y emita comprobantes pendientes por cliente.
          </p>
        </div>
      </div>

      {/* Le pasamos los datos al componente visual */}
      <GlobalBillingClient
        pendingSales={pendingSales}
        customersData={customersData}
      />
    </div>
  );
}
