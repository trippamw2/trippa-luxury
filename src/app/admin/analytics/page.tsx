"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { RevenueByDestination } from "../components/RevenueByDestination";
import { GuestRepeatRate } from "../components/GuestRepeatRate";
import { StatusDistributionChart } from "../components/StatusDistributionChart";

interface AdvancedAnalytics {
  monthlyRevenue: { month: string; revenue: number }[];
  conversionRate: number;
  totalInquiries: number;
  totalBookings: number;
  averageBookingValue: number;
  totalRevenue: number;
  revenueByDestination: { destination: string; revenue: number }[];
  uniqueGuests: number;
  returningGuests: number;
  repeatRate: number;
  statusCounts: Record<string, number>;
  monthlyBookings: { month: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/advanced")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => console.error("Analytics fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#8B7D6B]">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-soft-black">Advanced Analytics</h1>
        <p className="text-earth mt-1">Comprehensive business intelligence dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-[#C9A96E]/10 flex items-center justify-center rounded">
              <DollarSign className="w-4 h-4 text-[#C9A96E]" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">${data.totalRevenue.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 flex items-center justify-center rounded">
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Conversion Rate</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.conversionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{data.totalBookings} bookings / {data.totalInquiries} inquiries</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-50 flex items-center justify-center rounded">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Avg. Booking Value</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">${data.averageBookingValue.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-purple-50 flex items-center justify-center rounded">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Repeat Rate</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.repeatRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{data.returningGuests} of {data.uniqueGuests} guests</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RevenueByDestination data={data.revenueByDestination} />
        <GuestRepeatRate uniqueGuests={data.uniqueGuests} returningGuests={data.returningGuests} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatusDistributionChart data={data.statusCounts} />
        <div className="bg-white border border-gray-100 p-5">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Monthly Bookings
          </h3>
          <div className="space-y-2">
            {data.monthlyBookings.slice(-6).map((m) => (
              <div key={m.month} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{m.month}</span>
                <span className="font-medium text-gray-900">{m.count} bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
