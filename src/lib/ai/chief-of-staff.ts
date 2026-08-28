// ─── Kivara AI Chief of Staff ─────────────────────────────────────────────
// The coordination layer that sits above the individual AI agents. It
// aggregates operational signals from across the platform and produces:
//   1. A daily briefing (what the founder needs to know + act on today)
//   2. A weekly CEO review (what happened, what to change, highest-leverage next step)
//   3. Bottleneck detection
//
// It does not make consequential decisions — it prepares recommendations
// and routes them to the founder for approval (per the AI native operating
// system's Human-in-the-Loop policy).

import { createAdminClient } from "@/lib/supabase/admin";
import { getAllCustomerIntelligence } from "@/lib/ai/customer-intelligence";

// ─── Types ────────────────────────────────────────────────────────────────

export interface BriefingItem {
  id: string;
  type: "priority" | "customer" | "lead" | "decision" | "bottleneck" | "risk" | "opportunity";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  relatedId?: string;
  relatedType?: string;
  action?: "founder" | "delegate" | "monitor" | "approve";
  dueAt?: string;
}

export interface DailyBriefing {
  generatedAt: string;
  summary: string;
  items: BriefingItem[];
  today: {
    topPriorities: BriefingItem[];
    importantCustomers: BriefingItem[];
    highValueLeads: BriefingItem[];
    pendingDecisions: BriefingItem[];
    bottlenecks: BriefingItem[];
    risks: BriefingItem[];
    opportunities: BriefingItem[];
  };
  founder: {
    shouldDo: string[];
    shouldDelegate: string[];
    highestLeverageAction: string;
  };
}

export interface WeeklyReviewSection {
  heading: string;
  points: string[];
}

export interface WeeklyReview {
  generatedAt: string;
  weekLabel: string;
  sections: WeeklyReviewSection[];
  highestLeverageAction: string;
  metrics: {
    newInquiries: number;
    convertedInquiries: number;
    newBookings: number;
    revenue: number;
    openTasks: number;
    completedTasks: number;
    atRiskCustomers: number;
  };
}

// ─── Daily Briefing ───────────────────────────────────────────────────────

/**
 * Generate today's executive briefing by aggregating operational signals.
 */
