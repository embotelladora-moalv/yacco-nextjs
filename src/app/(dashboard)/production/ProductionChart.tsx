"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function ProductionChart({ data }: { data: any[] }) {
  // Simulamos datos agrupados por día para el ejemplo (luego se calcularán del Kardex real)
  const chartData = [
    { day: "Lun", llenos: 120, mermas: 2 },
    { day: "Mar", llenos: 150, mermas: 0 },
    { day: "Mié", llenos: 180, mermas: 3 },
    { day: "Jue", llenos: 140, mermas: 1 },
    { day: "Vie", llenos: 200, mermas: 5 },
    { day: "Sáb", llenos: 250, mermas: 2 },
  ];

  return (
    <Card className="shadow-sm border-gray-100 h-full">
      <CardHeader className="pb-2 border-b mb-4">
        <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-700" /> Rendimiento Semanal
          (Bidones 20L)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar
                dataKey="llenos"
                name="Producidos"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
              <Bar
                dataKey="mermas"
                name="Mermas"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
