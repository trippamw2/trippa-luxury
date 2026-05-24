"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";

interface PropertyRef {
  id: string;
  slug: string;
  name: string;
  location: string;
  tagline: string;
  description: string;
  heroImage: string;
  gallery: string[];
  rating: number;
  isActive: boolean;
}

interface Destination {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  positioning: string;
  heroImage: string;
  gallery: string[];
  properties: PropertyRef[];
  propertyCount: number;
  experiences: string[];
}

interface ApiDestination {
  id: string;
  slug: string;
  name: string;
  properties: any[];
  propertyCount: number;
}

function mapDestination(item: ApiDestination): Destination {
  const props = (item.properties || []).map((p: any) => ({
    id: p.id,
    slug: p.slug || "",
    name: p.name || "",
    location: p.location || "",
    tagline: p.tagline || "",
    description: p.description || "",
    heroImage: p.heroImage || "",
    gallery: p.gallery || [],
    rating: p.rating || 0,
    isActive: p.isActive ?? true,
  }));
  const firstProp = props[0];
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    subtitle: firstProp?.tagline || item.name,
    tagline: firstProp?.tagline || `Discover ${item.name}`,
    description: firstProp?.description || "",
    positioning: "",
    heroImage: firstProp?.heroImage || "",
    gallery: firstProp?.gallery || [],
    properties: props,
    propertyCount: item.propertyCount,
    experiences: [],
  };
}

