import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const SIZES = [1920, 1200, 800, 400];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are accepted" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const ext = file.name.split(".").pop() || "jpg";
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const contentType = file.type;
    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Get original metadata
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // --- Helper: ensure media bucket exists ---
    async function ensureBucket() {
      const { error } = await supabase.storage
        .from("media")
        .upload(`admin-uploads/${baseName}.${ext}`, inputBuffer, {
          contentType,
          upsert: false,
        });
      if (error?.message?.includes("bucket")) {
        await supabase.storage.createBucket("media", {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
        });
        return false; // bucket was missing, caller should retry
      }
      return true; // success
    }

    // Upload original
    const originalPath = `admin-uploads/${baseName}.${ext}`;
    const { error: origError } = await supabase.storage
      .from("media")
      .upload(originalPath, inputBuffer, { contentType, upsert: false });

    if (origError) {
      const ok = await ensureBucket();
      if (!ok) {
        // Retry after bucket creation
        const retry = await supabase.storage
          .from("media")
          .upload(originalPath, inputBuffer, { contentType, upsert: false });
        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: origError.message }, { status: 500 });
      }
    }

    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from("media")
      .getPublicUrl(originalPath);

    // --- Generate WebP variants ---
    const variants: { width: number; url: string; path: string }[] = [];

    for (const width of SIZES) {
      if (width >= originalWidth) continue; // skip upscaling : use original for largest

      try {
        const variantPath = `admin-uploads/${baseName}_${width}.webp`;
        const resizedBuffer = await sharp(inputBuffer)
          .resize(width, undefined, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        const { error: vError } = await supabase.storage
          .from("media")
          .upload(variantPath, resizedBuffer, { contentType: "image/webp", upsert: false });

        if (!vError) {
          const { data: { publicUrl } } = supabase.storage
            .from("media")
            .getPublicUrl(variantPath);
          variants.push({ width, url: publicUrl, path: variantPath });
        }
      } catch (variantErr) {
        console.warn(`Failed to generate ${width}px variant:`, variantErr);
      }
    }

    // --- Create media_assets record if metadata provided ---
    const category = formData.get("category") as string | null;
    const altText = formData.get("altText") as string | null;
    const tagsRaw = formData.get("tags") as string | null;

    let record: Record<string, any> | null = null;
    if (category || altText) {
      const { data: newRecord, error: recError } = await supabase
        .from("media_assets")
        .insert({
          filename: file.name,
          url: originalUrl,
          type: "image",
          category: category || "uncategorized",
          alt_text: altText || file.name,
          tags: tagsRaw ? JSON.parse(tagsRaw) : [],
          width: originalWidth,
          height: originalHeight,
          file_size: file.size,
          variants,
        })
        .select()
        .single();

      if (recError) {
        console.warn("Failed to create media_assets record:", recError);
      } else {
        record = newRecord;
      }
    }

    return NextResponse.json({
      url: originalUrl,
      path: originalPath,
      variants,
      width: originalWidth,
      height: originalHeight,
      fileSize: file.size,
      record,
    });
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
