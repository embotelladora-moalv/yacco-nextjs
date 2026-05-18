import { customerRepository } from "@/services/repositories/customerRepository";
import { CustomerTable } from "./CustomerTable";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const initialCustomers = await customerRepository.getInitialCustomers(100);
  const products = await inventoryRepository.getAllProducts();

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Gestión de Clientes
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Control de cuentas corrientes, historial de ventas y ubicaciones.
          </p>
        </div>

        <Button
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20 px-6 rounded-xl"
        >
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* COMPONENTE DE TABLA CON FILTROS */}
      <CustomerTable initialCustomers={initialCustomers} products={products} />
    </div>
  );
}
