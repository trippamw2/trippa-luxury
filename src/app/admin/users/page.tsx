"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Edit2, Trash2, X, Check, AlertCircle, Plus, Search, Mail, User } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

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

function mapUser(item: any): AdminUser {
  return {
    id: item.id,
    name: item.fullName || "",
    email: item.email || "",
    role: item.role || "editor",
    status: item.isActive ? "active" : "suspended",
    lastActive: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Never",
    createdAt: item.createdAt ? item.createdAt.split("T")[0] : "",
  };
}

function mapUserToApi(item: Partial<AdminUser>): any {
  return {
    full_name: item.name,
    email: item.email,
    role: item.role,
    is_active: item.status === "active",
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

export default function AdminUsers() {
  const { data: users, loading, create, update, remove } = useApiData<AdminUser>("users", {
    mapFromApi: mapUser,
    mapToApi: mapUserToApi,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "editor" as "admin" | "editor" | "agent", status: "active" as "active" | "invited" | "suspended" });

  const showToast = (message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const filtered = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      setFormData({ name: "", email: "", role: "editor", status: "active" });
      showToast("User created", "success");
    } else {
      showToast("Failed to create user", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    const result = await update(editingUser.id, formData);
    if (result) {
      setEditingUser(null);
      setShowModal(false);
      showToast("User updated", "success");
    } else {
      showToast("Failed to update user", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("User deleted", "success");
    } else {
      showToast("Failed to delete user", "error");
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>{toast && (<motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type==="success"?"bg-emerald-50 text-emerald-800 border border-emerald-200":"bg-red-50 text-red-800 border border-red-200"}`}>{toast.type==="success"?<Check className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}</AnimatePresence>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Users</h1><p className="text-earth mt-1">Manage admin users and roles</p></div>
        <button onClick={() => { setEditingUser(null); setFormData({ name: "", email: "", role: "editor", status: "active" }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90"><Plus className="w-4 h-4" />Add User</button>
      </div>
      <div className="bg-white border border-sand-light p-4 mb-6"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" /><input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div></div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading users...</div></div>
      ) : (
      <div className="bg-white border border-sand-light divide-y divide-sand-light">
        {filtered.map(u => (
          <div key={u.id} className="flex items-center justify-between p-4 hover:bg-warm-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center"><User className="w-5 h-5 text-gold" /></div>
              <div><p className="font-medium text-soft-black">{u.name}</p><p className="text-xs text-earth">{u.email}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 text-xs font-medium border ${ROLE_BADGES[u.role] || ""}`}>{u.role}</span>
              <span className={`px-2 py-0.5 text-xs font-medium border ${STATUS_BADGES[u.status] || ""}`}>{u.status}</span>
              <span className="text-xs text-earth">{u.lastActive}</span>
              <button onClick={() => { setEditingUser(u); setFormData({ name: u.name, email: u.email, role: u.role, status: u.status }); setShowModal(true); }} className="text-xs text-gold ml-3">Edit</button>
              <button onClick={() => setDeleteConfirm(u.id)} className="text-xs text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={()=>setShowModal(false)}>
            <motion.div initial={{scale:0.95}} className="bg-cream border border-sand-light w-full max-w-md max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0"><h2 className="text-xl font-bold text-soft-black">{editingUser?"Edit User":"Add User"}</h2><button onClick={()=>setShowModal(false)}><X className="w-5 h-5 text-earth"/></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Name</label><input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Email</label><input type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Role</label><select value={formData.role} onChange={e=>setFormData({...formData,role:e.target.value as any})} className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white"><option value="admin">Admin</option><option value="editor">Editor</option><option value="agent">Agent</option></select></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Status</label><select value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value as any})} className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white"><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={editingUser?handleEdit:handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium">{editingUser?"Save":"Add User"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setDeleteConfirm(null)}>
            <motion.div initial={{scale:0.95}} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={e=>e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete User</h3>
              <p className="text-sm text-earth mb-6">Delete this user?</p>
              <div className="flex gap-3"><button onClick={()=>setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
