-- ═══════════════════════════════════════════════════════════════════════════
-- 030 — Retention purge for append-only tables
--
-- `system_events` and `supplier_performance` are append-only by design
-- (migration 028 installed `forbid_append_only_mutation` as a BEFORE UPDATE OR
-- DELETE trigger). That is the right default: an audit trail you can quietly
-- edit is not an audit trail.
--
-- But append-only forever is not a policy, it is an accident of never writing
-- the deletion path. The tables grow without bound, and a retention rule that
-- only exists as a runbook nobody follows is not a retention rule.
--
-- This migration writes that path down, deliberately badly:
--
--   1. It is SECURITY DEFINER but EXECUTE is revoked from PUBLIC, anon and
--      authenticated, and granted only to service_role. There is no code path
--      from a browser to this function.
--   2. The table is chosen from a hardcoded whitelist — never interpolated
--      from caller input. `format('%I')` is not the defence here; the absence
--      of any dynamic name resolution at all is.
--   3. `p_older_than_days` has a hard 90-day floor. You cannot purge anything
--      recent even with service_role, so a bug in a caller cannot destroy the
--      evidence for a live dispute.
--   4. `p_reason` is mandatory and must be substantive, so the audit_log row
--      records WHY, not just that something vanished.
--   5. The delete is capped per call and reports whether it hit the cap, so a
--      backlog is purged in bounded steps rather than one unbounded DELETE.
--   6. It writes its own audit_log row — including counts, cutoff and reason.
--      A purge that does not record itself is the one failure mode that would
--      make this migration worth having.
--
-- ON THE TRIGGER, WHICH IS THE INTERESTING PART HERE:
-- A BEFORE trigger fires regardless of the caller's privileges, so
-- SECURITY DEFINER alone would NOT let this function delete anything. The
-- function therefore DISABLEs the guard as table owner, deletes, then
-- re-enables it.
--
-- That makes the transaction boundary load-bearing, and it is why there is
-- deliberately NO exception handler. If the DELETE fails, the exception
-- propagates and the surrounding transaction — including the DISABLE — rolls
-- back, so the table is never left unprotected. Adding a handler that re-enables
-- the trigger on the way out would be actively harmful: the re-enable happens
-- inside the subtransaction that is about to be rolled back, so it would be
-- undone, leaving the trigger disabled while appearing to have restored it.
-- Letting the error propagate is the safer behaviour.
--
-- Both timestamps below are `created_at` (row age), deliberately not
-- `observed_at`: an observation recorded late is still an old record for
-- retention purposes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Teach audit_log about purges ─────────────────────────────────────────
-- `action` is CHECK-constrained to six values, none of which describes a bulk
-- retention purge. Recording the purge as a DELETE would be a lie about what
-- happened (one row, not many) and would make it indistinguishable from an
-- ordinary application delete in the audit trail — exactly the ambiguity this
-- function exists to remove.
DO $$
BEGIN
  ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
  ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check
    CHECK (action IN (
      'CREATE', 'UPDATE', 'DELETE',
      'CAMPAIGN_SEND', 'LOGIN_SUCCESS', 'LOGIN_FAILED',
      'PURGE'
    ));
END
$$;

