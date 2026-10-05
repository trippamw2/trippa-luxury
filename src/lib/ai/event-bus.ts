// ─── KIVARA System Event Bus (Constitution §XIII — Continuous Learning) ─────
// The append-only event stream that makes Kivara's state reconstructable and
// its institutional memory auditable.
//
// Before this module, every AI capability was a stateless function call: a
// proposal existed only as a row, a sent email only as an `email_log` row, and
// nothing linked them. "How did we end up proposing this?" was unanswerable.
//
// This bus is the substrate that answers it. Every consequential step in a
// business flow emits a `system_events` row sharing a `correlation_id`, so an
// enquiry can be traced through profiling, journey design, supplier matching,
// pricing, proposal, human review and outcome — and, critically, each row
// records the autonomy level it ran at and whether a human cleared it.
//
// Three properties are load-bearing and enforced here rather than by
// convention:
//   1. APPEND-ONLY. There is no update or delete path in this module at all. The
//      `forbid_append_only_mutation` trigger is the backstop, but the absence
//      of a mutation API is the primary guarantee.
//   2. TELEMETRY NEVER BREAKS A BUSINESS FLOW. `recordEvent` swallows its own
//      failures and reports them as data. A failed audit write must not fail
//      the quote it was auditing.
//   3. TYPE SAFETY AT THE EDGE. `entity_id`/`correlation_id` are UUID columns
//      in Postgres but the domain uses slugs and order numbers, so ids are
//      validated rather than force-cast. A non-UUID id is carried in the
//      payload instead of corrupting the column.

import { coerceAutonomyLevel, type AutonomyLevel } from "./autonomy-policy";
import { normalizeUuid } from "./uuid";
import { createAdminClient } from "@/lib/supabase/admin";

// Re-exported so existing importers of the bus keep a stable public surface;
// the implementation is shared with every other UUID-column writer.
export { normalizeUuid };

/**
 * The canonical event vocabulary (migration 028, §1): the fifteen events that
 * describe a guest journey. Deliberately enforced here in TypeScript and NOT by
 * a SQL CHECK constraint — an append-only log that rejects a new event type is a
 * log that will be worked around, and the whole point of the stream is to
 * record what actually happened.
 */
export type CanonicalEventType =
  | "ENQUIRY_CREATED"
  | "CLIENT_PROFILED"
  | "JOURNEY_DESIGNED"
  | "SUPPLIERS_MATCHED"
  | "PRICE_CALCULATED"
  | "PROPOSAL_GENERATED"
  | "HUMAN_REVIEW_REQUESTED"
  | "ADMIN_APPROVED"
  | "CLIENT_ACCEPTED"
  | "SUPPLIER_REQUESTED"
  | "SUPPLIER_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "JOURNEY_COMPLETED"
  | "CLIENT_FEEDBACK_RECEIVED"
  | "JOURNEY_LEARNED";

/**
 * Operational events: the company auditing and governing itself. Separate from
 * the canonical fifteen because these describe KIVARA's internal life rather
 * than a guest's, and conflating the two would make "what happened to this
 * client" impossible to read.
 */
export type OperationalEventType =
  | "GAP_DETECTED"
  | "INSIGHT_RECORDED"
  | "AUTONOMY_ESCALATED"
  // Staged outbound lifecycle. An approval that emits no event is invisible to
  // KORA and Mission Control, so the review decision has to be an event too.
  | "OUTBOUND_STAGED_APPROVED"
  | "OUTBOUND_STAGED_REJECTED";

export type SystemEventType = CanonicalEventType | OperationalEventType;

