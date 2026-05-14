"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Edit2, Trash2, X, Check, AlertCircle, Plus, Search, Mail, User } from "lucide-react";

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

const MOCK_USERS: AdminUser[] = [
  { id: "1", name: "Admin User", email: "admin@trippa.luxury", role: "admin", status: "active", lastActive: "Just now", createdAt: "2024-01-15" },
  { id: "2", name: "Sarah Content", email: "sarah@trippa.luxury", role: "editor", status: "active", lastActive: "2 hours ago", createdAt: "2024-02-20" },
  { id: "3", name: "James Concierge", email: "james@trippa.luxury", role: "agent", status: "active", lastActive: "1 day ago", createdAt: "2024-03-10" },
  { id: "4", name: "Emma Marketing", email: "emma@trippa.luxury", role: "editor", status: "invited", lastActive: "Never", createdAt: "2024-04-01" },
  { id: "5", name: "David Ops", email: "david@trippa.luxury", role: "agent", status: "suspended", lastActive: "2 weeks ago", createdAt: "2024-01-20" },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin", description: "Full access to all features" },
  { value: "editor", label: "Editor", description: "Can manage content and blog" },
  { value: "agent", label: "Agent", description: "Can manage bookings and inquiries" },
];

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

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "agent" as "admin" | "editor" | "agent",
    status: "active" as "active" | "invited" | "suspended",
    phone: ""
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    admins: users.filter(u => u.role === "admin").length,
  };

  const handleAdd = () => {
    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      status: formData.status,
      phone: formData.phone,
      lastActive: "Never",
      createdAt: new Date().toISOString().split("T")[0]
    };
    setUsers([...users, newUser]);
    setShowModal(false);
    resetForm();
    showToast("User created successfully", "success");
  };

  const handleEdit = () => {
    if (!editingUser) return;
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    setEditingUser(null);
    setShowModal(false);
    showToast("User updated successfully", "success");
  };

  const handleDelete = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
    setDeleteConfirm(null);
    showToast("User deleted", "success");
  };

  const handleRoleChange = (userId: string, newRole: "admin" | "editor" | "agent") => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showToast("Role updated", "success");
  };

  const handleStatusChange = (userId: string, newStatus: "active" | "invited" | "suspended") => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    showToast("Status updated", "success");
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", role: "agent", status: "active", phone: "" });
  };

  const openAddModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, status: user.status, phone: user.phone || "" });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">User Management</h1>
          <p className="text-earth mt-1">Manage admins, editors, and agents with role-based access</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">
          <Plus className="w-4 h-4" />Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Users", value: stats.total, color: "text-soft-black" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          { label: "Admins", value: stats.admins, color: "text-indigo-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 border border-sand-light">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-earth mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-sand-light overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-sand-light">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-earth text-xs uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 font-medium text-earth text-xs uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 font-medium text-earth text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 font-medium text-earth text-xs uppercase tracking-wider">Last Active</th>
              <th className="text-left px-5 py-3 font-medium text-earth text-xs uppercase tracking-wider">Created</th>
              <th className="text-right px-5 py-3 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-light/50">
            {filtered.map((user) => (
              <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-warm-white transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="font-medium text-soft-black">{user.name}</p>
                      <p className="text-xs text-earth">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "editor" | "agent")}
                    className={`px-3 py-1.5 text-xs font-medium border rounded cursor-pointer ${ROLE_BADGES[user.role]}`}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.id, e.target.value as "active" | "invited" | "suspended")}
                    className={`px-3 py-1.5 text-xs font-medium border rounded cursor-pointer ${STATUS_BADGES[user.status]}`}
                  >
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="px-5 py-4 text-earth text-xs">{user.lastActive}</td>
                <td className="px-5 py-4 text-earth text-xs">{user.createdAt}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(user)} className="text-xs text-gold hover:text-gold-dark">Edit</button>
                    <button onClick={() => setDeleteConfirm(user.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-12 text-center text-earth">No users found.</div>}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingUser ? "Edit User" : "Add New User"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Full Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="john@trippa.luxury" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Phone (optional)</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="+1 234 567 890" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "editor" | "agent" })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
                    {ROLE_OPTIONS.map(role => (
                      <option key={role.value} value={role.value}>{role.label} - {role.description}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "invited" | "suspended" })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
                    <option value="active">Active</option>
                    <option value="invited">Invited (not yet accepted)</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingUser ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">
                  {editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}