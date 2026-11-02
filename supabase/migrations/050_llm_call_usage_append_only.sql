-- 050: Append-only trigger for llm_call_usage (parity with system_events/supplier_performance).
CREATE OR REPLACE FUNCTION public.forbid_llm_call_usage_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'llm_call_usage is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS llm_call_usage_append_only ON llm_call_usage;
CREATE TRIGGER llm_call_usage_append_only
  BEFORE UPDATE OR DELETE ON llm_call_usage
  FOR EACH ROW EXECUTE FUNCTION public.forbid_llm_call_usage_mutation();