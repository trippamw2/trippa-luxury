import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicRateLimiter } from "@/lib/public-rate-limiter";
import {
  createMemoryRateLimitStore,
  createPostgresRateLimitStore,
  resetRateLimitStoreCache,
  resolveRateLimitStore,
  takeRateLimit,
} from "@/lib/rate-limit-store";

type RpcResult = {
  data: { allowed: boolean; remaining: number; retry_after_seconds: number }[] | null;
  error: { message: string; code?: string } | null;
};

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

/** Stands in for the Supabase client, recording calls and scripting the reply. */
function fakeClient(respond: (call: RpcCall) => RpcResult) {
  const calls: RpcCall[] = [];
  return {
    calls,
    client: {
      rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
        const call = { fn, args };
        calls.push(call);
        return Promise.resolve(respond(call));
      },
    },
  };
}

function useClient(client: unknown): void {
  vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>);
}

const ALLOWED = { allowed: true, remaining: 4, retry_after_seconds: 60 };

/** Replies as if the RPC exists: the probe passes, real calls are allowed. */
function rpcPresent(): (call: RpcCall) => RpcResult {
  return (call) =>
    call.args.p_limit === 0
      ? { data: [{ allowed: false, remaining: 0, retry_after_seconds: 1 }], error: null }
      : { data: [ALLOWED], error: null };
}

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeEach(() => {
  resetRateLimitStoreCache();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
});

afterEach(() => {
  resetRateLimitStoreCache();
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  vi.restoreAllMocks();
});

describe("postgres store", () => {
  it("maps the RPC row onto a verdict", async () => {
    const { client } = fakeClient(() => ({ data: [ALLOWED], error: null }));
    const store = createPostgresRateLimitStore(client);

    expect(await store.take("k", 5, 60_000)).toEqual({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 60,
    });
  });

  it("converts the window to whole seconds and never asks for less than one", async () => {
    const { client, calls } = fakeClient(() => ({ data: [ALLOWED], error: null }));
    const store = createPostgresRateLimitStore(client);

    await store.take("k", 1, 500);
    await store.take("k", 1, 90_000);

    expect(calls[0].args.p_window_seconds).toBe(1);
    expect(calls[1].args.p_window_seconds).toBe(90);
  });

  it("throws on an RPC error so the caller can fall back", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "boom" } }));
    const store = createPostgresRateLimitStore(client);

    await expect(store.take("k", 1, 1000)).rejects.toThrow("boom");
  });

  it("throws when the RPC returns no row", async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }));
    const store = createPostgresRateLimitStore(client);

    await expect(store.take("k", 1, 1000)).rejects.toThrow(/no row/);
  });
});

describe("store resolution", () => {
  it("reports no durable store when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(await resolveRateLimitStore()).toEqual({ store: null, durable: false });
  });

  it("uses Postgres once the probe succeeds", async () => {
    const { client, calls } = fakeClient(rpcPresent());
    useClient(client);

    const resolution = await resolveRateLimitStore();

    expect(resolution.durable).toBe(true);
    expect(resolution.store?.kind).toBe("postgres");
    // The probe must not be able to consume a real caller's allowance.
    expect(calls[0].args.p_limit).toBe(0);
  });

  it("falls back and says so when the RPC is missing", async () => {
    const { client } = fakeClient(() => ({
      data: null,
      error: { message: "Could not find the function", code: "PGRST202" },
    }));
    useClient(client);

    const resolution = await resolveRateLimitStore();

    expect(resolution.durable).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("not present"));
  });

  it("falls back when the probe fails for an unrelated reason", async () => {
    const { client } = fakeClient(() => ({
      data: null,
      error: { message: "connection refused", code: "08006" },
    }));
    useClient(client);

    expect((await resolveRateLimitStore()).durable).toBe(false);
  });

  it("falls back when the probe rejects outright", async () => {
    useClient({
      rpc() {
        return Promise.reject(new Error("socket hang up"));
      },
    });

    expect((await resolveRateLimitStore()).durable).toBe(false);
  });

  it("falls back when the Supabase client cannot even be built", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    });

    expect((await resolveRateLimitStore()).durable).toBe(false);
  });
});

describe("degradation", () => {
  it("falls back to the caller's long-lived store when the durable write fails", async () => {
    const { client } = fakeClient((call) =>
      call.args.p_limit === 0
        ? { data: [{ allowed: false, remaining: 0, retry_after_seconds: 1 }], error: null }
        : { data: null, error: { message: "connection reset" } }
    );
    useClient(client);

    const fallback = createMemoryRateLimitStore();
    const first = await takeRateLimit("k", 2, 60_000, fallback, 0);
    const second = await takeRateLimit("k", 2, 60_000, fallback, 0);
    const third = await takeRateLimit("k", 2, 60_000, fallback, 0);

    expect(first.durable).toBe(false);
    expect(first.verdict.allowed).toBe(true);
    expect(second.verdict.allowed).toBe(true);
    // The count has to accumulate on the fallback: a store built per call would
    // never refuse anybody.
    expect(third.verdict.allowed).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Rate-limit write failed")
    );
  });

  it("does not flood the log while the database stays down", async () => {
    const { client } = fakeClient((call) =>
      call.args.p_limit === 0
        ? { data: [{ allowed: false, remaining: 0, retry_after_seconds: 1 }], error: null }
        : { data: null, error: { message: "connection reset" } }
    );
    useClient(client);

    const fallback = createMemoryRateLimitStore();
    for (let i = 0; i < 5; i += 1) {
      await takeRateLimit(`k-${i}`, 2, 60_000, fallback, 0);
    }

    const warnings = vi
      .mocked(console.warn)
      .mock.calls.filter((call) => String(call[0]).includes("Rate-limit write failed"));
    expect(warnings).toHaveLength(1);
  });

  it("still enforces the limit in memory when Postgres was never configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const fallback = createMemoryRateLimitStore();
    expect((await takeRateLimit("k", 1, 60_000, fallback, 0)).verdict.allowed).toBe(true);
    expect((await takeRateLimit("k", 1, 60_000, fallback, 0)).verdict.allowed).toBe(false);
  });
});

describe("durable bucket keys", () => {
  it("namespaces buckets so two limiters cannot spend each other's allowance", async () => {
    const { client, calls } = fakeClient(rpcPresent());
    useClient(client);

    const publicWrite = createPublicRateLimiter({
      limit: 1,
      windowMs: 60_000,
      name: "public-write",
      durable: true,
    });
    const llmCost = createPublicRateLimiter({
      limit: 1,
      windowMs: 60_000,
      name: "llm-cost",
      durable: true,
    });

    await publicWrite.take("same-ip", 0);
    await llmCost.take("same-ip", 0);

    const keys = calls.map((call) => String(call.args.p_bucket_key));
    expect(keys.some((key) => key.startsWith("public-write:"))).toBe(true);
    expect(keys.some((key) => key.startsWith("llm-cost:"))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps an attacker-supplied key inside the column's length limit", async () => {
    const { client, calls } = fakeClient(rpcPresent());
    useClient(client);

    const rl = createPublicRateLimiter({
      limit: 5,
      windowMs: 60_000,
      name: "public-write",
      durable: true,
    });
    await rl.take("x".repeat(5000), 0);

    // Migration 032 checks char_length between 1 and 256. An oversized
    // x-forwarded-for would otherwise fail the insert and silently drop the
    // caller out of the shared limiter.
    const key = String(calls[1].args.p_bucket_key);
    expect(key.length).toBeLessThanOrEqual(256);
    expect(key.startsWith("public-write:")).toBe(true);
  });
});