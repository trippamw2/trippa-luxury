"use client";

import { useState } from "react";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { FormInput } from "@/app/admin/components/FormField";
import { RichTextEditor } from "@/app/admin/components/RichTextEditor";
import { ImageUpload } from "@/app/admin/components/ImageUpload";
import { TagInput } from "@/app/admin/components/TagInput";
import { JsonEditor } from "@/app/admin/components/JsonEditor";
import { ImportCsv } from "@/app/admin/components/ImportCsv";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";

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

interface SeasonMonth {
  name: string;
  temp: string;
  weather: string;
  open: boolean | "partial";
}

interface Seasons {
  bestTime: string;
  closed: string;
  months: SeasonMonth[];
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
  highlights: string[];
  seasons: Seasons | null;
}

interface ApiDestination {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  positioning?: string;
  heroImage?: string;
  gallery?: string[];
  properties?: PropertyRef[];
  propertyCount: number;
  experiences?: string[];
  highlights?: string[];
  seasons?: Seasons | null;
}

interface DestinationPayload {
  name: string;
  slug: string;
  subtitle: string;
  tagline: string;
  description: string;
  positioning: string;
  heroImage: string;
  gallery: string[];
  experiences: string[];
  highlights: string[];
  seasons?: Seasons;
}

function mapDestination(item: ApiDestination): Destination {
  const props = (item.properties || []).map((p: PropertyRef) => ({
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
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    subtitle: item.subtitle || "",
    tagline: item.tagline || "",
    description: item.description || "",
    positioning: item.positioning || "",
    heroImage: item.heroImage || "",
    gallery: item.gallery || [],
    properties: props,
    propertyCount: item.propertyCount,
    experiences: item.experiences || [],
    highlights: item.highlights || [],
    seasons: item.seasons || null,
  };
}

export default function DestinationsPage() {
  const { data: apiDestinations, loading, create, update, remove, refresh } = useApiData<ApiDestination>("destinations", {});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "", subtitle: "", tagline: "", description: "", positioning: "", heroImage: "",
    gallery: [] as string[], experiences: "", highlights: "" as string,
    seasonsBestTime: "", seasonsClosed: "", seasonsMonths: "",
  });

  // Sync the local editable list when the API data changes. Done via
  // render-phase state adjustment (React-documented pattern) instead of an
  // effect, to avoid a synchronous setState-in-effect cascade.
  const [prevApi, setPrevApi] = useState(apiDestinations);
  if (apiDestinations !== prevApi) {
    setPrevApi(apiDestinations);
    setDestinations(apiDestinations.map(mapDestination));
  }



  const handleAdd = () => {
    setEditingDest(null);
    setFormData({
      title: "", subtitle: "", tagline: "", description: "", positioning: "", heroImage: "",
      gallery: [], experiences: "", highlights: "",
      seasonsBestTime: "", seasonsClosed: "", seasonsMonths: "",
    });
    setShowModal(true);
  };

  const handleEdit = (dest: Destination) => {
    setEditingDest(dest);
    setFormData({
      title: dest.name, subtitle: dest.subtitle, tagline: dest.tagline,
      description: dest.description, positioning: dest.positioning,
      heroImage: dest.heroImage, gallery: dest.gallery || [],
      experiences: (dest.experiences || []).join("\n"),
      highlights: (dest.highlights || []).join("\n"),
      seasonsBestTime: dest.seasons?.bestTime || "",
      seasonsClosed: dest.seasons?.closed || "",
      seasonsMonths: dest.seasons?.months ? JSON.stringify(dest.seasons.months, null, 2) : "",
    });
    setShowModal(true);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete destination "${slug}"? This removes destination metadata only.`)) return;
    const ok = await remove(slug);
    if (ok) toast("Destination deleted");
    else toast("Failed to delete destination");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = editingDest?.slug || formData.title.toLowerCase().replace(/\s+/g, "-");

    let seasons: Seasons | undefined;
    if (formData.seasonsBestTime || formData.seasonsMonths) {
      let months: SeasonMonth[] = [];
      try {
        months = JSON.parse(formData.seasonsMonths || "[]");
      } catch { /* ignore invalid JSON */ }
      seasons = {
        bestTime: formData.seasonsBestTime || "",
        closed: formData.seasonsClosed || "",
        months,
      };
    }

    const payload: DestinationPayload = {
      name: formData.title,
      slug,
      subtitle: formData.subtitle || "",
      tagline: formData.tagline || "",
      description: formData.description || "",
      positioning: formData.positioning || "",
      heroImage: formData.heroImage || "",
      gallery: formData.gallery || [],
      experiences: formData.experiences.split("\n").map(s => s.trim()).filter(Boolean),
      highlights: formData.highlights.split("\n").map(s => s.trim()).filter(Boolean),
      seasons,
    };

    let result;
    if (editingDest) {
      result = await update(editingDest.slug, payload);
    } else {
      result = await create(payload);
    }
    if (result) {
      toast(editingDest ? "Destination updated" : "Destination created");
      setShowModal(false);
    } else {
      toast("Failed to save destination");
    }
  };

  const handleAddGalleryImage = async (destSlug: string) => {
    const url = (document.getElementById("galleryImageUrl") as HTMLInputElement)?.value;
    if (!url) return;
    const dest = destinations.find(d => d.slug === destSlug);
    if (!dest) return;
    const updatedGallery = [...(dest.gallery || []), url];
    try {
      const res = await fetch(`/api/admin/destinations/${destSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery: updatedGallery }),
      });
      if (res.ok) {
        toast("Gallery image added");
        refresh();
      } else {
        toast("Failed to add image");
      }
    } catch {
      toast("Failed to add image");
    }
  };

  const handleDeleteGalleryImage = async (destSlug: string, index: number) => {
    const dest = destinations.find(d => d.slug === destSlug);
    if (!dest) return;
    const updatedGallery = (dest.gallery || []).filter((_, i) => i !== index);
    try {
      const res = await fetch(`/api/admin/destinations/${destSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery: updatedGallery }),
      });
      if (res.ok) {
        toast("Gallery image removed");
        refresh();
      } else {
        toast("Failed to remove image");
      }
    } catch {
      toast("Failed to remove image");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Destinations</h1>
          <p className="text-earth mt-1">Manage destination content, images, and seasons</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsv table="destinations" />
          {apiDestinations && apiDestinations.length > 0 && (
            <button
              onClick={() => exportToCsv(apiDestinations, [
                { key: "name", header: "Name" },
                { key: "slug", header: "Slug" },
                { key: "propertyCount", header: "Properties" },
                { key: "subtitle", header: "Subtitle" },
              ], "kivara-destinations")}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-sand-light text-sm text-earth hover:bg-warm-white hover:text-soft-black transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button onClick={handleAdd} className="px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">+ Add Destination</button>
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading destinations...</div></div>
      ) : (
      <div className="grid gap-6">
        {destinations.map((dest) => (
          <div key={dest.id} className="bg-white border border-sand-light p-6">
            <div className="flex gap-6">
              <div className="w-48 h-32 relative overflow-hidden flex-shrink-0 bg-sand-light">
                {dest.heroImage ? (
                  <Image src={dest.heroImage} alt={dest.name} fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-earth text-xs">No image</div>
                )}
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
                  <span>Experiences: {dest.experiences.length}</span>
                  <span>Highlights: {dest.highlights.length}</span>
                  {dest.seasons && <span>Seasons: configured</span>}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-soft-black">Gallery Images</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(dest.gallery || []).filter(Boolean).map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 overflow-hidden group bg-sand-light">
                        <Image src={img} alt={`Gallery ${idx}`} fill unoptimized className="object-cover" />
                        <button onClick={() => handleDeleteGalleryImage(dest.slug, idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const url = prompt("Enter image URL:");
                        if (url) handleAddGalleryImage(dest.slug);
                      }}
                      className="w-20 h-20 border-2 border-dashed border-sand-light flex items-center justify-center text-earth text-2xl hover:border-gold hover:text-gold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-cream border border-sand-light max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
              <h2 className="text-xl font-heading font-bold text-soft-black">{editingDest ? "Edit Destination" : "Add Destination"}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Title" name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="e.g., Lake Malawi" />
                  <ImageUpload label="Hero Image" value={formData.heroImage} onChange={(url) => setFormData({...formData, heroImage: url})} />
                </div>
                <FormInput label="Subtitle" name="subtitle" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="A freshwater archipelago known only to the fortunate few." />
                <FormInput label="Tagline" name="tagline" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} placeholder="Where the lake becomes an ocean of romantic tranquility" />
                <RichTextEditor label="Description" value={formData.description} onChange={(html) => setFormData({...formData, description: html})} minH="200px" />
                <RichTextEditor label="Positioning (hero paragraph)" value={formData.positioning} onChange={(html) => setFormData({...formData, positioning: html})} minH="200px" />

                {/* Experiences & Highlights */}
                <div className="grid grid-cols-2 gap-4">
                  <TagInput label="Experiences" value={formData.experiences.split("\n").filter(Boolean)} onChange={(tags) => setFormData({...formData, experiences: tags.join("\n")})} placeholder="Private beach dining" />
                  <TagInput label="Highlights" value={formData.highlights.split("\n").filter(Boolean)} onChange={(tags) => setFormData({...formData, highlights: tags.join("\n")})} placeholder="Crystal clear waters" />
                </div>

                {/* Gallery */}
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Gallery Images (one URL per line)</label>
                  <textarea value={formData.gallery.join("\n")} onChange={e => setFormData({...formData, gallery: e.target.value.split("\n").map(s => s.trim()).filter(Boolean)})}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" rows={4} placeholder="/images/kaya-mawa-beach-swing.jpg" />
                  {formData.gallery.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {formData.gallery.map((url, i) => (
                        <div key={i} className="relative aspect-[4/3] bg-sand-light overflow-hidden group">
                          <Image src={url} alt="" width={320} height={240} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} unoptimized />
                          <button type="button" onClick={() => setFormData({...formData, gallery: formData.gallery.filter((_, j) => j !== i)})}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seasons */}
                <div className="border-t border-sand-light pt-4">
                  <h3 className="text-sm font-bold text-soft-black mb-3">Seasons / Best Time to Visit</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Best Time</label>
                      <input type="text" value={formData.seasonsBestTime} onChange={e => setFormData({...formData, seasonsBestTime: e.target.value})}
                        className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="April to October" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Closed Season Note</label>
                      <input type="text" value={formData.seasonsClosed} onChange={e => setFormData({...formData, seasonsClosed: e.target.value})}
                        className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Some properties close Nov Mar" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <JsonEditor label="Monthly Breakdown" value={formData.seasonsMonths} onChange={(val) => setFormData({...formData, seasonsMonths: val})} minH="160px" placeholder={`[\n  {"name": "January", "temp": "26°C", "weather": "Dry", "open": true}\n]`} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">
                  {editingDest ? "Update Destination" : "Create Destination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