export async function generateDailyBriefing(): Promise<DailyBriefing> {
  const supabase = createAdminClient();
  const now = new Date();
  const items: BriefingItem[] = [];

  // Parallel data collection across the platform
  const [
    customerIntelligence,
    openInquiriesResult,
    bookingsResult,
    tasksResult,
  ] = await Promise.all([
    getAllCustomerIntelligence(),
    supabase
      .from("inquiries")
      .select("id, full_name, email, status, assigned_to, created_at, sla_due_at")
      .in("status", ["new", "read", "contacted", "qualified"])
      .order("created_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, booking_reference, client_name, status, total_amount, guest_profile_id, created_at")
      .eq("status", "provisional")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("id, title, description, priority, status, due_date, assignee_id")
      .in("status", ["todo", "in_progress"])
      .order("priority", { ascending: false }),
  ]);

  const openInquiries = (openInquiriesResult.data || []) as Array<{
    id: string; full_name: string; email: string; status: string;
    assigned_to: string | null; created_at: string; sla_due_at: string | null;
  }>;
  const provisionalBookings = (bookingsResult.data || []) as Array<{
    id: string; booking_reference: string; client_name: string;
    status: string; total_amount: number; guest_profile_id: string; created_at: string;
  }>;
  const openTasks = (tasksResult.data || []) as Array<{
    id: string; title: string; description: string; priority: string;
    status: string; due_date: string | null; assignee_id: string | null;
  }>;

  // ── Priorities: urgent/high tasks due today or overdue ───────────────
  for (const task of openTasks) {
    const due = task.due_date ? new Date(task.due_date) : null;
    const isUrgent = task.priority === "urgent" || task.priority === "high";
    const overdue = due && due < now;
    const dueToday = due && due.toDateString() === now.toDateString();
    const isSlaRelevant = !task.assignee_id;
    const isUnassigned = !task.assignee_id;

    if (isUrgent && (overdue || dueToday || isUnassigned)) {
      items.push({
        id: `task-${task.id}`,
        type: "priority",
        severity: overdue ? "high" : "medium",
        title: task.title,
        detail: task.description || `${task.priority} priority task${overdue ? " (overdue)" : dueToday ? " (due today)" : ""}`,
        relatedId: task.id,
        relatedType: "task",
        action: "delegate",
        dueAt: task.due_date || undefined,
      });
    }
  }

  // ── Unassigned open inquiries = bottleneck ───────────────────────────
  const unassignedInquiries = openInquiries.filter(i => !i.assigned_to);
  const staleInquiries = openInquiries.filter(i => {
    const created = new Date(i.created_at);
    return (now.getTime() - created.getTime()) > 24 * 60 * 60 * 1000; // > 24h old
  });
  const pastSla = openInquiries.filter(i => {
    if (!i.sla_due_at) return false;
    return new Date(i.sla_due_at) < now;
  });

  for (const inquiry of unassignedInquiries.slice(0, 5)) {
    items.push({
      id: `inquiry-${inquiry.id}`,
      type: "bottleneck",
      severity: "high",
      title: `Unassigned inquiry from ${inquiry.full_name}`,
      detail: `Inquiry (${inquiry.status}) has no assigned concierge. Assign to prevent SLA breach.`,
      relatedId: inquiry.id,
      relatedType: "inquiry",
      action: "delegate",
    });
  }

  for (const inquiry of pastSla.slice(0, 5)) {
    items.push({
      id: `sla-${inquiry.id}`,
      type: "bottleneck",
      severity: "high",
      title: `SLA breached: ${inquiry.full_name}`,
      detail: "Inquiry passed its first-response SLA target. Respond now.",
      relatedId: inquiry.id,
      relatedType: "inquiry",
      action: "founder",
    });
  }

  if (staleInquiries.length > 0 && unassignedInquiries.length === 0 && pastSla.length === 0) {
    items.push({
      id: "bottleneck-stale",
      type: "bottleneck",
      severity: "low",
      title: `${staleInquiries.length} inquiries waiting over 24h`,
      detail: "Assigned inquiries may need follow-up to keep the pipeline moving.",
      action: "delegate",
    });
  }

  // ── Provisional bookings = decisions ─────────────────────────────────
  for (const booking of provisionalBookings.slice(0, 5)) {
    items.push({
      id: `booking-${booking.id}`,
      type: "decision",
      severity: "medium",
      title: `Provisional booking ${booking.booking_reference} — ${booking.client_name}`,
      detail: `Booking totalling $${(booking.total_amount || 0).toLocaleString()} awaits deposit/confirmation action.`,
      relatedId: booking.id,
      relatedType: "booking",
      action: "approve",
    });
  }

  // ── Intelligence-derived items (from CRM layer) ──────────────────────
  const hotLeads = customerIntelligence.customers.filter(c => c.leadTier === "hot");
  const atRiskCustomers = customerIntelligence.customers.filter(c => c.churnRisk > 0.5);
  const vipCustomers = customerIntelligence.customers.filter(c => c.isVip);

  for (const lead of hotLeads.slice(0, 5)) {
    items.push({
      id: `lead-${lead.id}`,
      type: "lead",
      severity: "high",
      title: `Hot lead: ${lead.fullName}`,
      detail: lead.nextAction,
      relatedId: lead.id,
      relatedType: "guest",
      action: "founder",
    });
  }

  for (const customer of atRiskCustomers.slice(0, 5)) {
    items.push({
      id: `risk-${customer.id}`,
      type: "risk",
      severity: customer.churnRisk > 0.7 ? "high" : "medium",
      title: `At-risk customer: ${customer.fullName}`,
      detail: customer.nextAction,
      relatedId: customer.id,
      relatedType: "guest",
      action: "delegate",
    });
  }

  for (const customer of vipCustomers.slice(0, 3)) {
    items.push({
      id: `vip-${customer.id}`,
      type: "customer",
      severity: "medium",
      title: `VIP: ${customer.fullName}`,
      detail: `VIP customer. ${customer.nextAction || "Maintain relationship."}`,
      relatedId: customer.id,
      relatedType: "guest",
      action: "delegate",
    });
  }

  // ── Opportunities ────────────────────────────────────────────────────
  if (customerIntelligence.customers.length > 0) {
    const healthyUpsell = customerIntelligence.customers.filter(
      c => c.engagementScore > 60 && c.totalBookings >= 1
    );
    if (healthyUpsell.length > 0) {
      items.push({
        id: "opportunity-upsell",
        type: "opportunity",
        severity: "medium",
        title: `${healthyUpsell.length} engaged customers ready for a new journey concept`,
        detail: "These customers have high engagement and past bookings — ideal upsell targets for a follow-up proposal.",
        action: "delegate",
      });
    }
  }

  // ── Structure the briefing ───────────────────────────────────────────
  const byType = {
    priority: items.filter(i => i.type === "priority"),
    customer: items.filter(i => i.type === "customer"),
    lead: items.filter(i => i.type === "lead"),
    decision: items.filter(i => i.type === "decision"),
    bottleneck: items.filter(i => i.type === "bottleneck"),
    risk: items.filter(i => i.type === "risk"),
    opportunity: items.filter(i => i.type === "opportunity"),
  };

  const highSeverity = items.filter(i => i.severity === "high");
  const founderItems = items.filter(i => i.action === "founder");

  const topPriorities = [
    ...byType.bottleneck.filter(i => i.severity === "high"),
    ...byType.lead,
    ...byType.priority.filter(i => i.severity === "high"),
  ].slice(0, 5);

  return {
    generatedAt: now.toISOString(),
    summary: highSeverity.length > 0
      ? `${highSeverity.length} high-priority item${highSeverity.length > 1 ? "s" : ""} need attention today. ${founderItems.length} require founder input.`
      : "No urgent items. The organisation is operating smoothly — focus on strategic growth.",
    items,
    today: {
      topPriorities,
      importantCustomers: byType.customer,
      highValueLeads: byType.lead,
      pendingDecisions: byType.decision,
      bottlenecks: byType.bottleneck,
      risks: byType.risk,
      opportunities: byType.opportunity,
    },
    founder: {
      shouldDo: founderItems.map(i => i.title).slice(0, 5),
      shouldDelegate: items.filter(i => i.action === "delegate").map(i => i.title).slice(0, 5),
      highestLeverageAction: founderItems[0]?.title
        || topPriorities[0]?.title
        || "No critical action — invest today in a strategic growth activity.",
    },
  };
}

