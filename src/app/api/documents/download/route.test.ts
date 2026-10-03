import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  AdminAuthError: class AdminAuthError extends Error {
    status: number;
    constructor(message: string, status = 403) {
      super(message);
      this.status = status;
    }
  },
}));

// One representative generator; the point is the guard, not the templating.
const mockGenerateQuoteDocument = vi.fn();
vi.mock("@/lib/documents/quote", () => ({
  generateQuoteDocument: (...args: unknown[]) => mockGenerateQuoteDocument(...(args as [])),
}));

vi.mock("@/lib/ai/types", () => ({}));

import { GET } from "@/app/api/documents/download/route";

function req(params = "type=quote&bookingRef=KVR-1&clientName=Martin") {
  return new NextRequest(`http://localhost/api/documents/download?${params}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ role: "admin" });
  mockGenerateQuoteDocument.mockReturnValue("<html>quote</html>");
});

describe("GET /api/documents/download", () => {
  it("refuses an unauthenticated caller", async () => {
    const { AdminAuthError } = await import("@/lib/admin-auth");
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Authentication required", 401));

    const res = await GET(req());

    expect(res.status).toBe(401);
    // The whole point: no branded document is produced.
    expect(mockGenerateQuoteDocument).not.toHaveBeenCalled();
  });

  it("serves a document to an authorised caller", async () => {
    const res = await GET(req());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("kivara-quote-KVR-1.html");
    expect(mockGenerateQuoteDocument).toHaveBeenCalled();
  });

  it("marks the download as unrenderable and nosniff", async () => {
    const res = await GET(req());
    // Caller-supplied HTML must not be treated as an active document.
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  it("strips path characters out of the filename", async () => {
    const res = await GET(req("type=quote&bookingRef=../../etc/passwd"));
    expect(res.headers.get("content-disposition")).not.toContain("..");
  });

  it("rejects an unknown document type", async () => {
    const res = await GET(req("type=not-a-document"));
    expect(res.status).toBe(400);
  });

  it("requires a document type", async () => {
    const res = await GET(req("bookingRef=KVR-1"));
    expect(res.status).toBe(400);
  });

  it("does not leak the internal error message", async () => {
    mockGenerateQuoteDocument.mockImplementation(() => {
      throw new Error("secret internal path C:\\config");
    });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret internal path");
  });
});