export const CANONICAL_EVENT_TYPES: readonly CanonicalEventType[] = [
  "ENQUIRY_CREATED",
  "CLIENT_PROFILED",
  "JOURNEY_DESIGNED",
  "SUPPLIERS_MATCHED",
  "PRICE_CALCULATED",
  "PROPOSAL_GENERATED",
  "HUMAN_REVIEW_REQUESTED",
  "ADMIN_APPROVED",
  "CLIENT_ACCEPTED",
  "SUPPLIER_REQUESTED",
  "SUPPLIER_CONFIRMED",
  "PAYMENT_RECEIVED",
  "JOURNEY_COMPLETED",
  "CLIENT_FEEDBACK_RECEIVED",
  "JOURNEY_LEARNED",
] as const;

export const OPERATIONAL_EVENT_TYPES: readonly OperationalEventType[] = [
  "GAP_DETECTED",
  "INSIGHT_RECORDED",
  "AUTONOMY_ESCALATED",
  "OUTBOUND_STAGED_APPROVED",
  "OUTBOUND_STAGED_REJECTED",
] as const;

export function isCanonicalEventType(value: unknown): value is CanonicalEventType {
  return typeof value === "string" && (CANONICAL_EVENT_TYPES as readonly string[]).includes(value);
}

export function isOperationalEventType(value: unknown): value is OperationalEventType {
  return typeof value === "string" && (OPERATIONAL_EVENT_TYPES as readonly string[]).includes(value);
}

/** Accepts the whole vocabulary, canonical plus operational. */
export function isSystemEventType(value: unknown): value is SystemEventType {
  return isCanonicalEventType(value) || isOperationalEventType(value);
}

/** Mirrors the `system_events_actor_type_check` constraint exactly. */
export type EventActorType = "human" | "agent" | "system" | "cron" | "kora";

const ACTOR_TYPES: readonly EventActorType[] = ["human", "agent", "system", "cron", "kora"];

export function isEventActorType(value: unknown): value is EventActorType {
  return typeof value === "string" && (ACTOR_TYPES as readonly string[]).includes(value);
}

/** A row as read back from Postgres. */
export interface SystemEventRow {
  id: string;
  eventType: SystemEventType;
  entityType: string;
  entityId: string | null;
  actorType: EventActorType;
  actorId: string | null;
  correlationId: string | null;
  payload: Record<string, unknown>;
  autonomyLevel: AutonomyLevel;
  humanReviewed: boolean;
  createdAt: string;
}

/** The snake_case shape actually sent to the insert. */
export interface EventInsertRow {
  event_type: SystemEventType;
  entity_type: string;
  entity_id: string | null;
  actor_type: EventActorType;
  actor_id: string | null;
  correlation_id: string | null;
  payload: Record<string, unknown>;
  autonomy_level: number;
  human_reviewed: boolean;
}

export interface EventInput {
  eventType: SystemEventType;
  /** e.g. "booking", "proposal", "supplier", "journey". */
  entityType: string;
  /**
   * A UUID. Domain identifiers (order numbers, slugs) are not UUIDs, so pass
   * those in `payload.externalId` instead — they are preserved there.
   */
  entityId?: string | null;
  actorType?: EventActorType;
  actorId?: string | null;
  /**
   * Share one correlation id across every event in a single business flow.
   * Omitting it starts a NEW flow, so multi-step callers must thread it
   * through explicitly.
   */
  correlationId?: string | null;
  payload?: Record<string, unknown>;
  /** The authority this event was emitted at. */
  autonomyLevel?: AutonomyLevel;
  humanReviewed?: boolean;
}

export function newCorrelationId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Build the insert row from intent. Pure, so the defaults and the id-safety
 * rules are unit-testable without a database.
 *
 * Note that `autonomyLevel` is coerced rather than trusted: a value outside
 * 0–4 would violate the column CHECK and abort the write, and a broken audit
 * trail is worse than a clamped one.
 */
export function buildEventRow(input: EventInput): EventInsertRow {
  const autonomy = coerceAutonomyLevel(input.autonomyLevel ?? 0);
  return {
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: normalizeUuid(input.entityId),
    actor_type: input.actorType ?? "system",
    actor_id: typeof input.actorId === "string" && input.actorId.trim() !== ""
      ? input.actorId.trim()
      : null,
    correlation_id: normalizeUuid(input.correlationId),
    payload: input.payload ?? {},
    autonomy_level: autonomy,
    human_reviewed: input.humanReviewed ?? false,
  };
}

