"use client";

import { motion } from "framer-motion";
import { ImageIcon, Upload, Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/lib/constants";

const MOCK_MEDIA = [
  { id: "1", src: IMAGES.lakeMalawiHero, alt: "Lake Malawi aerial", type: "image", size: "2.4 MB", used: true },
  { id: "2", src: IMAGES.southLuangwaHero, alt: "South Luangwa safari", type: "image", size: "3.1 MB", used: true },
  { id: "3", src: IMAGES.zanzibarHero, alt: "Zanzibar beach", type: "image", size: "1.8 MB", used: true },
  { id: "4", src: IMAGES.kayaMawa, alt: "Kaya Mawa lodge", type: "image", size: "2.7 MB", used: true },
  { id: "5", src: IMAGES.pukuRidge, alt: "Puku Ridge Camp", type: "image", size: "3.5 MB", used: true },
  { id: "6", src: IMAGES.xanadu, alt: "Xanadu Villas", type: "image", size: "2.2 MB", used: false },
  { id: "7", src: IMAGES.dining, alt: "Private beach dining", type: "image", size: "1.9 MB", used: true },
  { id: "8", src: IMAGES.spa, alt: "Couples spa", type: "image", size: "2.0 MB", used: true },
];

export default function AdminMedia() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Media Library</h1>
          <p className="text-sm text-earth mt-1">Upload and manage images and videos.</p>
        </div>
        <Button variant="primary" size="sm">
          <Upload className="w-4 h-4" />
          Upload Media
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Files", value: "24", color: "text-soft-black" },
          { label: "Images", value: "22", color: "text-gold-700" },
          { label: "Videos", value: "2", color: "text-indigo-700" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 border border-sand-light">
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {MOCK_MEDIA.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="group relative bg-white border border-gray-100 overflow-hidden aspect-square"
          >
            <img
              src={item.src}
              alt={item.alt}
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/40 transition-all duration-300 flex items-center justify-center">
              <button className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 text-gray-700 hover:bg-white transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {/* Badges */}
            <div className="absolute top-2 left-2">
              {item.type === "video" && (
                <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-medium flex items-center gap-1">
                  <Film className="w-3 h-3" /> Video
                </span>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <p className="text-xs text-white/90 truncate">{item.alt}</p>
              <p className="text-[10px] text-white/60">{item.size}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Upload area */}
      <div className="mt-8 border-2 border-dashed border-gray-200 p-12 text-center hover:border-gray-300 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Drop files here or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, MP4 up to 50 MB</p>
      </div>
    </div>
  );
}
