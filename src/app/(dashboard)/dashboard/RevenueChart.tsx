"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RevenueData {
  month: string;
  billed: number;
  cash: number;
  digital: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Formatear el mes para mostrar (ej: "2024-06" -> "Jun 2024")
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("es-PE", { month: "short", year: "numeric" });
  };

  const chartData = data.map((item) => ({
    ...item,
    formattedMonth: formatMonth(item.month),
  }));

  return (
    <div className="w-full h-[400px] bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 text-slate-900">
        Ingresos Mensuales (S/)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="formattedMonth"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value) => `S/ ${value}`}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number) => [`S/ ${value.toFixed(2)}`]}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "20px" }}
          />
          <Bar
            name="Facturado"
            dataKey="billed"
            fill="#0f172a"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar
            name="Cobrado Efectivo"
            dataKey="cash"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar
            name="Cobrado Digital"
            dataKey="digital"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
