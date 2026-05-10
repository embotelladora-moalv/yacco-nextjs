import { customerRepository } from "@/services/repositories/customerRepository";
import { HandCoins } from "lucide-react";
import { CollectionForm } from "./CollectionForm";

export default async function CollectionsPage() {
  // Solo traemos a los clientes que tengan deuda > 0 para no llenar el selector innecesariamente
  const allCustomers = await customerRepository.getAll();
  const customersWithDebt = allCustomers.filter((c) => c.debtAmount > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 pt-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-blue-600" />
            Centro de Cobranzas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Amortización de créditos y registro de ingresos Moalv S.a.C.
          </p>
        </div>
      </div>

      <CollectionForm customersWithDebt={customersWithDebt} />
    </div>
  );
}
