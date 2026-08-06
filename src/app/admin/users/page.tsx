"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Plus, User, Mail } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormSelect } from "@/app/admin/components/FormField";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "agent";
  status: "active" | "invited" | "suspended";
  lastActive: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

interface ApiAdminUser {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  updatedAt?: string;
  createdAt?: string;
  password?: string;
}

function mapUser(item: ApiAdminUser): AdminUser {
  return {
    id: item.id,
    name: item.fullName || "",
    email: item.email || "",
    role: (item.role || "editor") as AdminUser["role"],
    status: item.isActive ? "active" : "suspended",
    lastActive: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Never",
    createdAt: item.createdAt ? item.createdAt.split("T")[0] : "",
  };
}

function mapUserToApi(item: Partial<AdminUser & { password?: string }>): Record<string, unknown> {
  const pwd = item.password;
  return {
    full_name: item.name,
    email: item.email,
    role: item.role,
    is_active: item.status === "active",
    ...(pwd ? { password: pwd } : {}),
  };
}

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-indigo-50 text-indigo-700 border-indigo-200",
  editor: "bg-amber-50 text-amber-700 border-amber-200",
  agent: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_BADGES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  invited: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "agent", label: "Agent" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminUsers() {
  const { data: users, loading, create, update, remove } = useApiData("users", {
    mapFromApi: mapUser,
    mapToApi: mapUserToApi,
  });
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "editor" as "admin" | "editor" | "agent", status: "active" as "active" | "invited" | "suspended", password: "" });

  const resetForm = () => setFormData({ name: "", email: "", role: "editor", status: "active", password: "" });

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      resetForm();
      toast("User created", "success");
    } else {
      toast("Failed to create user", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    const result = await update(editingUser.id, formData);
    if (result) {
      setEditingUser(null);
      setShowModal(false);
      toast("User updated", "success");
    } else {
      toast("Failed to update user", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("User deleted", "success");
    } else {
      toast("Failed to delete user", "error");
    }
  };

  const openAddModal = () => { setEditingUser(null); resetForm(); setShowModal(true); };
  const openEditModal = (u: AdminUser) => { setEditingUser(u); setFormData({ name: u.name, email: u.email, role: u.role, status: u.status, password: "" }); setShowModal(true); };

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Users</h1><p className="text-earth mt-1">Manage admin users and roles</p></div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors"><Plus className="w-4 h-4" />Add User</button>
      </div>

      {loading ? (
        <div className="bg-white border border-sand-light divide-y divide-sand-light">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-sand-light" />
              <div className="flex-1 space-y-1"><SkeletonText className="w-1/3" /><SkeletonText className="w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Add admin users to manage the platform." action={{ label: "Add User", onClick: openAddModal }} />
      ) : (
        <div className="bg-white border border-sand-light divide-y divide-sand-light">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 hover:bg-warm-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center"><User className="w-5 h-5 text-gold" /></div>
                <div><p className="font-medium text-soft-black">{u.name}</p><p className="text-xs text-earth flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium border ${ROLE_BADGES[u.role] || ""}`}>{u.role}</span>
                <span className={`px-2 py-0.5 text-xs font-medium border ${STATUS_BADGES[u.status] || ""}`}>{u.status}</span>
                <span className="text-xs text-earth hidden md:inline">{u.lastActive}</span>
                <button onClick={() => openEditModal(u)} className="text-xs text-gold ml-3 hover:underline">Edit</button>
                <button onClick={() => setDeleteConfirm(u.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editingUser ? "Edit User" : "Add User"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <FormInput label="Name" name="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                <FormInput label="Email" name="email" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
                {!editingUser && (
                  <FormInput label="Password" name="password" type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required placeholder="Min. 6 characters" />
                )}
                <FormSelect label="Role" name="role" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as AdminUser["role"] }))} options={ROLES} />
                <FormSelect label="Status" name="status" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as AdminUser["status"] }))} options={STATUSES} />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingUser ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editingUser ? "Save" : "Add User"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete User</h3>
              <p className="text-sm text-earth mb-6">Delete this user?</p>
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
