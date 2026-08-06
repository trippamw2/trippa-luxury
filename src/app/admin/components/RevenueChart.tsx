"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { month: string; revenue: number }[];
}

export function RevenueChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((d) => ({
    ...d,
    label: d.month.slice(5), // "2026-05" → "05"
    revenue: d.revenue,
  }));

  return (
    <div className="bg-white border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Monthly Revenue
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#8B7D6B" }}
              tickLine={false}
              axisLine={{ stroke: "#f0f0f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8B7D6B" }}
              tickLine={false}
              axisLine={{ stroke: "#f0f0f0" }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [`$${(Number(value) || 0).toLocaleString()}`, "Revenue"]}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Bar dataKey="revenue" fill="#C9A96E" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