-- ── 2. The purge function ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_append_only_rows(
  p_table          TEXT,
  p_older_than_days INTEGER,
  p_reason         TEXT,
  p_max_rows       INTEGER DEFAULT 10000,
  p_performed_by   UUID  DEFAULT NULL
)
RETURNS TABLE (
  purged_count INTEGER,
  hit_cap      BOOLEAN,
  cutoff       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Mandatory for SECURITY DEFINER: without an explicit search_path, a caller
-- who can create objects in a schema earlier in the path can shadow the
-- function's own references and run code as the definer.
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Retention floor. Deliberately a constant rather than a parameter: making
  -- it passable would let the floor be bypassed by the same call that uses it.
  c_min_retention_days CONSTANT INTEGER := 90;
  c_max_rows           CONSTANT INTEGER := 50000;
  c_min_reason_len     CONSTANT INTEGER := 10;

  v_trigger_name TEXT;
  v_cutoff       TIMESTAMPTZ;
  v_deleted      INTEGER;
BEGIN
  -- Whitelist. Resolving the trigger name from a lookup means an unknown table
  -- never reaches the dynamic SQL below, and no caller-supplied identifier is
  -- ever formatted into a statement.
  CASE p_table
    WHEN 'system_events'        THEN v_trigger_name := 'system_events_append_only';
    WHEN 'supplier_performance' THEN v_trigger_name := 'supplier_performance_append_only';
    ELSE
      RAISE EXCEPTION
        'purge_append_only_rows: table % is not purgeable (allowed: system_events, supplier_performance)',
        p_table
        USING ERRCODE = '22023';
  END CASE;

  IF p_older_than_days IS NULL OR p_older_than_days < c_min_retention_days THEN
    RAISE EXCEPTION
      'purge_append_only_rows: p_older_than_days must be >= % days (requested: %)',
      c_min_retention_days, p_older_than_days
      USING ERRCODE = '22023';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < c_min_reason_len THEN
    RAISE EXCEPTION
      'purge_append_only_rows: p_reason must be a substantive explanation (>= % chars)',
      c_min_reason_len
      USING ERRCODE = '22023';
  END IF;

  IF p_max_rows IS NULL OR p_max_rows < 1 OR p_max_rows > c_max_rows THEN
    RAISE EXCEPTION
      'purge_append_only_rows: p_max_rows must be between 1 and % (requested: %)',
      c_max_rows, p_max_rows
      USING ERRCODE = '22023';
  END IF;

  v_cutoff := now() - make_interval(days => p_older_than_days);

  -- Bounded delete: only the oldest p_max_rows rows qualify, so a large
  -- backlog is purged in successive bounded calls instead of one statement
  -- that can hold a lock long enough to matter.
  -- A BEFORE trigger fires regardless of privilege, so SECURITY DEFINER alone
  -- would not let this function delete anything. Disabling the guard is only
  -- possible because this function runs as the table owner.
  --
  -- Note this takes an ACCESS EXCLUSIVE lock on the table for the duration of
  -- the transaction. That is an accepted cost of a maintenance operation, and
  -- another reason p_max_rows is capped and the function is not on any
  -- request path.
  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I', p_table, v_trigger_name);

  EXECUTE format(
    'DELETE FROM public.%I WHERE id IN (
       SELECT id FROM public.%I
       WHERE created_at < $1
       ORDER BY created_at ASC
       LIMIT $2
     )',
    p_table, p_table
  ) USING v_cutoff, p_max_rows;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Record the purge. This happens inside the same transaction as the delete:
  -- either both land or neither does. A purge that deleted rows without
  -- recording itself would be the one outcome that defeats the purpose.
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, new_data, performed_by
  ) VALUES (
    p_table,
    NULL,
    'PURGE',
    jsonb_build_object(
      'purged_count',     v_deleted,
      'older_than_days',  p_older_than_days,
      'cutoff',           v_cutoff,
      'max_rows',         p_max_rows,
      'reason',           btrim(p_reason),
      'trigger_disabled', v_trigger_name
    ),
    NULL,
    p_performed_by
  );

  -- Re-enable last, so the table is unguarded for the shortest possible window.
  -- If anything above this line raises, the whole transaction — DISABLE
  -- included — rolls back, so the trigger is never left off by a failure.
  EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I', p_table, v_trigger_name);

  RETURN QUERY SELECT v_deleted, (v_deleted >= p_max_rows), v_cutoff;
END;
$$;

-- ── 3. Lock it down ─────────────────────────────────────────────────────────
-- REVOKE must come after CREATE OR REPLACE: functions default to EXECUTE for
-- PUBLIC, so a brief window exists between the two statements. Re-run this
-- migration to close it if it is ever interrupted.
REVOKE ALL ON FUNCTION public.purge_append_only_rows(TEXT, INTEGER, TEXT, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_append_only_rows(TEXT, INTEGER, TEXT, INTEGER, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.purge_append_only_rows(TEXT, INTEGER, TEXT, INTEGER, UUID) FROM authenticated;

-- service_role is the only caller. This is the operational interface: a
-- maintenance route or job authenticated with the service key.
GRANT EXECUTE ON FUNCTION public.purge_append_only_rows(TEXT, INTEGER, TEXT, INTEGER, UUID) TO service_role;

COMMENT ON FUNCTION public.purge_append_only_rows(TEXT, INTEGER, TEXT, INTEGER, UUID) IS
  'Retention purge for append-only tables. service_role only; 90-day minimum '
  'retention; mandatory reason; capped per call; writes its own audit_log row '
  '(action = PURGE). Exists so retention is enforceable rather than aspirational.';
