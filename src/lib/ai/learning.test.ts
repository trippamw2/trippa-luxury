import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockPersist = vi.fn();
vi.mock("@/lib/ai/agent-persistence", () => ({
  persistAgentReport: (...args: unknown[]) => mockPersist(...args),
}));

import {
  retrieveLessons,
  recordLesson,
  formatLessonsForPrompt,
  kivaraIdentity,
} from "@/lib/ai/learning";

describe("learning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when the store throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("db down");
    });
    await expect(retrieveLessons("journey")).resolves.toEqual([]);
  });

  it("returns lessons from the store", async () => {
    const settle = { data: [{ id: "1", title: "T", statement: "S", created_at: "2026-01-01T00:00:00Z" }], error: null };
    const chain = (): unknown => new Proxy({} as object, {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(settle);
        return () => chain();
      },
    });
    mockFrom.mockReturnValue({ select: () => chain() });
    const lessons = await retrieveLessons("journey");
    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe("T");
  });

  it("formats an empty list as an empty string", () => {
    expect(formatLessonsForPrompt([])).toBe("");
  });

  it("formats lessons as a numbered block", () => {
    const out = formatLessonsForPrompt([
      { domain: "journey", title: "A", statement: "B" },
    ]);
    expect(out).toContain("Learned from past Kivara outcomes");
    expect(out).toContain("1. A: B");
  });

  it("kivaraIdentity brands the model", () => {
    const id = kivaraIdentity("marketing");
    expect(id).toContain("KIVARA LLM");
    expect(id).toContain("marketing");
  });

  it("recordLesson delegates to persistAgentReport", async () => {
    mockPersist.mockResolvedValue({ inserted: true });
    const res = await recordLesson({
      domain: "journey",
      agent: "test",
      title: "t",
      statement: "s",
    });
    expect(res.inserted).toBe(true);
    expect(mockPersist).toHaveBeenCalled();
  });

  it("recordLesson never throws", async () => {
    mockPersist.mockRejectedValue(new Error("boom"));
    const res = await recordLesson({
      domain: "journey",
      agent: "test",
      title: "t",
      statement: "s",
    });
    expect(res.inserted).toBe(false);
  });
});
