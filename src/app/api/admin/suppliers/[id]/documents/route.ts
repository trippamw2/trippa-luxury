import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest } from "@/lib/audit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "supplier-docs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: supplierId } = await params;
  try {
    await requireAdmin({ module: "suppliers", minRole: "editor" });
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("supplier_documents")
      .select("id, supplier_id, doc_type, original_name, file_path, expires_on, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: supplierId } = await params;
  try {
    const { profile } = await requireAdmin({ module: "suppliers", minRole: "editor" });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("doc_type") as string) || "other";
    const expiresOn = (formData.get("expires_on") as string) || null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!["contract", "insurance", "license", "other"].includes(docType)) {
      return NextResponse.json({ error: "Invalid doc_type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 413 });
    }

    const supabase = createAdminClient();
    const uuid = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${supplierId}/${uuid}-${safeName}`;
    const bytes = await file.arrayBuffer();

    // Ensure bucket exists (best-effort).
    try {
      await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_FILE_SIZE });
    } catch {
      // bucket may already exist
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: row, error: insertError } = await supabase
      .from("supplier_documents")
      .insert({
        supplier_id: supplierId,
        doc_type: docType,
        original_name: file.name,
        file_path: filePath,
        expires_on: expiresOn || null,
        uploaded_by: profile.id,
      })
      .select("id, supplier_id, doc_type, original_name, file_path, expires_on, created_at")
      .single();

    if (insertError || !row) {
      // Clean up uploaded object on DB failure.
      await supabase.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: insertError?.message || "Insert failed" }, { status: 500 });
    }

    await createAuditLog({
      tableName: "supplier_documents",
      action: "CREATE",
      recordId: row.id,
      newData: { supplier_id: supplierId, doc_type: docType, original_name: file.name, file_path: filePath },
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Supplier doc upload error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}