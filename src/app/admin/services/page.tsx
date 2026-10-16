"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, X, Search, Tag, Download } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";
import { exportToCsv } from "@/lib/csv-export";

interface Service {
  id: string;
  name: string;
  slug: string;
  category: string;
  destination: string;
  description: string;
  netCost: number;
  publicPrice: number | null;
  currency: string;
  availabilityModel: string;
  minPax: number;
  maxPax: number;
  isActive: boolean;
  isPublic: boolean;
  kivaraClassification: string;
  tags: string[];
}

interface ApiService {
  id: string;
  name?: string;
  slug?: string;
  category?: string;
  destination?: string;
  description?: string;
  netCost?: number;
  publicPrice?: number | null;
  currency?: string;
  availabilityModel?: string;
  minPax?: number;
  maxPax?: number;
  isActive?: boolean;
  isPublic?: boolean;
  kivaraClassification?: string | null;
  tags?: string[];
}

function mapService(item: ApiService): Service {
  return {
    id: item.id,
    name: item.name || "",
    slug: item.slug || "",
    category: item.category || "other",
    destination: item.destination || "",
    description: item.description || "",
    netCost: item.netCost ?? 0,
    publicPrice: item.publicPrice ?? null,
    currency: item.currency || "USD",
    availabilityModel: item.availabilityModel || "per_service",
    minPax: item.minPax ?? 1,
    maxPax: item.maxPax ?? 20,
    isActive: item.isActive !== false,
    isPublic: item.isPublic !== false,
    kivaraClassification: item.kivaraClassification || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

function mapServiceToApi(item: Partial<Service>): Record<string, unknown> {
  return {
    name: item.name,
    // An empty slug must reach the DB as NULL, not "": `slug` is UNIQUE and two
    // empty strings would collide on the second save.
    slug: item.slug || null,
    category: item.category,
    destination: item.destination || null,
    description: item.description,
    net_cost: item.netCost,
    public_price: item.publicPrice,
    currency: item.currency,
    availability_model: item.availabilityModel,
    min_pax: item.minPax,
    max_pax: item.maxPax,
    is_active: item.isActive,
    is_public: item.isPublic,
    kivara_classification: item.kivaraClassification || null,
    tags: item.tags,
  };
}

const CATEGORIES = [
  "accommodation",
  "transport",
  "experience",
  "dining",
  "wellness",
  "photography",
  "concierge",
  "other",
] as const;

const AVAILABILITY = [
  "per_night",
  "per_person",
  "per_room",
  "per_service",
  "per_group",
  "fixed",
  "on_request",
] as const;

const CLASSIFICATIONS = [
  { value: "", label: "Unclassified" },
  { value: "kivara_approved", label: "Kivara Approved" },
  { value: "kivara_preferred", label: "Kivara Preferred" },
  { value: "kivara_signature", label: "Kivara Signature" },
];

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: "bg-amber-50 text-amber-700 border-amber-200",
  transport: "bg-blue-50 text-blue-700 border-blue-200",
  experience: "bg-emerald-50 text-emerald-700 border-emerald-200",
  dining: "bg-orange-50 text-orange-700 border-orange-200",
  wellness: "bg-rose-50 text-rose-700 border-rose-200",
  photography: "bg-indigo-50 text-indigo-700 border-indigo-200",
  concierge: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

const emptyForm = {
  name: "",
  slug: "",
  category: "experience" as string,
  destination: "",
  description: "",
  netCost: "",
  publicPrice: "",
  currency: "USD",
  availabilityModel: "per_service" as string,
  minPax: "1",
  maxPax: "20",
  isActive: true,
  isPublic: true,
  kivaraClassification: "",
  tags: "",
};

export default function AdminServices() {
  const { data: services, loading, create, update, remove } = useApiData<Service, ApiService>("services", {
    mapFromApi: mapService,
    mapToApi: mapServiceToApi,
  });
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = services.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => setFormData(emptyForm);

  const openAddModal = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (service: Service) => {
    setEditing(service);
    setFormData({
      name: service.name,
      slug: service.slug,
      category: service.category,
      destination: service.destination,
      description: service.description,
      netCost: service.netCost ? service.netCost.toString() : "",
      publicPrice: service.publicPrice !== null ? service.publicPrice.toString() : "",
      currency: service.currency,
      availabilityModel: service.availabilityModel,
      minPax: service.minPax.toString(),
      maxPax: service.maxPax.toString(),
      isActive: service.isActive,
      isPublic: service.isPublic,
      kivaraClassification: service.kivaraClassification,
      tags: service.tags.join(", "),
    });
    setShowModal(true);
  };

  const payload = (): Partial<Service> => ({
    name: formData.name.trim(),
    slug: formData.slug.trim(),
    category: formData.category,
    destination: formData.destination.trim(),
    description: formData.description,
    netCost: parseFloat(formData.netCost) || 0,
    // Empty means "no public price recorded" (NULL), not a price of 0.
    publicPrice: formData.publicPrice.trim() === "" ? null : parseFloat(formData.publicPrice),
    currency: formData.currency || "USD",
    availabilityModel: formData.availabilityModel,
    minPax: parseInt(formData.minPax, 10) || 1,
    maxPax: parseInt(formData.maxPax, 10) || 1,
    isActive: formData.isActive,
    isPublic: formData.isPublic,
    kivaraClassification: formData.kivaraClassification,
    tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast("A service name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const result = await update(editing.id, payload());
        if (result) {
          toast("Service updated", "success");
          setShowModal(false);
          setEditing(null);
          resetForm();
        } else {
          toast("Failed to update service", "error");
        }
      } else {
        const result = await create({ ...payload() });
        if (result) {
          toast("Service created", "success");
          setShowModal(false);
          resetForm();
        } else {
          toast("Failed to create service", "error");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Service deleted", "success");
    } else {
      toast("Failed to delete service", "error");
    }
  };

  const toggleActive = async (service: Service) => {
    const result = await update(service.id, { isActive: !service.isActive });
    if (result) {
      toast(service.isActive ? "Service deactivated" : "Service activated", "success");
    } else {
      toast("Failed to update service", "error");
    }
  };

  const stats = {
    total: services.length,
    active: services.filter((s) => s.isActive).length,
    public: services.filter((s) => s.isPublic).length,
    signature: services.filter((s) => s.kivaraClassification === "kivara_signature").length,
  };

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Services</h1>
          <p className="text-earth mt-1">Manage luxury travel services, add-ons, and concierge offerings.</p>
        </div>
        <div className="flex items-center gap-2">
          {services.length > 0 && (
            <button
              onClick={() =>
                exportToCsv(
                  services,
                  [
                    { key: "name", header: "Name" },
                    { key: "category", header: "Category" },
                    { key: "destination", header: "Destination" },
                    { key: "netCost", header: "Net Cost" },
                    { key: "publicPrice", header: "Public Price" },
                    { key: "currency", header: "Currency" },
                    { key: "isActive", header: "Active" },
                  ],
                  "kivara-services"
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-sand-light text-sm text-earth hover:bg-warm-white hover:text-soft-black transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"
          >
            <Plus className="w-4 h-4" />
            New Service
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Services", value: stats.total, color: "text-soft-black" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          { label: "Public", value: stats.public, color: "text-gold" },
          { label: "Signature", value: stats.signature, color: "text-earth" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-sand-light p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-earth">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/60" />
          <input
            type="text"
            placeholder="Search services by name, category or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white capitalize"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-sand-light overflow-hidden">
        {loading ? (
          <div className="divide-y divide-sand-light">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <SkeletonText className="w-10 h-10" />
                <div className="flex-1 space-y-2">
                  <SkeletonText className="w-1/3" />
                  <SkeletonText className="w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No services yet"
            description={
              search || categoryFilter !== "all"
                ? "No services match your filters."
                : "Add your first service or add-on offering."
            }
            action={!search && categoryFilter === "all" ? { label: "New Service", onClick: openAddModal } : undefined}
          />
        ) : (
          <div className="divide-y divide-sand-light">
            {filtered.map((service) => (
              <div key={service.id} className="p-4 hover:bg-warm-white/60 flex items-center justify-between transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-cream border border-sand-light text-gold flex items-center justify-center font-semibold text-sm">
                    {service.name ? service.name.substring(0, 2).toUpperCase() : "SV"}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-soft-black">{service.name || "Untitled Service"}</h3>
                    <div className="flex items-center gap-3 text-xs text-earth mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 border capitalize ${CATEGORY_COLORS[service.category] || CATEGORY_COLORS.other}`}>
                        {service.category}
                      </span>
                      {service.destination && <span>{service.destination}</span>}
                      <span className="font-medium text-soft-black">
                        {service.publicPrice !== null
                          ? `${service.currency} ${service.publicPrice.toLocaleString()}`
                          : `${service.currency} —`}
                      </span>
                      {service.kivaraClassification && (
                        <span className="text-gold capitalize">{service.kivaraClassification.replace("kivara_", "")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                      service.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                    title="Toggle active"
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => openEditModal(service)}
                    className="p-2 text-gold hover:text-gold-dark"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(service.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light w-full max-w-3xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editing ? "Edit Service" : "Create New Service"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                <FormGroup>
                  <FormInput
                    label="Service Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Private Sunset Cruise"
                    required
                  />
                  <FormInput
                    label="Slug"
                    name="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="private-sunset-cruise"
                  />
                </FormGroup>
                <FormGroup>
                  <FormSelect
                    label="Category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                  />
                  <FormInput
                    label="Destination"
                    name="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="lake-malawi"
                  />
                </FormGroup>
                <FormTextarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the service offering..."
                />
                <FormGroup>
                  <FormInput
                    label="Net Cost"
                    name="netCost"
                    type="number"
                    value={formData.netCost}
                    onChange={(e) => setFormData({ ...formData, netCost: e.target.value })}
                    placeholder="0"
                  />
                  <FormInput
                    label="Public Price"
                    name="publicPrice"
                    type="number"
                    value={formData.publicPrice}
                    onChange={(e) => setFormData({ ...formData, publicPrice: e.target.value })}
                    placeholder="Leave blank if not yet priced"
                  />
                  <FormSelect
                    label="Currency"
                    name="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    options={[
                      { value: "USD", label: "USD" },
                      { value: "ZMW", label: "ZMW" },
                      { value: "EUR", label: "EUR" },
                      { value: "GBP", label: "GBP" },
                    ]}
                  />
                </FormGroup>
                <FormGroup>
                  <FormSelect
                    label="Availability Model"
                    name="availabilityModel"
                    value={formData.availabilityModel}
                    onChange={(e) => setFormData({ ...formData, availabilityModel: e.target.value })}
                    options={AVAILABILITY.map((a) => ({ value: a, label: a.replace(/_/g, " ") }))}
                  />
                  <FormSelect
                    label="Kivara Classification"
                    name="kivaraClassification"
                    value={formData.kivaraClassification}
                    onChange={(e) => setFormData({ ...formData, kivaraClassification: e.target.value })}
                    options={CLASSIFICATIONS}
                  />
                </FormGroup>
                <FormGroup>
                  <FormInput
                    label="Min Pax"
                    name="minPax"
                    type="number"
                    value={formData.minPax}
                    onChange={(e) => setFormData({ ...formData, minPax: e.target.value })}
                  />
                  <FormInput
                    label="Max Pax"
                    name="maxPax"
                    type="number"
                    value={formData.maxPax}
                    onChange={(e) => setFormData({ ...formData, maxPax: e.target.value })}
                  />
                </FormGroup>
                <FormInput
                  label="Tags (comma separated)"
                  name="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="romantic, sunset, boat"
                />
                <FormGroup>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 accent-gold"
                    />
                    <span className="text-sm text-earth">Active (available for use)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="w-4 h-4 accent-gold"
                    />
                    <span className="text-sm text-earth">Public (visible to guests)</span>
                  </label>
                </FormGroup>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this service?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
