"use client";

import dynamic from "next/dynamic";
import { Customer } from "@/core/entities/Customer";

// Movemos la carga dinámica aquí, donde "use client" permite el ssr: false
const CustomerMap = dynamic(() => import("@/components/shared/CustomerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[700px] w-full bg-gray-100 animate-pulse rounded-3xl flex items-center justify-center text-gray-400 font-bold">
      Cargando Mapa de Yacco...
    </div>
  ),
});

export function MapWrapper({ customers }: { customers: Customer[] }) {
  return <CustomerMap customers={customers} />;
}
