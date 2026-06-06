import { customerRepository } from "@/services/repositories/customerRepository";
import { CustomerTable } from "./CustomerTable";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { getUserSession } from "@/services/firebase/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    cursor?: string;
    q?: string;
    cursors?: string;
    limit?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q || "";
  const cursorsParam = resolvedSearchParams.cursors || "";
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 10;

  // Descomponemos la pila de cursores de la URL. El cursor activo para Firestore es el último
  const cursorArray = cursorsParam ? cursorsParam.split(",") : [];
  const currentCursor = cursorArray[cursorArray.length - 1];

  const [paginatedData, products, session] = await Promise.all([
    customerRepository.listPaginated({
      pageSize: limit,
      cursor: currentCursor,
      search: q,
    }),
    inventoryRepository.getAllProducts(),
    getUserSession(),
  ]);

  const { items: customers, nextCursor, hasMore, totalCount } = paginatedData;
  const isAdmin = session?.roles?.includes("ADMIN") ?? false;

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
      <CustomerTable
        initialCustomers={customers}
        products={products}
        nextCursor={nextCursor}
        hasMore={hasMore}
        totalCount={totalCount}
        currentSearch={q}
        currentCursors={cursorsParam}
        currentLimit={limit}
        isAdmin={isAdmin}
      />
    </div>
  );
}
