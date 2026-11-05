// ─── Kivara LLM Training Pipeline ────────────────────────────────────────────
// Exports Kivara's accumulated institutional memory as a fine-tuning dataset
// (OpenAI chat format) and, when a training API key is configured, launches a
// fine-tuning job. The resulting model id is stored in platform_settings
// `kivara_llm_model` (and may be overridden by KIVARA_LLM_MODEL env) and is
// preferred by `@/lib/ai/kivara-llm`.
//
// Until a training key is configured, Kivara LLM operates in
// retrieval-augmented mode: lessons are injected at prompt time. Running the
// pipeline still produces the dataset, so it can be used with any compatible
// training provider later.

import { createAdminClient } from "@/lib/supabase/admin";

const OPENAI_API_BASE = "https://api.openai.com/v1";

export interface TrainingExample {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

const KIVARA_SYSTEM = "You are KIVARA LLM, the intelligence layer for Kivara luxury romance travel. You design journeys, write proposals, profile guests, match suppliers, and plan operations. You are warm, precise, and on-brand. You never invent prices, availability, or supplier commitments.";

/**
 * Read the configured Kivara model id, if any.
 */
export async function getKivaraModel(): Promise<string | null> {
  const envModel = process.env.KIVARA_LLM_MODEL;
  if (envModel && envModel.trim()) return envModel.trim();
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "kivara_llm_model")
      .maybeSingle();
    const value = (data as { value?: string } | null)?.value;
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export async function setKivaraModel(model: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("platform_settings")
    .upsert({ key: "kivara_llm_model", value: model }, { onConflict: "key" });
}

/**
 * Build a fine-tuning dataset from institutional memory:
 *   - insights (agent reports) → lesson examples
 *   - completed bookings with feedback → outcome examples
 *   - JOURNEY_LEARNED system events → learning examples
 */
export async function buildTrainingDataset(): Promise<TrainingExample[]> {
  const examples: TrainingExample[] = [];
  try {
    const supabase = createAdminClient();

    // 1. Insights → lessons.
    const { data: insights } = await supabase
      .from("insights")
      .select("agent, scope, title, statement, report")
      .order("created_at", { ascending: false })
      .limit(500);
    for (const row of insights ?? []) {
      const r = row as Record<string, unknown>;
      const title = String(r.title ?? "");
      const statement = String(r.statement ?? "");
      if (!title || !statement) continue;
      examples.push({
        messages: [
          { role: "system", content: KIVARA_SYSTEM },
          { role: "user", content: `What has Kivara learned about ${r.scope ?? "operations"}?` },
          { role: "assistant", content: `${title}\n\n${statement}` },
        ],
      });
    }

    // 2. Completed bookings with feedback → outcome lessons.
    const { data: feedbackEvents } = await supabase
      .from("system_events")
      .select("payload, correlation_id")
      .eq("event_type", "CLIENT_FEEDBACK_RECEIVED")
      .order("created_at", { ascending: false })
      .limit(500);
    for (const ev of feedbackEvents ?? []) {
      const payload = (ev as { payload?: Record<string, unknown> }).payload ?? {};
      const rating = payload.rating;
      const comment = payload.comment;
      if (rating == null) continue;
      examples.push({
        messages: [
          { role: "system", content: KIVARA_SYSTEM },
          { role: "user", content: "A guest completed a trip. What should Kivara remember?" },
          {
            role: "assistant",
            content: `Guest rating: ${rating}/5.${comment ? ` Feedback: ${String(comment).slice(0, 500)}` : ""} Use this to improve future journey design, supplier selection, and communication.`,
          },
        ],
      });
    }

    // 3. JOURNEY_LEARNED events → learning examples.
    const { data: learnedEvents } = await supabase
      .from("system_events")
      .select("payload")
      .eq("event_type", "JOURNEY_LEARNED")
      .order("created_at", { ascending: false })
      .limit(500);
    for (const ev of learnedEvents ?? []) {
      const payload = (ev as { payload?: Record<string, unknown> }).payload ?? {};
      examples.push({
        messages: [
          { role: "system", content: KIVARA_SYSTEM },
          { role: "user", content: "A journey was completed. What lesson should Kivara carry forward?" },
          { role: "assistant", content: `Journey ${String(payload.bookingId ?? "")} completed. Source: ${String(payload.source ?? "trip-completion")}. Carry forward the supplier matches, timing, and guest preferences that led to completion.` },
        ],
      });
    }
  } catch {
    // Degrade gracefully: return whatever we collected.
  }
  return examples;
}

export function datasetToJsonl(examples: TrainingExample[]): string {
  return examples.map((e) => JSON.stringify(e)).join("\n");
}

/**
 * Launch a fine-tuning job. Requires OPENAI_API_KEY. Returns the job id or an error.
 */
export async function launchFineTuneJob(
  trainingJsonl: string,
  baseModel: string = "gpt-4o-mini-2024-07-18"
): Promise<{ jobId?: string; model?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { error: "OPENAI_API_KEY is not configured; cannot launch fine-tuning job" };
  }
  if (!trainingJsonl.trim()) {
    return { error: "empty training dataset" };
  }

  try {
    // 1. Upload the training file.
    const boundary = `----kivara${Date.now()}`;
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="purpose"',
      "",
      "fine-tune",
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="kivara-training.jsonl"',
      "Content-Type: application/jsonl",
      "",
      trainingJsonl,
      `--${boundary}--`,
    ].join("\r\n");

    const uploadRes = await fetch(`${OPENAI_API_BASE}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (!uploadRes.ok) {
      return { error: `file upload failed: ${uploadRes.status} ${await uploadRes.text()}` };
    }
    const upload = (await uploadRes.json()) as { id: string };

    // 2. Create the fine-tuning job.
    const jobRes = await fetch(`${OPENAI_API_BASE}/fine_tuning/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ training_file: upload.id, model: baseModel }),
    });
    if (!jobRes.ok) {
      return { error: `fine-tune job creation failed: ${jobRes.status} ${await jobRes.text()}` };
    }
    const job = (await jobRes.json()) as { id: string; fine_tuned_model?: string };
    return { jobId: job.id, model: job.fine_tuned_model };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown error" };
  }
}
