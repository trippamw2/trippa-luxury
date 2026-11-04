import { describe, it, expect } from "vitest";
import { computeReadiness, type ReadinessSignals } from "./platform-readiness";

function signals(overrides: Partial<ReadinessSignals> = {}): ReadinessSignals {
  return {
    schemaArtifacts: [
      { key: "inquiries.attribution", present: true },
      { key: "supplier_documents", present: true },
    ],
    storageBuckets: ["supplier-docs"],
    requiredBuckets: ["supplier-docs"],
    integrations: [
      { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role", present: true },
      { key: "NEXT_BREVO_KEY", label: "Brevo", present: true },
    ],
    dataIntegrity: [{ key: "legacy_statuses", label: "No legacy status slugs", ok: true, detail: "0 rows" }],
    ...overrides,
  };
}

describe("computeReadiness", () => {
  it("scores 100 when every signal is healthy", () => {
    expect(computeReadiness(signals()).score).toBe(100);
  });

  it("scores 0 when nothing is configured", () => {
    const report = computeReadiness({
      schemaArtifacts: [{ key: "a", present: false }],
      storageBuckets: [],
      requiredBuckets: ["supplier-docs"],
      integrations: [{ key: "k", label: "K", present: false }],
      dataIntegrity: [{ key: "d", label: "D", ok: false, detail: "broken" }],
    });
    expect(report.score).toBe(0);
    expect(report.missing).toHaveLength(4);
  });

  it("weights schema above storage", () => {
    const noSchema = computeReadiness(
      signals({ schemaArtifacts: [{ key: "missing", present: false }] })
    );
    const noStorage = computeReadiness(signals({ storageBuckets: [] }));
    expect(noSchema.score).toBe(65);
    expect(noStorage.score).toBe(85);
    expect(noSchema.score).toBeLessThan(noStorage.score);
  });

  it("lists what is missing with a readable detail", () => {
    const report = computeReadiness(signals({ storageBuckets: [] }));
    expect(report.missing).toContain("Storage · supplier-docs — bucket missing");
  });

  it("normalises when a group is empty instead of silently deflating", () => {
    const report = computeReadiness(
      signals({ dataIntegrity: [], schemaArtifacts: [], storageBuckets: [], requiredBuckets: [] })
    );
    // Only integrations remain and they all pass.
    expect(report.score).toBe(100);
    expect(report.checks.every((c) => c.group === "integrations")).toBe(true);
  });

  it("distributes a group weight evenly across its checks", () => {
    const report = computeReadiness(
      signals({
        schemaArtifacts: [
          { key: "a", present: true },
          { key: "b", present: false },
        ],
      })
    );
    const schema = report.checks.filter((c) => c.group === "schema");
    expect(schema[0].weight).toBe(17.5);
    expect(schema[1].weight).toBe(17.5);
  });

  it("keeps the score at 100 when an advisory is missing", () => {
    const report = computeReadiness(
      signals({
        advisories: [
          { key: "SENTRY_DSN", label: "Sentry error tracking", present: false, detail: "not configured" },
        ],
      })
    );
    expect(report.score).toBe(100);
    expect(report.missing).toHaveLength(0);
    expect(report.advisories).toHaveLength(1);
    expect(report.advisories[0].ok).toBe(false);
    expect(report.advisories[0].weight).toBe(0);
  });

  it("never lets an advisory hide a failing required check", () => {
    const report = computeReadiness(
      signals({
        storageBuckets: [],
        advisories: [{ key: "SENTRY_DSN", label: "Sentry", present: false }],
      })
    );
    expect(report.score).toBe(85);
    expect(report.missing).toContain("Storage · supplier-docs — bucket missing");
  });
});