// ─── Weekly CEO Review ────────────────────────────────────────────────────

/**
 * Generate the weekly CEO review: what happened, what worked, what failed,
 * and the single highest-leverage action for next week.
 */
export async function generateWeeklyReview(): Promise<WeeklyReview> {
  const supabase = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [inquiriesResult, bookingsResult, tasksResult, paymentsResult] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, status, created_at")
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("bookings")
      .select("id, status, total_amount, created_at, confirmed_at"),
    supabase
      .from("tasks")
      .select("id, status, completed_at, created_at"),
    supabase
      .from("payments")
      .select("id, amount, status, created_at")
      .gte("created_at", weekAgo.toISOString()),
  ]);

  const inquiries = (inquiriesResult.data || []) as Array<{ id: string; status: string; created_at: string }>;
  const bookings = (bookingsResult.data || []) as Array<{ id: string; status: string; total_amount: number; created_at: string; confirmed_at?: string }>;
  const tasks = (tasksResult.data || []) as Array<{ id: string; status: string; completed_at?: string; created_at: string }>;
  const payments = (paymentsResult.data || []) as Array<{ id: string; amount: number; status: string; created_at: string }>;

  const newInquiries = inquiries.length;
  const convertedInquiries = bookings.filter(b =>
    (b.created_at && new Date(b.created_at) >= weekAgo) ||
    (b.confirmed_at && new Date(b.confirmed_at) >= weekAgo)
  ).length;
  const completedTasks = tasks.filter(t => t.status === "done" && t.completed_at && new Date(t.completed_at) >= weekAgo).length;
  const openTasks = tasks.filter(t => t.status !== "done").length;
  const revenue = payments
    .filter(p => p.status === "succeeded" || p.status === "paid" || p.status === "completed")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const customerIntelligence = await getAllCustomerIntelligence();
  const atRiskCount = customerIntelligence.customers.filter(c => c.churnRisk > 0.5).length;

  const sections: WeeklyReviewSection[] = [
    {
      heading: "What happened this week?",
      points: [
        `${newInquiries} new inquiries received.`,
        `${convertedInquiries} converted into bookings${bookings.length > 0 ? ` (${bookings.filter(b => b.status !== "provisional").length} confirmed)` : ""}.`,
        `${completedTasks} tasks completed${openTasks > 0 ? `, ${openTasks} still open` : ""}.`,
        revenue > 0 ? `$${revenue.toLocaleString()} in received payments this week.` : "No payments received this week.",
      ],
    },
    {
      heading: "What worked?",
      points: [
        ...(convertedInquiries > 0 ? [`${convertedInquiries} inquiries advanced to booking — the conversion pipeline is working.`] : []),
        ...(completedTasks > 0 ? [`${completedTasks} tasks closed — operational throughput is healthy.`] : []),
        newInquiries === 0 ? "No new inquiries — consider whether lead generation needs attention." : `${newInquiries} new inquiries entering the funnel.`,
      ],
    },
    {
      heading: "What failed or needs attention?",
      points: [
        atRiskCount > 0 ? `${atRiskCount} customers flagged at risk of churn. Re-engagement plan recommended.` : "No customers currently at risk.",
        openTasks > 0 ? `${openTasks} tasks remain open — check for overdue or stalled work.` : "Task backlog is clear.",
        "Revenue/unit economics should be reviewed for each booking to confirm margins.",
      ],
    },
    {
      heading: "What should be automated or become an agent?",
      points: [
        "Inquiry first-response and qualification are well-suited to automation.",
        "Follow-up cadence on open proposals should be automated.",
        "Supplier coordination and documentation could be delegated to agents as volume grows.",
      ],
    },
    {
      heading: "What should remain human?",
      points: [
        "High-value relationship conversations and final proposal sign-off.",
        "Major supplier negotiations and partnerships.",
        "Any custom or exceptional journey design requests.",
      ],
    },
  ];

  const highestLeverageAction =
    atRiskCount > 0
      ? "Re-engage at-risk customers with a targeted win-back campaign."
      : convertedInquiries === 0
        ? "Follow up on all open inquiries to drive first conversions."
        : "Invest in the highest-margin journey type to grow repeat customers.";

  return {
    generatedAt: now.toISOString(),
    weekLabel: `${weekAgo.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}`,
    sections,
    highestLeverageAction,
    metrics: {
      newInquiries,
      convertedInquiries,
      newBookings: bookings.filter(b => new Date(b.created_at) >= weekAgo).length,
      revenue,
      openTasks,
      completedTasks,
      atRiskCustomers: atRiskCount,
    },
  };
}
