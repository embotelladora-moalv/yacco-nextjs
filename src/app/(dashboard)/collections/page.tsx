import { customerRepository } from "@/services/repositories/customerRepository";
import { CollectionsClient } from "./CollectionsClient";
import { HandCoins } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  // Obtenemos a todos los clientes (podrías optimizarlo en el repositorio luego para que solo traiga debtAmount > 0 directamente desde Firebase)
  const allCustomers = await customerRepository.getAllCustomers();

  // Filtramos a los deudores
  const debtors = allCustomers.filter((c) => (c.debtAmount || 0) > 0);

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER DE LA SECCIÓN */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <HandCoins className="h-8 w-8 text-red-500" />
          Módulo de Cobranzas
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Gestión de cuentas por cobrar y registro de amortizaciones de
          clientes.
        </p>
      </div>

      {/* DASHBOARD CLIENTE */}
      <CollectionsClient debtors={debtors} />
    </div>
  );
}
