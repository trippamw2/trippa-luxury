"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface Props {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  provisional: "#EAB308",
  deposit_paid: "#0EA5E9",
  confirmed: "#10B981",
  balance_due: "#F59E0B",
  paid: "#14B8A6",
  in_progress: "#6366F1",
  completed: "#6B7280",
  cancelled: "#EF4444",
  refunded: "#EC4899",
};

const STATUS_LABELS: Record<string, string> = {
  provisional: "Provisional",
  deposit_paid: "Deposit Paid",
  confirmed: "Confirmed",
  balance_due: "Balance Due",
  paid: "Paid in Full",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function StatusDistributionChart({ data }: Props) {
  if (!data || Object.keys(data).length === 0) return null;

  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#9CA3AF",
    }));

  return (
    <div className="bg-white border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Booking Status Distribution
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#6B7280" }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
