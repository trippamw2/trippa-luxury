"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, Link as LinkIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormInput } from "./FormField";

/* ─── Props ───────────────────────────────────────────── */
interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  error?: string;
  /** Accepted MIME types (default: images) */
  accept?: string;
  /** Max file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Bucket name in Supabase storage (default: "media") */
  bucket?: string;
  disabled?: boolean;
}

/* ─── Component ───────────────────────────────────────── */
export function ImageUpload({
  value, onChange, label, error, accept = "image/*",
  maxSizeMB = 5, disabled,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are accepted.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onChange, maxSizeMB]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearImage = () => { onChange(""); setUploadError(null); };

  const inputId = `img-upload-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="space-y-0.5">
      {label && (
        <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Preview when image is set */}
      {value ? (
        <div className="relative aspect-video bg-sand-light overflow-hidden group">
          <Image src={value} alt="Upload preview" fill className="object-cover" />
          <button
            type="button"
            onClick={clearImage}
            disabled={disabled}
            className="absolute top-2 right-2 p-1 bg-soft-black/70 text-cream rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed cursor-pointer transition-colors",
            dragOver
              ? "border-gold bg-gold/5"
              : "border-sand-light hover:border-gold/50 hover:bg-warm-white",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="text-sm text-earth">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-earth" />
              <p className="text-sm text-earth">
                <span className="text-gold font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-earth/60">PNG, JPG, WebP up to {maxSizeMB}MB</p>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowUrlInput(!showUrlInput); }}
                className="flex items-center gap-1 text-xs text-earth hover:text-gold mt-1"
              >
                <LinkIcon className="w-3 h-3" /> Paste URL instead
              </button>
            </>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
        </div>
      )}

      {/* URL input fallback */}
      {showUrlInput && (
        <div className="mt-2">
          <FormInput
            placeholder="https://example.com/image.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-xs text-red-500 mt-1">{error || uploadError}</p>
      )}
    </div>
  );
}
