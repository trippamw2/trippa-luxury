"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Check, AlertCircle, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { JOURNAL_POSTS } from "@/lib/constants";

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

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>(JOURNAL_POSTS.map(p => ({ 
    id: p.id, 
    title: p.title, 
    category: p.category, 
    date: p.date, 
    author: p.author, 
    excerpt: p.excerpt || "", 
    image: p.image,
    content: "",
    published: true
  })));
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Romance",
    date: "",
    author: "Trippa Team",
    excerpt: "",
    image: "",
    content: "",
    published: true
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    const newPost: BlogPost = { 
      id: `post-${Date.now()}`, 
      title: formData.title, 
      category: formData.category, 
      date: formData.date || new Date().toISOString().split("T")[0], 
      author: formData.author, 
      excerpt: formData.excerpt,
      image: formData.image || "https://images.unsplash.com/photo-1499750310159-5b5f096fd68b?w=800&q=80",
      content: formData.content,
      published: formData.published
    };
    setPosts([...posts, newPost]);
    setShowModal(false);
    setFormData({ title: "", category: "Romance", date: "", author: "Trippa Team", excerpt: "", image: "", content: "", published: true });
    showToast("Blog post created", "success");
  };

  const handleEdit = () => {
    if (!editingPost) return;
    const updated = { 
      ...editingPost,
      title: formData.title,
      category: formData.category,
      date: formData.date,
      author: formData.author,
      excerpt: formData.excerpt,
      image: formData.image || "https://images.unsplash.com/photo-1499750310159-5b5f096fd68b?w=800&q=80",
      content: formData.content,
      published: formData.published
    };
    setPosts(posts.map(p => p.id === editingPost.id ? updated : p));
    setEditingPost(null);
    setShowModal(false);
    showToast("Blog post updated", "success");
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
    setDeleteConfirm(null);
    showToast("Blog post deleted", "success");
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      category: post.category,
      date: post.date,
      author: post.author,
      excerpt: post.excerpt,
      image: post.image,
      content: post.content || "",
      published: post.published ?? true
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingPost(null);
    setFormData({ title: "", category: "Romance", date: "", author: "Trippa Team", excerpt: "", image: "", content: "", published: true });
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Blog & Journal</h1>
          <p className="text-earth mt-1">Manage blog posts, stories, and travel journal content</p>
        </div>
        <button onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all">
          <Plus className="w-4 h-4" />New Post
        </button>
      </div>

      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((post) => (
          <div key={post.id} className="bg-white border border-sand-light rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {/* Image */}
            <div className="relative aspect-video bg-cream">
              {post.image ? (
                <Image src={post.image} alt={post.title} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-8 h-8 text-earth-light" />
                </div>
              )}
              {!post.published && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-earth text-white text-xs rounded">Draft</div>
              )}
            </div>
            
            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gold uppercase tracking-wider">{post.category}</span>
                <span className="text-xs text-earth-light">•</span>
                <span className="text-xs text-earth">{post.date}</span>
              </div>
              <h3 className="font-heading font-bold text-soft-black mb-2 line-clamp-2">{post.title}</h3>
              <p className="text-sm text-earth line-clamp-2">{post.excerpt}</p>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-sand-light">
                <span className="text-xs text-earth-light">By {post.author}</span>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(post)} className="text-xs text-gold hover:text-gold-dark">Edit</button>
                  <button onClick={() => setDeleteConfirm(post.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingPost ? "Edit Post" : "New Post"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Image URL */}
                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Hero Image URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={formData.image} 
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })} 
                      className="flex-1 px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" 
                      placeholder="https://images.unsplash.com/..."
                    />
                    {formData.image && (
                      <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 border border-sand-light">
                        <Image src={formData.image} alt="Preview" fill className="object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Title</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" 
                  />
                </div>

                {/* Category & Author */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Category</label>
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white"
                    >
                      <option>Romance</option>
                      <option>Adventure</option>
                      <option>Cultural</option>
                      <option>Wellness</option>
                      <option>Safari</option>
                      <option>Beach</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Author</label>
                    <input 
                      type="text" 
                      value={formData.author} 
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })} 
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" 
                    />
                  </div>
                </div>

                {/* Date & Published */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Date</label>
                    <input 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" 
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <input 
                      type="checkbox" 
                      id="published"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })} 
                      className="w-4 h-4"
                    />
                    <label htmlFor="published" className="text-sm text-soft-black">Published</label>
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Excerpt / Summary</label>
                  <textarea 
                    value={formData.excerpt} 
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} 
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" 
                    rows={3}
                    placeholder="Brief summary for the blog post..."
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Full Content</label>
                  <textarea 
                    value={formData.content} 
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:border-gold bg-white" 
                    rows={6}
                    placeholder="Full blog post content..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-sand-light">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button>
                <button 
                  onClick={editingPost ? handleEdit : handleAdd} 
                  className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark"
                >
                  {editingPost ? "Save Changes" : "Create Post"}
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
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
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