/**
 * Narrow a raw JSONB/Postgres row into a `SystemEventRow`. Postgres returns
 * `unknown`-shaped data here (there are no generated types for this project),
 * so the boundary is validated explicitly rather than cast.
 *
 * Returns null for rows that cannot be trusted; a malformed audit row is
 * skipped, never silently coerced into something it isn't.
 */
export function parseEventRow(raw: unknown): SystemEventRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  // Accepts the full vocabulary, not just the canonical fifteen: an event the
  // company wrote about itself must survive the round trip just as a guest
  // journey event does.
  if (!isSystemEventType(r.event_type)) return null;
  if (typeof r.entity_type !== "string" || r.entity_type === "") return null;

  const actorType = isEventActorType(r.actor_type) ? r.actor_type : "system";
  const autonomy = coerceAutonomyLevel(r.autonomy_level);

  return {
    id: typeof r.id === "string" ? r.id : "",
    eventType: r.event_type,
    entityType: r.entity_type,
    entityId: normalizeUuid(r.entity_id),
    actorType,
    actorId: typeof r.actor_id === "string" ? r.actor_id : null,
    correlationId: normalizeUuid(r.correlation_id),
    payload:
      typeof r.payload === "object" && r.payload !== null && !Array.isArray(r.payload)
        ? (r.payload as Record<string, unknown>)
        : {},
    autonomyLevel: autonomy,
    humanReviewed: r.human_reviewed === true,
    createdAt: typeof r.created_at === "string" ? r.created_at : "",
  };
}

// ─── Write path ─────────────────────────────────────────────────────────────

export interface EventSink {
  // PromiseLike rather than Promise: the Supabase query builder is a thenable,
  // so declaring Promise here would make the real client structurally
  // unassignable to this interface.
  insert(row: EventInsertRow): PromiseLike<{ error: { message: string } | null }>;
}

export interface AppendOutcome {
  ok: boolean;
  row: EventInsertRow;
  error: string | null;
}

/**
 * Append one event. The single write path — there is deliberately no update or
 * delete counterpart.
 */
export async function appendEvent(sink: EventSink, input: EventInput): Promise<AppendOutcome> {
  const row = buildEventRow(input);
  const { error } = await sink.insert(row);
  return { ok: error === null, row, error: error?.message ?? null };
}

/** Narrow backend view, so the bus can be exercised without a database. */
interface EventSinkBackend {
  from(table: string): {
    insert(values: EventInsertRow): PromiseLike<{ error: { message: string } | null }>;
  };
}

export function createEventSink(backend: EventSinkBackend): EventSink {
  return {
    insert: (row) => backend.from("system_events").insert(row),
  };
}

export function createSupabaseEventSink(): EventSink {
  // Built inline rather than through createEventSink: matching Supabase's
  // deeply generic client against a structural interface trips an
  // excessively-deep type instantiation. This adapter is the right place to
  // absorb that. Env is read here (never at module load) so importing this
  // module in a build or test without env vars does not throw.
  const supabase = createAdminClient();
  return {
    insert: async (row) => {
      const { error } = await supabase.from("system_events").insert(row);
      return { error: error ? { message: error.message } : null };
    },
  };
}

let cachedSink: EventSink | null = null;

function defaultSink(): EventSink {
  if (!cachedSink) cachedSink = createSupabaseEventSink();
  return cachedSink;
}

/**
 * Fire-and-forget event emission for business flows.
 *
 * Never throws and never rejects: a failure to write the audit trail is
 * returned as `ok: false` so the caller can log it, but it must not roll back
 * or fail the operation being audited. This is the single most important
 * property of the bus — instrumentation that can break production is
 * instrumentation nobody is allowed to turn on.
 */
