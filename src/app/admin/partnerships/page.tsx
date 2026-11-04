"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Handshake, Plus, X, Edit2, Trash2, Mail, Globe2 } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { DataTable, type Column } from "@/app/admin/components/DataTable";
import { FormInput, FormSelect, FormTextarea } from "@/app/admin/components/FormField";

/**
 * Partnership records.
 *
 * `/api/admin/partnerships` used to be a scoring endpoint with nowhere to keep
 * the result. Migration 053 added the table; this screen is the CRUD surface:
 * pipeline status, contact details, AI fit score and notes.
 */

const CATEGORIES = [
  { value: "hotel", label: "Hotel" },
  { value: "dmc", label: "DMC" },
  { value: "brand", label: "Brand" },
  { value: "airline", label: "Airline" },
  { value: "media", label: "Media" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "declined", label: "Declined" },
];

const STATUS_STYLES: Record<string, string> = {
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};

interface Partnership {
  id: string;
  partnerName: string;
  category: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  country: string | null;
  fitScore: number | null;
  notes: string | null;
  source: string | null;
  createdAt: string | null;
}

interface ApiPartnership {
  id: string;
  partnerName?: string | null;
  category?: string | null;
  status?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  country?: string | null;
  fitScore?: number | null;
  notes?: string | null;
  source?: string | null;
  createdAt?: string | null;
}

function mapPartnership(item: ApiPartnership): Partnership {
  return {
    id: item.id,
    partnerName: item.partnerName ?? "",
    category: item.category ?? "hotel",
    status: item.status ?? "prospect",
    contactName: item.contactName ?? null,
    contactEmail: item.contactEmail ?? null,
    country: item.country ?? null,
    fitScore: typeof item.fitScore === "number" ? item.fitScore : null,
    notes: item.notes ?? null,
    source: item.source ?? null,
    createdAt: item.createdAt ?? null,
  };
}

interface FormState {
  partnerName: string;
  category: string;
  status: string;
  contactName: string;
  contactEmail: string;
  country: string;
  fitScore: string;
  notes: string;
  source: string;
}

const EMPTY_FORM: FormState = {
  partnerName: "",
  category: "hotel",
  status: "prospect",
  contactName: "",
  contactEmail: "",
  country: "",
  fitScore: "",
  notes: "",
  source: "",
};

export default function AdminPartnerships() {
  const { data: partners, loading, create, update, remove } = useApiData<
    Partnership,
    ApiPartnership
  >("partnerships", { mapFromApi: mapPartnership });
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partnership | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("all");

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (partner: Partnership) => {
    setEditing(partner);
    setForm({
      partnerName: partner.partnerName,
      category: partner.category,
      status: partner.status,
      contactName: partner.contactName ?? "",
      contactEmail: partner.contactEmail ?? "",
      country: partner.country ?? "",
      fitScore: partner.fitScore === null ? "" : String(partner.fitScore),
      notes: partner.notes ?? "",
      source: partner.source ?? "",
    });
    setShowModal(true);
  };

  const payload = () => ({
    partnerName: form.partnerName.trim(),
    category: form.category,
    status: form.status,
    contactName: form.contactName.trim(),
    contactEmail: form.contactEmail.trim(),
    country: form.country.trim(),
    fitScore: form.fitScore.trim() === "" ? null : Number(form.fitScore),
    notes: form.notes.trim(),
    source: form.source.trim(),
  });

  const handleSave = async () => {
    if (!form.partnerName.trim()) {
      toast("Partner name is required", "error");
      return;
    }
    const result = editing ? await update(editing.id, payload()) : await create(payload());
    if (result) {
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      toast(editing ? "Partner updated" : "Partner added", "success");
    } else {
      toast("Failed to save partner", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Partner removed", "success");
    } else {
      toast("Failed to remove partner", "error");
    }
  };

  const filtered = statusFilter === "all"
    ? partners
    : partners.filter((p) => p.status === statusFilter);

  const columns: Column<Partnership>[] = [
    {
      key: "partnerName",
      header: "Partner",
      render: (p) => (
        <div>
          <p className="font-medium text-soft-black">{p.partnerName}</p>
          <p className="text-xs text-earth capitalize">{p.category}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (p) => (
        <div className="text-xs text-earth space-y-0.5">
          {p.contactName && <p>{p.contactName}</p>}
          {p.contactEmail && (
            <p className="flex items-center gap-1">
              <Mail className="w-3 h-3" />{p.contactEmail}
            </p>
          )}
          {p.country && (
            <p className="flex items-center gap-1">
              <Globe2 className="w-3 h-3" />{p.country}
            </p>
          )}
          {!p.contactName && !p.contactEmail && !p.country && <span className="text-earth/50">—</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <span className={`px-2 py-0.5 text-xs font-medium border capitalize ${STATUS_STYLES[p.status] ?? ""}`}>
          {p.status}
        </span>
      ),
    },
    {
      key: "fitScore",
      header: "Fit",
      render: (p) => (p.fitScore === null ? <span className="text-earth/50">—</span> : <span className="font-medium text-soft-black">{p.fitScore}</span>),
    },
    {
      key: "notes",
      header: "Notes",
      render: (p) => <span className="text-xs text-earth line-clamp-2">{p.notes || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(p)} className="p-1.5 text-gold hover:bg-sand-light rounded" title="Edit partner">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-red-400 hover:bg-sand-light rounded" title="Delete partner">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Partnerships</h1>
          <p className="text-earth mt-1">Hotels, DMCs, brands and media partners — pipeline and fit</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">
          <Plus className="w-4 h-4" />Add Partner
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: partners.length },
          { label: "Active", value: partners.filter((p) => p.status === "active").length },
          { label: "Prospects", value: partners.filter((p) => p.status === "prospect").length },
          { label: "Avg fit", value: (() => {
            const scored = partners.filter((p) => p.fitScore !== null);
            if (scored.length === 0) return "—";
            return Math.round(scored.reduce((sum, p) => sum + (p.fitScore ?? 0), 0) / scored.length);
          })() },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 border border-sand-light">
            <p className="text-2xl font-bold text-soft-black">{stat.value}</p>
            <p className="text-xs text-earth">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search partners..."
        loading={loading}
        emptyState={
          <div className="text-center py-12">
            <Handshake className="w-10 h-10 text-earth/30 mx-auto mb-3" />
            <p className="text-sm text-earth">No partners yet. Add the first hotel, DMC or brand.</p>
          </div>
        }
      />

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light w-full max-w-xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editing ? "Edit Partner" : "Add Partner"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <FormInput label="Partner name" name="partnerName" value={form.partnerName} onChange={(e) => setForm((p) => ({ ...p, partnerName: e.target.value }))} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect label="Category" name="category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} options={CATEGORIES} />
                  <FormSelect label="Status" name="status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} options={STATUSES} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Contact name" name="contactName" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
                  <FormInput label="Contact email" name="contactEmail" type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Country" name="country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                  <FormInput label="Fit score (0-100)" name="fitScore" type="number" value={form.fitScore} onChange={(e) => setForm((p) => ({ ...p, fitScore: e.target.value }))} placeholder="Optional" />
                </div>
                <FormInput label="Source" name="source" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} placeholder="Referral, trade show, outreach..." />
                <FormTextarea label="Notes" name="notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={4} />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editing ? "Save" : "Add Partner"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Remove Partner</h3>
              <p className="text-sm text-earth mb-6">This deletes the partnership record. Continue?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
