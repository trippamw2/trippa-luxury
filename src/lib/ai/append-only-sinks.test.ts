import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Supabase sink for each append-only table is the last unverified link: the
 * rest of the suite injects a fake sink, so nothing asserted that these
 * actually target the right table, pass the row through untouched, or convert a
 * Supabase failure into data instead of a throw.
 *
 * The last point is the one that matters most. decisions and
 * supplier_performance are both append-only, and recordQcDecision /
 * recordSupplierPerformance are documented as never throwing so a failed
 * governance write can neither roll back nor fail the business action it was
 * protecting. If a sink leaked a rejection, that guarantee would be false and no
 * existing test would catch it.
 *
 * Row shape is deliberately not asserted here - buildQcDecisionRow and
 * buildSupplierPerformanceRow already own that contract and are tested directly.
 * What these tests pin is the sink's own responsibility: the destination table
 * and the failure semantics.
 */

const inserted: { table: string; row: Record<string, unknown> }[] = [];
let nextError: { message: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        if (nextError) return { error: nextError };
        inserted.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));

describe("append-only Supabase sinks", () => {
  beforeEach(() => {
    inserted.length = 0;
    nextError = null;
  });

  it("records a QC decision into the decisions table", async () => {
    const { createSupabaseQcDecisionSink } = await import("@/lib/ai/quality-gate");
    const sink = createSupabaseQcDecisionSink();

    const result = await sink.insert({} as Parameters<typeof sink.insert>[0]);

    expect(result.error).toBeNull();
    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe("decisions");
  });

  it("records supplier performance into the supplier_performance table", async () => {
    const { createSupabaseSupplierPerformanceSink } = await import("@/lib/ai/supplier-intelligence");
    const sink = createSupabaseSupplierPerformanceSink();

    const result = await sink.insert({} as Parameters<typeof sink.insert>[0]);

    expect(result.error).toBeNull();
    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe("supplier_performance");
  });

  it("reports a Supabase failure as data, never as a throw", async () => {
    const { createSupabaseQcDecisionSink } = await import("@/lib/ai/quality-gate");
    nextError = { message: "append-only trigger rejected the write" };

    // Append-only tables reject mutation at the database level. A sink that
    // threw here would turn a governance refusal into a failed request, which is
    // precisely the coupling these writers were written to avoid.
    const sink = createSupabaseQcDecisionSink();
    const result = await sink.insert({} as Parameters<typeof sink.insert>[0]);

    expect(result.error).toEqual({ message: "append-only trigger rejected the write" });
    expect(inserted).toHaveLength(0);
  });
});