export async function recordEvent(input: EventInput): Promise<AppendOutcome> {
  const row = buildEventRow(input);
  try {
    const sink = defaultSink();
    const { error } = await sink.insert(row);
    return { ok: error === null, row, error: error?.message ?? null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, row, error: message };
  }
}

// ─── Read path (state reconstructability) ───────────────────────────────────

export interface EventReader {
  recent(limit: number): Promise<SystemEventRow[]>;
  byCorrelation(correlationId: string): Promise<SystemEventRow[]>;
}

interface EventSelectResult {
  data: unknown;
  error: { message: string } | null;
}

interface EventQueryLike {
  select(columns: string): {
    order(column: string, opts: { ascending: boolean }): {
      limit(count: number): PromiseLike<EventSelectResult>;
    };
    eq(column: string, value: string): PromiseLike<EventSelectResult>;
  };
}

interface EventReaderBackend {
  from(table: string): EventQueryLike;
}

function toEventRows(result: EventSelectResult): SystemEventRow[] {
  if (result.error) return [];
  const rows: unknown = result.data;
  return Array.isArray(rows)
    ? rows.map(parseEventRow).filter((r): r is SystemEventRow => r !== null)
    : [];
}

export function createEventReader(backend: EventReaderBackend): EventReader {
  return {
    async recent(limit) {
      return toEventRows(
        await backend
          .from("system_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit)
      );
    },
    async byCorrelation(correlationId) {
      const id = normalizeUuid(correlationId);
      if (!id) return [];
      return toEventRows(await backend.from("system_events").select("*").eq("correlation_id", id));
    },
  };
}

export function createSupabaseEventReader(): EventReader {
  // Inline for the same deeply-generic reason as createSupabaseEventSink. Env is
  // read here (never at module load), matching the repo convention so an
  // unconfigured build can still import this module.
  const supabase = createAdminClient();
  return {
    async recent(limit) {
      const { data, error } = await supabase
        .from("system_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return toEventRows({ data, error });
    },
    async byCorrelation(correlationId) {
      const id = normalizeUuid(correlationId);
      if (!id) return [];
      const { data, error } = await supabase
        .from("system_events")
        .select("*")
        .eq("correlation_id", id);
      return toEventRows({ data, error });
    },
  };
}

let cachedReader: EventReader | null = null;

function defaultReader(): EventReader {
  if (!cachedReader) cachedReader = createSupabaseEventReader();
  return cachedReader;
}

export function recentEvents(limit = 50): Promise<SystemEventRow[]> {
  return defaultReader().recent(limit);
}

export function eventsForCorrelation(correlationId: string): Promise<SystemEventRow[]> {
  return defaultReader().byCorrelation(correlationId);
}

export interface FlowTrace {
  correlationId: string;
  events: SystemEventRow[];
  /** The full business flow in chronological order, when recognisable. */
  sequence: SystemEventType[];
  /** True once a human explicitly cleared something on this flow. */
  humanInTheLoop: boolean;
  /** The highest autonomy level any step in this flow ran at. */
  peakAutonomyLevel: AutonomyLevel;
}

/**
 * Fold a set of correlated events into a readable trace. Pure, so the
 * reconstructability guarantee is testable: given the same events, the same
 * flow is always reconstructed, in order, with its human checkpoints visible.
 */
export function summarizeFlow(events: SystemEventRow[]): FlowTrace | null {
  if (events.length === 0) return null;

  const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = ordered[0];
  const correlationId = ordered.find((e) => e.correlationId !== null)?.correlationId ?? first.id;
  if (!correlationId) return null;

  return {
    correlationId,
    events: ordered,
    sequence: ordered.map((e) => e.eventType),
    humanInTheLoop: ordered.some((e) => e.humanReviewed || e.actorType === "human"),
    peakAutonomyLevel: ordered.reduce<AutonomyLevel>(
      (peak, e) => (e.autonomyLevel > peak ? e.autonomyLevel : peak),
      0
    ),
  };
}
