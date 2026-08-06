"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Edit2, Trash2, Image as ImageIcon, BookOpen } from "lucide-react";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { ImportCsv } from "@/app/admin/components/ImportCsv";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";
import { RichTextEditor } from "@/app/admin/components/RichTextEditor";
import { ImageUpload } from "@/app/admin/components/ImageUpload";

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

interface ApiBlogPost {
  id: string;
  title?: string;
  category?: string;
  publishedAt?: string;
  createdAt?: string;
  author?: string;
  excerpt?: string;
  image?: string;
  content?: string;
  isPublished?: boolean;
}

function mapPost(item: ApiBlogPost): BlogPost {
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

function mapPostToApi(item: Partial<BlogPost>): Record<string, unknown> {
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

export default function AdminBlog() {
  const { data: posts, loading, create, update, remove } = useApiData("blog", {
    mapFromApi: mapPost,
    mapToApi: mapPostToApi,
  });
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "", category: "Romance", date: "", author: "Kivara Team",
    excerpt: "", image: "", content: "", published: true,
  });

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => setFormData({
    title: "", category: "Romance", date: new Date().toISOString().split("T")[0],
    author: "Kivara Team", excerpt: "", image: "", content: "", published: true,
  });

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
      toast("Blog post created", "success");
    } else {
      toast("Failed to create post", "error");
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
      toast("Blog post updated", "success");
    } else {
      toast("Failed to update post", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Blog post deleted", "success");
    } else {
      toast("Failed to delete post", "error");
    }
  };

  const openAddModal = () => { setEditingPost(null); resetForm(); setShowModal(true); };
  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title, category: post.category, date: post.date, author: post.author,
      excerpt: post.excerpt, image: post.image, content: post.content || "", published: post.published ?? true,
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Blog & Journal</h1><p className="text-earth mt-1">Create and manage blog posts and journal entries</p></div>
        <div className="flex items-center gap-2">
          <ImportCsv table="blog_posts" />
          {posts && posts.length > 0 && (
            <button
              onClick={() => exportToCsv(posts, [
                { key: "title", header: "Title" },
                { key: "category", header: "Category" },
                { key: "author", header: "Author" },
                { key: "date", header: "Date" },
                { key: "published", header: "Published" },
              ], "kivara-blog")}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-sand-light text-sm text-earth hover:bg-warm-white hover:text-soft-black transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"><Plus className="w-4 h-4" />New Post</button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-sand-light px-4 py-3 mb-6">
        <div className="relative max-w-sm">
          <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold" />
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-sand-light overflow-hidden">
              <div className="aspect-video bg-sand-light" />
              <div className="p-4 space-y-2">
                <SkeletonText className="w-1/4" />
                <SkeletonText className="w-3/4" />
                <SkeletonText className="w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No posts yet"
          description={searchQuery ? "No posts match your search." : "Write your first blog post."}
          action={!searchQuery ? { label: "New Post", onClick: openAddModal } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(post => (
            <div key={post.id} className="bg-white border border-sand-light overflow-hidden group">
              <div className="relative aspect-video bg-cream">
                {post.image ? <Image src={post.image} alt={post.title} fill className="object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon className="w-6 h-6 text-earth" /></div>}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 text-xs font-medium ${post.published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gold font-medium">{post.category}</span>
                  <span className="text-xs text-earth">•</span>
                  <span className="text-xs text-earth">{post.date}</span>
                </div>
                <h3 className="font-semibold text-soft-black mb-1 line-clamp-2">{post.title}</h3>
                <p className="text-xs text-earth mb-1">{post.author}</p>
                <p className="text-sm text-earth line-clamp-2">{post.excerpt}</p>
                <div className="mt-3 pt-3 border-t border-sand-light flex items-center justify-between">
                  <span className="text-xs text-earth">{post.date}</span>
                  <div className="flex gap-3">
                    <button onClick={() => openEditModal(post)} className="flex items-center gap-1 text-xs text-gold hover:underline"><Edit2 className="w-3 h-3" />Edit</button>
                    <button onClick={() => setDeleteConfirm(post.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><Trash2 className="w-3 h-3" />Delete</button>
                  </div>
                </div>
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
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editingPost ? "Edit Post" : "New Blog Post"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <FormInput label="Title" name="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required />
                <FormGroup>
                  <FormSelect label="Category" name="category" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                  <FormInput label="Author" name="author" value={formData.author} onChange={e => setFormData(p => ({ ...p, author: e.target.value }))} />
                </FormGroup>
                <ImageUpload label="Featured Image" value={formData.image} onChange={(url) => setFormData(p => ({ ...p, image: url }))} />
                <FormTextarea label="Excerpt" name="excerpt" value={formData.excerpt} onChange={e => setFormData(p => ({ ...p, excerpt: e.target.value }))} rows={2} />
                <RichTextEditor label="Content" value={formData.content} onChange={(html) => setFormData(p => ({ ...p, content: html }))} minH="320px" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.published} onChange={e => setFormData(p => ({ ...p, published: e.target.checked }))} className="w-4 h-4 accent-gold" />
                  <span className="text-sm text-earth">Published</span>
                </label>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingPost ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editingPost ? "Update" : "Create"}</button>
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
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Post</h3>
              <p className="text-sm text-earth mb-6">Delete this blog post?</p>
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
