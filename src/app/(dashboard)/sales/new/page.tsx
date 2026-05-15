import { customerRepository } from "@/services/repositories/customerRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { ShoppingCart } from "lucide-react";
import { SaleForm } from "../SaleForm";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  // Obtenemos los datos necesarios para el formulario
  const [customers, products, activeManifests] = await Promise.all([
    customerRepository.getAllCustomers(),
    inventoryRepository.getAllProducts(),
    dispatchRepository.getActiveManifests(),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 p-2 rounded-xl">
          <ShoppingCart className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Registrar Venta
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Selecciona el tipo de despacho para iniciar la transacción.
          </p>
        </div>
      </div>

      <SaleForm
        customers={customers}
        products={products}
        activeManifests={activeManifests}
      />
    </div>
  );
}
