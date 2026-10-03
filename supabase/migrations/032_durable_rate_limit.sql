-- ─── Durable Rate Limiting ──────────────────────────────────────────────────
-- Replaces per-process counters with a shared Postgres-backed fixed window so
-- a limit means the same thing on every instance.
--
-- Why this exists: the in-memory limiter in `src/lib/public-rate-limiter.ts`
-- keeps its counters in the Node process. On Vercel — where every serverless
-- invocation may get its own instance and cold starts discard state — a caller
-- can multiply their allowance by the number of instances and a restart resets
-- every counter to zero. That is fine as defence in depth and useless as a
-- limit.
--
-- This remains DEFENCE IN DEPTH, not a hard boundary:
--   * `clientKey` is derived from `x-forwarded-for`, which the caller controls,
--     so varying the header yields a fresh bucket per request regardless of
--     where the counter lives.
--   * A determined attacker rotates source addresses far faster than any fixed
--     window can track.
-- The hard boundary belongs at the edge (WAF, CAPTCHA, provider quotas). This
-- table makes the in-process limiter honest about what it can and cannot do.
--
-- Atomicity: the whole read-modify-write is a single INSERT .. ON CONFLICT DO
-- UPDATE, which Postgres runs as one statement under a row lock. Doing this as
-- SELECT-then-UPDATE in application code would reintroduce the exact race a rate
-- limiter must not have: two concurrent requests both read count = N - 1 and both
-- are admitted past the limit.

BEGIN;

-- ── Table ──────────────────────────────────────────────────────────────────
-- One row per (bucket, current window). Rows are upserted in place rather than
-- accumulated, so the table stays proportional to *active* callers rather than to
-- total requests.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key         TEXT PRIMARY KEY,
  window_started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Named `request_count` rather than `count` to stay clear of the aggregate.
  request_count      INTEGER     NOT NULL DEFAULT 0,

  -- A counter can never usefully be negative, and an oversized key would let a
  -- caller pad the key space. Both are bounded rather than trusted.
  CONSTRAINT rate_limit_buckets_count_positive CHECK (request_count >= 0),
  CONSTRAINT rate_limit_buckets_key_length    CHECK (char_length(bucket_key) BETWEEN 1 AND 256)
);

COMMENT ON TABLE public.rate_limit_buckets IS
  'Shared fixed-window rate limit counters. Bounded by active callers, not by total requests.';

-- Supports the pruning sweep below. Without it every cleanup sequential scans the
-- whole table.
CREATE INDEX IF NOT EXISTS rate_limit_buckets_window_started_at_idx
  ON public.rate_limit_buckets (window_started_at);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Enabled with NO policies. That is deliberate: the service role bypasses RLS,
-- so it keeps full access, while anon and authenticated match zero policies and
-- are refused. A permissive policy here would expose everyone's rate-limit state
-- and let a caller read or forge another bucket's counter.
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- ── Consume one unit ───────────────────────────────────────────────────────
-- Returns whether the call is admitted, what is left in the window, and how long
-- the caller should wait. `remaining` is clamped at 0 so a caller cannot see a
-- negative allowance, and `retry_after_seconds` is floored at 1 so a client never
-- receives Retry-After: 0 and retries immediately in a loop.
CREATE OR REPLACE FUNCTION public.take_rate_limit(
  p_bucket_key       TEXT,
  p_limit            INTEGER,
  p_window_seconds   INTEGER
)
RETURNS TABLE (
  allowed             BOOLEAN,
  remaining           INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_started_at TIMESTAMPTZ;
  v_new_count         INTEGER;
  v_reset_at          TIMESTAMPTZ;
BEGIN
  -- A non-positive limit rejects everything, and so does a non-positive window.
  -- Clamping turns a configuration mistake into a visibly wrong limit rather than
  -- an apparent outage.
  p_limit          := GREATEST(p_limit, 0);
  p_window_seconds := GREATEST(p_window_seconds, 1);

  -- Single atomic upsert. The CASE expressions read the pre-update row, so an
  -- elapsed window restarts the count at 1 while a live window keeps counting.
  INSERT INTO public.rate_limit_buckets AS b (bucket_key, window_started_at, request_count)
  VALUES (p_bucket_key, NOW(), 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET request_count = CASE
                          WHEN b.window_started_at <= NOW() - make_interval(secs => p_window_seconds)
                          THEN 1
                          ELSE b.request_count + 1
                        END,
        window_started_at = CASE
                          WHEN b.window_started_at <= NOW() - make_interval(secs => p_window_seconds)
                          THEN NOW()
                          ELSE b.window_started_at
                        END
  RETURNING b.request_count, b.window_started_at
  INTO v_new_count, v_window_started_at;

  v_reset_at := v_window_started_at + make_interval(secs => p_window_seconds);

  RETURN QUERY
  SELECT
    v_new_count <= p_limit,
    GREATEST(p_limit - v_new_count, 0),
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset_at - NOW()))::NUMERIC)::INTEGER);
END;
$$;

COMMENT ON FUNCTION public.take_rate_limit(TEXT, INTEGER, INTEGER) IS
  'Atomically consume one unit of a fixed-window rate limit. Service role only.';

-- ── Pruning ────────────────────────────────────────────────────────────────
-- The in-process limiter sweeps expired keys; this table has no equivalent, and
-- the key space is attacker-controlled. Without a sweep, every distinct
-- x-forwarded-for a caller invents leaves a permanent row and the table grows
-- until the database itself is the bottleneck — a denial-of-service aimed at the
-- limiter rather than past it.
--
-- Schedule this (pg_cron, or the existing /api/cron/* routes) and call it until
-- it returns 0.
CREATE OR REPLACE FUNCTION public.prune_rate_limit_buckets(
  p_max_rows INTEGER DEFAULT 5000
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- A one-day horizon is deliberately generous: a row that old cannot belong to an
  -- active window under any plausible limit, and the wider the margin the less
  -- chance of deleting a bucket a caller is about to legitimately reuse.
  --
  -- Bounded per call so a cleanup can never become one long transaction holding
  -- locks across the table and blocking the hot path.
  DELETE FROM public.rate_limit_buckets
  WHERE bucket_key IN (
    SELECT bucket_key
    FROM public.rate_limit_buckets
    WHERE window_started_at <= NOW() - INTERVAL '1 day'
    LIMIT GREATEST(p_max_rows, 0)
  );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.prune_rate_limit_buckets(INTEGER) IS
  'Delete up to p_max_rows expired rate limit buckets. Returns rows deleted; call until 0.';

-- ── Grants ─────────────────────────────────────────────────────────────────
-- Default-deny first: PUBLIC holds EXECUTE on every new function by default, so
-- without this revoke these would be callable by anon over PostgREST.
REVOKE ALL ON FUNCTION public.take_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.take_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.take_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.take_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.prune_rate_limit_buckets(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_rate_limit_buckets(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.prune_rate_limit_buckets(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_rate_limit_buckets(INTEGER) TO service_role;

-- No table grants are issued. RLS with no policies is what actually denies anon
-- and authenticated here, including any grant Supabase's default privileges may
-- have applied; service_role bypasses RLS and needs the table access the SECURITY
-- DEFINER functions run with.

COMMIT;