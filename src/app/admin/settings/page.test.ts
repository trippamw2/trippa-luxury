import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Render-free guard for the "Guest portal access" card.
 *
 * The card is the only place an operator can trigger the backfill, and the
 * danger is wiring: provisioning must stay an explicit, single click against
 * the admin endpoint - never an effect that runs on page load, and never a
 * silent retry loop. Those are properties of the source, so they are asserted
 * against the source rather than by rendering the page.
 */

const SETTINGS_PAGE = join(
  process.cwd(),
  "src",
  "app",
  "admin",
  "settings",
  "page.tsx",
);

const BACKFILL_ENDPOINT = "/api/admin/guest-portal/backfill";

describe("admin settings: guest portal access card", () => {
  const source = readFileSync(SETTINGS_PAGE, "utf8");

  it("renders the card with a Run backfill button", () => {
    expect(source).toContain("Guest portal access");
    expect(source).toContain("Run backfill");
    expect(source).toContain("onClick={runGuestPortalBackfill}");
    // Disabled while running, so a second click cannot start a parallel run.
    expect(source).toContain("disabled={backfillRunning}");
    expect(source).toContain('"Running..."');
  });

  it("posts once to the admin backfill endpoint from the click handler", () => {
    const callSite = `fetch("${BACKFILL_ENDPOINT}", { method: "POST" })`;
    expect(source).toContain(callSite);
    // Exactly one call site: nothing else in the page may reach the endpoint,
    // so it can never fire on mount or after a render.
    expect(source.match(new RegExp(`"${BACKFILL_ENDPOINT}"`, "g"))?.length).toBe(1);

    const handlerStart = source.indexOf("async function runGuestPortalBackfill");
    expect(handlerStart).toBeGreaterThan(-1);
    const handlerEnd = source.indexOf("// Load from API on mount", handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);
    expect(handler).toContain(BACKFILL_ENDPOINT);
  });

  it("renders the summary counts, collapsible failures and the error state", () => {
    for (const count of ["attempted", "created", "skipped", "failed"]) {
      expect(source).toContain(`backfillResult.${count}`);
    }
    // Failure emails and their reasons live inside a collapsible <details>.
    expect(source).toContain("<details");
    expect(source).toContain("backfillResult.failures.map");
    expect(source).toContain("failure.email");
    expect(source).toContain("failure.reason");
    // Inline error branch for 401/403/500/network failures.
    expect(source).toContain("backfillError");
    expect(source).toContain('"Backfill failed"');
  });
});
