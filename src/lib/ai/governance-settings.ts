// ─── Kivara Runtime Governance Switches ───────────────────────────────────
// Operator-controlled autonomy, read by the AI layer on every consequential
// path.
//
// Why this exists: `autonomy-policy.ts` is deliberately pure, so the operating
// dial lived in a constant. That made the constitution's central control
// unreachable at 3am — turning autonomy down or stopping model spend required a
// code change and a deploy. This module is the mutable half: the policy stays
// pure and exhaustively testable, and the dial becomes an operator setting.
//
// Precedence, highest first:
//   1. Environment. A deploy is a legitimate emergency lever and must win over
//      the database, otherwise a bad value written through the UI could not be
//      overridden without another deploy.
//   2. `platform_settings`, written through the admin API and audited.
//   3. Conservative defaults, which match the level the constitution starts at.
//
// Availability note: if the settings cannot be read, the conservative defaults
// apply and the failure is logged. Failing closed here would take inquiry and
// booking off the air for everyone because of a settings-table hiccup, which is
// a worse outcome than running one window at the default dial.

import { DEFAULT_COMPANY_AUTONOMY_LEVEL, coerceAutonomyLevel, type AutonomyLevel } from "@/lib/ai/autonomy-policy";
import { createAdminClient } from "@/lib/supabase/admin";

/** `platform_settings` keys. Prefixed so they cannot collide with site settings. */
export const GOVERNANCE_KEYS = {
  autonomyLevel: "governance.autonomy_level",
  llmEnabled: "governance.llm_enabled",
  outboundEnabled: "governance.ai_outbound_enabled",
  internalWritesEnabled: "governance.ai_internal_writes_enabled",
  updatedAt: "governance.updated_at",
  updatedBy: "governance.updated_by",
  ratifiedAt: "governance.ratified_at",
  ratifiedBy: "governance.ratified_by",
  ratifiedDocVersion: "governance.ratified_doc_version",
} as const;

/**
 * Version of `GOVERNANCE.md` these controls implement.
 *
 * Ratification is bound to a version rather than a moment, so that editing the
 * constitution does not silently inherit an old sign-off. Bump this when a change
 * is material — a right withdrawn or a new capability granted — and the admin
 * surface will report the ratification as stale until a human re-ratifies.
 * Editorial fixes do not need a bump.
 */
export const GOVERNANCE_DOC_VERSION = 1;

/**
 * The exact words an operator must submit to ratify.
 *
 * A confirm button is a reflex; typing a sentence is a decision. This is the
 * cheapest place to make the act deliberate, and it gives the audit trail
 * something meaningful to show afterwards.
 */
export const GOVERNANCE_RATIFICATION_PHRASE = "I ratify the Kivara AI Governance Constitution";

export interface GovernanceSettings {
  /** The operating dial. Actions above this escalate to a human. */
  autonomyLevel: AutonomyLevel;
  /** Master switch for every outbound model call. */
  llmEnabled: boolean;
  /** AI-initiated messages to clients and guests. */
  outboundEnabled: boolean;
  /** AI-initiated reversible internal state changes. */
  internalWritesEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  /** When a human ratified the constitution, or null if never. */
  ratifiedAt: string | null;
  ratifiedBy: string | null;
  /** Which document version was ratified. */
  ratifiedDocVersion: number | null;
  /** True when the environment is overriding the stored value. */
  envOverride: boolean;
}

export const DEFAULT_GOVERNANCE_SETTINGS: GovernanceSettings = {
  // Level 2 — reversible internal work executes, anything consequential escalates.
  autonomyLevel: DEFAULT_COMPANY_AUTONOMY_LEVEL,
  // Model spend on by default: these are emergency levers, to be pulled during
  // an incident rather than shipped off. Starting them off would mean the first
  // deploy silently changed product behaviour, and an operator who never looks
  // at a setting cannot be relied on to have set it correctly.
  llmEnabled: true,
  // Outbound is on by default for the same reason, and because the routes that
  // dispatch to guests are already human-gated: a manager sends the quote they
  // are looking at. What the constitution actually forbids is *unreviewed*
  // outbound, and that is stopped by the dial refusing an unattended dispatch at
  // level 2 — not by disabling the whole capability. Pull this switch to freeze
  // all outbound immediately, including human-gated sends.
  outboundEnabled: true,
  internalWritesEnabled: true,
  updatedAt: null,
  updatedBy: null,
  ratifiedAt: null,
  ratifiedBy: null,
  ratifiedDocVersion: null,
  envOverride: false,
};

