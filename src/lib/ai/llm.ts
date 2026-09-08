// ─── Kivara LLM Client (Gemini + Groq + DeepSeek, direct) ─────────────────
// Central client for all LLM calls, calling Google Gemini, Groq and DeepSeek
// directly via their OpenAI-compatible chat/completions endpoints (Gemini uses
// its native generateContent endpoint). Provides structured JSON output,
// error handling, and provider fallback.
// ─────────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;

/**
 * Provider order is fallback order: Gemini is primary, Groq is the free
 * fallback, DeepSeek is the final backup.
 *
 * `kind` selects the request/response protocol:
 * - "gemini-native"  → Google's `generateContent` REST API. Used because the
 *   OpenAI-compat endpoint rejects `thinkingConfig`, and Gemini 2.5 Flash's
 *   hidden thinking phase silently consumes the `max_tokens` budget (a call
 *   with maxTokens 260 produced 0 bytes of visible output). Thinking is
 *   disabled here so token budgets go entirely to visible content.
 * - "openai"         → standard OpenAI chat/completions contract (Groq, DeepSeek).
 */
type ProviderKind = "gemini-native" | "openai";

interface LlmProvider {
  name: "gemini" | "groq" | "deepseek";
  kind: ProviderKind;
  baseUrl: string;
  keyEnv: string;
  defaultModel: string;
}

const PROVIDERS: LlmProvider[] = [
  {
    name: "gemini",
    kind: "gemini-native",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyEnv: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
  },
  {
    name: "groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
  },
  {
    name: "deepseek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/chat/completions",
    keyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-v4-flash",
  },
];

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  /** Optional model override. Defaults to the provider's recommended model. */
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

interface ChatCompletionResponse {
  choices: { message: { content: string; role: string }; finish_reason: string }[];
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string };
}

/** Google `generateContent` response shape (native Gemini protocol). */
interface GeminiGenerateResponse {
  candidates?: {
    content?: { parts?: { text?: string; thinking?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
  error?: { message?: string };
}

/** Providers whose API key is configured, in fallback order. */
function getEnabledProviders(): LlmProvider[] {
  return PROVIDERS.filter((provider) => {
    const key = process.env[provider.keyEnv];
    return typeof key === "string" && key.trim().length > 0;
  });
}

function getProviderKey(provider: LlmProvider): string {
  const key = process.env[provider.keyEnv];
  if (!key) throw new Error(`${provider.name} key (${provider.keyEnv}) not configured`);
  return key;
}

/**
 * OpenAI-compatible chat/completions protocol (DeepSeek).
 */
async function callOpenAICompat(
  provider: LlmProvider,
  messages: LlmMessage[],
  config: LlmConfig
): Promise<LlmResponse> {
  const apiKey = getProviderKey(provider);
  const model = config.model || provider.defaultModel;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: config.temperature ?? 0.3,
    max_tokens: config.maxTokens ?? 2048,
  };

  if (config.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`${provider.name} ${res.status}: ${errText}`);
    }

    const data: ChatCompletionResponse = await res.json();

    if (data.error) {
      throw new Error(`${provider.name} error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`Empty response from ${provider.name}`);
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
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Google `generateContent` protocol (native Gemini).
 *
 * Uses the native endpoint because the OpenAI-compat layer rejects
 * `thinkingConfig`, and Gemini 2.5 Flash's hidden thinking would otherwise
 * silently consume the caller's `maxTokens` budget (verified: maxTokens 260
 * produced 0 bytes of visible output via the compat endpoint). Thinking is
 * disabled here so budgets go entirely to visible content. JSON mode uses
 * `responseMimeType: "application/json"` which enforces valid JSON output.
 */
async function callGeminiNative(
  provider: LlmProvider,
  messages: LlmMessage[],
  config: LlmConfig
): Promise<LlmResponse> {
  const apiKey = getProviderKey(provider);
  const model = config.model || provider.defaultModel;

  // Gemini maps roles: system → systemInstruction; user / assistant → contents.
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const generationConfig: Record<string, unknown> = {
    temperature: config.temperature ?? 0.3,
    maxOutputTokens: config.maxTokens ?? 2048,
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (config.responseFormat === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  };
  if (systemText.length > 0) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`${provider.name} ${res.status}: ${errText}`);
    }

    const data: GeminiGenerateResponse = await res.json();

    if (data.error) {
      throw new Error(`${provider.name} error: ${data.error.message}`);
    }

    const parts = data.candidates?.[0]?.content?.parts;
    const content = parts
      ?.filter((p) => typeof p.text === "string")
      .map((p) => p.text)
      .join("");
    if (!content) {
      throw new Error(`Empty response from ${provider.name}`);
    }

    return {
      content,
      model: data.modelVersion || model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Dispatch to the provider's protocol implementation. */
function callProvider(
  provider: LlmProvider,
  messages: LlmMessage[],
  config: LlmConfig
): Promise<LlmResponse> {
  return provider.kind === "gemini-native"
    ? callGeminiNative(provider, messages, config)
    : callOpenAICompat(provider, messages, config);
}

/**
 * Call the LLM with a chat completion request.
 * Tries configured providers in order (Gemini → DeepSeek) until one succeeds.
 * Throws only when every configured provider fails.
 */
export async function callLlm(
  messages: LlmMessage[],
  config: LlmConfig = {}
): Promise<LlmResponse> {
  const enabled = getEnabledProviders();
  if (enabled.length === 0) {
    throw new Error("No LLM API key configured (set GEMINI_API_KEY and/or DEEPSEEK_API_KEY)");
  }

  const lastError: Error[] = [];

  for (const provider of enabled) {
    try {
      return await callProvider(provider, messages, config);
    } catch (err) {
      lastError.push(err instanceof Error ? err : new Error(String(err)));
      console.warn(
        `LLM provider ${provider.name} (${provider.defaultModel}) failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const combined = lastError.map((e) => e.message).join("; ");
  throw new Error(`LLM call failed after ${enabled.length} provider(s): ${combined}`);
}

/**
 * Call LLM and parse the response as JSON.
 * Throws if parsing fails.
 */
export async function callLlmJson<T = Record<string, unknown>>(
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
 * Returns true if at least one provider key is set and a simple call succeeds.
 */
export async function checkLlmHealth(): Promise<{ ok: boolean; message: string }> {
  const enabled = getEnabledProviders();
  if (enabled.length === 0) {
    return { ok: false, message: "No LLM API key configured (set GEMINI_API_KEY and/or DEEPSEEK_API_KEY)" };
  }

  try {
    const res = await callLlm(
      [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Reply with exactly the word: ok" },
      ],
      { maxTokens: 10 }
    );

    return { ok: true, message: `Connected (provider: ${enabled[0].name}, model: ${res.model})` };
  } catch (err) {
    return {
      ok: false,
      message: `LLM check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}