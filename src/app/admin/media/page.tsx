"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, Edit2, Trash2, X, Search, ImageIcon } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: string;
  category: string;
  altText: string;
  createdAt: string;
}

function mapMedia(item: any): MediaItem {
  return {
    id: item.id,
    filename: item.filename || "image.jpg",
    url: item.url || "",
    type: item.type || "image",
    category: item.category || "uncategorized",
    altText: item.altText || item.alt_text || item.filename || "",
    createdAt: item.createdAt || "",
  };
}

function mapMediaToApi(item: Partial<MediaItem>): any {
  return {
    filename: item.filename || "image.jpg",
    url: item.url,
    type: item.type || "image",
    category: item.category || "uncategorized",
    alt_text: item.altText || item.filename || "",
  };
}

const CATEGORIES = ["homepage", "destinations", "properties", "experiences", "blog"];

const CATEGORY_LABELS: Record<string, string> = {
  homepage: "Homepage",
  destinations: "Destinations",
  properties: "Properties",
  experiences: "Experiences & Activities",
  blog: "Blog & Journal",
};

export default function MediaPage() {
  const { data: mediaItems, loading, create, update, remove } = useApiData<MediaItem>("media", {
    mapFromApi: mapMedia,
    mapToApi: mapMediaToApi,
  });
  const [activeCategory, setActiveCategory] = useState("homepage");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ url: "", altText: "" });

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const filtered = mediaItems.filter(
    (m) => m.category === activeCategory && m.altText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReplace = async (item: MediaItem) => {
    const result = await update(item.id, { ...item, url: formData.url, altText: formData.altText });
    if (result) {
      showNotification("Image updated");
      setShowModal(false);
      setEditingItem(null);
      setFormData({ url: "", altText: "" });
    } else {
      showNotification("Failed to update image");
    }
  };

  const handleAdd = async () => {
    const result = await create({
      filename: `media-${Date.now()}.jpg`,
      url: formData.url,
      category: activeCategory,
      altText: formData.altText || "Media image",
    });
    if (result) {
      showNotification("Image added");
      setShowModal(false);
      setFormData({ url: "", altText: "" });
    } else {
      showNotification("Failed to add image");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      showNotification("Image deleted");
    } else {
      showNotification("Failed to delete image");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Media Library</h1>
          <p className="text-earth mt-1">Manage all images across the website</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setFormData({ url: "", altText: "" }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors"
        >
          <Upload className="w-4 h-4" /> Add Image
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sand-light pb-4">
        {CATEGORIES.map((key) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeCategory === key ? "bg-soft-black text-cream" : "text-earth hover:bg-sand-light"
            }`}
          >
            {CATEGORY_LABELS[key]} ({mediaItems.filter((m) => m.category === key).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold"
        />
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading media...</div></div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white border border-sand-light overflow-hidden">
            <div className="relative aspect-video bg-cream">
              <Image src={item.url} alt={item.altText} fill className="object-cover" />
            </div>
            <div className="p-4">
              <p className="font-medium text-soft-black text-sm truncate">{item.altText || item.filename}</p>
              <p className="text-xs text-earth mt-1 truncate">{item.url}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setEditingItem(item); setFormData({ url: item.url, altText: item.altText }); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-soft-black text-cream hover:bg-soft-black-light transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Replace
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-sand-light text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 text-earth text-sm">No images in this category. Click "Add Image" to upload.</div>
        )}
      </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-cream border border-sand-light p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-soft-black">{editingItem ? "Replace Image" : "Add Image"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
            </div>
            {formData.url && (
              <div className="relative aspect-video bg-cream mb-4 overflow-hidden">
                <Image src={formData.url} alt="Preview" fill className="object-cover" />
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-earth uppercase mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 border border-sand-light text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth uppercase mb-2">Alt Text</label>
                <input
                  type="text"
                  value={formData.altText}
                  onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                  className="w-full px-4 py-2.5 border border-sand-light text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
              <button
                onClick={editingItem ? () => handleReplace(editingItem) : handleAdd}
                disabled={!formData.url}
                className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium disabled:opacity-50"
              >
                {editingItem ? "Save" : "Add Image"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-cream border border-sand-light p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-earth" />
            <span className="text-sm text-soft-black"><span className="font-medium">{mediaItems.length}</span> total images</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-soft-black text-white px-4 py-2 shadow-lg z-50 text-sm">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
