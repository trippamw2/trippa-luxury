import { NextRequest, NextResponse } from "next/server";
import { runKoraAudit } from "@/lib/ai/kora";

/**
 * POST /api/cron/kora-audit
 *
 * Scheduled KORA audit. The company periodically turns its attention on itself:
 * read the platform, detect where reality diverges from the constitution, file
 * the findings as evidence-backed gaps, and raise well-evidenced hypotheses.
 *
 * KORA never sends anything to a client, never spends money, and never approves
 * its own recommendations — see CAPABILITY_PERMISSIONS in lib/ai/autonomy-policy.
 * This endpoint therefore only ever files findings for a human to act on.
 *
 * Auth: Bearer token matching CRON_SECRET, identical to the other cron routes.
 *
 * Status codes, and why they differ:
 *   200 — the audit completed. This includes the case where KORA found nothing,
 *         and the case where its write was refused by the autonomy policy:
 *         being blocked is the governance layer working as designed, so paging
 *         an operator about it would train us to ignore the alert.
 *   500 — the audit itself is broken (unreadable platform, failed write). This
 *         is the case worth waking someone for, because a silent auditor is
 *         worse than no auditor.
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }

    if (authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await runKoraAudit();

    if (report.blockedReason) {
      return NextResponse.json({
        ok: false,
        blocked: true,
        reason: report.blockedReason,
        startedAt: report.startedAt,
        gapsDetected: report.gapsDetected,
        message:
          "KORA detected gaps but was not permitted to record them at the current autonomy level.",
      });
    }

    if (report.error) {
      return NextResponse.json({ ok: false, ...report }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      ...report,
      message:
        report.gapsDetected === 0
          ? "KORA audit complete: no gaps detected."
          : `KORA audit complete: ${report.gapsDetected} gap(s) recorded, ${report.hypothesesRaised} hypothesis(es) raised.`,
    });
  } catch (err: unknown) {
    // runKoraAudit is contracted never to throw, so reaching here means the
    // failure is in the route itself. Surface it rather than swallowing it.
    console.error("Cron: kora-audit error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
