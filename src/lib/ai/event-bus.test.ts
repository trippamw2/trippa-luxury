import { describe, expect, it } from "vitest";
import {
  CANONICAL_EVENT_TYPES,
  appendEvent,
  buildEventRow,
  createEventReader,
  isCanonicalEventType,
  isEventActorType,
  newCorrelationId,
  normalizeUuid,
  parseEventRow,
  recordEvent,
  summarizeFlow,
  type EventInsertRow,
  type SystemEventRow,
} from "./event-bus";

const A_UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const B_UUID = "9c858901-8a57-4791-81fe-4c455b099bc9";

/** A raw Postgres row, as the `select *` read path would return it. */
function rawRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: A_UUID,
    event_type: "ENQUIRY_CREATED",
    entity_type: "inquiry",
    entity_id: B_UUID,
    actor_type: "system",
    actor_id: null,
    correlation_id: A_UUID,
    payload: { source: "website" },
    autonomy_level: 1,
    human_reviewed: false,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeSink(result: { error: { message: string } | null }) {
  const inserted: EventInsertRow[] = [];
  return {
    inserted,
    sink: {
      insert: async (row: EventInsertRow) => {
        inserted.push(row);
        return result;
      },
    },
  };
}

function fakeReader(rows: unknown[], opts: { error?: string } = {}) {
  const calls: { table: string; columns: string; op: string; arg?: string; limit?: number }[] = [];
  const supabase = {
    from(table: string) {
      return {
        select(columns: string) {
          return {
            order(_column: string, _opts: { ascending: boolean }) {
              return {
                async limit(count: number) {
                  calls.push({ table, columns, op: "recent", limit: count });
                  return opts.error
                    ? { data: null, error: { message: opts.error } }
                    : { data: rows, error: null };
                },
              };
            },
            async eq(column: string, value: string) {
              calls.push({ table, columns, op: "eq", arg: `${column}=${value}` });
              return opts.error
                ? { data: null, error: { message: opts.error } }
                : { data: rows, error: null };
            },
          };
        },
      };
    },
  };
  return { reader: createEventReader(supabase), calls };
}

