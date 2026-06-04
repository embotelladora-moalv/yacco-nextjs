// src/components/sunat/GlobalBillingClient.tsx
"use client";

import { useState } from "react";
import { User, ChevronDown, ChevronUp, PackageCheck } from "lucide-react";
import ConsolidateBillingPanel from "@/components/sunat/ConsolidateBillingPanel";
import { PendingSale } from "../customers/[id]/CustomerProfileClient";

interface GlobalBillingProps {
  pendingSales: (PendingSale & { customerId: string })[];
  customersData: Record<string, any>;
}

export default function GlobalBillingClient({
  pendingSales,
  customersData,
}: GlobalBillingProps) {
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(
    null,
  );

  // Agrupar ventas por cliente
  const groupedSales = pendingSales.reduce(
    (acc, sale) => {
      if (!acc[sale.customerId]) acc[sale.customerId] = [];
      acc[sale.customerId].push(sale);
      return acc;
    },
    {} as Record<string, PendingSale[]>,
  );

  const customerIdsWithPending = Object.keys(groupedSales);

  if (customerIdsWithPending.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
        <PackageCheck className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-800">
          ¡Todo está al día!
        </h3>
        <p className="text-slate-500 font-medium mt-2">
          No hay pedidos pendientes de facturación en el sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customerIdsWithPending.map((customerId) => {
        const customer = customersData[customerId] || {
          name: "Cliente Eliminado / Desconocido",
        };
        const sales = groupedSales[customerId];
        const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const isExpanded = expandedCustomerId === customerId;

        return (
          <div
            key={customerId}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
          >
            {/* CABECERA (Resumen por cliente) */}
            <div
              onClick={() =>
                setExpandedCustomerId(isExpanded ? null : customerId)
              }
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {customer.name ||
                      customer.fullName ||
                      customer.businessName}
                  </h3>
                  <p className="text-xs font-bold text-slate-500">
                    {sales.length}{" "}
                    {sales.length === 1
                      ? "pedido pendiente"
                      : "pedidos pendientes"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Monto Total
                  </p>
                  <p className="text-lg font-black text-slate-800">
                    S/ {totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-slate-400">
                  {isExpanded ? (
                    <ChevronUp className="h-6 w-6" />
                  ) : (
                    <ChevronDown className="h-6 w-6" />
                  )}
                </div>
              </div>
            </div>

            {/* CONTENIDO (Panel de Consolidación) */}
            {isExpanded && (
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                {/* Reutilizamos el súper componente que creamos en el paso anterior */}
                <ConsolidateBillingPanel
                  customerId={customerId}
                  customerName={
                    customer.name || customer.fullName || customer.businessName
                  }
                  pendingSales={sales}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
