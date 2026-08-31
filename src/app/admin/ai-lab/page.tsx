"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Plus,
  Sparkles,
  RefreshCw,
  Lightbulb,
} from "lucide-react";

// ─── Type mirrors for the AI Lab API (§26) ────────────────────────────────

type ExperimentStatus = "idea" | "running" | "won" | "failed" | "paused";

interface Experiment {
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

interface MonthlyPrompt {
  question: string;
  date: string;
  focusAreas: string[];
}

const STATUS_META: Record<ExperimentStatus, { label: string; color: string }> = {
  idea: { label: "Idea", color: "bg-gray-100 text-gray-600" },
  running: { label: "Running", color: "bg-indigo-50 text-indigo-700" },
  won: { label: "Won", color: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", color: "bg-red-50 text-red-700" },
  paused: { label: "Paused", color: "bg-amber-50 text-amber-700" },
};

const CATEGORY_LABEL: Record<Experiment["category"], string> = {
  model: "Model",
  automation: "Automation",
  "agent-architecture": "Agent Architecture",
  "customer-experience": "Customer Experience",
  "business-model": "Business Model",
  distribution: "Distribution",
  "revenue-stream": "Revenue Stream",
};

// ─── Page ────────────────────────────────────────────────────────────────

export default function AiLabPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [prompt, setPrompt] = useState<MonthlyPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [expRes, promptRes] = await Promise.all([
        fetch("/api/admin/ai-lab"),
        fetch("/api/admin/ai-lab?view=monthly"),
      ]);
      const expJson = await expRes.json();
      const promptJson = await promptRes.json();
      if (expJson.error) throw new Error(expJson.error);
      setExperiments(expJson.experiments || []);
      setPrompt(promptJson.prompt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI Lab");
    } finally {
      setLoading(false);
    }
  }, []);

  // Defer so the async loader's setState calls happen in the microtask queue,
  // not synchronously in the effect body (lint-clean and DRY).
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void load();
  };

  const updateStatus = async (id: string, status: ExperimentStatus) => {
    try {
      const res = await fetch("/api/admin/ai-lab", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setExperiments((prev) => prev.map((e) => (e.id === id ? json.experiment : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update experiment");
    }
  };

  const createExperiment = async (input: { title: string; category: Experiment["category"]; hypothesis: string }) => {
    try {
      const res = await fetch("/api/admin/ai-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, status: "idea" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setExperiments((prev) => [json.experiment, ...prev]);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create experiment");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Lab</h1>
          <p className="text-sm text-gray-500 mt-1">
            A permanent experimentation lab — what became possible this month that was not practical last month?
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-soft-black text-cream hover:bg-soft-black/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Experiment
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

      {/* Create form */}
      {showCreate && <CreateForm onCreate={createExperiment} onCancel={() => setShowCreate(false)} />}

      {/* Monthly prompt */}
      {prompt && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-soft-black text-cream p-6 mb-6"
        >
          <p className="text-xs text-cream/60 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {prompt.date} — The Monthly Question
          </p>
          <p className="text-lg font-medium text-cream">{prompt.question}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {prompt.focusAreas.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-white/10 text-cream/80">
                <Lightbulb className="w-3 h-3 text-amber-300" /> {f}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">Consulting the lab...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {experiments.length === 0 && (
            <div className="col-span-full p-8 text-center text-sm text-gray-400">
              No experiments logged yet — add your first one above.
            </div>
          )}
          {experiments.map((e) => {
            const meta = STATUS_META[e.status];
            return (
              <div key={e.id} className="bg-white border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-4 h-4 text-gold" />
                  <h3 className="text-sm font-semibold text-gray-900">{e.title}</h3>
                </div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{CATEGORY_LABEL[e.category]}</p>
                <p className="text-xs text-gray-600 flex-1 leading-relaxed">{e.hypothesis}</p>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                  <select
                    value={e.status}
                    onChange={(ev) => updateStatus(e.id, ev.target.value as ExperimentStatus)}
                    className="ml-auto text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600"
                  >
                    <option value="idea">idea</option>
                    <option value="running">running</option>
                    <option value="won">won</option>
                    <option value="failed">failed</option>
                    <option value="paused">paused</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateForm({ onCreate, onCancel }: {
  onCreate: (input: { title: string; category: Experiment["category"]; hypothesis: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Experiment["category"]>("model");
  const [hypothesis, setHypothesis] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hypothesis.trim()) return;
    onCreate({ title: title.trim(), category, hypothesis: hypothesis.trim() });
  };

  return (
    <form onSubmit={submit} className="bg-white border border-gray-100 p-5 mb-6 space-y-4">
      <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Log an experiment</h2>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
          placeholder="e.g. Model-agnostic fallback ladder"
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Experiment["category"])}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-soft-black bg-white"
          >
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Hypothesis</label>
        <textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
          placeholder="What do you expect to learn?"
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        <button type="submit" className="px-3 py-2 text-xs font-medium bg-soft-black text-cream hover:bg-soft-black/90">
          Log Experiment
        </button>
      </div>
    </form>
  );
}
