import { customerRepository } from "@/services/repositories/customerRepository";
import { CustomerTable } from "./CustomerTable";
import { CustomerStats } from "./CustomerStats";

export default async function CustomersPage() {
  // Obtenemos los primeros 10 clientes para la carga inicial SSR
  const initialCustomers = await customerRepository.getAllActive(); // Idealmente un método getFirstPage()

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">
          Directorio de Clientes
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Gestión operativa y financiera de Embotelladora Moalv S.a.C.
        </p>
      </div>

      {/* Las nuevas tarjetas de estadísticas */}
      <CustomerStats />

      {/* La tabla con la lógica de Algolia inyectada */}
      <CustomerTable initialData={initialCustomers.slice(0, 10)} />
    </div>
  );
}
