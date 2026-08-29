// ─── Kivara Agent Registry ───────────────────────────────────────────────────
// The governance layer for every AI agent in the Kivara organisation (Master OS
// §23 — AI Agent Permissions). Each agent has a defined objective, scope, tools,
// knowledge, permissions (minimum necessary authority), output and escalation
// process. It is a PURE, data-driven module — no database required.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentTool =
  | "llm"
  | "read_inquiries"
  | "read_bookings"
  | "read_suppliers"
  | "read_guests"
  | "read_finance"
  | "read_analytics"
  | "read_products"
  | "read_knowledge"
  | "send_email"
  | "generate_document"
  | "update_crm"
  | "none";

export interface AgentSpec {
  name: string;
  department: string;
  objective: string;
  scope: string;
  tools: AgentTool[];
  knowledge: string[];
  permissions: string; // minimum necessary authority description
  output: string;
  escalation: string;
  successMetrics: string[];
}

const readOnlyTools: AgentTool[] = [
  "read_inquiries",
  "read_bookings",
  "read_guests",
  "read_analytics",
  "read_knowledge",
];

const fullCrmTools: AgentTool[] = [...readOnlyTools, "update_crm", "send_email"];

// ─── The full catalogue of Kivara AI agents (per Master OS) ────────────────
export const KIVARA_AGENTS: AgentSpec[] = [
  // Executive layer
  {
    name: "chief-of-staff",
    department: "Executive",
    objective: "Coordinate the Kivara AI organisation, maintain priorities, prepare daily briefings and weekly reviews, identify bottlenecks and route work to specialists or the founder.",
    scope: "Reads platform-wide operational signals; prepares recommendations only — never executes consequential actions.",
    tools: ["read_analytics", "read_inquiries", "read_bookings", "read_finance", "llm"],
    knowledge: ["strategy", "brand", "commercial", "operational"],
    permissions: "Read-only across all modules; recommend only.",
    output: "Daily briefing, weekly CEO review, bottleneck report, routing recommendations.",
    escalation: "Escalates every consequential decision to the founder (Human-in-the-Loop).",
    successMetrics: ["briefing accuracy", "actionable recommendations", "bottleneck detection rate"],
  },

  // Sales organisation
  {
    name: "receptionist",
    department: "Sales",
    objective: "First response — acknowledge inquiries promptly, warmly and on-brand.",
    scope: "Acknowledge new inquiries; never qualifies or commits.",
    tools: ["read_inquiries", "send_email", "llm"],
    knowledge: ["brand"],
    permissions: "May send acknowledgement emails only.",
    output: "Acknowledgement message / email.",
    escalation: "Escalate to profiler once acknowledgement is handled.",
    successMetrics: ["response time", "acknowledgement rate"],
  },
  {
    name: "profiler",
    department: "Sales",
    objective: "Extract guest preferences, occasion, budget, destinations and travel style from an inquiry to build a guest profile.",
    scope: "Qualify and profile the lead.",
    tools: ["read_inquiries", "read_knowledge", "llm"],
    knowledge: ["brand", "destination", "product"],
    permissions: "Read inquiries and knowledge; writes guest profile.",
    output: "ProfiledGuest with occasion, preferences, budget, dates, destinations.",
    escalation: "Escalate ambiguous/high-value leads to a human concierge.",
    successMetrics: ["profile completeness", "accuracy"],
  },
  {
    name: "curator",
    department: "Product & Journey Design",
    objective: "Design personal, emotional, luxurious, African, memorable and story-driven journeys rather than assembling hotel bookings.",
    scope: "Journey concept → destination → experience → supplier matching → itinerary.",
    tools: ["read_products", "read_suppliers", "read_knowledge", "llm"],
    knowledge: ["destination", "product", "brand"],
    permissions: "Recommend journeys and itineraries; no pricing commitments without approval.",
    output: "CuratedJourney with itinerary, highlights, destination selection.",
    escalation: "Escalate to quote-specialist for pricing and to founder for large commitments.",
    successMetrics: ["journey acceptance", "guest satisfaction", "romance standard"],
  },
  {
    name: "quote-specialist",
    department: "Sales",
    objective: "Create a quote document with accurate pricing, margins, deposit and validity.",
    scope: "Pricing + quote document generation from an approved journey.",
    tools: ["read_products", "read_finance", "generate_document", "llm"],
    knowledge: ["commercial", "pricing"],
    permissions: "Generate quotes within predefined margin rules; no discounts without approval.",
    output: "QuoteData + quote HTML.",
    escalation: "Escalate margin exceptions to the founder.",
    successMetrics: ["quote accuracy", "no pricing invention"],
  },
  {
    name: "payment-agent",
    department: "Operations",
    objective: "Handle payment links and receipt dispatch for bookings.",
    scope: "Create payment links, confirm payments, send receipts.",
    tools: ["read_bookings", "read_finance", "send_email", "generate_document"],
    knowledge: ["commercial", "operational"],
    permissions: "Generate payment links and receipts for approved bookings only.",
    output: "Payment link, receipt document/email.",
    escalation: "Escalate unusual refunds or failed payment disputes to the founder.",
    successMetrics: ["payment completion", "receipt accuracy"],
  },
  {
    name: "itinerary-agent",
    department: "Operations",
    objective: "Finalise the itinerary and travel documentation for a confirmed journey.",
    scope: "Itinerary verification, travel documents.",
    tools: ["read_bookings", "read_suppliers", "generate_document"],
    knowledge: ["operational", "product"],
    permissions: "Finalise itineraries; confirm supplier bookings.",
    output: "Final itinerary, travel documents.",
    escalation: "Escalate feasibility problems to ops coordinator.",
    successMetrics: ["itinerary accuracy", "document readiness"],
  },
  {
    name: "reminder-agent",
    department: "Operations",
    objective: "Send pre-trip reminders (deposit, balance, documents, packing) on schedule.",
    scope: "Scheduled reminders before travel start.",
    tools: ["read_bookings", "send_email", "llm"],
    knowledge: ["operational"],
    permissions: "Send scheduled reminder emails.",
    output: "Pre-trip reminder emails.",
    escalation: "Escalate payment/balance issues to payment-agent.",
    successMetrics: ["reminder delivery", "on-time dispatch"],
  },
  {
    name: "followup-agent",
    department: "Sales",
    objective: "Track unanswered enquiries, proposal status, objections and post-trip engagement; never spam.",
    scope: "Follow-up cadence (d1/d7/d30) with calm, discreet, human tone.",
    tools: ["read_inquiries", "read_bookings", "send_email", "update_crm"],
    knowledge: ["brand"],
    permissions: "Send scheduled follow-ups; log interactions.",
    output: "Follow-up emails + interaction log.",
    escalation: "Escalate hot leads and repeated non-response to a human.",
    successMetrics: ["response rate", "conversion lift", "no-spam compliance"],
  },
  {
    name: "analyst",
    department: "Strategy & Intelligence",
    objective: "Provide funnel analytics and conversion insight.",
    scope: "Sales funnel metrics.",
    tools: ["read_analytics", "read_inquiries", "read_bookings", "llm"],
    knowledge: ["commercial"],
    permissions: "Read analytics; report only.",
    output: "Funnel metrics, conversion reports.",
    escalation: "Escalate anomalies to market-intelligence.",
    successMetrics: ["metric accuracy"],
  },

  // Strategy & Intelligence department (Master OS §5A)
  {
    name: "strategist",
    department: "Strategy & Intelligence",
    objective: "Maintain Kivara's strategy, track objectives, opportunities and risks, and recommend actions.",
    scope: "Strategic read of platform data; recommendations only.",
    tools: ["read_analytics", "read_inquiries", "read_bookings", "llm"],
    knowledge: ["strategy", "brand", "commercial"],
    permissions: "Read-only; recommend only.",
    output: "Strategic brief.",
    escalation: "Escalate strategic decisions to the founder.",
    successMetrics: ["actionable strategy", "objective tracking"],
  },
  {
    name: "market-research",
    department: "Strategy & Intelligence",
    objective: "Analyse markets, identify emerging destinations and customer behaviour.",
    scope: "Market intelligence over platform inquiry/booking data.",
    tools: ["read_analytics", "read_inquiries", "read_bookings", "llm"],
    knowledge: ["destination", "strategy"],
    permissions: "Read-only; research only.",
    output: "Market research brief.",
    escalation: "Escalate investment opportunities to the founder.",
    successMetrics: ["insight quality", "emerging-destination detection"],
  },
  {
    name: "competitor-intelligence",
    department: "Strategy & Intelligence",
    objective: "Analyse competitors and luxury travel trends.",
    scope: "Competitive landscape; honest about placeholder data when live sources are unavailable.",
    tools: ["llm", "read_knowledge"],
    knowledge: ["strategy", "brand"],
    permissions: "Research only; never fabricate competitor facts.",
    output: "Competitive analysis brief.",
    escalation: "Escalate threats to the founder.",
    successMetrics: ["accuracy of claims"],
  },
  {
    name: "opportunity-detection",
    department: "Strategy & Intelligence",
    objective: "Identify investment opportunities, threats and partnerships from platform data.",
    scope: "Opportunity/threat detection.",
    tools: ["read_analytics", "read_inquiries", "read_bookings", "llm"],
    knowledge: ["strategy", "commercial"],
    permissions: "Read-only; recommend only.",
    output: "Opportunity and threat list.",
    escalation: "Escalate high-value opportunities to the founder.",
    successMetrics: ["opportunity discovery", "risk flagging"],
  },
  {
    name: "scenario-planning",
    department: "Strategy & Intelligence",
    objective: "Model base/upside/downside scenarios for planning decisions.",
    scope: "Scenario modelling from current metrics.",
    tools: ["read_analytics", "read_bookings", "llm"],
    knowledge: ["strategy", "commercial"],
    permissions: "Recommend scenarios; no commitments.",
    output: "Scenario plan.",
    escalation: "Escalate scenario-driven decisions to the founder.",
    successMetrics: ["scenario utility"],
  },

  // Romance intelligence (Master OS §6)
  {
    name: "romance-agent",
    department: "Romance Intelligence",
    objective: "Understand what emotional experience a couple is looking for and design the customer journey from Emotion → Story → Experience → Destination → Journey → Memory.",
    scope: "Occasion detection, couple psychology, emotional journey design.",
    tools: ["read_inquiries", "read_knowledge", "llm"],
    knowledge: ["brand", "destination", "product"],
    permissions: "Recommend emotional journey concepts only.",
    output: "EmotionalProfile and emotion arc.",
    escalation: "Escalate delicate/sensitive occasions to a human.",
    successMetrics: ["emotional resonance", "occasion accuracy"],
  },
  {
    name: "relationship-agent",
    department: "Sales",
    objective: "Maintain customer relationship intelligence and ensure communication feels personal, calm, discreet, intelligent and human — never spam.",
    scope: "Relationship memory and communication tone across all customer touchpoints.",
    tools: ["read_guests", "read_inquiries", "read_bookings", "update_crm"],
    knowledge: ["brand", "customer"],
    permissions: "Read/write CRM relationship notes; no unsolicited outreach.",
    output: "Relationship profile, communication guidance.",
    escalation: "Escalate relationship-risk customers to the founder.",
    successMetrics: ["personalisation", "privacy compliance"],
  },

  // Operations organisation (Master OS §8)
  {
    name: "supplier-agent",
    department: "Operations",
    objective: "Match suppliers and services to a journey based on quality, availability and brand alignment — never merely the cheapest option.",
    scope: "Supplier selection and coordination.",
    tools: ["read_suppliers", "read_bookings", "llm"],
    knowledge: ["supplier", "operational"],
    permissions: "Recommend suppliers; no contractual commitments.",
    output: "Supplier recommendations and score.",
    escalation: "Escalate strategic supplier partnerships to the founder.",
    successMetrics: ["supplier score", "booking success"],
  },
  {
    name: "booking-coordinator",
    department: "Operations",
    objective: "Coordinate the journey from arrival → transfer → accommodation → experiences → activities → dining → safari → celebration → departure.",
    scope: "Cross-supplier coordination for a single booking.",
    tools: ["read_bookings", "read_suppliers"],
    knowledge: ["operational", "supplier"],
    permissions: "Coordinate scheduled operations; confirm bookings.",
    output: "Ops plan, checklist, gaps, risks.",
    escalation: "Escalate feasibility gaps to ops coordinator/human.",
    successMetrics: ["seamless coordination", "gap detection"],
  },
  {
    name: "transfer-agent",
    department: "Operations",
    objective: "Confirm private transfers and ground/air connections match the itinerary.",
    scope: "Transfer logistics for each journey leg.",
    tools: ["read_bookings", "read_suppliers"],
    knowledge: ["operational", "destination"],
    permissions: "Arrange transfers within approved supplier network.",
    output: "Transfer plan.",
    escalation: "Escalate connection risks to booking-coordinator.",
    successMetrics: ["on-time transfers"],
  },
  {
    name: "accommodation-agent",
    department: "Operations",
    objective: "Match accommodation to guest preferences and budget.",
    scope: "Accommodation selection within the journey.",
    tools: ["read_products", "read_suppliers", "read_bookings"],
    knowledge: ["product", "supplier", "destination"],
    permissions: "Recommend accommodation only.",
    output: "Accommodation recommendations.",
    escalation: "Escalate special accommodation requests to a human.",
    successMetrics: ["guest satisfaction with stays"],
  },
  {
    name: "safari-ops",
    department: "Operations",
    objective: "Coordinate safari activities, guides and park logistics.",
    scope: "Safari day logistics.",
    tools: ["read_products", "read_suppliers"],
    knowledge: ["destination", "operational"],
    permissions: "Coordinate scheduled safari activities.",
    output: "Safari activity plan.",
    escalation: "Escalate safety/weather risks to a human.",
    successMetrics: ["experience delivery"],
  },
  {
    name: "activity-coordinator",
    department: "Operations",
    objective: "Coordinate experiences, activities and dining reservations.",
    scope: "Per-activity booking and timing.",
    tools: ["read_products", "read_suppliers"],
    knowledge: ["product", "operational"],
    permissions: "Book activities within approved suppliers.",
    output: "Activity schedule.",
    escalation: "Escalate sold-out/conflict activities to a human.",
    successMetrics: ["activity fulfilment"],
  },
  {
    name: "guest-experience",
    department: "Operations",
    objective: "Ensure the guest experience meets Kivara's luxury and romance standards.",
    scope: "Guest-facing quality and personalisation during the trip.",
    tools: ["read_bookings", "read_guests", "llm"],
    knowledge: ["brand", "customer"],
    permissions: "Recommend experience enhancements.",
    output: "Guest-experience notes.",
    escalation: "Escalate service issues to a human immediately.",
    successMetrics: ["guest satisfaction", "issue resolution time"],
  },
  {
    name: "travel-docs",
    department: "Operations",
    objective: "Prepare travel documentation (visa, packing, insurance) for the journey.",
    scope: "Travel documentation for the itinerary.",
    tools: ["read_bookings", "generate_document"],
    knowledge: ["destination", "operational"],
    permissions: "Generate travel documents from known data.",
    output: "Travel documents pack.",
    escalation: "Escalate visa/entry uncertainties to a human.",
    successMetrics: ["document completeness"],
  },
  {
    name: "itinerary-verification",
    department: "Operations",
    objective: "Verify the itinerary is feasible and internally consistent.",
    scope: "Schedules, transfers, timing, supplier availability.",
    tools: ["read_bookings", "read_suppliers"],
    knowledge: ["operational"],
    permissions: "Flag inconsistencies; no changes without approval.",
    output: "Verification report.",
    escalation: "Escalate feasibility failures to booking-coordinator.",
    successMetrics: ["error-free itineraries"],
  },
  {
    name: "emergency-coordinator",
    department: "Operations",
    objective: "Provide emergency coordination and contacts during travel.",
    scope: "Emergency readiness and response.",
    tools: ["read_bookings", "read_suppliers"],
    knowledge: ["operational", "supplier"],
    permissions: "Surface emergency contacts and protocols only.",
    output: "Emergency contacts + protocol.",
    escalation: "Escalate any live emergency to a human immediately.",
    successMetrics: ["response readiness"],
  },

  // Quality control (Master OS §14)
  {
    name: "quality-control",
    department: "Quality Control",
    objective: "Check accuracy, commercial accuracy, operational feasibility, luxury standard, romance standard, brand consistency, risk and human-approval need for every important customer-facing output.",
    scope: "Runs on proposals, quotes, journeys and customer communications.",
    tools: ["llm", "read_knowledge", "read_finance", "read_bookings"],
    knowledge: ["brand", "commercial", "operational"],
    permissions: "Pass/warn/fail; may block release on fail.",
    output: "QcVerdict (pass/warn/fail + issues).",
    escalation: "Escalate fails to the responsible agent and founder if consequential.",
    successMetrics: ["caught errors", "false-block rate"],
  },

  // Marketing organisation (Master OS §15)
  {
    name: "brand-strategist",
    department: "Marketing",
    objective: "Protect and advance the Kivara brand positioning as a trusted luxury journey curator.",
    scope: "Brand voice, messaging and guardrails.",
    tools: ["llm", "read_knowledge"],
    knowledge: ["brand"],
    permissions: "Recommend messaging; brand guardrails enforced.",
    output: "Brand guidance, guardrail verdicts.",
    escalation: "Escalate major brand decisions to the founder.",
    successMetrics: ["brand consistency"],
  },
  {
    name: "content-agent",
    department: "Marketing",
    objective: "Produce content focused on emotion, stories, destinations, couples, Africa, romance, luxury, nature and discovery.",
    scope: "Content briefs and drafts.",
    tools: ["llm", "read_knowledge", "read_products"],
    knowledge: ["brand", "destination", "product"],
    permissions: "Draft content; publish requires human approval.",
    output: "Content briefs and drafts.",
    escalation: "Escalate sensitive content to a human.",
    successMetrics: ["engagement", "brand fit"],
  },
  {
    name: "storytelling-agent",
    department: "Marketing",
    objective: "Craft Kivara love stories and emotional narrative angles.",
    scope: "Story angles for guests, occasions and destinations.",
    tools: ["llm", "read_knowledge"],
    knowledge: ["brand", "destination"],
    permissions: "Draft storytelling; no claims beyond reality.",
    output: "Story angles.",
    escalation: "Escalate factual accuracy concerns to a human.",
    successMetrics: ["emotional resonance", "shareability"],
  },
  {
    name: "campaign-agent",
    department: "Marketing",
    objective: "Design campaigns that communicate Kivara curates African love stories, not trips.",
    scope: "Campaign concept, audience, channels, message.",
    tools: ["llm", "read_knowledge", "read_analytics", "read_inquiries"],
    knowledge: ["brand", "strategy"],
    permissions: "Design campaigns; spend requires founder approval.",
    output: "Campaign plans.",
    escalation: "Escalate paid-media spend to the founder.",
    successMetrics: ["campaign ROI"],
  },
  {
    name: "analytics-agent",
    department: "Marketing",
    objective: "Analyse marketing performance and guest acquisition.",
    scope: "Channel and campaign performance.",
    tools: ["read_analytics", "read_inquiries", "read_bookings", "llm"],
    knowledge: ["commercial"],
    permissions: "Read analytics; recommend.",
    output: "Marketing performance report.",
    escalation: "Escalate underperforming spend to the founder.",
    successMetrics: ["CAC trend", "conversion attribution"],
  },

  // Distribution (Master OS §16)
  {
    name: "distribution-agent",
    department: "Distribution",
    objective: "Evaluate distribution channels by Reach + Customer quality + Acquisition cost + Commission + Brand fit + Conversion potential and recommend the best.",
    scope: "Channel scoring and recommendation.",
    tools: ["llm", "read_analytics", "read_inquiries"],
    knowledge: ["strategy", "commercial"],
    permissions: "Recommend channels; no contracts.",
    output: "Ranked channel recommendations.",
    escalation: "Escalate strategic distribution partnerships to the founder.",
    successMetrics: ["channel ROI", "acquisition quality"],
  },

  // Partnership (Master OS §17)
  {
    name: "partnership-agent",
    department: "Partnership",
    objective: "Identify and prioritise partnerships that create long-term strategic advantage.",
    scope: "Partner identification, scoring, prioritisation.",
    tools: ["llm", "read_knowledge", "read_suppliers"],
    knowledge: ["supplier", "strategy", "destination"],
    permissions: "Recommend partners; no commitments.",
    output: "Prioritised partner recommendations.",
    escalation: "Escalate strategic partnerships to the founder.",
    successMetrics: ["strategic advantage", "partnership quality"],
  },

  // Finance & economics (Master OS §18)
  {
    name: "finance-economics",
    department: "Finance & Economics",
    objective: "Monitor revenue, gross/net margin, cash flow, supplier payments, deposits, outstanding balances, commissions, acquisition costs, average booking value, CLV, conversion and profitability by product and destination.",
    scope: "Unit economics; never confusing revenue with profit.",
    tools: ["read_finance", "read_bookings", "read_analytics"],
    knowledge: ["commercial", "pricing"],
    permissions: "Read-only; report only.",
    output: "Unit economics + profitability report.",
    escalation: "Escalate financial anomalies to the founder.",
    successMetrics: ["metric accuracy", "profitability insight"],
  },

  // AI lab (Master OS §26)
  {
    name: "ai-lab",
    department: "AI Lab",
    objective: "Continuously discover new AI capabilities, models, automations, agent architectures, customer experiences, business models, distribution and revenue streams.",
    scope: "Experimentation ledger and monthly review.",
    tools: ["llm", "read_knowledge"],
    knowledge: ["strategy", "brand"],
    permissions: "Recommend experiments; no production changes without approval.",
    output: "Experiment ledger, monthly prompt.",
    escalation: "Escalate promising experiments to the founder.",
    successMetrics: ["experiment throughput", "adopted wins"],
  },
];

// ─── Registry accessors ─────────────────────────────────────────────────────

export function getAgent(name: string): AgentSpec | undefined {
  return KIVARA_AGENTS.find((a) => a.name === name);
}

export function getAllAgents(): AgentSpec[] {
  return KIVARA_AGENTS;
}

export function getAgentsByDepartment(department: string): AgentSpec[] {
  return KIVARA_AGENTS.filter((a) => a.department === department);
}

export function registerAgent(spec: AgentSpec): AgentSpec[] {
  const existing = KIVARA_AGENTS.findIndex((a) => a.name === spec.name);
  if (existing >= 0) {
    KIVARA_AGENTS[existing] = spec;
  } else {
    KIVARA_AGENTS.push(spec);
  }
  return KIVARA_AGENTS;
}

export const agentRegistry = {
  get: getAgent,
  all: getAllAgents,
  byDepartment: getAgentsByDepartment,
  register: registerAgent,
};
