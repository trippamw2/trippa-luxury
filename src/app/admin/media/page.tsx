"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Edit2, Trash2, X, Search, ImageIcon, Tags, FileText, Save, Loader2,
} from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput } from "@/app/admin/components/FormField";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────── */

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: string;
  category: string;
  altText: string;
  tags: string[];
  createdAt: string;
}

interface UploadResult {
  url: string;
  record: Record<string, any> | null;
}

/* ─── Mappers ─────────────────────────────────────────── */

function mapMedia(item: any): MediaItem {
  return {
    id: item.id,
    filename: item.filename || "image.jpg",
    url: item.url || "",
    type: item.type || "image",
    category: item.category || "uncategorized",
    altText: item.altText || item.alt_text || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    createdAt: item.createdAt || "",
  };
}

function mapMediaToApi(item: Partial<MediaItem>): any {
  return {
    filename: item.filename,
    url: item.url,
    type: item.type || "image",
    category: item.category,
    alt_text: item.altText,
    tags: item.tags || [],
  };
}

/* ─── Constants ──────────────────────────────────────── */

const CATEGORIES = ["homepage", "destinations", "properties", "experiences", "blog"];

const CATEGORY_LABELS: Record<string, string> = {
  homepage: "Homepage",
  destinations: "Destinations",
  properties: "Properties",
  experiences: "Experiences & Activities",
  blog: "Blog & Journal",
};

/* ─── Component ──────────────────────────────────────── */

