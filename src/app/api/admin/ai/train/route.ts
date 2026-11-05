import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import {
  buildTrainingDataset,
  datasetToJsonl,
  launchFineTuneJob,
  setKivaraModel,
  getKivaraModel,
} from "@/lib/ai/training";

/**
 * POST /api/admin/ai/train
 *
 * Builds a fine-tuning dataset from Kivara's institutional memory and, when
 * OPENAI_API_KEY is configured, launches a fine-tuning job. The resulting
 * model id is stored in platform_settings and preferred by KIVARA LLM.
 *
 * Body (optional): { "launch": boolean, "baseModel": string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "ai-lab", minRole: "admin" });

    const body = await request.json().catch(() => ({}));
    const launch = body?.launch === true;
    const baseModel = typeof body?.baseModel === "string" ? body.baseModel : undefined;

    const examples = await buildTrainingDataset();
    const jsonl = datasetToJsonl(examples);

    let job: { jobId?: string; model?: string; error?: string } | null = null;
    if (launch) {
      job = await launchFineTuneJob(jsonl, baseModel);
      if (job?.model) {
        await setKivaraModel(job.model);
      }
    }

    const currentModel = await getKivaraModel();

    return NextResponse.json({
      success: true,
      exampleCount: examples.length,
      datasetBytes: jsonl.length,
      launched: launch,
      job,
      currentModel,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin({ module: "ai-lab", minRole: "agent" });
    const currentModel = await getKivaraModel();
    return NextResponse.json({ currentModel });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
