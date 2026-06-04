// src/components/shared/CustomerStatsCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Droplet, Calendar, TrendingUp } from "lucide-react";

export function CustomerStatsCards({ stats }: { stats: any }) {
  const items = [
    {
      title: "Deuda Monetaria",
      value: `S/ ${stats.currentDebt.toFixed(2)}`,
      icon: DollarSign,
      color: stats.currentDebt > 0 ? "text-red-600" : "text-green-600",
      description: "Saldo pendiente de pago",
    },
    {
      title: "Bidones en Préstamo",
      value: `${stats.loanedBottles} Und.`,
      icon: Droplet,
      color: "text-blue-600",
      description: "Envases de 20L entregados",
    },
    {
      title: "Frecuencia de Pedido",
      value: `Cada ${stats.orderFrequencyDays || "--"} días`,
      icon: TrendingUp,
      color: "text-purple-600",
      description: "Promedio sugerido",
    },
    {
      title: "Última Venta",
      value: stats.lastSaleDate
        ? stats.lastSaleDate.toLocaleDateString()
        : "Sin registros",
      icon: Calendar,
      color: "text-gray-600",
      description: "Fecha de última entrega",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <Card key={idx} className="shadow-sm border-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              {item.title}
            </CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${item.color}`}>
              {item.value}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 font-medium italic">
              {item.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
