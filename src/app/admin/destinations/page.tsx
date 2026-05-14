"use client";

import { useState } from "react";
import Image from "next/image";

// Sample data - in production would come from API/database
const initialDestinations = [
  {
    id: "lake-malawi",
    title: "Lake Malawi",
    subtitle: "Africa's Best Kept Secret. Your Private Freshwater Paradise.",
    tagline: "Where the lake becomes an ocean of tranquility",
    description: "Lake Malawi is not merely a destination. It is a benediction. Africa's third largest lake holds crystal waters that shimmer like liquid sapphire, shores so pristine they feel untouched by time, and an atmosphere of such profound serenity that couples find themselves speaking in whispers.",
    positioning: "Imagine a place where the horizon is nothing but water and sky. Where the only decisions are whether to kayak at dawn or dine beneath constellations on a private beach. Kaya Mawa, Pumulani, Blue Zebra Island Lodge each offers its own chapter of this love story.",
    heroImage: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1540972501202-c4389992159f?w=800&q=80",
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
      "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=800&q=80",
    ],
    properties: ["kaya-mawa", "pumulani-lodge", "blue-zebra-island-lodge"],
    experiences: [
      "Private beach dining beneath a canopy of stars",
      "Sunset dhow cruises across the Lake of Stars",
      "Snorkeling in crystalline freshwater coves",
      "Private picnics on deserted islands",
      "Kayaking through golden hour light",
      "Intimate cultural encounters with lakeside villages",
    ],
  },
  {
    id: "south-luangwa",
    title: "South Luangwa",
    subtitle: "The Birthplace of the Walking Safari. The Soul of African Wilderness.",
    tagline: "Where intimacy with the wild transforms you",
    description: "South Luangwa is not a national park. It is a living cathedral of wilderness. The birthplace of the walking safari offers something increasingly precious: an unfiltered, unscripted communion with the natural world.",
    positioning: "This is Africa as it was before fences, before crowds, before compromise. South Luangwa offers an intimacy with the wild that few places on earth can match.",
    heroImage: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
      "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=800&q=80",
    ],
    properties: ["puku-ridge-camp", "luangwa-safari-house", "luangwa-river-camp"],
    experiences: [
      "Guided walking safaris following ancient elephant paths",
      "Night drives revealing the bush after dark",
      "Sundowners on the riverbank as Africa paints the sky",
      "Bush breakfasts where zebras are your dining companions",
      "Exclusive photography hides for intimate wildlife encounters",
      "Stargazing from raised platforms above the floodplain",
    ],
  },
  {
    id: "zanzibar",
    title: "Zanzibar",
    subtitle: "The Spice Island. The Apex of Tropical Romance.",
    tagline: "Where history, spice, and turquoise waters converge",
    description: "Zanzibar is a love letter written in cinnamon and clove. An archipelago where ancient Stone Town alleyways lead to beaches of such impossible beauty they seem invented.",
    positioning: "Zanzibar exists at the intersection of culture and paradise. The scent of spices drifts through centuries old corridors. Dhows sail into sunsets that set the sky ablaze.",
    heroImage: "https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=1920&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1578099139121-68fc7f86ca09?w=800&q=80",
      "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6d5?w=800&q=80",
      "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=80",
    ],
    properties: ["xanadu-villas", "zanzibar-white-sand-villas", "the-residence-zanzibar"],
    experiences: [
      "Spice plantation tours through ancient aromatic gardens",
      "Stone Town heritage walks through living history",
      "Private sandbank dining surrounded by the Indian Ocean",
      "Sunset dhow cruises with champagne and Swahili canapes",
      "Couples spa rituals using indigenous Zanzibari ingredients",
      "Deep sea fishing expeditions into the Indian Ocean",
    ],
  },
];

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState(initialDestinations);
  const [showModal, setShowModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<typeof initialDestinations[0] | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentDestination, setCurrentDestination] = useState<string>("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    tagline: "",
    description: "",
    positioning: "",
    heroImage: "",
    properties: "",
    experiences: "",
  });

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAdd = () => {
    setEditingDestination(null);
    setFormData({
      title: "",
      subtitle: "",
      tagline: "",
      description: "",
      positioning: "",
      heroImage: "",
      properties: "",
      experiences: "",
    });
    setShowModal(true);
  };

  const handleEdit = (dest: typeof initialDestinations[0]) => {
    setEditingDestination(dest);
    setFormData({
      title: dest.title,
      subtitle: dest.subtitle,
      tagline: dest.tagline,
      description: dest.description,
      positioning: dest.positioning,
      heroImage: dest.heroImage,
      properties: dest.properties.join(", "),
      experiences: dest.experiences.join("\n"),
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this destination?")) {
      setDestinations(destinations.filter((d) => d.id !== id));
      showNotification("Destination deleted successfully");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDestination = {
      id: editingDestination?.id || formData.title.toLowerCase().replace(/\s+/g, "-"),
      title: formData.title,
      subtitle: formData.subtitle,
      tagline: formData.tagline,
      description: formData.description,
      positioning: formData.positioning,
      heroImage: formData.heroImage || "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80",
      gallery: editingDestination?.gallery || [],
      properties: formData.properties.split(",").map((p) => p.trim()).filter(Boolean),
      experiences: formData.experiences.split("\n").map((e) => e.trim()).filter(Boolean),
    };

    if (editingDestination) {
      setDestinations(destinations.map((d) => (d.id === editingDestination.id ? newDestination : d)));
      showNotification("Destination updated successfully");
    } else {
      setDestinations([...destinations, newDestination]);
      showNotification("Destination created successfully");
    }
    setShowModal(false);
  };

  const handleAddGalleryImage = (destId: string, imageUrl: string) => {
    if (!imageUrl) return;
    setDestinations(
      destinations.map((d) =>
        d.id === destId ? { ...d, gallery: [...d.gallery, imageUrl] } : d
      )
    );
    showNotification("Gallery image added");
  };

  const handleDeleteGalleryImage = (destId: string, index: number) => {
    setDestinations(
      destinations.map((d) =>
        d.id === destId
          ? { ...d, gallery: d.gallery.filter((_, i) => i !== index) }
          : d
      )
    );
    showNotification("Gallery image removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Destinations</h1>
          <p className="text-earth mt-1">Manage destination content, images, and seasons</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-gold text-white font-medium rounded hover:bg-gold/90 transition-colors"
        >
          + Add Destination
        </button>
      </div>

      {/* Destinations Grid */}
      <div className="grid gap-6">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            className="bg-white border border-sand-light rounded-lg p-6"
          >
            <div className="flex gap-6">
              {/* Hero Image Preview */}
              <div className="w-48 h-32 relative rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={dest.heroImage}
                  alt={dest.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-soft-black">{dest.title}</h3>
                    <p className="text-earth text-sm mt-1">{dest.subtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(dest)}
                      className="px-3 py-1.5 text-sm text-soft-black border border-sand-light rounded hover:bg-cream transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dest.id)}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-earth">
                  <span>Properties: {dest.properties.length}</span>
                  <span>Experiences: {dest.experiences.length}</span>
                  <span>Gallery: {dest.gallery.length} images</span>
                </div>

                {/* Gallery Management */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-soft-black">Gallery Images</span>
                    <button
                      onClick={() => {
                        setCurrentDestination(dest.id);
                        setShowGalleryModal(true);
                      }}
                      className="text-sm text-gold hover:underline"
                    >
                      + Add Image
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {dest.gallery.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded overflow-hidden group">
                        <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                        <button
                          onClick={() => handleDeleteGalleryImage(dest.id, idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-sand-light">
              <h2 className="text-xl font-heading font-bold text-soft-black">
                {editingDestination ? "Edit Destination" : "Add Destination"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  required
                  placeholder="e.g., Lake Malawi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  placeholder="e.g., Africa's Best Kept Secret..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  placeholder="e.g., Where the lake becomes an ocean of tranquility"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  rows={3}
                  placeholder="Main description paragraph"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Positioning</label>
                <textarea
                  value={formData.positioning}
                  onChange={(e) => setFormData({ ...formData, positioning: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  rows={3}
                  placeholder="Marketing positioning text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Hero Image URL</label>
                <input
                  type="url"
                  value={formData.heroImage}
                  onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Properties (comma separated)</label>
                <input
                  type="text"
                  value={formData.properties}
                  onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  placeholder="kaya-mawa, pumulani-lodge, blue-zebra-island-lodge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Experiences (one per line)</label>
                <textarea
                  value={formData.experiences}
                  onChange={(e) => setFormData({ ...formData, experiences: e.target.value })}
                  className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
                  rows={5}
                  placeholder="Private beach dining&#10;Sunset dhow cruises&#10;Snorkeling..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold text-white font-medium rounded hover:bg-gold/90 transition-colors"
                >
                  {editingDestination ? "Update Destination" : "Create Destination"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-soft-black border border-sand-light rounded hover:bg-cream transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Add Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-heading font-bold text-soft-black mb-4">Add Gallery Image</h3>
            <input
              type="url"
              id="galleryImageUrl"
              className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none mb-4"
              placeholder="https://images.unsplash.com/..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const url = (document.getElementById("galleryImageUrl") as HTMLInputElement).value;
                  handleAddGalleryImage(currentDestination, url);
                  setShowGalleryModal(false);
                }}
                className="px-4 py-2 bg-gold text-white font-medium rounded hover:bg-gold/90 transition-colors"
              >
                Add Image
              </button>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="px-4 py-2 text-soft-black border border-sand-light rounded hover:bg-cream transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-soft-black text-white px-4 py-2 rounded shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}