export default function MediaPage() {
  const { data: mediaItems, loading, refresh, create, update, remove } =
    useApiData<MediaItem>("media", { mapFromApi: mapMedia, mapToApi: mapMediaToApi });
  const { toast } = useToast();

  /* state */
  const [activeCategory, setActiveCategory] = useState("homepage");
  const [searchQuery, setSearchQuery] = useState("");
  const [editModal, setEditModal] = useState<MediaItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Bulk alt-text editor
  const [showBulkAlt, setShowBulkAlt] = useState(false);
  const [bulkEdits, setBulkEdits] = useState<Record<string, string>>({});

  // Bulk upload
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /* derived */
  const filtered = mediaItems.filter(
    (m) =>
      m.category === activeCategory &&
      (m.altText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  /* ── Upload helpers ─────────────────────────────────── */

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", activeCategory);
      formData.append("altText", file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));

      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        return data;
      } catch (err: any) {
        console.error("Upload failed:", err);
        return null;
      }
    },
    [activeCategory]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (fileArray.length === 0) {
        toast("No valid image files", "error");
        return;
      }

      setUploading(true);
      const names = fileArray.map((f) => f.name);
      setUploadQueue(names);

      let successCount = 0;
      for (const file of fileArray) {
        const result = await uploadFile(file);
        if (result?.record) {
          // Manually add to local state for immediate display
          // (the create/refresh pattern would double-call)
          successCount++;
        } else if (result?.url) {
          // Upload worked but no auto-record — create one manually
          const newItem = await create({
            filename: file.name,
            url: result.url,
            category: activeCategory,
            altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          });
          if (newItem) successCount++;
        }
      }

      setUploadQueue([]);
      setUploading(false);
      refresh();

      if (successCount > 0) {
        toast(`${successCount} image(s) uploaded`, "success");
      } else {
        toast("Upload failed", "error");
      }
    },
    [uploadFile, create, activeCategory, refresh, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    },
    [handleFiles]
  );

  /* ── Alt-text bulk edit ─────────────────────────────── */

  const openBulkEdit = () => {
    const edits: Record<string, string> = {};
    filtered.forEach((m) => (edits[m.id] = m.altText));
    setBulkEdits(edits);
    setShowBulkAlt(true);
  };

  const saveBulkAltText = async () => {
    let saved = 0;
    for (const [id, altText] of Object.entries(bulkEdits)) {
      const item = mediaItems.find((m) => m.id === id);
      if (item && item.altText !== altText) {
        const ok = await update(id, { ...item, altText });
        if (ok) saved++;
      }
    }
    setShowBulkAlt(false);
    refresh();
    toast(`${saved} alt text(s) updated`, "success");
  };

  /* ── Single edit ────────────────────────────────────── */

  const saveEdit = async () => {
    if (!editModal) return;
    const ok = await update(editModal.id, editModal);
    if (ok) {
      setEditModal(null);
      toast("Image updated", "success");
    } else {
      toast("Failed to update", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Image deleted", "success");
    } else {
      toast("Failed to delete", "error");
    }
  };

  /* ── Tag helpers ────────────────────────────────────── */

  const allTags = Array.from(
    new Set(mediaItems.flatMap((m) => m.tags))
  ).sort();

  const [activeTag, setActiveTag] = useState("");

  const tagFiltered = activeTag
    ? filtered.filter((m) => m.tags.includes(activeTag))
    : filtered;

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Media Library</h1>
          <p className="text-earth mt-1">Upload, tag, and manage all images across the website</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openBulkEdit}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors disabled:opacity-40"
          >
            <FileText className="w-4 h-4" /> Bulk Alt Text
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload Images
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Upload drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed cursor-pointer transition-colors",
          dragOver
            ? "border-gold bg-gold/5"
            : "border-sand-light hover:border-gold/50 hover:bg-warm-white",
          uploading && "pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
            <p className="text-sm text-earth">
              Uploading {uploadQueue.length} file(s)...
            </p>
            <div className="flex flex-wrap gap-1 justify-center max-w-md">
              {uploadQueue.map((name, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-sand-light text-earth rounded"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-earth" />
            <p className="text-sm text-earth">
              <span className="text-gold font-medium">Click to upload</span> or drag & drop images
            </p>
            <p className="text-xs text-earth/60">
              PNG, JPG, WebP — multiple files supported — auto-converts to WebP
            </p>
          </>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sand-light pb-4">
        {CATEGORIES.map((key) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              "px-4 py-2 rounded text-sm font-medium transition-colors",
              activeCategory === key
                ? "bg-soft-black text-cream"
                : "text-earth hover:bg-sand-light"
            )}
          >
            {CATEGORY_LABELS[key]} ({mediaItems.filter((m) => m.category === key).length})
          </button>
        ))}
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tags className="w-4 h-4 text-earth" />
          <button
            onClick={() => setActiveTag("")}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-colors",
              !activeTag
                ? "bg-soft-black text-cream border-soft-black"
                : "border-sand-light text-earth hover:bg-warm-white"
            )}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                activeTag === tag
                  ? "bg-gold text-soft-black border-gold"
                  : "border-sand-light text-earth hover:bg-warm-white"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
        <input
          type="text"
          placeholder="Search by name, alt text, or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-sand-light overflow-hidden">
              <div className="aspect-video bg-sand-light" />
              <div className="p-4 space-y-2">
                <SkeletonText className="w-2/3" />
                <SkeletonText className="w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : tagFiltered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={searchQuery || activeTag ? "No images found" : "No images yet"}
          description={
            searchQuery || activeTag
              ? "Try a different search or tag filter."
              : `Drop images above or click "Upload Images" to add to ${CATEGORY_LABELS[activeCategory]}.`
          }
        />
      ) : (
        /* Image grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tagFiltered.map((item) => (
            <div key={item.id} className="bg-white border border-sand-light overflow-hidden group">
              <div className="relative aspect-video bg-cream">
                <Image
                  src={item.url}
                  alt={item.altText || item.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-soft-black text-sm truncate">
                  {item.altText || item.filename}
                </p>
                <p className="text-xs text-earth truncate">{item.filename}</p>

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] bg-sand-light text-earth rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-sand-light">
                  <button
                    onClick={() => setEditModal({ ...item })}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-soft-black text-cream hover:bg-soft-black-light transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-sand-light text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="bg-cream border border-sand-light p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-earth" />
            <span className="text-sm text-soft-black">
              <span className="font-medium">{mediaItems.length}</span> total images
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-earth" />
            <span className="text-sm text-soft-black">
              <span className="font-medium">{allTags.length}</span> tags
            </span>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light w-full max-w-md max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h3 className="text-lg font-bold text-soft-black">Edit Image</h3>
                <button onClick={() => setEditModal(null)}>
                  <X className="w-5 h-5 text-earth" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {editModal.url && (
                  <div className="relative aspect-video bg-sand-light overflow-hidden rounded">
                    <Image
                      src={editModal.url}
                      alt={editModal.altText}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <FormInput
                  label="Alt Text"
                  name="altText"
                  value={editModal.altText}
                  onChange={(e) =>
                    setEditModal({ ...editModal, altText: e.target.value })
                  }
                />
                <FormInput
                  label="Tags (comma-separated)"
                  name="tags"
                  value={editModal.tags.join(", ")}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
                    Filename
                  </label>
                  <p className="text-sm text-soft-black bg-sand-light/50 px-3 py-2 rounded">
                    {editModal.filename}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk Alt Text Modal ──────────────────────────── */}
      <AnimatePresence>
        {showBulkAlt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowBulkAlt(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h3 className="text-lg font-bold text-soft-black">
                  Bulk Edit Alt Text — {CATEGORY_LABELS[activeCategory]}
                </h3>
                <button onClick={() => setShowBulkAlt(false)}>
                  <X className="w-5 h-5 text-earth" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {filtered.length === 0 ? (
                  <p className="text-sm text-earth">No images in this category.</p>
                ) : (
                  filtered.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="relative w-16 h-12 flex-shrink-0 bg-sand-light overflow-hidden rounded">
                        <Image
                          src={item.url}
                          alt={item.altText}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-earth truncate">{item.filename}</p>
                        <input
                          type="text"
                          value={bulkEdits[item.id] || ""}
                          onChange={(e) =>
                            setBulkEdits((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-full mt-1 px-3 py-1.5 text-sm border border-sand-light focus:outline-none focus:border-gold"
                          placeholder="Enter alt text..."
                        />
                      </div>
                      {item.tags.length > 0 && (
                        <div className="hidden sm:flex flex-wrap gap-1 max-w-[120px]">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] bg-sand-light text-earth rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button
                  onClick={() => setShowBulkAlt(false)}
                  className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBulkAltText}
                  disabled={filtered.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium disabled:opacity-50 hover:bg-gold-dark transition-colors"
                >
                  <Save className="w-4 h-4" /> Save All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ──────────────────────────── */}
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
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Image</h3>
              <p className="text-sm text-earth mb-6">
                Delete this image from the media library? Images referenced in pages will need to be re-uploaded.
              </p>
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
