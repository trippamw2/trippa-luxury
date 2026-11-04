/**
 * Platform readiness — the engineering/deployment half of platform health.
 *
 * The business score in `platform-intelligence.ts` measures commercial data
 * (inquiries → bookings, supplier count, pipeline value). That number can sit in
 * the "developing" band on a fully built platform simply because the sales
 * pipeline is young. This module answers the other question: *is the platform
 * itself complete and correctly configured?*
 *
 * Checks are either **required** (the platform cannot operate correctly without
 * them, so they count toward the score) or **advisory** (nice to have; shown on
 * the page but never able to hide or deflate a required check). Splitting the
 * two keeps 100 reachable for a working platform without pretending that, say,
 * an unconfigured error tracker is free.
 *
 * Pure and deterministic — callers pass the signals in, so every check is unit
 * testable without a database.
 */

export type ReadinessGroup = "schema" | "storage" | "integrations" | "data";

export interface SchemaArtifact {
  key: string;
  present: boolean;
}

export interface ReadinessSignals {
  /** Migration artefacts (tables/columns) the runtime expects to exist. */
  schemaArtifacts: SchemaArtifact[];
  /** Storage buckets the platform writes to. */
  storageBuckets: string[];
  requiredBuckets: string[];
  /** Required integrations. Presence only — never the value. */
  integrations: { key: string; label: string; present: boolean }[];
  /** Live data invariants that should hold after migrations run. */
  dataIntegrity: { key: string; label: string; ok: boolean; detail: string }[];
  /** Optional capabilities. Reported, never scored. */
  advisories?: { key: string; label: string; present: boolean; detail?: string }[];
}

export interface ReadinessCheck {
  key: string;
  label: string;
  group: ReadinessGroup | "advisory";
  ok: boolean;
  weight: number;
  detail: string;
  optional?: boolean;
}

export interface ReadinessReport {
  score: number;
  checks: ReadinessCheck[];
  /** Human-readable list of what is holding the score back. */
  missing: string[];
  /** Optional checks that are not configured. Never affects `score`. */
  advisories: ReadinessCheck[];
}

const GROUP_WEIGHT: Record<ReadinessGroup, number> = {
  schema: 35,
  storage: 15,
  integrations: 25,
  data: 25,
};

function groupWeight(group: ReadinessGroup, count: number): number {
  if (count <= 0) return 0;
  return GROUP_WEIGHT[group] / count;
}

/**
 * Compute the readiness score from explicit signals.
 *
 * A group with no signals contributes nothing, which would silently deflate the
 * score, so the score is normalised by the total weight of the scored checks.
 * Optional checks carry no weight and never enter the denominator.
 */
export function computeReadiness(signals: ReadinessSignals): ReadinessReport {
  const checks: ReadinessCheck[] = [];

  for (const artifact of signals.schemaArtifacts) {
    checks.push({
      key: `schema:${artifact.key}`,
      label: `Schema · ${artifact.key}`,
      group: "schema",
      ok: artifact.present,
      weight: groupWeight("schema", signals.schemaArtifacts.length),
      detail: artifact.present ? "present" : "missing",
    });
  }

  for (const bucket of signals.requiredBuckets) {
    const present = signals.storageBuckets.includes(bucket);
    checks.push({
      key: `storage:${bucket}`,
      label: `Storage · ${bucket}`,
      group: "storage",
      ok: present,
      weight: groupWeight("storage", signals.requiredBuckets.length),
      detail: present ? "bucket exists" : "bucket missing",
    });
  }

  for (const integration of signals.integrations) {
    checks.push({
      key: `integration:${integration.key}`,
      label: integration.label,
      group: "integrations",
      ok: integration.present,
      weight: groupWeight("integrations", signals.integrations.length),
      detail: integration.present ? "configured" : "not configured",
    });
  }

  for (const item of signals.dataIntegrity) {
    checks.push({
      key: `data:${item.key}`,
      label: item.label,
      group: "data",
      ok: item.ok,
      weight: groupWeight("data", signals.dataIntegrity.length),
      detail: item.detail,
    });
  }

  const advisories: ReadinessCheck[] = (signals.advisories ?? []).map((item) => ({
    key: `advisory:${item.key}`,
    label: item.label,
    group: "advisory",
    ok: item.present,
    weight: 0,
    detail: item.detail ?? (item.present ? "configured" : "not configured"),
    optional: true,
  }));

  const scored = checks.filter((c) => !c.optional);
  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0);
  const earned = scored.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  return {
    score,
    checks: scored,
    missing: scored.filter((c) => !c.ok).map((c) => `${c.label} — ${c.detail}`),
    advisories,
  };
}
