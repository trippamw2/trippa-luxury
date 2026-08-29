// ─── Kivara AI Lab (Master OS §26) ───────────────────────────────────────────
// A permanent experimentation lab that continuously discovers new AI
// capabilities, models, automations, agent architectures, customer experiences,
// business models, distribution opportunities and revenue streams.
// Each month it asks: "What became possible this month that was not practical
// last month?"
// ─────────────────────────────────────────────────────────────────────────────

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

// A starting catalogue of concrete, actionable experiments aligned to §26.
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

let experiments: Experiment[] = [];

function uid(): string {
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class AiLab {
  logExperiment(
    input: Omit<Experiment, "id" | "createdAt" | "updatedAt">
  ): Experiment {
    const now = new Date().toISOString();
    const exp: Experiment = { ...input, id: uid(), createdAt: now, updatedAt: now };
    experiments.push(exp);
    return exp;
  }

  listExperiments(category?: Experiment["category"]): Experiment[] {
    if (!category) return [...experiments];
    return experiments.filter((e) => e.category === category);
  }

  updateStatus(id: string, status: ExperimentStatus): Experiment | undefined {
    const exp = experiments.find((e) => e.id === id);
    if (exp) {
      exp.status = status;
      exp.updatedAt = new Date().toISOString();
    }
    return exp;
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
