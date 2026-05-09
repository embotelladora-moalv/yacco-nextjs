// src/components/shared/CustomerDetailHeader.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit, MapPin } from "lucide-react";
import Link from "next/link";
import { Customer } from "@/core/entities/Customer";

export function CustomerDetailHeader({ customer }: { customer: Customer }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
      <div className="flex items-start gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon" className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {customer.alias}
            </h1>
            <Badge className="bg-blue-700">{customer.categoryTag}</Badge>
          </div>
          <p className="text-sm text-gray-500 font-medium uppercase mt-1">
            {customer.businessName} •{" "}
            <span className="font-mono">{customer.documentNumber}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2">
          <MapPin className="h-4 w-4" /> Ver en Mapa General
        </Button>
        <Button className="bg-blue-700 gap-2">
          <Edit className="h-4 w-4" /> Editar Perfil
        </Button>
      </div>
    </div>
  );
}
