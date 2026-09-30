import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRunKoraAudit = vi.fn();
vi.mock("@/lib/ai/kora", () => ({
  runKoraAudit: () => mockRunKoraAudit(),
}));

// Must import the route AFTER mocks are registered (hoisted).
import { POST } from "@/app/api/cron/kora-audit/route";

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/cron/kora-audit", {
    method: "POST",
    headers,
  });
}

/** A completed, clean audit. */
function cleanReport(overrides: Record<string, unknown> = {}) {
  return {
    startedAt: "2026-06-01T05:00:00.000Z",
    gapsDetected: 0,
    gapsRecorded: 0,
    hypothesesRaised: 0,
    blockedReason: null,
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mockRunKoraAudit.mockResolvedValue(cleanReport());
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/cron/kora-audit — auth", () => {
  it("returns 401 when the bearer token is missing", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(401);
    expect(mockRunKoraAudit).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await POST(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
    expect(mockRunKoraAudit).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(503);
    expect(mockRunKoraAudit).not.toHaveBeenCalled();
  });
});

describe("POST /api/cron/kora-audit — outcomes", () => {
  it("returns 200 and a clean message when nothing is wrong", async () => {
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.gapsDetected).toBe(0);
    expect(body.message).toContain("no gaps detected");
  });

  it("reports how many gaps were recorded", async () => {
    mockRunKoraAudit.mockResolvedValue(
      cleanReport({ gapsDetected: 3, gapsRecorded: 3, hypothesesRaised: 1 })
    );
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.gapsRecorded).toBe(3);
    expect(body.hypothesesRaised).toBe(1);
    expect(body.message).toContain("3 gap(s) recorded");
  });

  it("returns 500 when the audit itself is broken", async () => {
    mockRunKoraAudit.mockResolvedValue(cleanReport({ error: "KORA could not read the platform" }));
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("could not read");
  });

  it("returns 200 — not 500 — when governance blocks the write", async () => {
    // Being blocked by the autonomy policy is the control working, not an
    // outage. Alerting on it would train us to ignore alerts.
    mockRunKoraAudit.mockResolvedValue(
      cleanReport({
        gapsDetected: 2,
        gapsRecorded: 0,
        blockedReason: "Action requires more authority than the company's current operating level.",
      })
    );
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.blocked).toBe(true);
    expect(body.reason).toContain("operating level");
    // The findings were still detected — that work is not lost.
    expect(body.gapsDetected).toBe(2);
  });

  it("returns 500 if the audit throws despite its never-throw contract", async () => {
    mockRunKoraAudit.mockRejectedValue(new Error("unexpected"));
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("unexpected");
  });
});