function row(overrides: Partial<SystemEventRow> = {}): SystemEventRow {
  return {
    id: A_UUID,
    eventType: "ENQUIRY_CREATED",
    entityType: "inquiry",
    entityId: B_UUID,
    actorType: "system",
    actorId: null,
    correlationId: A_UUID,
    payload: {},
    autonomyLevel: 1,
    humanReviewed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("canonical event vocabulary", () => {
  it("contains exactly the fifteen constitutional types", () => {
    expect(CANONICAL_EVENT_TYPES).toHaveLength(15);
    expect(new Set(CANONICAL_EVENT_TYPES).size).toBe(15);
  });

  it("recognises every canonical type", () => {
    for (const t of CANONICAL_EVENT_TYPES) expect(isCanonicalEventType(t)).toBe(true);
  });

  it("rejects unknown or mis-cased types", () => {
    expect(isCanonicalEventType("enquiry_created")).toBe(false);
    expect(isCanonicalEventType("SOMETHING_NEW")).toBe(false);
    expect(isCanonicalEventType("")).toBe(false);
    expect(isCanonicalEventType(null)).toBe(false);
    expect(isCanonicalEventType(7)).toBe(false);
  });
});

describe("isEventActorType", () => {
  it("mirrors the SQL CHECK constraint", () => {
    for (const a of ["human", "agent", "system", "cron", "kora"]) {
      expect(isEventActorType(a)).toBe(true);
    }
  });

  it("rejects actor types the constraint forbids", () => {
    expect(isEventActorType("robot")).toBe(false);
    expect(isEventActorType("HUMAN")).toBe(false);
    expect(isEventActorType(undefined)).toBe(false);
  });
});

describe("normalizeUuid", () => {
  it("accepts a uuid and normalises case and padding", () => {
    expect(normalizeUuid(A_UUID)).toBe(A_UUID);
    expect(normalizeUuid(A_UUID.toUpperCase())).toBe(A_UUID);
    expect(normalizeUuid(`  ${A_UUID}  `)).toBe(A_UUID);
  });

  it("rejects the domain identifiers that are not uuids", () => {
    // This is the case the column type would have crashed on.
    expect(normalizeUuid("BK-2026-0042")).toBeNull();
    expect(normalizeUuid("kivara-luxury-safari")).toBeNull();
    expect(normalizeUuid("12345")).toBeNull();
    expect(normalizeUuid("")).toBeNull();
    expect(normalizeUuid(null)).toBeNull();
    expect(normalizeUuid(undefined)).toBeNull();
    expect(normalizeUuid(42)).toBeNull();
    expect(normalizeUuid({})).toBeNull();
  });
});

describe("newCorrelationId", () => {
  it("produces a real uuid", () => {
    expect(normalizeUuid(newCorrelationId())).not.toBeNull();
  });

  it("does not repeat", () => {
    expect(newCorrelationId()).not.toBe(newCorrelationId());
  });
});

describe("buildEventRow", () => {
  it("applies safe defaults", () => {
    const r = buildEventRow({ eventType: "ENQUIRY_CREATED", entityType: "inquiry" });
    expect(r).toEqual({
      event_type: "ENQUIRY_CREATED",
      entity_type: "inquiry",
      entity_id: null,
      actor_type: "system",
      actor_id: null,
      correlation_id: null,
      payload: {},
      autonomy_level: 0,
      human_reviewed: false,
    });
  });

  it("preserves an explicit uuid entity and correlation id", () => {
    const r = buildEventRow({
      eventType: "JOURNEY_DESIGNED",
      entityType: "journey",
      entityId: B_UUID,
      correlationId: A_UUID,
    });
    expect(r.entity_id).toBe(B_UUID);
    expect(r.correlation_id).toBe(A_UUID);
  });

  it("nulls a non-uuid entity id instead of corrupting the column", () => {
    const r = buildEventRow({
      eventType: "CLIENT_ACCEPTED",
      entityType: "booking",
      entityId: "BK-2026-0042",
    });
    expect(r.entity_id).toBeNull();
  });

  it("keeps a valid autonomy level untouched", () => {
    expect(
      buildEventRow({ eventType: "PAYMENT_RECEIVED", entityType: "booking", autonomyLevel: 4 })
        .autonomy_level
    ).toBe(4);
    expect(
      buildEventRow({ eventType: "ENQUIRY_CREATED", entityType: "inquiry", autonomyLevel: 1 })
        .autonomy_level
    ).toBe(1);
  });

  it("normalises the actor id and treats blank as absent", () => {
    expect(
      buildEventRow({ eventType: "ADMIN_APPROVED", entityType: "proposal", actorType: "human", actorId: "  " })
        .actor_id
    ).toBeNull();
    expect(
      buildEventRow({ eventType: "ADMIN_APPROVED", entityType: "proposal", actorType: "human", actorId: " abc " })
        .actor_id
    ).toBe("abc");
  });

  it("carries KORA as a first-class actor", () => {
    const r = buildEventRow({
      eventType: "JOURNEY_LEARNED",
      entityType: "insight",
      actorType: "kora",
      actorId: "kora-auditor",
      autonomyLevel: 3,
    });
    expect(r.actor_type).toBe("kora");
    expect(r.autonomy_level).toBe(3);
  });
});

describe("parseEventRow", () => {
  it("narrows a well-formed row", () => {
    const parsed = parseEventRow(rawRow());
    expect(parsed).not.toBeNull();
    expect(parsed?.eventType).toBe("ENQUIRY_CREATED");
    expect(parsed?.entityId).toBe(B_UUID);
    expect(parsed?.autonomyLevel).toBe(1);
    expect(parsed?.payload).toEqual({ source: "website" });
  });

  it("drops a row whose event type is not canonical", () => {
    expect(parseEventRow(rawRow({ event_type: "TOTALLY_MADE_UP" }))).toBeNull();
    expect(parseEventRow(rawRow({ event_type: null }))).toBeNull();
  });

  it("drops a row with no entity type", () => {
    expect(parseEventRow(rawRow({ entity_type: "" }))).toBeNull();
    expect(parseEventRow(rawRow({ entity_type: 12 }))).toBeNull();
  });

  it("drops non-objects", () => {
    expect(parseEventRow(null)).toBeNull();
    expect(parseEventRow("row")).toBeNull();
    expect(parseEventRow(undefined)).toBeNull();
    expect(parseEventRow([1, 2])).toBeNull();
  });

  it("falls back to system for an actor the constraint would reject", () => {
    expect(parseEventRow(rawRow({ actor_type: "robot" }))?.actorType).toBe("system");
  });

  it("replaces a non-object payload with an empty object", () => {
    expect(parseEventRow(rawRow({ payload: "oops" }))?.payload).toEqual({});
    expect(parseEventRow(rawRow({ payload: [1] }))?.payload).toEqual({});
  });

  it("clamps a stored autonomy level outside the ladder", () => {
    expect(parseEventRow(rawRow({ autonomy_level: 42 }))?.autonomyLevel).toBe(4);
  });

  it("nulls a stored non-uuid entity id", () => {
    expect(parseEventRow(rawRow({ entity_id: "BK-9" }))?.entityId).toBeNull();
  });
});

describe("appendEvent", () => {
  it("sends the built row to the sink and reports success", async () => {
    const { sink, inserted } = fakeSink({ error: null });
    const outcome = await appendEvent(sink, {
      eventType: "PROPOSAL_GENERATED",
      entityType: "proposal",
      entityId: A_UUID,
      correlationId: A_UUID,
      autonomyLevel: 2,
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.error).toBeNull();
    expect(inserted).toHaveLength(1);
    expect(inserted[0].event_type).toBe("PROPOSAL_GENERATED");
    expect(inserted[0].autonomy_level).toBe(2);
  });

  it("surfaces a database error instead of throwing", async () => {
    const { sink } = fakeSink({ error: { message: "permission denied" } });
    const outcome = await appendEvent(sink, { eventType: "PAYMENT_RECEIVED", entityType: "booking" });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe("permission denied");
  });
});

describe("recordEvent", () => {
  it("never throws when the event store is unreachable", async () => {
    // Deterministic regardless of local env: force the missing-env path.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const outcome = await recordEvent({
        eventType: "ENQUIRY_CREATED",
        entityType: "inquiry",
        entityId: A_UUID,
      });
      // The business flow must not be broken by a failed audit write.
      expect(outcome.ok).toBe(false);
      expect(outcome.error).toBeTruthy();
      expect(outcome.row.event_type).toBe("ENQUIRY_CREATED");
    } finally {
      if (url !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      if (key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    }
  });
});

describe("createEventReader", () => {
  it("reads the newest events first, bounded by the limit", async () => {
    const { reader, calls } = fakeReader([rawRow()]);
    const rows = await reader.recent(25);
    expect(rows).toHaveLength(1);
    expect(calls[0]).toMatchObject({ table: "system_events", op: "recent", limit: 25 });
  });

  it("skips malformed rows rather than trusting them", async () => {
    const { reader } = fakeReader([rawRow(), rawRow({ event_type: "BOGUS" }), null]);
    expect(await reader.recent(10)).toHaveLength(1);
  });

  it("returns an empty history on a read error", async () => {
    const { reader } = fakeReader([], { error: "timeout" });
    expect(await reader.recent(10)).toEqual([]);
  });

  it("refuses a non-uuid correlation id without querying", async () => {
    const { reader, calls } = fakeReader([rawRow()]);
    expect(await reader.byCorrelation("BK-2026-0042")).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("filters a valid correlation id", async () => {
    const { reader, calls } = fakeReader([rawRow()]);
    const rows = await reader.byCorrelation(A_UUID);
    expect(rows).toHaveLength(1);
    expect(calls[0].arg).toBe(`correlation_id=${A_UUID}`);
  });
});

describe("summarizeFlow", () => {
  it("returns null for an empty flow", () => {
    expect(summarizeFlow([])).toBeNull();
  });

  it("reconstructs a flow in chronological order regardless of input order", () => {
    const trace = summarizeFlow([
      row({ eventType: "PAYMENT_RECEIVED", createdAt: "2026-01-03T00:00:00.000Z" }),
      row({ eventType: "ENQUIRY_CREATED", createdAt: "2026-01-01T00:00:00.000Z" }),
      row({ eventType: "PROPOSAL_GENERATED", createdAt: "2026-01-02T00:00:00.000Z" }),
    ]);
    expect(trace?.sequence).toEqual([
      "ENQUIRY_CREATED",
      "PROPOSAL_GENERATED",
      "PAYMENT_RECEIVED",
    ]);
  });

  it("detects a human in the loop from either signal", () => {
    expect(summarizeFlow([row({ humanReviewed: true })])?.humanInTheLoop).toBe(true);
    expect(summarizeFlow([row({ actorType: "human" })])?.humanInTheLoop).toBe(true);
    expect(summarizeFlow([row()])?.humanInTheLoop).toBe(false);
  });

  it("reports the peak autonomy level reached by the flow", () => {
    const trace = summarizeFlow([
      row({ autonomyLevel: 1 }),
      row({ autonomyLevel: 3 }),
      row({ autonomyLevel: 2 }),
    ]);
    expect(trace?.peakAutonomyLevel).toBe(3);
  });

  it("surfaces the correlation id that stitches the flow together", () => {
    const trace = summarizeFlow([row({ correlationId: B_UUID })]);
    expect(trace?.correlationId).toBe(B_UUID);
  });

  it("falls back to the first row id when no event carries a correlation id", () => {
    const trace = summarizeFlow([row({ id: A_UUID, correlationId: null })]);
    expect(trace?.correlationId).toBe(A_UUID);
  });
});
