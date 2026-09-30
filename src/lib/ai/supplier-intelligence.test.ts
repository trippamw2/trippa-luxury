import { describe, it, expect } from "vitest";
import {
  buildSupplierPerformanceRow,
  computeSupplierScore,
  recordSupplierPerformance,
  type ScoredSupplier,
  type SupplierPerformanceInsertRow,
} from "@/lib/ai/supplier-intelligence";

const A_UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function scoredSupplier(overrides: Partial<ScoredSupplier> = {}): ScoredSupplier {
  return {
    id: A_UUID,
    name: "Romance Villa Zanzibar",
    score: computeSupplierScore({
      status: "active",
      rating: 9,
      contract_on_file: true,
      insurance_on_file: true,
      commission_rate: 8,
    }),
    ...overrides,
  };
}

describe("supplier-intelligence pure", () => {
  it("scores active high-rated supplier high", () => {
    const s = computeSupplierScore({ status: "active", rating: 4.8, contract_on_file: true, insurance_on_file: true, commission_rate: 8 });
    expect(s.overall).toBeGreaterThan(50);
    expect(s.tier).not.toBe("do-not-use");
  });
  it("penalises blacklisted", () => {
    const s = computeSupplierScore({ status: "blacklisted", rating: 2, contract_on_file: false });
    expect(s.overall).toBeLessThan(50);
    expect(s.tier).toBe("do-not-use");
  });
  it("handles missing rating", () => {
    const s = computeSupplierScore({ status: "active" });
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
  });
  it("rewards romance signals in name", () => {
    const s = computeSupplierScore({ name: "Romance Villa Zanzibar", status: "active", rating: 9 });
    expect(s.dimensions.romance).toBeGreaterThan(4);
  });
});

describe("buildSupplierPerformanceRow", () => {
  it("scales the 0-10 dimensions onto the 0-100 ledger columns", () => {
    const supplier = scoredSupplier();
    const row = buildSupplierPerformanceRow(supplier);
    expect(row).not.toBeNull();
    expect(row?.responsiveness_score).toBe(
      Math.round(supplier.score.dimensions.responsiveness * 10)
    );
    expect(row?.reliability_score).toBe(Math.round(supplier.score.dimensions.reliability * 10));
  });

  it("passes the overall score through unscaled", () => {
    const supplier = scoredSupplier();
    const row = buildSupplierPerformanceRow(supplier);
    // `overall` is already 0-100; scaling it again would inflate it past the
    // column's CHECK constraint.
    expect(row?.quality_score).toBe(supplier.score.overall);
    expect(row?.quality_score).toBeLessThanOrEqual(100);
  });

  it("records the appraisal as manual_review, not satisfaction", () => {
    // A score read off the suppliers table observed no delivery. Calling it
    // `satisfaction` would assert a service outcome that never happened.
    expect(buildSupplierPerformanceRow(scoredSupplier())?.observation_type).toBe("manual_review");
  });

  it("leaves punctuality and satisfaction null rather than inferring them", () => {
    const row = buildSupplierPerformanceRow(scoredSupplier());
    expect(row?.on_time_score).toBeNull();
    expect(row?.client_satisfaction).toBeNull();
  });

  it("keeps every score inside the column CHECK constraints", () => {
    const row = buildSupplierPerformanceRow(scoredSupplier());
    for (const v of [
      row?.responsiveness_score,
      row?.reliability_score,
      row?.quality_score,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(row?.issue_severity).toBeGreaterThanOrEqual(0);
    expect(row?.issue_severity).toBeLessThanOrEqual(5);
  });

  it("skips a supplier whose id is not a uuid", () => {
    // supplier_id is an FK to suppliers.id; a slug id would surface as an FK
    // violation rather than a clean skip.
    expect(buildSupplierPerformanceRow(scoredSupplier({ id: "sup-lodge-01" }))).toBeNull();
    expect(buildSupplierPerformanceRow(scoredSupplier({ id: "" }))).toBeNull();
  });

  it("attributes the row to the agent, not a human", () => {
    expect(buildSupplierPerformanceRow(scoredSupplier())?.source).toBe("agent");
  });
});

describe("recordSupplierPerformance", () => {
  function fakeSink(result: { error: { message: string } | null }) {
    const inserted: SupplierPerformanceInsertRow[] = [];
    return {
      inserted,
      sink: {
        insert: async (row: SupplierPerformanceInsertRow) => {
          inserted.push(row);
          return result;
        },
      },
    };
  }

  it("appends the row to the ledger", async () => {
    const { sink, inserted } = fakeSink({ error: null });
    const outcome = await recordSupplierPerformance(scoredSupplier(), sink);
    expect(outcome.ok).toBe(true);
    expect(outcome.action).toBe("recorded");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].supplier_id).toBe(A_UUID);
  });

  it("never queries for a subject that cannot be written", async () => {
    const { sink, inserted } = fakeSink({ error: null });
    const outcome = await recordSupplierPerformance(scoredSupplier({ id: "nope" }), sink);
    expect(outcome.action).toBe("skipped");
    expect(outcome.ok).toBe(true);
    expect(inserted).toHaveLength(0);
  });

  it("surfaces a database error instead of throwing", async () => {
    const { sink } = fakeSink({ error: { message: "append-only" } });
    const outcome = await recordSupplierPerformance(scoredSupplier(), sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe("append-only");
  });

  it("never throws when the ledger is unreachable", async () => {
    const sink = {
      insert: async () => {
        throw new Error("network down");
      },
    };
    const outcome = await recordSupplierPerformance(scoredSupplier(), sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe("network down");
  });
});
