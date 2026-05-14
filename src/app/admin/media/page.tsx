"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, Edit2, Trash2, Save, X, Search, ImageIcon } from "lucide-react";

// Image categories and their current values
const imageCategories = {
  homepage: {
    name: "Homepage",
    images: [
      { id: "hero", label: "Hero Background", key: "hero", current: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80" },
      { id: "featured1", label: "Featured Destination 1", key: "featured1", current: "https://images.unsplash.com/photo-1540972501202-c4389992159f?w=800&q=80" },
      { id: "featured2", label: "Featured Destination 2", key: "featured2", current: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80" },
      { id: "featured3", label: "Featured Destination 3", key: "featured3", current: "https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=800&q=80" },
    ],
  },
  destinations: {
    name: "Destinations",
    images: [
      { id: "lake-malawi-hero", label: "Lake Malawi Hero", key: "lakeMalawiHero", current: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80" },
      { id: "lake-malawi-gallery1", label: "Lake Malawi Gallery 1", key: "lakeMalawiGallery1", current: "https://images.unsplash.com/photo-1540972501202-c4389992159f?w=800&q=80" },
      { id: "lake-malawi-gallery2", label: "Lake Malawi Gallery 2", key: "lakeMalawiGallery2", current: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80" },
      { id: "south-luangwa-hero", label: "South Luangwa Hero", key: "southLuangwaHero", current: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&q=80" },
      { id: "south-luangwa-gallery1", label: "South Luangwa Gallery 1", key: "southLuangwaGallery1", current: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80" },
      { id: "south-luangwa-gallery2", label: "South Luangwa Gallery 2", key: "southLuangwaGallery2", current: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80" },
      { id: "zanzibar-hero", label: "Zanzibar Hero", key: "zanzibarHero", current: "https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=1920&q=80" },
      { id: "zanzibar-gallery1", label: "Zanzibar Gallery 1", key: "zanzibarGallery1", current: "https://images.unsplash.com/photo-1578099139121-68fc7f86ca09?w=800&q=80" },
      { id: "zanzibar-gallery2", label: "Zanzibar Gallery 2", key: "zanzibarGallery2", current: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6d5?w=800&q=80" },
    ],
  },
  properties: {
    name: "Properties",
    images: [
      { id: "kaya-mawa", label: "Kaya Mawa", key: "kayaMawa", current: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80" },
      { id: "pumulani", label: "Pumulani Lodge", key: "pumulaniLodge", current: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80" },
      { id: "blue-zebra", label: "Blue Zebra Island Lodge", key: "blueZebraIslandLodge", current: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80" },
      { id: "puku-ridge", label: "Puku Ridge Camp", key: "pukuRidgeCamp", current: "https://images.unsplash.com/photo-1544957992-20514f595d6f?w=800&q=80" },
      { id: "luangwa-safari-house", label: "Luangwa Safari House", key: "luangwaSafariHouse", current: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80" },
      { id: "luangwa-river-camp", label: "Luangwa River Camp", key: "luangwaRiverCamp", current: "https://images.unsplash.com/photo-1571003123894-1f0594d2d5d9?w=800&q=80" },
      { id: "xanadu", label: "Xanadu Villas", key: "xanaduVillas", current: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80" },
      { id: "zanzibar-white-sand", label: "Zanzibar White Sand", key: "zanzibarWhiteSandVillas", current: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80" },
      { id: "the-residence", label: "The Residence Zanzibar", key: "theResidenceZanzibar", current: "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80" },
    ],
  },
  experiences: {
    name: "Experiences & Activities",
    images: [
      { id: "dining", label: "Private Dining", key: "dining", current: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80" },
      { id: "spa", label: "Couples Spa", key: "spa", current: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80" },
      { id: "safari", label: "Safari Experience", key: "safari", current: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80" },
      { id: "beach", label: "Beach Activities", key: "beach", current: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80" },
      { id: "water-activities", label: "Water Activities", key: "waterActivities", current: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80" },
      { id: "sunset", label: "Sunset Experience", key: "sunset", current: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80" },
    ],
  },
  blog: {
    name: "Blog & Journal",
    images: [
      { id: "blog-hero1", label: "Blog Post 1", key: "blogHero1", current: "https://images.unsplash.com/photo-1499750310159-5b5f096fd68b?w=800&q=80" },
      { id: "blog-hero2", label: "Blog Post 2", key: "blogHero2", current: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80" },
      { id: "blog-hero3", label: "Blog Post 3", key: "blogHero3", current: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80" },
    ],
  },
};

export default function MediaPage() {
  const [activeCategory, setActiveCategory] = useState("homepage");
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Store modified images in state (would be API in production)
  const [modifiedImages, setModifiedImages] = useState<Record<string, string>>({});

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getCurrentImage = (key: string) => {
    return modifiedImages[key] || imageCategories[activeCategory as keyof typeof imageCategories].images.find((img) => img.key === key)?.current || "";
  };

  const handleSaveImage = (key: string) => {
    if (imageUrl) {
      setModifiedImages({ ...modifiedImages, [key]: imageUrl });
      showNotification("Image updated successfully");
      setEditingImage(null);
      setImageUrl("");
    }
  };

  const handleResetImage = (key: string) => {
    const newModified = { ...modifiedImages };
    delete newModified[key];
    setModifiedImages(newModified);
    showNotification("Image reset to default");
  };

  const filteredImages = imageCategories[activeCategory as keyof typeof imageCategories].images.filter((img) =>
    img.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Media Library</h1>
          <p className="text-earth mt-1">Manage all images across the website</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sand-light pb-4">
        {Object.entries(imageCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeCategory === key
                ? "bg-soft-black text-cream"
                : "text-earth hover:bg-sand-light"
            }`}
          >
            {category.name}
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
          className="w-full pl-10 pr-4 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
        />
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredImages.map((img) => (
          <div key={img.id} className="bg-white border border-sand-light rounded-lg overflow-hidden">
            {/* Image Preview */}
            <div className="relative aspect-video bg-cream">
              <Image
                src={getCurrentImage(img.key)}
                alt={img.label}
                fill
                className="object-cover"
              />
              {modifiedImages[img.key] && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-gold text-white text-xs rounded">
                  Modified
                </div>
              )}
            </div>

            {/* Image Info */}
            <div className="p-4">
              <p className="font-medium text-soft-black text-sm">{img.label}</p>
              <p className="text-xs text-earth mt-1 truncate">
                {getCurrentImage(img.key)}
              </p>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setEditingImage(img.key);
                    setImageUrl(getCurrentImage(img.key));
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-soft-black text-cream rounded hover:bg-soft-black-light transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Replace
                </button>
                {modifiedImages[img.key] && (
                  <button
                    onClick={() => handleResetImage(img.key)}
                    className="px-3 py-1.5 text-sm border border-sand-light rounded hover:bg-cream transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Edit Modal */}
            {editingImage === img.key && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-4 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-soft-black">Replace Image</h3>
                    <button onClick={() => setEditingImage(null)} className="text-earth hover:text-soft-black">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="relative aspect-video bg-cream mb-4 rounded overflow-hidden">
                    {imageUrl && (
                      <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                    )}
                  </div>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image URL (e.g., https://images.unsplash.com/...)"
                    className="w-full px-3 py-2 border border-sand-light rounded focus:border-gold focus:outline-none text-sm mb-3"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveImage(img.key)}
                      disabled={!imageUrl}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gold text-white rounded hover:bg-gold/90 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingImage(null);
                        setImageUrl("");
                      }}
                      className="px-3 py-2 border border-sand-light rounded hover:bg-cream transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="bg-cream border border-sand-light rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-earth" />
            <span className="text-sm text-soft-black">
              <span className="font-medium">{Object.values(imageCategories).reduce((acc, cat) => acc + cat.images.length, 0)}</span> total images
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-soft-black">
              <span className="font-medium text-gold">{Object.keys(modifiedImages).length}</span> modified
            </span>
          </div>
          <div className="text-xs text-earth">
            Changes are saved locally. In production, these would save to database.
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-soft-black text-white px-4 py-2 rounded shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}