"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Building2, Plane, Car, Ship, MapPin, Phone, Mail, Star, Shield, MoreHorizontal, CheckCircle, Hotel, Users } from "lucide-react";

type SupplierCategory = "lodge" | "airline" | "car-rental" | "transfer" | "activity" | "spa" | "catering";

interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  location: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  commissionRate: number;
  rating: number;
  status: "active" | "inactive" | "blacklisted";
  contractOnFile: boolean;
  bookingsCount: number;
  totalRevenue: number;
}

const categoryConfig: Record<SupplierCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  lodge: { label: "Lodges & Camps", icon: Hotel, color: "text-amber-600", bg: "bg-amber-50" },
  airline: { label: "Airlines", icon: Plane, color: "text-blue-600", bg: "bg-blue-50" },
  "car-rental": { label: "Car Rentals", icon: Car, color: "text-indigo-600", bg: "bg-indigo-50" },
  transfer: { label: "Transfers", icon: Ship, color: "text-cyan-600", bg: "bg-cyan-50" },
  activity: { label: "Activity Providers", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
  spa: { label: "Spa & Wellness", icon: Shield, color: "text-rose-600", bg: "bg-rose-50" },
  catering: { label: "Catering & Dining", icon: Star, color: "text-orange-600", bg: "bg-orange-50" },
};

const MOCK_SUPPLIERS: Supplier[] = [
  { id: "1", name: "Kaya Mawa", category: "lodge", location: "Likoma Island", country: "Malawi", contactPerson: "John Chibwana", email: "reservations@kayamawa.com", phone: "+265 888 123 456", commissionRate: 15, rating: 4.9, status: "active", contractOnFile: true, bookingsCount: 12, totalRevenue: 84000 },
  { id: "2", name: "Puku Ridge Camp", category: "lodge", location: "South Luangwa", country: "Zambia", contactPerson: "Grace Banda", email: "grace@pukuridge.com", phone: "+260 977 123 456", commissionRate: 18, rating: 4.9, status: "active", contractOnFile: true, bookingsCount: 18, totalRevenue: 126000 },
  { id: "3", name: "ProFlight Zambia", category: "airline", location: "Lusaka", country: "Zambia", contactPerson: "Michael Zulu", email: "charter@proflight.zm", phone: "+260 211 123 456", commissionRate: 8, rating: 4.5, status: "active", contractOnFile: true, bookingsCount: 32, totalRevenue: 48000 },
  { id: "4", name: "Zanzibar Luxury Transfers", category: "transfer", location: "Zanzibar", country: "Tanzania", contactPerson: "Ali Hassan", email: "ali@zlt.co.tz", phone: "+255 777 123 456", commissionRate: 10, rating: 4.3, status: "active", contractOnFile: false, bookingsCount: 24, totalRevenue: 14400 },
  { id: "5", name: "Avis Zanzibar", category: "car-rental", location: "Zanzibar", country: "Tanzania", contactPerson: "Fatima Juma", email: "zanzibar@avis.com", phone: "+255 774 456 789", commissionRate: 5, rating: 4.2, status: "active", contractOnFile: true, bookingsCount: 8, totalRevenue: 6400 },
  { id: "6", name: "Xanadu Villas", category: "lodge", location: "Kendwa", country: "Tanzania", contactPerson: "Sophie Laurent", email: "concierge@xanadu.com", phone: "+255 776 789 012", commissionRate: 15, rating: 4.9, status: "active", contractOnFile: true, bookingsCount: 15, totalRevenue: 105000 },
  { id: "7", name: "Bush & Beyond Guides", category: "activity", location: "South Luangwa", country: "Zambia", contactPerson: "David Mwale", email: "david@bushandbeyond.com", phone: "+260 966 345 678", commissionRate: 12, rating: 4.8, status: "active", contractOnFile: true, bookingsCount: 45, totalRevenue: 36000 },
  { id: "8", name: "Malawi Air Charters", category: "airline", location: "Lilongwe", country: "Malawi", contactPerson: "Chimwemwe Phiri", email: "charter@malawiair.mw", phone: "+265 999 234 567", commissionRate: 8, rating: 4.4, status: "inactive", contractOnFile: false, bookingsCount: 6, totalRevenue: 12000 },
  { id: "9", name: "Ocean Spa Zanzibar", category: "spa", location: "Paje", country: "Tanzania", contactPerson: "Aisha Mohammed", email: "aisha@oceanspa.co.tz", phone: "+255 773 890 123", commissionRate: 20, rating: 4.7, status: "active", contractOnFile: true, bookingsCount: 20, totalRevenue: 16000 },
];

const statusConfig = {
  active: { label: "Active", color: "text-emerald-700", bg: "bg-emerald-50" },
  inactive: { label: "Inactive", color: "text-gray-600", bg: "bg-gray-100" },
  blacklisted: { label: "Blacklisted", color: "text-red-700", bg: "bg-red-50" },
};



export default function AdminSuppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupplierCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredSuppliers = MOCK_SUPPLIERS.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase()) || s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalCommissions = MOCK_SUPPLIERS.filter(s => s.status === "active").reduce((sum, s) => sum + (s.totalRevenue * s.commissionRate / 100), 0);


  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage lodges, airlines, car rentals, transfer services, and activity partners.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-all">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Suppliers", value: MOCK_SUPPLIERS.length.toString() },
          { label: "Active Partners", value: MOCK_SUPPLIERS.filter(s => s.status === "active").length.toString() },
          { label: "Lodges & Camps", value: MOCK_SUPPLIERS.filter(s => s.category === "lodge").length.toString() },
          { label: "Airlines & Transfers", value: MOCK_SUPPLIERS.filter(s => s.category === "airline" || s.category === "transfer").length.toString() },
          { label: "Comm. This Month", value: `$${Math.round(totalCommissions / 12).toLocaleString()}` },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white p-4 border border-gray-100">
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const count = MOCK_SUPPLIERS.filter(s => s.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key as SupplierCategory)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${categoryFilter === key ? `${config.bg} ${config.color} ring-1 ring-inset ring-current` : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
            >
              <config.icon className="w-3.5 h-3.5" />
              {config.label}
              <span className="ml-0.5 opacity-60">({count})</span>
            </button>
          );
        })}
        {categoryFilter !== "all" && (
          <button onClick={() => setCategoryFilter("all")} className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600">Clear filter</button>
        )}
      </div>

      <div className="bg-white border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search suppliers by name, location, or contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 focus:outline-none focus:border-gray-400">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-gray-100 p-12 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No suppliers found matching your criteria.</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier, index) => {
            const category = categoryConfig[supplier.category];
            const status = statusConfig[supplier.status];
            const Icon = category.icon;

            return (
              <motion.div key={supplier.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="bg-white border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${category.bg}`}>
                      <Icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">{supplier.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${category.bg} ${category.color}`}>{category.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.color}`}>{status.label}</span>
                        {supplier.contractOnFile && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> Contract
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.location}, {supplier.country}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{supplier.rating}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                        <span>Contact: {supplier.contactPerson}</span>
                        <span>Commission: {supplier.commissionRate}%</span>
                        <span>{supplier.bookingsCount} bookings</span>
                        <span className="font-medium text-gray-600">${supplier.totalRevenue.toLocaleString()} revenue</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors">View</button>
                    <button className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">Edit</button>
                    <button className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