export default function DestinationsPage() {
  const { data: apiDestinations, loading, create, update, remove, refresh } = useApiData<ApiDestination>("destinations", {});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentDestSlug, setCurrentDestSlug] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [formData, setFormData] = useState({ title: "", subtitle: "", tagline: "", description: "", positioning: "", heroImage: "", properties: "", experiences: "" });

  useEffect(() => {
    setDestinations(apiDestinations.map(mapDestination));
  }, [apiDestinations]);

  const showNotification = (msg: string) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  const handleAdd = () => {
    setEditingDest(null);
    setFormData({ title: "", subtitle: "", tagline: "", description: "", positioning: "", heroImage: "", properties: "", experiences: "" });
    setShowModal(true);
  };

  const handleEdit = (dest: Destination) => {
    setEditingDest(dest);
    setFormData({
      title: dest.name, subtitle: dest.subtitle, tagline: dest.tagline,
      description: dest.description, positioning: dest.positioning,
      heroImage: dest.heroImage, properties: dest.properties.map(p => p.slug).join(", "),
      experiences: dest.experiences.join("\n"),
    });
    setShowModal(true);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete destination "${slug}"? This removes destination metadata only.`)) return;
    const ok = await remove(slug);
    if (ok) showNotification("Destination deleted");
    else showNotification("Failed to delete destination");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = editingDest?.slug || formData.title.toLowerCase().replace(/\s+/g, "-");
    const payload = {
      name: formData.title,
      slug,
      description: formData.description || editingDest?.description || "",
      heroImage: formData.heroImage || editingDest?.heroImage || "",
    };
    let result;
    if (editingDest) {
      result = await update(editingDest.slug, payload);
    } else {
      result = await create(payload);
    }
    if (result) {
      showNotification(editingDest ? "Destination updated" : "Destination created");
      setShowModal(false);
    } else {
      showNotification("Failed to save destination");
    }
  };

  const handleAddGalleryImage = async (destSlug: string) => {
    const url = (document.getElementById("galleryImageUrl") as HTMLInputElement)?.value;
    if (!url) return;
    const dest = destinations.find(d => d.slug === destSlug);
    if (dest && dest.properties.length > 0) {
      const prop = dest.properties[0];
      try {
        const res = await fetch(`/api/admin/properties/${prop.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gallery: [...prop.gallery, url] }),
        });
        if (res.ok) {
          showNotification("Gallery image added");
          setShowGalleryModal(false);
          refresh();
        } else {
          showNotification("Failed to add image");
        }
      } catch {
        showNotification("Failed to add image");
      }
    }
  };

  const handleDeleteGalleryImage = async (destSlug: string, index: number) => {
    const dest = destinations.find(d => d.slug === destSlug);
    if (dest && dest.properties.length > 0) {
      const prop = dest.properties[0];
      try {
        const res = await fetch(`/api/admin/properties/${prop.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gallery: prop.gallery.filter((_, i) => i !== index) }),
        });
        if (res.ok) {
          showNotification("Gallery image removed");
          refresh();
        } else {
          showNotification("Failed to remove image");
        }
      } catch {
        showNotification("Failed to remove image");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Destinations</h1>
          <p className="text-earth mt-1">Manage destination content, images, and seasons</p>
        </div>
        <button onClick={handleAdd} className="px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">+ Add Destination</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading destinations...</div></div>
      ) : (
      <div className="grid gap-6">
        {destinations.map((dest) => (
          <div key={dest.id} className="bg-white border border-sand-light p-6">
            <div className="flex gap-6">
              <div className="w-48 h-32 relative overflow-hidden flex-shrink-0">
                <Image src={dest.heroImage} alt={dest.name} fill unoptimized className="object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-soft-black">{dest.name}</h3>
                    <p className="text-earth text-sm mt-1">{dest.subtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(dest)} className="px-3 py-1.5 text-sm text-soft-black border border-sand-light hover:bg-cream transition-colors">Edit</button>
                    <button onClick={() => handleDelete(dest.slug)} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-earth">
                  <span>Properties: {dest.propertyCount}</span>
                  <span>Gallery: {dest.gallery.length} images</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-soft-black">Gallery Images</span>
                    <button onClick={() => { setCurrentDestSlug(dest.slug); setShowGalleryModal(true); }} className="text-sm text-gold hover:underline">+ Add Image</button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {dest.gallery.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 overflow-hidden group">
                        <Image src={img} alt={`Gallery ${idx}`} fill unoptimized className="object-cover" />
                        <button onClick={() => handleDeleteGalleryImage(dest.slug, idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream border border-sand-light max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-sand-light"><h2 className="text-xl font-heading font-bold text-soft-black">{editingDest ? "Edit Destination" : "Add Destination"}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-soft-black mb-1">Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none" required placeholder="e.g., Lake Malawi" /></div>
              <div><label className="block text-sm font-medium text-soft-black mb-1">Subtitle</label><input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-soft-black mb-1">Tagline</label><input type="text" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-soft-black mb-1">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none" rows={3} /></div>
              <div><label className="block text-sm font-medium text-soft-black mb-1">Positioning</label><textarea value={formData.positioning} onChange={e => setFormData({...formData, positioning: e.target.value})} className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none" rows={3} /></div>
              <div><label className="block text-sm font-medium text-soft-black mb-1">Hero Image URL</label><input type="url" value={formData.heroImage} onChange={e => setFormData({...formData, heroImage: e.target.value})} className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none" /></div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="px-4 py-2 bg-gold text-soft-black font-medium hover:bg-gold/90 transition-colors">{editingDest ? "Update" : "Create"}</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-soft-black border border-sand-light hover:bg-cream transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGalleryModal && (
        <div className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream border border-sand-light max-w-md w-full p-6">
            <h3 className="text-lg font-heading font-bold text-soft-black mb-4">Add Gallery Image</h3>
            <input type="url" id="galleryImageUrl" className="w-full px-3 py-2 border border-sand-light focus:border-gold focus:outline-none mb-4" placeholder="https://images.unsplash.com/..." />
            <div className="flex gap-3">
              <button onClick={() => handleAddGalleryImage(currentDestSlug)} className="px-4 py-2 bg-gold text-soft-black font-medium hover:bg-gold/90 transition-colors">Add Image</button>
              <button onClick={() => setShowGalleryModal(false)} className="px-4 py-2 text-soft-black border border-sand-light hover:bg-cream transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-soft-black text-white px-4 py-2 shadow-lg z-50">{toastMessage}</div>
      )}
    </div>
  );
}
