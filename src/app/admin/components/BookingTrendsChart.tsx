"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { month: string; count: number }[];
}

export function BookingTrendsChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((d) => ({
    ...d,
    label: d.month.slice(5),
    count: d.count,
  }));

  return (
    <div className="bg-white border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Booking Trends
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
