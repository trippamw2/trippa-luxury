import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  normalizeEmail,
  suppressionBlocks,
  loadSuppressions,
  isEmailBlocked,
  partitionSuppressed,
  hardSuppress,
  ensureMarketingSuppression,
  liftMarketingSuppression,
} from "@/lib/email-consent";

type Settle = { data: unknown; error: unknown };

/** Result awaited by a read chain (`.select().in()` / `.select().eq()`). */
let readResult: Settle;
/** Result awaited by `insert` / `upsert`. */
let writeResult: Settle;
/** Rows passed to `insert`. */
let insertArgs: unknown[];
/** Rows passed to `upsert`, with their options. */
let upsertArgs: { row: Record<string, unknown>; options: unknown }[];
/** `(column, value)` pairs applied to delete chains. */
let deleteFilters: { column: string; value: unknown }[];

/** Tables `from` was asked for, in order — proves we don't query needlessly. */
let fromTables: string[];

function installMock(): void {
  mockFrom.mockImplementation((table: string) => {
    fromTables.push(table);
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    chain.select = ret;
    chain.in = ret;
    chain.eq = (column: string, value: unknown) => {
      deleteFilters.push({ column, value });
      return chain;
    };
    chain.maybeSingle = () => Promise.resolve(readResult);
    chain.insert = (row: unknown) => {
      insertArgs.push(row);
      return Promise.resolve(writeResult);
    };
    chain.upsert = (row: unknown, options: unknown) => {
      upsertArgs.push({ row: row as Record<string, unknown>, options });
      return Promise.resolve(writeResult);
    };
    chain.delete = ret;
    chain.then = (resolve: (value: unknown) => void) => resolve(readResult);
    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  readResult = { data: null, error: null };
  writeResult = { data: null, error: null };
  insertArgs = [];
  upsertArgs = [];
  deleteFilters = [];
  fromTables = [];
  installMock();
});

// ── Pure rules ─────────────────────────────────────────────────────────────
describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Guest@Example.COM ")).toBe("guest@example.com");
  });

  it("treats null/undefined as empty", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("suppressionBlocks", () => {
  it("blocks nothing when there is no suppression", () => {
    expect(suppressionBlocks(undefined, "marketing")).toBe(false);
    expect(suppressionBlocks(undefined, "service")).toBe(false);
  });

  it("blocks marketing for any scope", () => {
    expect(suppressionBlocks("marketing", "marketing")).toBe(true);
    expect(suppressionBlocks("all", "marketing")).toBe(true);
  });

  // The distinction the whole module exists for: an unsubscribe is a marketing
  // preference, not a refusal of receipts and reminders for a booked trip.
  it("blocks service mail only for a hard stop", () => {
    expect(suppressionBlocks("marketing", "service")).toBe(false);
    expect(suppressionBlocks("all", "service")).toBe(true);
  });
});

// ── Reads ──────────────────────────────────────────────────────────────────
describe("loadSuppressions", () => {
  it("returns an empty map without querying when there are no addresses", async () => {
    const map = await loadSuppressions([]);

    expect(map.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("maps normalized addresses to their scope", async () => {
    readResult = {
      data: [{ email: "Guest@Example.com", scope: "all" }],
      error: null,
    };

    const map = await loadSuppressions(["guest@example.com"]);

    expect(map.get("guest@example.com")).toBe("all");
  });

  // A lookup failure must be loud: callers choose fail-closed vs fail-open, so
  // the helper cannot silently return "nobody suppressed".
  it("throws when the lookup fails", async () => {
    readResult = { data: null, error: { message: "boom" } };

    await expect(loadSuppressions(["guest@example.com"])).rejects.toThrow(
      /Suppression lookup failed/
    );
  });
});

describe("isEmailBlocked", () => {
  it("is true for a marketing suppression asked as marketing", async () => {
    readResult = { data: [{ email: "a@b.com", scope: "marketing" }], error: null };

    expect(await isEmailBlocked("a@b.com", "marketing")).toBe(true);
  });

  it("is false for a marketing suppression asked as service", async () => {
    readResult = { data: [{ email: "a@b.com", scope: "marketing" }], error: null };

    expect(await isEmailBlocked("a@b.com", "service")).toBe(false);
  });
});

describe("partitionSuppressed", () => {
  it("splits the list, preserving original addresses", async () => {
    readResult = {
      data: [{ email: "blocked@example.com", scope: "marketing" }],
      error: null,
    };

    const part = await partitionSuppressed(
      ["ok@example.com", "blocked@example.com"],
      "marketing"
    );

    expect(part.allowed).toEqual(["ok@example.com"]);
    expect(part.blocked).toEqual(["blocked@example.com"]);
  });

  it("leaves a marketing-suppressed address deliverable for service mail", async () => {
    readResult = {
      data: [{ email: "blocked@example.com", scope: "marketing" }],
      error: null,
    };

    const part = await partitionSuppressed(["blocked@example.com"], "service");

    expect(part.allowed).toEqual(["blocked@example.com"]);
    expect(part.blocked).toEqual([]);
  });
});

// ── Writes ─────────────────────────────────────────────────────────────────
describe("hardSuppress", () => {
  it("upserts a scope-all row on the email conflict target", async () => {
    const result = await hardSuppress({ email: "Guest@Example.com", reason: "bounce" });

    expect(result.ok).toBe(true);
    expect(upsertArgs[0].row).toMatchObject({
      email: "guest@example.com",
      scope: "all",
      reason: "bounce",
    });
    expect(upsertArgs[0].options).toEqual({ onConflict: "email" });
  });

  it("rejects an empty address without querying", async () => {
    const result = await hardSuppress({ email: "  ", reason: "bounce" });

    expect(result.ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("ensureMarketingSuppression", () => {
  it("does not downgrade an existing suppression", async () => {
    readResult = { data: { id: "row-1" }, error: null };

    const result = await ensureMarketingSuppression({ email: "a@b.com" });

    expect(result.ok).toBe(true);
    expect(insertArgs).toEqual([]);
  });

  it("inserts a marketing row when none exists", async () => {
    readResult = { data: null, error: null };

    const result = await ensureMarketingSuppression({
      email: "A@B.com",
      source: "public_unsubscribe",
    });

    expect(result.ok).toBe(true);
    expect(insertArgs[0]).toMatchObject({
      email: "a@b.com",
      scope: "marketing",
      reason: "unsubscribe",
      source: "public_unsubscribe",
    });
  });

  // A concurrent insert racing to the unique index means the address is already
  // suppressed — success, not failure.
  it("tolerates a unique-violation race", async () => {
    readResult = { data: null, error: null };
    writeResult = { data: null, error: { code: "23505", message: "dup" } };

    const result = await ensureMarketingSuppression({ email: "a@b.com" });

    expect(result.ok).toBe(true);
  });
});

describe("liftMarketingSuppression", () => {
  it("deletes only the marketing-scope row", async () => {
    await liftMarketingSuppression("  Guest@Example.com ");

    expect(deleteFilters).toContainEqual({ column: "email", value: "guest@example.com" });
    expect(deleteFilters).toContainEqual({ column: "scope", value: "marketing" });
  });

  it("does nothing for an empty address", async () => {
    await liftMarketingSuppression("");

    expect(mockFrom).not.toHaveBeenCalled();
  });
});
