"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Check, AlertCircle, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";

interface BlogPost {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  excerpt: string;
  image: string;
  content?: string;
  published?: boolean;
}

const CATEGORIES = ["Romance", "Safari", "Travel", "Travel Guide", "Sustainability", "Wellness"];

function mapPost(item: any): BlogPost {
  return {
    id: item.id,
    title: item.title || "",
    category: item.category || "Travel",
    date: item.publishedAt ? item.publishedAt.split("T")[0] : (item.createdAt ? item.createdAt.split("T")[0] : ""),
    author: item.author || "Kivara Team",
    excerpt: item.excerpt || "",
    image: item.image || "",
    content: item.content || "",
    published: item.isPublished !== false,
  };
}

function mapPostToApi(item: Partial<BlogPost>): any {
  return {
    title: item.title,
    category: item.category,
    author: item.author,
    excerpt: item.excerpt,
    content: item.content,
    image: item.image,
    is_published: item.published,
    published_at: item.published ? new Date().toISOString() : null,
    slug: item.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `post-${Date.now()}`,
  };
}

const formStyle = "w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white";

export default function AdminBlog() {
  const { data: posts, loading, create, update, remove } = useApiData<BlogPost>("blog", {
    mapFromApi: mapPost,
    mapToApi: mapPostToApi,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({
    title: "", category: "Romance", date: "", author: "Kivara Team",
    excerpt: "", image: "", content: "", published: true
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    const result = await create({
      title: formData.title,
      category: formData.category,
      date: formData.date || new Date().toISOString().split("T")[0],
      author: formData.author,
      excerpt: formData.excerpt,
      image: formData.image || "/images/journal-honeymoon.jpg",
      content: formData.content,
      published: formData.published,
    });
    if (result) {
      setShowModal(false);
      setFormData({ title: "", category: "Romance", date: "", author: "Kivara Team", excerpt: "", image: "", content: "", published: true });
      showToast("Blog post created", "success");
    } else {
      showToast("Failed to create post", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingPost) return;
    const result = await update(editingPost.id, {
      ...editingPost,
      title: formData.title,
      category: formData.category,
      date: formData.date,
      author: formData.author,
      excerpt: formData.excerpt,
      image: formData.image,
      content: formData.content,
      published: formData.published,
    });
    if (result) {
      setEditingPost(null);
      setShowModal(false);
      showToast("Blog post updated", "success");
    } else {
      showToast("Failed to update post", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("Blog post deleted", "success");
    } else {
      showToast("Failed to delete post", "error");
    }
  };

  const openAddModal = () => {
    setEditingPost(null);
    setFormData({ title: "", category: "Romance", date: new Date().toISOString().split("T")[0], author: "Kivara Team", excerpt: "", image: "", content: "", published: true });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}</AnimatePresence>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Blog & Journal</h1><p className="text-earth mt-1">Create and manage blog posts and journal entries</p></div>
        <button onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark"><Plus className="w-4 h-4" />New Post</button>
      </div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" /><input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading posts...</div></div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(post => (
          <div key={post.id} className="bg-white border border-sand-light overflow-hidden group">
            <div className="relative aspect-video bg-cream">
              {post.image ? <Image src={post.image} alt={post.title} fill className="object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon className="w-6 h-6 text-earth" /></div>}
              <div className="absolute top-2 right-2"><span className={`px-2 py-0.5 text-xs font-medium ${post.published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{post.published ? "Published" : "Draft"}</span></div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2"><span className="text-xs text-gold font-medium">{post.category}</span><span className="text-xs text-earth">•</span><span className="text-xs text-earth">{post.date}</span></div>
              <h3 className="font-semibold text-soft-black mb-1 line-clamp-2">{post.title}</h3>
              <p className="text-xs text-earth mb-1">{post.author}</p>
              <p className="text-sm text-earth line-clamp-2">{post.excerpt}</p>
              <div className="mt-3 pt-3 border-t border-sand-light flex items-center justify-between">
                <span className="text-xs text-earth">{post.date}</span>
                <div className="flex gap-3">
                  <button onClick={() => { setEditingPost(post); setFormData({ title: post.title, category: post.category, date: post.date, author: post.author, excerpt: post.excerpt, image: post.image, content: post.content || "", published: post.published ?? true }); setShowModal(true); }} className="text-xs text-gold">Edit</button>
                  <button onClick={() => setDeleteConfirm(post.id)} className="text-xs text-red-500">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-soft-black">{editingPost ? "Edit Post" : "New Blog Post"}</h2><button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button></div>
              <div className="space-y-4">
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={formStyle} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={formStyle}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Author</label><input type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className={formStyle} /></div>
                </div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Image URL</label><div className="flex gap-2"><input type="url" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className={formStyle} />{formData.image && <div className="relative w-16 h-16 flex-shrink-0"><Image src={formData.image} alt="" fill className="object-cover" /></div>}</div></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Excerpt</label><textarea value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className={formStyle} rows={2} /></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Content</label><textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className={formStyle} rows={6} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={formData.published} onChange={e => setFormData({...formData, published: e.target.checked})} className="w-4 h-4" /><label className="text-sm text-earth">Published</label></div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-sand-light">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={editingPost ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium">{editingPost ? "Update" : "Create"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Post</h3>
              <p className="text-sm text-earth mb-6">Delete this blog post?</p>
              <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
