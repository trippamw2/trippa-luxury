"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Props {
  uniqueGuests: number;
  returningGuests: number;
}

const COLORS = ["#C9A96E", "#8B7D6B"];

export function GuestRepeatRate({ uniqueGuests, returningGuests }: Props) {
  if (uniqueGuests === 0) return null;

  const newGuests = uniqueGuests - returningGuests;
  const data = [
    { name: "New Guests", value: newGuests },
    { name: "Returning Guests", value: returningGuests },
  ];

  return (
    <div className="bg-white border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Guest Repeat Rate
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-gray-500 mt-2">
        {uniqueGuests} unique guests · {returningGuests} returning
      </p>
    </div>
  );
}