/**
 * Outbound AI communication defaults to permitted *for human-authorized sends*.
 *
 * The constitution requires outbound messages to be staged and reviewed, and the
 * admin dispatch routes satisfy that: a manager composes and sends the specific
 * artifact they are looking at. What it forbids is unreviewed outbound, which is
 * refused by the dial rather than by disabling the capability. `outboundEnabled`
 * exists as the incident lever for freezing all outbound at once.
 */

/** How long a read is cached, in ms. Bounds both latency and DB load. */
export const GOVERNANCE_CACHE_TTL_MS = 5_000;

type CacheEntry = { value: GovernanceSettings; readAt: number };

let cached: CacheEntry | null = null;

/** Drops the cache. Called after a write, and by tests. */
export function resetGovernanceCache(): void {
  cached = null;
}

/**
 * Parse a boolean setting.
 *
 * `false`, `0`, `off`, `no` are false. Everything else is true, so an operator
 * cannot accidentally disable a switch by typing something unexpected. Note
 * that "0" is meaningful here and must not be treated as unset, which is the
 * same trap `coerceAutonomyLevel` guards against for the dial.
 */
export function parseBooleanFlag(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === null || raw === undefined || raw === "") return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (["false", "0", "off", "no"].includes(normalized)) return false;
  if (["true", "1", "on", "yes"].includes(normalized)) return true;
  return fallback;
}

/**
 * Read an env var without assuming it exists.
 *
 * Env access is lazy here rather than at module load, so the build and any
 * unrelated code path work without these set.
 */
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

/**
 * Coerce a stored settings value to a string.
 *
 * `platform_settings.value` is text, but a hand-edited row or a bad migration
 * can put anything there. Returning null rather than stringifying nonsense keeps
 * the ratification record honest instead of displaying `"undefined"` as a sign-off.
 */
