import { describe, it, expect } from "vitest";
import { buildOpsPlan } from "@/lib/ai/ops-orchestrator";

describe("ops-orchestrator pure", () => {
  it("builds 9 legs arrival→departure", () => {
    const plan = buildOpsPlan({ id: "b1", destination: "Zanzibar", start_date: "2026-09-01", duration_nights: 5 }, []);
    expect(plan.legs).toHaveLength(9);
    expect(plan.legs[0].leg).toBe("arrival");
    expect(plan.legs[8].leg).toBe("departure");
  });
  it("matches suppliers by category", () => {
    const plan = buildOpsPlan({ id: "b1", destination: "Kenya" }, [{ id: "s1", name: "Lodge A", category: "lodge" }]);
    const accLeg = plan.legs.find((l) => l.leg === "accommodation");
    expect(accLeg?.matchedSuppliers[0]?.name).toBe("Lodge A");
  });
  it("generates risks and checklist", () => {
    const plan = buildOpsPlan({ id: "b1" }, []);
    expect(plan.risks.length).toBeGreaterThan(0);
    expect(plan.checklist.length).toBeGreaterThan(0);
  });
});
