"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Eye } from "lucide-react";

const STATS = [
  { label: "Total Revenue (MTD)", value: "$84,500", change: "+12%", positive: true, icon: DollarSign, color: "text-emerald-600" },
  { label: "Active Bookings", value: "12", change: "+3", positive: true, icon: Calendar, color: "text-blue-600" },
  { label: "Website Visitors (MTD)", value: "3,842", change: "+28%", positive: true, icon: Eye, color: "text-indigo-600" },
  { label: "Conversion Rate", value: "4.2%", change: "+0.8%", positive: true, icon: TrendingUp, color: "text-amber-600" },
];

const RECENT_ACTIVITY = [
  { action: "New booking confirmed", detail: "TRP-0009 — Beach & Bush Escape", time: "10 min ago" },
  { action: "Inquiry received", detail: "Sarah & James Mitchell — Lake Malawi", time: "2 hours ago" },
  { action: "Payment processed", detail: "TRP-0002 — $6,800 deposit received", time: "4 hours ago" },
  { action: "Tour created", detail: "Walking Safari Adventure — South Luangwa", time: "1 day ago" },
  { action: "Property updated", detail: "Kaya Mawa — pricing and availability", time: "2 days ago" },
];

export default function AdminAnalytics() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track traffic, bookings, and conversions.</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-5 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <span className={`text-xs font-medium ${stat.positive ? "text-emerald-600" : "text-red-600"}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend (chart placeholder) */}
        <div className="bg-white border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h3>
          <div className="flex items-end gap-3 h-40">
            {[
              { label: "Dec", value: 45 },
              { label: "Jan", value: 52 },
              { label: "Feb", value: 38 },
              { label: "Mar", value: 61 },
              { label: "Apr", value: 72 },
              { label: "May", value: 85 },
            ].map((month) => (
              <div key={month.label} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gold/70 rounded-t"
                  style={{ height: `${month.value}%` }}
                />
                <span className="text-xs text-gray-400">{month.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
            <span>Connect Google Analytics for detailed insights</span>
            <span className="text-indigo-600 cursor-pointer hover:text-indigo-800">Set up &rarr;</span>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="w-2 h-2 mt-1.5 rounded-full bg-gold shrink-0" />
                <div>
                  <p className="text-sm text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-400">{item.detail}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