function readOptionalString(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

function readOptionalNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function applyEnvOverrides(settings: GovernanceSettings): GovernanceSettings {
  const envLlm = readEnv("GOVERNANCE_LLM_ENABLED");
  const envOutbound = readEnv("GOVERNANCE_AI_OUTBOUND_ENABLED");
  const envInternalWrites = readEnv("GOVERNANCE_AI_INTERNAL_WRITES_ENABLED");
  const envLevel = readEnv("GOVERNANCE_AUTONOMY_LEVEL");

  const overrides = {
    ...settings,
    llmEnabled: envLlm === undefined ? settings.llmEnabled : parseBooleanFlag(envLlm, settings.llmEnabled),
    outboundEnabled:
      envOutbound === undefined ? settings.outboundEnabled : parseBooleanFlag(envOutbound, settings.outboundEnabled),
    internalWritesEnabled:
      envInternalWrites === undefined
        ? settings.internalWritesEnabled
        : parseBooleanFlag(envInternalWrites, settings.internalWritesEnabled),
    // "0" is a legitimate dial position, so only an absent value defers.
    autonomyLevel: envLevel === undefined ? settings.autonomyLevel : coerceAutonomyLevel(envLevel),
  };

  const envOverride =
    envLlm !== undefined || envOutbound !== undefined || envInternalWrites !== undefined || envLevel !== undefined;

  return { ...overrides, envOverride };
}

/**
 * Current governance settings.
 *
 * Cached briefly because the AI layer consults this on consequential paths and
 * a database round-trip per model call would be wasteful. The TTL bounds how
 * long an operator waits to see a switch take effect.
 */
export async function getGovernanceSettings(options?: { nowMs?: number }): Promise<GovernanceSettings> {
  const nowMs = options?.nowMs ?? Date.now();

  if (cached && nowMs - cached.readAt < GOVERNANCE_CACHE_TTL_MS) {
    return applyEnvOverrides(cached.value);
  }

  let stored: GovernanceSettings = { ...DEFAULT_GOVERNANCE_SETTINGS };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in(
        "key",
        [
          GOVERNANCE_KEYS.autonomyLevel,
          GOVERNANCE_KEYS.llmEnabled,
          GOVERNANCE_KEYS.outboundEnabled,
          GOVERNANCE_KEYS.internalWritesEnabled,
          GOVERNANCE_KEYS.updatedAt,
          GOVERNANCE_KEYS.updatedBy,
          GOVERNANCE_KEYS.ratifiedAt,
          GOVERNANCE_KEYS.ratifiedBy,
          GOVERNANCE_KEYS.ratifiedDocVersion,
        ]
      );

    if (error) throw error;

    const rows = (data ?? []) as Array<{ key: string; value: unknown }>;
    const byKey = new Map(rows.map((row) => [row.key, row.value]));

    stored = {
      autonomyLevel: coerceAutonomyLevel(byKey.get(GOVERNANCE_KEYS.autonomyLevel)),
      llmEnabled: parseBooleanFlag(byKey.get(GOVERNANCE_KEYS.llmEnabled), DEFAULT_GOVERNANCE_SETTINGS.llmEnabled),
      outboundEnabled: parseBooleanFlag(
        byKey.get(GOVERNANCE_KEYS.outboundEnabled),
        DEFAULT_GOVERNANCE_SETTINGS.outboundEnabled
      ),
      internalWritesEnabled: parseBooleanFlag(
        byKey.get(GOVERNANCE_KEYS.internalWritesEnabled),
        DEFAULT_GOVERNANCE_SETTINGS.internalWritesEnabled
      ),
      updatedAt: typeof byKey.get(GOVERNANCE_KEYS.updatedAt) === "string" ? (byKey.get(GOVERNANCE_KEYS.updatedAt) as string) : null,
      updatedBy: typeof byKey.get(GOVERNANCE_KEYS.updatedBy) === "string" ? (byKey.get(GOVERNANCE_KEYS.updatedBy) as string) : null,
      ratifiedAt: readOptionalString(byKey.get(GOVERNANCE_KEYS.ratifiedAt)),
      ratifiedBy: readOptionalString(byKey.get(GOVERNANCE_KEYS.ratifiedBy)),
      ratifiedDocVersion: readOptionalNumber(byKey.get(GOVERNANCE_KEYS.ratifiedDocVersion)),
      envOverride: false,
    };
  } catch (error) {
    // Availability over exactness: fall back to the conservative defaults and
    // make the failure visible rather than silently running ungoverned.
    console.error(
      "Governance settings unavailable; falling back to conservative defaults:",
      error instanceof Error ? error.message : error
    );
    stored = { ...DEFAULT_GOVERNANCE_SETTINGS };
  }

  cached = { value: stored, readAt: nowMs };
  return applyEnvOverrides(stored);
}

/** The operating dial, for `evaluateAutonomy`. */
export async function currentAutonomyLevel(): Promise<AutonomyLevel> {
  return (await getGovernanceSettings()).autonomyLevel;
}

/** False when model spend is switched off. Callers must not call a model. */
export async function isLlmEnabled(): Promise<boolean> {
  return (await getGovernanceSettings()).llmEnabled;
}

/** False when AI-initiated outbound communication is switched off. */
export async function isOutboundEnabled(): Promise<boolean> {
  return (await getGovernanceSettings()).outboundEnabled;
}

export interface GovernanceUpdate {
  autonomyLevel?: AutonomyLevel;
  llmEnabled?: boolean;
  outboundEnabled?: boolean;
  internalWritesEnabled?: boolean;
}

/**
 * Persist new settings. Writes through the admin API only.
 *
 * Every change is attributed and audited, because a governance change that
 * cannot be traced is indistinguishable from a governance change nobody made.
 */
