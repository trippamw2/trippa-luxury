"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Calendar, MapPin, Clock, ArrowRight, CheckCircle, X } from "lucide-react";

interface ItineraryItem {
  id: string;
  title: string;
  client_name?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  created_at: string;
}

interface ApiItinerary {
  id: string;
  title?: string;
  client_name?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  created_at?: string;
}

export default function AdminItineraries() {
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    client_name: "",
    destination: "",
    start_date: "",
    end_date: "",
  });

  const fetchItineraries = () => {
    setLoading(true);
    fetch("/api/admin/itinerary")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setItineraries((json.data || json || []).map(mapApi));
      })
      .catch((err) => console.error("Itineraries fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  function mapApi(item: ApiItinerary): ItineraryItem {
    return {
      id: item.id,
      title: item.title || "Untitled Itinerary",
      client_name: item.client_name || "",
      status: item.status || "active",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      destination: item.destination || "",
      created_at: item.created_at || "",
    };
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          client_name: formData.client_name,
          destination: formData.destination,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: "active",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create itinerary");
      setIsModalOpen(false);
      setFormData({ title: "", client_name: "", destination: "", start_date: "", end_date: "" });
      fetchItineraries();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create itinerary");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = itineraries.filter(
    (item) =>
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.destination?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Itineraries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage guest travel itineraries and day-by-day schedules.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Itinerary
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search itineraries by title, client, or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading itineraries...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No itineraries found</h3>
            <p className="text-xs text-gray-500 mt-1">Get started by creating a new travel itinerary.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-semibold text-sm">
                    {item.title ? item.title.substring(0, 2).toUpperCase() : "IT"}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{item.title || "Untitled Itinerary"}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      {item.client_name && <span>Client: {item.client_name}</span>}
                      {item.destination && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {item.destination}
                        </span>
                      )}
                      {item.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.start_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 capitalize">
                    {item.status || "Active"}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create New Itinerary</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Itinerary Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10-Day Luangwa & Lower Zambezi Expedition"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julian Sterling"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Primary Destination</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Luangwa, Zambia"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Creating..." : "Save Itinerary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
