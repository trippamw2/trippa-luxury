import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/llm", () => ({
  callLlm: vi.fn(async () => ({ content: "hi", model: "gemini-2.5-flash", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })),
  callLlmJson: vi.fn(async () => ({ data: { ok: true } })),
}));

vi.mock("@/lib/ai/training", () => ({
  getKivaraModel: vi.fn(async () => null),
}));

vi.mock("@/lib/ai/learning", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/learning")>();
  return {
    ...actual,
    retrieveLessons: vi.fn(async () => []),
  };
});

import { kivaraCallLlm, kivaraCallLlmJson } from "@/lib/ai/kivara-llm";

describe("kivara-llm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stamps the model name with the kivara brand", async () => {
    const res = await kivaraCallLlm([{ role: "user", content: "hi" }]);
    expect(res.model).toContain("kivara-llm/");
    expect(res.content).toBe("hi");
  });

  it("returns parsed JSON from kivaraCallLlmJson", async () => {
    const res = await kivaraCallLlmJson<{ ok: boolean }>([{ role: "user", content: "hi" }]);
    expect(res.data.ok).toBe(true);
  });
});
