"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { destination: string; revenue: number }[];
}

export function RevenueByDestination({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Revenue by Destination
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
          <YAxis type="category" dataKey="destination" fontSize={11} width={80} />
          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
          <Bar dataKey="revenue" fill="#C9A96E" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