export async function setGovernanceSettings(
  update: GovernanceUpdate,
  actor: { performedBy?: string } = {}
): Promise<GovernanceSettings> {
  const current = await getGovernanceSettings();
  const next: GovernanceSettings = {
    autonomyLevel: update.autonomyLevel ?? current.autonomyLevel,
    llmEnabled: update.llmEnabled ?? current.llmEnabled,
    outboundEnabled: update.outboundEnabled ?? current.outboundEnabled,
    internalWritesEnabled: update.internalWritesEnabled ?? current.internalWritesEnabled,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.performedBy ?? null,
    // Ratification is carried through deliberately. Moving the dial is an
    // operating decision, not a constitutional one, and must not silently
    // discard a human sign-off. Only `ratifyGovernance` may clear it.
    ratifiedAt: current.ratifiedAt,
    ratifiedBy: current.ratifiedBy,
    ratifiedDocVersion: current.ratifiedDocVersion,
    envOverride: current.envOverride,
  };

  const supabase = createAdminClient();
  const rows: Array<{ key: string; value: string }> = [
    { key: GOVERNANCE_KEYS.autonomyLevel, value: String(next.autonomyLevel) },
    { key: GOVERNANCE_KEYS.llmEnabled, value: String(next.llmEnabled) },
    { key: GOVERNANCE_KEYS.outboundEnabled, value: String(next.outboundEnabled) },
    { key: GOVERNANCE_KEYS.internalWritesEnabled, value: String(next.internalWritesEnabled) },
    { key: GOVERNANCE_KEYS.updatedAt, value: next.updatedAt as string },
  ];
  if (next.updatedBy) rows.push({ key: GOVERNANCE_KEYS.updatedBy, value: next.updatedBy });

  const { error } = await supabase.from("platform_settings").upsert(rows);
  if (error) throw error;

  // Refuse to serve the value that was just superseded.
  cached = { value: next, readAt: Date.now() };
  return applyEnvOverrides(next);
}

export interface RatificationResult {
  settings: GovernanceSettings;
  /** True when this call was the first sign-off. */
  firstRatification: boolean;
  /** True when a previous sign-off existed for an older document version. */
  reRatification: boolean;
}

/**
 * Record a human's ratification of the constitution.
 *
 * This deliberately does not happen implicitly, at build time, or on first read.
 * The document's own STATUS line says UNRATIFIED, and that stays true until
 * someone with authority presses the button — an agent must not be able to sign
 * a constitution on the company's behalf, because then ratification would mean
 * nothing at all.
 *
 * The sign-off is bound to `GOVERNANCE_DOC_VERSION`, so materially editing the
 * constitution invalidates it rather than inheriting an old approval.
 */
export async function ratifyGovernance(
  actor: { performedBy?: string; acknowledgement?: string } = {}
): Promise<RatificationResult> {
  // Require the caller to state what they are ratifying. A bare POST that
  // silently ratifies is indistinguishable from one that did not happen.
  const acknowledged = (actor.acknowledgement ?? "").trim();
  if (acknowledged !== GOVERNANCE_RATIFICATION_PHRASE) {
    throw new Error(
      `Ratification requires an explicit acknowledgement of "${GOVERNANCE_RATIFICATION_PHRASE}"`
    );
  }

  const current = await getGovernanceSettings();
  const hadRatification = current.ratifiedAt !== null;
  const staleBefore =
    hadRatification && current.ratifiedDocVersion !== GOVERNANCE_DOC_VERSION;

  const next: GovernanceSettings = {
    ...current,
    ratifiedAt: new Date().toISOString(),
    ratifiedBy: actor.performedBy ?? null,
    ratifiedDocVersion: GOVERNANCE_DOC_VERSION,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.performedBy ?? null,
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert([
    { key: GOVERNANCE_KEYS.ratifiedAt, value: next.ratifiedAt as string },
    { key: GOVERNANCE_KEYS.ratifiedDocVersion, value: String(GOVERNANCE_DOC_VERSION) },
    ...(next.ratifiedBy ? [{ key: GOVERNANCE_KEYS.ratifiedBy, value: next.ratifiedBy }] : []),
    { key: GOVERNANCE_KEYS.updatedAt, value: next.updatedAt as string },
  ]);
  if (error) throw error;

  cached = { value: next, readAt: Date.now() };
  return {
    settings: applyEnvOverrides(next),
    firstRatification: !hadRatification,
    reRatification: hadRatification || staleBefore,
  };
}

/** True when a human has signed off on the current document version. */
export async function isRatified(): Promise<boolean> {
  const settings = await getGovernanceSettings();
  return (
    settings.ratifiedAt !== null &&
    settings.ratifiedDocVersion === GOVERNANCE_DOC_VERSION
  );
}

/**
 * True when the constitution was signed off but has since materially changed.
 *
 * A stale ratification must not read as a current one, so callers report this
 * rather than the bare `ratifiedAt` timestamp.
 */
export async function isRatificationStale(): Promise<boolean> {
  const settings = await getGovernanceSettings();
  return settings.ratifiedAt !== null && settings.ratifiedDocVersion !== GOVERNANCE_DOC_VERSION;
}