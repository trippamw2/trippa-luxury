-- 048: Supplier compliance documents.
CREATE TABLE IF NOT EXISTS supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('contract', 'insurance', 'license', 'other')),
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  expires_on DATE,
  uploaded_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (supplier_id, doc_type, original_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier ON supplier_documents (supplier_id);

ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
-- service-role only: no policies for anon/authenticated.