"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Check, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { JOURNAL_POSTS } from "@/lib/constants";

interface BlogPost {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  excerpt: string;
  image: string;
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>(JOURNAL_POSTS.map(p => ({ id: p.id, title: p.title, category: p.category, date: p.date, author: p.author, excerpt: p.excerpt || "", image: p.image })));
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({ title: "", category: "Romance", date: "", author: "Trippa Team" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAdd = () => {
    const newPost: BlogPost = { id: `post-${Date.now()}`, title: formData.title, category: formData.category, date: new Date().toISOString().split("T")[0], author: formData.author, excerpt: "", image: "" };
    setPosts([...posts, newPost]);
    setShowModal(false);
    setFormData({ title: "", category: "Romance", date: "", author: "Trippa Team" });
    showToast("Blog post created", "success");
  };

  const handleEdit = () => {
    if (!editingPost) return;
    setPosts(posts.map(p => p.id === editingPost.id ? editingPost : p));
    setEditingPost(null);
    showToast("Blog post updated", "success");
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
    setDeleteConfirm(null);
    showToast("Blog post deleted", "success");
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Blog Posts</h1>
          <p className="text-sm text-earth mt-1">Manage journal content.</p>
        </div>
        <button onClick={() => { setEditingPost(null); setFormData({ title: "", category: "Romance", date: "", author: "Trippa Team" }); setShowModal(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all">
          <Plus className="w-4 h-4" />New Post
        </button>
      </div>

      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
        </div>
      </div>

      <div className="bg-white border border-sand-light overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-sand-light">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Author</th>
              <th className="text-right px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-light/50">
            {filtered.map((post) => (
              <tr key={post.id} className="hover:bg-warm-white transition-colors">
                <td className="px-4 py-3 font-medium text-soft-black">{post.title}</td>
                <td className="px-4 py-3 text-earth">{post.category}</td>
                <td className="px-4 py-3 text-earth">{post.date}</td>
                <td className="px-4 py-3 text-earth">{post.author}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditingPost(post); setFormData({ title: post.title, category: post.category, date: post.date, author: post.author }); setShowModal(true); }} className="text-xs text-gold hover:text-gold-dark mr-3">Edit</button>
                  <button onClick={() => setDeleteConfirm(post.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cream border border-sand-light p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingPost ? "Edit Post" : "New Post"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white"><option>Romance</option><option>Adventure</option><option>Cultural</option><option>Wellness</option></select></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Author</label><input type="text" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button>
                <button onClick={editingPost ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark">{editingPost ? "Save" : "Create"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure?</p>
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