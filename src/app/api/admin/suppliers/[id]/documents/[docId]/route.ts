import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: supplierId, docId } = await params;
  try {
    const { profile } = await requireAdmin({ module: "suppliers", minRole: "editor" });
    const supabase = createAdminClient();

    const { data: doc, error: fetchError } = await supabase
      .from("supplier_documents")
      .select("id, file_path")
      .eq("id", docId)
      .eq("supplier_id", supplierId)
      .single();
    if (fetchError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await supabase.storage.from("supplier-docs").remove([doc.file_path]);
    const { error: deleteError } = await supabase
      .from("supplier_documents")
      .delete()
      .eq("id", docId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await createAuditLog({
      tableName: "supplier_documents",
      action: "DELETE",
      recordId: docId,
      performedBy: profile.id,
      ipAddress: getIpFromRequest(_request),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Supplier doc delete error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}