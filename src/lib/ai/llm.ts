// ─── Kivara OpenRouter LLM Client ─────────────────────────────────────────
// Central client for all LLM calls via OpenRouter.
// Provides structured JSON output, error handling, and fallback support.
// ─────────────────────────────────────────────────────────────────────────

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const FALLBACK_MODEL = "anthropic/claude-3-haiku";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
}

export interface LlmResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface OpenRouterResponse {
  choices: { message: { content: string; role: string }; finish_reason: string }[];
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string };
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  return key;
}

/**
 * Call OpenRouter with a chat completion request.
 * Automatically retries with fallback model on failure.
 */
export async function callLlm(
  messages: LlmMessage[],
  config: LlmConfig = {}
): Promise<LlmResponse> {
  const apiKey = getApiKey();
  const model = config.model || DEFAULT_MODEL;
  const lastError: Error[] = [];

  const models = [model];
  if (model === DEFAULT_MODEL) models.push(FALLBACK_MODEL);

  for (let attempt = 0; attempt < models.length; attempt++) {
    const currentModel = models[attempt];
    try {
      const body: Record<string, any> = {
        model: currentModel,
        messages,
        temperature: config.temperature ?? 0.3,
        max_tokens: config.maxTokens ?? 2048,
      };

      if (config.responseFormat === "json_object") {
        body.response_format = { type: "json_object" };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(OPENROUTER_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://trippa-luxury.vercel.app",
          "X-Title": "Kivara Luxury Travel",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`OpenRouter ${res.status}: ${errText}`);
      }

      const data: OpenRouterResponse = await res.json();

      if (data.error) {
        throw new Error(`OpenRouter error: ${data.error.message}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenRouter");
      }

      return {
        content,
        model: data.model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      lastError.push(err instanceof Error ? err : new Error(String(err)));

      // If we have another model to try, log and continue
      if (attempt < models.length - 1) {
        console.warn(
          `LLM attempt ${attempt + 1} with ${currentModel} failed:`,
          err instanceof Error ? err.message : String(err)
        );
        console.warn(`Falling back to ${models[attempt + 1]}...`);
      }
    }
  }

  // All retries exhausted
  const combined = lastError.map((e) => e.message).join("; ");
  throw new Error(`LLM call failed after ${models.length} attempts: ${combined}`);
}

/**
 * Call LLM and parse the response as JSON.
 * Throws if parsing fails.
 */
export async function callLlmJson<T = Record<string, any>>(
  messages: LlmMessage[],
  config: LlmConfig = {}
): Promise<{ data: T; usage?: LlmResponse["usage"] }> {
  const response = await callLlm(messages, {
    ...config,
    responseFormat: "json_object",
  });

  try {
    const data = JSON.parse(response.content) as T;
    return { data, usage: response.usage };
  } catch (err) {
    // Attempt to extract JSON from markdown code fences
    const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]) as T;
        return { data, usage: response.usage };
      } catch {}
    }
    throw new Error(
      `Failed to parse LLM JSON response: ${err instanceof Error ? err.message : String(err)}\nRaw: ${response.content.slice(0, 500)}`
    );
  }
}

/**
 * Check if the LLM is configured and reachable.
 * Returns true if the API key is set and a simple call succeeds.
 */
export async function checkLlmHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return { ok: false, message: "OPENROUTER_API_KEY not configured" };

    const res = await callLlm(
      [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Reply with exactly the word: ok" },
      ],
      { maxTokens: 10 }
    );

    return { ok: true, message: `Connected (model: ${res.model})` };
  } catch (err) {
    return {
      ok: false,
      message: `LLM check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
