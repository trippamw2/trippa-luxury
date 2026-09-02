// ─── Kivara AI Lab (Master OS §26) ───────────────────────────────────────────
// A permanent experimentation lab that continuously discovers new AI
// capabilities, models, automations, agent architectures, customer experiences,
// business models, distribution opportunities and revenue streams.
// Each month it asks: "What became possible this month that was not practical
// last month?"
//
// The experiment ledger is persisted to Postgres (ai_lab_experiments) so it
// survives restarts and is shared across processes. The starting catalogue is
// seeded by migration 019.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";

export type ExperimentStatus = "idea" | "running" | "won" | "failed" | "paused";

export interface Experiment {
  id: string;
  title: string;
  category:
    | "model"
    | "automation"
    | "agent-architecture"
    | "customer-experience"
    | "business-model"
    | "distribution"
    | "revenue-stream";
  hypothesis: string;
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export const EXPERIMENT_CATEGORIES: Experiment["category"][] = [
  "model",
  "automation",
  "agent-architecture",
  "customer-experience",
  "business-model",
  "distribution",
  "revenue-stream",
];

// The canonical starting catalogue, aligned with the seed in migration 019.
// Returned by preferredExperiments() for the "suggested experiments" view.
export const SUGGESTED_EXPERIMENTS: Omit<Experiment, "id" | "createdAt" | "updatedAt">[] = [
  {
    title: "Model-agnostic fallback ladder",
    category: "model",
    hypothesis: "Routing each agent to the cheapest model that still passes its quality gate lowers cost without degrading output.",
    status: "idea",
  },
  {
    title: "Automated nightly market brief",
    category: "automation",
    hypothesis: "A scheduled Strategist brief each morning reduces founder decision latency.",
    status: "idea",
  },
  {
    title: "Self-healing supplier matching",
    category: "agent-architecture",
    hypothesis: "Letting the booking-coordinator re-plan a leg when a supplier becomes unavailable improves ops resilience.",
    status: "idea",
  },
  {
    title: "Romance-gated proposal A/B",
    category: "customer-experience",
    hypothesis: "Proposals framed by an emotional arc convert higher than standard quotes.",
    status: "idea",
  },
  {
    title: "Owned-lodge pilot business model",
    category: "business-model",
    hypothesis: "Scoring demand signals can identify which destination justifies an owned/operated asset first.",
    status: "idea",
  },
  {
    title: "Luxury travel advisor channel",
    category: "distribution",
    hypothesis: "A small, high-fit advisor network yields higher quality leads than broad platforms.",
    status: "idea",
  },
  {
    title: "Design-fee revenue stream",
    category: "revenue-stream",
    hypothesis: "An optional curated-itinerary design fee monetises non-booked discovery traffic.",
    status: "idea",
  },
];

// Map a snake_case DB row back to the camelCase Experiment API shape.
function mapRow(row: {
  id: string;
  title: string;
  category: Experiment["category"];
  hypothesis: string;
  status: ExperimentStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}): Experiment {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    hypothesis: row.hypothesis,
    status: row.status,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    ...(row.notes !== undefined && row.notes !== null ? { notes: row.notes } : {}),
  };
}

function uid(): string {
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class AiLab {
  async logExperiment(
    input: Omit<Experiment, "id" | "createdAt" | "updatedAt">
  ): Promise<Experiment> {
    const client = createAdminClient();
    const now = new Date().toISOString();
    const id = uid();
    const { data, error } = await client
      .from("ai_lab_experiments")
      .insert({
        id,
        title: input.title,
        category: input.category,
        hypothesis: input.hypothesis,
        status: input.status,
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create experiment");
    return mapRow(data);
  }

  async listExperiments(category?: Experiment["category"]): Promise<Experiment[]> {
    const client = createAdminClient();
    let query = client
      .from("ai_lab_experiments")
      .select("*")
      .order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => mapRow(row));
  }

  async updateStatus(id: string, status: ExperimentStatus): Promise<Experiment | undefined> {
    const client = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from("ai_lab_experiments")
      .update({ status, updated_at: now })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined; // no matching row
      throw error;
    }
    if (!data) return undefined;
    return mapRow(data);
  }

  /**
   * The monthly question: "What became possible this month that was not
   * practical last month?" Returns a structured prompt targeting current
   * capability frontiers. Purely generative scaffolding — no live tooling.
   */
  monthlyPrompt(): { question: string; date: string; focusAreas: string[] } {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    return {
      question:
        "What became possible this month that was not practical last month?",
      date: month,
      focusAreas: [
        "New frontier models and capabilities",
        "Cheaper inference for the same quality",
        "Automation that removes a manual step",
        "Agent architectures that coordinate better",
        "Customer experiences that were previously impractical",
        "New business models, distribution channels and revenue streams",
      ],
    };
  }

  suggestedExperiments(): Omit<Experiment, "id" | "createdAt" | "updatedAt">[] {
    return SUGGESTED_EXPERIMENTS;
  }
}

export const aiLab = new AiLab();
