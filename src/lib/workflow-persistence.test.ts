import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
// The chainable query double records the arguments passed to `.range()`, which
// is the only thing that bounds this query. Before the fix, `range` was never
// called at all when no valid limit was supplied.
const rangeCalls: Array<[number, number]> = [];

function chainable(): unknown {
  return new Proxy({} as object, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 });
      }
      if (prop === "range") {
        return (from: number, to: number) => {
          rangeCalls.push([from, to]);
          return chainable();
        };
      }
      if (
        prop === "select" ||
        prop === "order" ||
        prop === "eq" ||
        prop === "or" ||
        prop === "gte" ||
        prop === "lte"
      ) {
        return () => chainable();
      }
      return undefined;
    },
  });
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => chainable() }),
}));

import { WorkflowPersistence } from "@/lib/workflow-persistence";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

describe("WorkflowPersistence.list result bounding", () => {
  beforeEach(() => {
    rangeCalls.length = 0;
  });

  const persistence = new WorkflowPersistence();

  it("bounds the query even when no limit was requested", async () => {
    await persistence.list();

    expect(rangeCalls).toHaveLength(1);
    expect(rangeCalls[0]).toEqual([0, DEFAULT_PAGE_SIZE - 1]);
  });

  it("bounds the query when the limit is unparseable (NaN)", async () => {
    // The original defect: `parseInt("abc")` produced NaN, `if (filters.limit)`
    // was false, so no bound was applied and every booking row was returned.
    await persistence.list({ limit: "abc" });

    expect(rangeCalls).toHaveLength(1);
    expect(rangeCalls[0]).toEqual([0, DEFAULT_PAGE_SIZE - 1]);
  });

  it("bounds the query when the limit is zero", async () => {
    await persistence.list({ limit: 0 });

    expect(rangeCalls).toHaveLength(1);
    expect(rangeCalls[0]).toEqual([0, DEFAULT_PAGE_SIZE - 1]);
  });

  it("clamps an oversized limit to the ceiling", async () => {
    await persistence.list({ limit: 10_000_000 });

    expect(rangeCalls[0]).toEqual([0, MAX_PAGE_SIZE - 1]);
  });

  it("applies a valid limit and offset", async () => {
    await persistence.list({ limit: "25", offset: "50" });

    expect(rangeCalls[0]).toEqual([50, 74]);
  });

  it("treats a negative offset as the first page", async () => {
    await persistence.list({ offset: "-5" });

    expect(rangeCalls[0]).toEqual([0, DEFAULT_PAGE_SIZE - 1]);
  });

  it("never returns a range wider than the ceiling", async () => {
    for (const limit of [undefined, null, "", "abc", -1, 0, NaN, 999_999_999]) {
      rangeCalls.length = 0;
      await persistence.list({ limit: limit as string | number | undefined });
      const [from, to] = rangeCalls[0];
      expect(to - from + 1).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    }
  });
});