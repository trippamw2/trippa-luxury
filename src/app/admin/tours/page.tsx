"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit3, Copy, Eye, Clock, MapPin, DollarSign, Users, Calendar, CheckCircle, XCircle, Star } from "lucide-react";
import { formatDestination } from "@/lib/utils";

interface Tour {
  id: string;
  title: string;
  category: string;
  destination: string;
  durationDays: number;
  pricingFrom: number;
  currency: string;
  status: "active" | "draft" | "archived";
  bookings: number;
  rating: number;
  featured: boolean;
}

const MOCK_TOURS: Tour[] = [
  { id: "1", title: "Walking Safari Adventure", category: "Safari", destination: "south-luangwa", durationDays: 3, pricingFrom: 1200, currency: "USD", status: "active", bookings: 8, rating: 4.9, featured: true },
  { id: "2", title: "Sunset Dhow Cruise & Beach Dinner", category: "Romance", destination: "zanzibar", durationDays: 1, pricingFrom: 350, currency: "USD", status: "active", bookings: 15, rating: 4.8, featured: true },
  { id: "3", title: "Private Island Picnic Experience", category: "Romance", destination: "lake-malawi", durationDays: 1, pricingFrom: 450, currency: "USD", status: "active", bookings: 6, rating: 5.0, featured: false },
  { id: "4", title: "Full-Day Safari Game Drive", category: "Safari", destination: "south-luangwa", durationDays: 1, pricingFrom: 400, currency: "USD", status: "active", bookings: 22, rating: 4.7, featured: false },
  { id: "5", title: "Spice Plantation & Stone Town Tour", category: "Cultural", destination: "zanzibar", durationDays: 1, pricingFrom: 200, currency: "USD", status: "active", bookings: 12, rating: 4.5, featured: false },
  { id: "6", title: "Couples Spa & Wellness Retreat", category: "Wellness", destination: "zanzibar", durationDays: 3, pricingFrom: 1800, currency: "USD", status: "active", bookings: 4, rating: 4.9, featured: true },
  { id: "7", title: "Guided Kayak & Snorkel Expedition", category: "Adventure", destination: "lake-malawi", durationDays: 1, pricingFrom: 180, currency: "USD", status: "draft", bookings: 0, rating: 0, featured: false },
  { id: "8", title: "Stargazing Sleepout on the Floodplain", category: "Romance", destination: "south-luangwa", durationDays: 1, pricingFrom: 600, currency: "USD", status: "active", bookings: 3, rating: 5.0, featured: true },
];

const categoryColors: Record<string, string> = {
  Safari: "bg-amber-50 text-amber-700",
  Romance: "bg-rose-50 text-rose-700",
  Cultural: "bg-indigo-50 text-indigo-700",
  Wellness: "bg-emerald-50 text-emerald-700",
  Adventure: "bg-blue-50 text-blue-700",
  Dining: "bg-orange-50 text-orange-700",
};

export default function AdminTours() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTours = MOCK_TOURS.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tours & Experiences</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage tour products, activities, and experiences.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-all">
          <Plus className="w-4 h-4" />
          Create Tour
        </button>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Tours", value: "8", color: "text-gray-900", bg: "bg-gray-50" },
          { label: "Active Experiences", value: "6", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Safari Adventures", value: "3", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Romantic Experiences", value: "4", color: "text-rose-600", bg: "bg-rose-50" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white p-5 border border-gray-100">
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tours by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 focus:outline-none focus:border-gray-400"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tours Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTours.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-gray-400">No tours found. Create your first experience.</div>
        ) : (
          filteredTours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-white border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${categoryColors[tour.category] || "bg-gray-50 text-gray-600"}`}>
                    {tour.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {tour.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${tour.status === "active" ? "bg-emerald-50 text-emerald-700" : tour.status === "draft" ? "bg-gray-100 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
                      {tour.status}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{tour.title}</h3>
                <p className="text-xs text-gray-400 capitalize flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDestination(tour.destination)}
                </p>
              </div>

              {/* Card Details */}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tour.durationDays} {tour.durationDays === 1 ? "day" : "days"}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tour.bookings} bookings</span>
                  {tour.rating > 0 && <span className="flex items-center gap-1">&#9733; {tour.rating}</span>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {tour.currency} ${tour.pricingFrom.toLocaleString()}
                    <span className="text-xs text-gray-400 font-normal"> /person</span>
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-6 py-3 bg-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                  <button className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                  <button className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"><Copy className="w-3 h-3" /> Duplicate</button>
                </div>
                <button className="text-xs text-red-600 hover:text-red-800">Archive</button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Tour Creation Info */}
      <div className="mt-8 bg-amber-50 border border-amber-200 p-6">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Tour Management</h3>
        <p className="text-xs text-amber-700 mb-3">
          Create unique experiences that can be added to packages or booked independently. Each tour includes:
        </p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Detailed description, highlights, and what&apos;s included/excluded</li>
          <li>Availability calendar with seasonal pricing and capacity management</li>
          <li>Supplier assignments (guides, transport, activity providers)</li>
          <li>Integration with bookings and invoicing</li>
        </ul>
      </div>
    </div>
  );
}
