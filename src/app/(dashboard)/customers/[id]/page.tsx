// src/app/(dashboard)/customers/[id]/page.tsx
import { CustomerContactsList } from "@/components/shared/CustomerContactsList";
import { CustomerDetailHeader } from "@/components/shared/CustomerDetailHeader";
import { CustomerLocationsList } from "@/components/shared/CustomerLocationsList";
import { CustomerStatsCards } from "@/components/shared/CustomerStatsCards";
import { customerRepository } from "@/services/repositories/customerRepository";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Obtenemos los datos completos del cliente de Moalv S.a.C.
  const customer = await customerRepository.getById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* 1. Cabecera con Alias y Datos Fiscales */}
      <CustomerDetailHeader customer={customer} />

      {/* 2. REQUISITO: Deuda, Préstamos y Reporte Sugerido */}
      <CustomerStatsCards stats={customer.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. REQUISITO: Multi-ubicación y Mapa */}
        <div className="lg:col-span-2">
          <CustomerLocationsList
            customerId={customer.id}
            locations={customer.locations}
          />
        </div>

        {/* 4. REQUISITO: Multi-contacto */}
        <div className="lg:col-span-1">
          <CustomerContactsList
            customerId={customer.id}
            contacts={customer.contacts}
          />
        </div>
      </div>
    </div>
  );
}
