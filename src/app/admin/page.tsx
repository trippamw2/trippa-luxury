"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, DollarSign, MessageCircle, CalendarCheck, Eye, Users, Building, Plane, Receipt, ArrowRight, Plus, Luggage, MapPin, CreditCard } from "lucide-react";

const stats = [
  { label: "New Inquiries (This Month)", value: "12", change: "+20%", icon: MessageCircle, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Active Bookings", value: "5", change: "+25%", icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50" },
  { label: "Revenue (MTD)", value: "$142,800", change: "+12.5%", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Active Suppliers", value: "7", change: "+2", icon: Building, color: "text-purple-600", bg: "bg-purple-50" },
  { label: "Tours Available", value: "8", change: "+3", icon: Luggage, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Upcoming Check-ins", value: "3", change: "This week", icon: Eye, color: "text-indigo-600", bg: "bg-indigo-50" },
];

const recentInquiries = [
  { name: "Sarah & James Mitchell", email: "sarah@example.com", destination: "Lake Malawi & Zanzibar", date: "2 hours ago", status: "new" },
  { name: "Alexander & Natalia Petrov", email: "alex@example.com", destination: "Zanzibar", date: "1 day ago", status: "new" },
  { name: "David & Claire Mueller", email: "david@example.com", destination: "Lake Malawi", date: "2 days ago", status: "read" },
];

const upcomingBookings = [
  { ref: "TRP-0005", client: "Anders & Ingrid Solberg", checkIn: "Jun 10, 2026", destination: "South Luangwa", status: "In Progress" },
  { ref: "TRP-0003", client: "Alexander & Natalia Petrov", checkIn: "Jul 20, 2026", destination: "Zanzibar", status: "Provisional" },
  { ref: "TRP-0001", client: "Sarah & James Mitchell", checkIn: "Aug 15, 2026", destination: "Lake Malawi & Zanzibar", status: "Confirmed" },
];

export default function AdminDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your luxury travel company command center.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {stats.map((stat, index) => (
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
              <span className="text-[10px] text-green-600 font-medium">{stat.change}</span>
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
            {recentInquiries.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p>No inquiries yet. They will appear here once your site is live and Supabase is connected.</p>
              </div>
            ) : (
              recentInquiries.map((inquiry, i) => (
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
                    <p className="text-[10px] text-gray-400 mt-1">{inquiry.date}</p>
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
              {upcomingBookings.map((booking, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-medium text-indigo-600">{booking.ref}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{booking.client}</td>
                  <td className="px-5 py-3.5 text-gray-500">{booking.destination}</td>
                  <td className="px-5 py-3.5 text-gray-500">{booking.checkIn}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${booking.status === "Confirmed" ? "bg-green-50 text-green-700" : booking.status === "In Progress" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
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
            {[
              { name: "Walking Safari Adventure", bookings: 8, revenue: 9600 },
              { name: "Sunset Dhow Cruise & Beach Dinner", bookings: 15, revenue: 5250 },
              { name: "Couples Spa & Wellness Retreat", bookings: 4, revenue: 7200 },
            ].map((tour) => (
              <div key={tour.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{tour.name}</span>
                <span className="text-gray-400 text-xs">{tour.bookings} bookings &middot; ${tour.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suppliers Summary */}
        <div className="bg-white border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Supplier Partners</h3>
            <Link href="/admin/suppliers" className="text-xs text-indigo-600 hover:text-indigo-800">Manage</Link>
          </div>
          <div className="space-y-3">
            {[
              { name: "Kaya Mawa", type: "Lodge", commission: 15, revenue: 84000 },
              { name: "Puku Ridge Camp", type: "Lodge", commission: 18, revenue: 126000 },
              { name: "ProFlight Zambia", type: "Airline", commission: 8, revenue: 48000 },
              { name: "Bush & Beyond Guides", type: "Activity", commission: 12, revenue: 36000 },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">{s.name}</span>
                  <span className="text-[10px] text-gray-400">({s.type})</span>
                </div>
                <span className="text-gray-400 text-xs">{s.commission}% &middot; ${s.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
