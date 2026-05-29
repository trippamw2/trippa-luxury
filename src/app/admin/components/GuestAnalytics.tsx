"use client";

import { useState, useEffect } from "react";

interface GuestAnalyticsData {
  totalGuests: number;
  vipGuests: number;
  repeatGuests: number;
  couples: number;
  solo: number;
  avgSpentPerGuest: number;
  avgBookingsPerGuest: number;
  topCountries: { country: string; count: number }[];
  sourceDistribution: { source: string; count: number }[];
  travelStyleDistribution: { style: string; count: number }[];
  topInterests: { interest: string; count: number }[];
  budgetDistribution: { range: string; count: number }[];
}

export function GuestAnalytics() {
  const [data, setData] = useState<GuestAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/guests")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => console.error("Guest analytics error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 p-5">
        <div className="text-sm text-gray-400">Loading guest analytics...</div>
      </div>
    );
  }

  if (!data) return null;

  const overallStats = [
    { label: "Total Guests", value: String(data.totalGuests) },
    { label: "VIP Guests", value: String(data.vipGuests) },
    { label: "Repeat Guests", value: String(data.repeatGuests) },
    { label: "Avg. Spent", value: `$${data.avgSpentPerGuest.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { label: "Avg. Bookings", value: data.avgBookingsPerGuest.toFixed(1) },
    { label: "Couples", value: `${data.couples} (${data.totalGuests > 0 ? Math.round((data.couples / data.totalGuests) * 100) : 0}%)` },
  ];

  return (
    <div className="bg-white border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Guest Analytics
      </h3>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6">
        {overallStats.map((stat) => (
          <div key={stat.label}>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Countries</h4>
          {data.topCountries.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="space-y-1.5">
              {data.topCountries.map((c) => (
                <div key={c.country} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{c.country}</span>
                  <span className="text-gray-400">{c.count} guests</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source Distribution */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Acquisition Sources</h4>
          {data.sourceDistribution.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="space-y-1.5">
              {data.sourceDistribution.map((s) => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 capitalize">{s.source}</span>
                  <span className="text-gray-400">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Travel Style */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Travel Styles</h4>
          {data.travelStyleDistribution.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="space-y-1.5">
              {data.travelStyleDistribution.map((t) => (
                <div key={t.style} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 capitalize">{t.style}</span>
                  <span className="text-gray-400">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Interests */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Interests</h4>
          {data.topInterests.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="space-y-1.5">
              {data.topInterests.slice(0, 8).map((i) => (
                <div key={i.interest} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 capitalize">{i.interest.replace(/_/g, " ")}</span>
                  <span className="text-gray-400">{i.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
