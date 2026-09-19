"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Tag, DollarSign, CheckCircle, X, ArrowRight } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  category?: string;
  price?: number;
  description?: string;
  is_active?: boolean;
}

export default function AdminServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/services")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setServices(json.data || json || []);
      })
      .catch((err) => console.error("Services fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = services.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-1">Manage luxury travel services, add-ons, and concierge offerings.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search services by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading services...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No services found</h3>
            <p className="text-xs text-gray-500 mt-1">Add your first service or add-on offering.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-semibold text-sm">
                    {item.name ? item.name.substring(0, 2).toUpperCase() : "SV"}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{item.name || "Untitled Service"}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      {item.category && <span className="capitalize">Category: {item.category}</span>}
                      {item.price !== undefined && (
                        <span className="flex items-center gap-1 font-medium text-gray-900">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          {item.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
