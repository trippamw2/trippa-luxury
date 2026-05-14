"use client";

import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";

export default function AdminMedia() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage images and videos.</p>
        </div>
        <Button variant="primary" size="sm">Upload Media</Button>
      </div>

      <div className="bg-white border border-gray-100 p-12 text-center">
        <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No media uploaded yet.</p>
        <p className="text-xs text-gray-300 mt-1">Upload images and videos for your properties and content.</p>
      </div>
    </div>
  );
}
