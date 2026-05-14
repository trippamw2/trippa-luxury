"use client";

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, MessageCircle, CalendarCheck, Eye, Users } from "lucide-react";

const stats = [
  { label: "Total Inquiries", value: "0", change: "+0%", icon: MessageCircle, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Active Bookings", value: "0", change: "+0%", icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50" },
  { label: "Revenue (MTD)", value: "$0", change: "+0%", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Website Visitors", value: "0", change: "+0%", icon: Eye, color: "text-purple-600", bg: "bg-purple-50" },
];

const recentInquiries = [
  { name: "No inquiries yet", email: "", destination: "", date: "", status: "" },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to your Trippa admin panel.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-xs text-green-600 font-medium">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 border border-gray-100 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Recent Inquiries</h2>
          <div className="text-sm text-gray-400 py-8 text-center">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p>No inquiries yet. Inquiries will appear here once your site is live.</p>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: "View All Inquiries", href: "/admin/inquiries" },
              { label: "Manage Properties", href: "/admin/properties" },
              { label: "Create Package", href: "/admin/packages" },
              { label: "Write Blog Post", href: "/admin/blog" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="block w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Info */}
      <div className="bg-amber-50 border border-amber-200 p-6">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Setup Required</h3>
        <p className="text-xs text-amber-700 mb-3">
          To activate the admin panel, you need to:
        </p>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
          <li>Create a Supabase project at supabase.com</li>
          <li>Copy your project URL and anon key to <code className="bg-amber-100 px-1">.env.local</code></li>
          <li>Run the schema from <code className="bg-amber-100 px-1">supabase/schema.sql</code> in the Supabase SQL editor</li>
          <li>Create your first admin user in the Supabase Auth dashboard</li>
          <li>Add the user to the <code className="bg-amber-100 px-1">admin_profiles</code> table with role &apos;admin&apos;</li>
        </ol>
      </div>
    </div>
  );
}
