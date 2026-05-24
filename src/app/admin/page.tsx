"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, MessageCircle, CalendarCheck, Eye, Users, Building, Plane, Receipt, ArrowRight, Plus, Luggage, MapPin } from "lucide-react";

interface DashboardData {
  totalProperties: number;
  totalBookings: number;
  totalInquiries: number;
  totalTours: number;
  totalPackages: number;
  totalSuppliers: number;
  pendingInquiries: number;
  activeBookings: number;
  totalRevenue: number;
  upcomingCheckins: number;
  recentInquiries: { name: string; email: string; destination: string; date: string; status: string }[];
  upcomingBookings: { ref: string; client: string; destination: string; checkIn: string; status: string }[];
  tourSummary: { name: string; bookings: number; revenue: number }[];
  supplierSummary: { name: string; type: string; commission: number; revenue: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => console.error("Dashboard fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const statCards = data
    ? [
        { label: "New Inquiries", value: String(data.pendingInquiries), change: `${data.totalInquiries} total`, icon: MessageCircle, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Active Bookings", value: String(data.activeBookings), change: `${data.totalBookings} total`, icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50" },
        { label: "Revenue", value: `$${data.totalRevenue.toLocaleString()}`, change: "All time", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Suppliers", value: String(data.totalSuppliers), change: "Active partners", icon: Building, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Tours", value: String(data.totalTours), change: "Available", icon: Luggage, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Upcoming Check-ins", value: String(data.upcomingCheckins), change: "Next 7 days", icon: Eye, color: "text-indigo-600", bg: "bg-indigo-50" },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your luxury travel company command center.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">Loading dashboard...</div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">{stat.change}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Recent Inquiries */}
            <div className="lg:col-span-2 bg-white border border-gray-100">
              <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Recent Inquiries</h2>
                <Link href="/admin/inquiries" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {!data || data.recentInquiries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p>No inquiries yet.</p>
                  </div>
                ) : (
                  data.recentInquiries.map((inquiry, i) => (
                    <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-50 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inquiry.name}</p>
                          <p className="text-xs text-gray-400">{inquiry.email} &middot; {inquiry.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${inquiry.status === "new" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {inquiry.status}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {inquiry.date ? new Date(inquiry.date).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-100">
              <div className="p-5 border-b border-gray-50">
                <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                {[
{ label: "New Booking", href: "/admin/bookings", icon: CalendarCheck, color: "text-green-600" },
                  { label: "AI Journey Curation", href: "/admin/ai-journeys", icon: Plane, color: "text-purple-600" },
                  { label: "Create Tour", href: "/admin/tours", icon: Plus, color: "text-amber-600" },
                  { label: "Add Supplier", href: "/admin/suppliers", icon: Building, color: "text-purple-600" },
                  { label: "New Invoice", href: "/admin/finance", icon: Receipt, color: "text-indigo-600" },
                  { label: "View Inquiries", href: "/admin/inquiries", icon: MessageCircle, color: "text-blue-600" },
                  { label: "Manage Properties", href: "/admin/properties", icon: MapPin, color: "text-rose-600" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white border border-gray-100 mb-8">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Upcoming Bookings</h2>
              <Link href="/admin/bookings" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Manage Bookings <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Reference</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Destination</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Check-In</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!data || data.upcomingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No upcoming bookings.</td>
                    </tr>
                  ) : (
                    data.upcomingBookings.map((booking, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-indigo-600">{booking.ref}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">{booking.client}</td>
                        <td className="px-5 py-3.5 text-gray-500">{booking.destination}</td>
                        <td className="px-5 py-3.5 text-gray-500">{booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : ""}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${
                            booking.status === "confirmed" ? "bg-green-50 text-green-700" :
                            booking.status === "in_progress" ? "bg-indigo-50 text-indigo-700" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {booking.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product & Supplier Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tours Summary */}
            <div className="bg-white border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Tours & Experiences</h3>
                <Link href="/admin/tours" className="text-xs text-indigo-600 hover:text-indigo-800">Manage</Link>
              </div>
              <div className="space-y-3">
                {data && data.tourSummary.length > 0 ? (
                  data.tourSummary.slice(0, 5).map((tour) => (
                    <div key={tour.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{tour.name}</span>
                      <span className="text-gray-400 text-xs">{tour.bookings} bookings &middot; ${tour.revenue.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No tour data yet.</p>
                )}
              </div>
            </div>

            {/* Suppliers Summary */}
            <div className="bg-white border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Supplier Partners</h3>
                <Link href="/admin/suppliers" className="text-xs text-indigo-600 hover:text-indigo-800">Manage</Link>
              </div>
              <div className="space-y-3">
                {data && data.supplierSummary.length > 0 ? (
                  data.supplierSummary.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{s.name}</span>
                        <span className="text-[10px] text-gray-400">({s.type})</span>
                      </div>
                      <span className="text-gray-400 text-xs">{s.commission}% &middot; ${s.revenue.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No supplier data yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
