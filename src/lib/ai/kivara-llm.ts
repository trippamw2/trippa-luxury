// ─── KIVARA LLM ──────────────────────────────────────────────────────────────
// The branded intelligence layer for Kivara. Every LLM call in the platform
// should go through here rather than `@/lib/ai/llm` directly, so that:
//   1. The model is branded as KIVARA LLM (consistent identity + constraints).
//   2. Relevant learned lessons (from completed trips, guest feedback, supplier
//      outcomes, marketing results) are injected as few-shot context.
//   3. Usage is recorded through the existing llm-usage accounting.
//
// This is retrieval-augmented learning: the base models are unchanged, but
// each call is grounded in Kivara's institutional memory. When a fine-tuned
// Kivara model is configured (KIVARA_LLM_MODEL env or platform_settings
// `kivara_llm_model`), it is preferred over the base providers.

import { callLlm, callLlmJson, type LlmMessage, type LlmConfig, type LlmResponse } from "./llm";
import { retrieveLessons, formatLessonsForPrompt, kivaraIdentity, type LearningDomain } from "./learning";
import { getKivaraModel } from "./training";

export { recordLesson } from "./learning";
export type { LearningDomain };

export interface KivaraLlmConfig extends LlmConfig {
  /** Learning domain for lesson retrieval. Defaults to "general". */
  domain?: LearningDomain;
  /** Set false to skip lesson injection (e.g. health checks). */
  learning?: boolean;
  /** Extra lesson query hint (e.g. destination name). */
  learningQuery?: string;
}

const KIVARA_SYSTEM_PREFIX = "KIVARA LLM";

function buildSystemMessage(domain: LearningDomain, lessons: string): string {
  const parts = [kivaraIdentity(domain)];
  if (lessons) parts.push(lessons);
  return parts.join("\n\n");
}

async function injectLearning(
  messages: LlmMessage[],
  config: KivaraLlmConfig
): Promise<LlmMessage[]> {
  if (config.learning === false) return messages;
  const domain = config.domain ?? "general";
  const lessons = await retrieveLessons(domain);
  const lessonBlock = formatLessonsForPrompt(lessons);
  const identity = buildSystemMessage(domain, lessonBlock);

  // Prepend/merge into the first system message rather than adding a second one.
  const first = messages[0];
  if (first && first.role === "system") {
    return [{ role: "system", content: `${identity}\n\n${first.content}` }, ...messages.slice(1)];
  }
  return [{ role: "system", content: identity }, ...messages];
}

async function resolveModel(config: KivaraLlmConfig): Promise<{ model?: string; provider?: string }> {
  if (config.model) return { model: config.model, provider: config.provider };
  try {
    const info = await getKivaraModel();
    if (!info) return {};
    return { model: info.model, provider: info.provider };
  } catch {
    return {};
  }
}

export async function kivaraCallLlm(
  messages: LlmMessage[],
  config: KivaraLlmConfig = {}
): Promise<LlmResponse> {
  const enriched = await injectLearning(messages, config);
  const resolved = await resolveModel(config);
  const merged: LlmConfig = {
    ...config,
    model: resolved.model ?? config.model,
    provider: (resolved.provider as LlmConfig["provider"]) ?? config.provider,
  };
  const response = await callLlm(enriched, merged);
  // Stamp the brand in the returned model name when the base provider is used.
  if (!response.model || !response.model.toLowerCase().includes("kivara")) {
    response.model = `kivara-llm/${response.model}`;
  }
  return response;
}

export async function kivaraCallLlmJson<T = Record<string, unknown>>(
  messages: LlmMessage[],
  config: KivaraLlmConfig = {}
): Promise<{ data: T; usage?: LlmResponse["usage"] }> {
  const enriched = await injectLearning(messages, config);
  const resolved = await resolveModel(config);
  const merged: LlmConfig = {
    ...config,
    model: resolved.model ?? config.model,
    provider: (resolved.provider as LlmConfig["provider"]) ?? config.provider,
  };
  return callLlmJson<T>(enriched, merged);
}

export { KIVARA_SYSTEM_PREFIX };
