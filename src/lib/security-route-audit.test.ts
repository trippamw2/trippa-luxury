import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Structural guard: a public route may not send email, write to the database,
 * or reach for the service-role client unless it either authenticates the
 * caller or is an explicitly justified exception.
 *
 * Three real routes shipped open by accident (two mail relays, plus a booking
 * lifecycle endpoint that hard-deleted rows via the service-role client). None
 * had a test, so nothing failed when they were found. This test is that missing
 * net: the next one breaks the build instead of production.
 */

const API_ROOT = join(process.cwd(), "src", "app", "api");

/** Capabilities that must never be reachable from an unauthenticated caller. */
const CAPABILITIES: { name: string; pattern: RegExp }[] = [
  { name: "sends email", pattern: /\bsendEmail\s*\(/ },
  { name: "writes to the database", pattern: /\.(insert|update|upsert|delete)\s*\(/ },
  { name: "uses the service-role client", pattern: /\bcreateAdminClient\b/ },
];

/** Markers that show a route decides who the caller is. */
const GUARDS: { name: string; pattern: RegExp }[] = [
  { name: "requireAdmin", pattern: /\brequireAdmin\b/ },
  { name: "getUser", pattern: /\.auth\.getUser\s*\(/ },
  { name: "getSession", pattern: /\.auth\.getSession\s*\(/ },
  { name: "CRON_SECRET", pattern: /\bCRON_SECRET\b/ },
  { name: "ADMIN_SEED_SECRET", pattern: /\bADMIN_SEED_SECRET\b/ },
  { name: "PayPal signature verification", pattern: /\bverifyPayPalSignature\b/ },
];

/**
 * Most admin routes authorise through the shared handlers in `@/lib/api-helpers`
 * rather than calling `requireAdmin` themselves. Recognising the wrapper keeps
 * this test from crying wolf on 30 correctly-guarded routes.
 */
const API_HELPER_HANDLERS = [
  "handleGetList",
  "handleGetOne",
  "handleCreate",
  "handleUpdate",
  "handleDelete",
];

function callsSharedAdminHandler(source: string): boolean {
  return (
    /from\s+"@\/lib\/api-helpers"/.test(source) &&
    API_HELPER_HANDLERS.some((h) => new RegExp(`\\b${h}\\s*\\(`).test(source))
  );
}

/** True when the route makes an authorization decision, directly or via a wrapper. */
function isGuarded(source: string): boolean {
  return GUARDS.some((g) => g.pattern.test(source)) || callsSharedAdminHandler(source);
}

/**
 * Public routes that are deliberately reachable without a session, each with the
 * reason it is safe. Adding an entry here is a security decision, so the reason
 * is required rather than optional.
 */
const JUSTIFIED_EXCEPTIONS: Record<string, string> = {
  "inquiry": "Public contact form. Writes only the inquiry row and emails the concierge; abuse is bounded by rate limiting, not by secrecy.",
  "newsletter": "Public signup. Writes one subscriber row and sends a confirmation; nothing is read back or disclosed.",
  "payment/paypal/execute": "PayPal's own return leg. Unauthenticated by design, but every booking change requires a verified capture whose amount and order binding match the booking.",
  "payment/paypal/webhook": "PayPal server-to-server. Unauthenticated by design, but the notification is rejected unless the RSA-SHA256 signature verifies against PayPal's certificate.",
};

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...routeFiles(full));
    } else if (entry === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

/** `payment/paypal/execute`, using forward slashes on every platform. */
function routeKey(root: string, file: string): string {
  return relative(root, file)
    .replace(/[\\/]route\.ts$/, "")
    .split(sep)
    .join("/");
}

describe("public API routes are authenticated or justified", () => {
  const publicRoutes = routeFiles(API_ROOT)
    .map((file) => ({ file, key: routeKey(API_ROOT, file) }))
    .filter(({ key }) => !key.startsWith("admin/") && !key.startsWith("cron/"));

  it("finds the public routes to check", () => {
    // Guards against a broken path silently checking nothing at all.
    expect(publicRoutes.length).toBeGreaterThan(10);
  });

  it("has a reason recorded for every justified exception", () => {
    for (const key of Object.keys(JUSTIFIED_EXCEPTIONS)) {
      expect(
        JUSTIFIED_EXCEPTIONS[key]?.length ?? 0,
        `exception "${key}" needs a written justification`
      ).toBeGreaterThan(20);
    }
  });

  const offenders: string[] = [];
  for (const { file, key } of publicRoutes) {
    const source = readFileSync(file, "utf8");
    const capabilities = CAPABILITIES.filter((c) => c.pattern.test(source)).map((c) => c.name);
    if (capabilities.length === 0) continue;

    if (!isGuarded(source) && !JUSTIFIED_EXCEPTIONS[key]) {
      offenders.push(
        `src/app/api/${key}.ts ${capabilities.join(" + ")} with no authentication and no recorded exception`
      );
    }
  }

  it("guards every public route that can send email, write, or use the admin client", () => {
    expect(offenders).toEqual([]);
  });

  it("does not list an exception for a route that no longer exists", () => {
    const keys = new Set(publicRoutes.map((r) => r.key));
    const stale = Object.keys(JUSTIFIED_EXCEPTIONS).filter((k) => !keys.has(k));
    expect(stale, "remove justifications for deleted routes").toEqual([]);
  });
});

describe("admin and cron routes keep their guards", () => {
  /**
   * The two admin routes that establish identity rather than consume it, and so
   * cannot require an existing session.
   */
  const ADMIN_IDENTITY_ROUTES = new Set([
    "admin/auth/login", // the login endpoint itself
    "admin/seed", // first-admin bootstrap, gated on ADMIN_SEED_SECRET
  ]);

  it("every admin route authorises its caller", () => {
    const adminRoutes = routeFiles(API_ROOT)
      .map((file) => ({ file, key: routeKey(API_ROOT, file) }))
      .filter(({ key }) => key.startsWith("admin/"));

    expect(adminRoutes.length).toBeGreaterThan(50);

    const unguarded = adminRoutes
      .filter(({ file }) => !isGuarded(readFileSync(file, "utf8")))
      .map(({ key }) => `src/app/api/${key}.ts`)
      .filter((path) => !ADMIN_IDENTITY_ROUTES.has(path.replace("src/app/api/", "").replace(/\.ts$/, "")));

    expect(unguarded).toEqual([]);
  });

  it("anchors the shared admin handlers in requireAdmin", () => {
    // The wrapper is what most admin routes rely on, so the guarantee belongs
    // here: if someone drops the requireAdmin call from a handler, every admin
    // route using it is exposed at once.
    const helpers = readFileSync(join(process.cwd(), "src", "lib", "api-helpers.ts"), "utf8");

    for (const handler of API_HELPER_HANDLERS) {
      const body = helpers.slice(helpers.indexOf(`export async function ${handler}`));
      const next = body.indexOf("export async function", 1);
      const scoped = next > 0 ? body.slice(0, next) : body;
      expect(
        /\brequireAdmin\s*\(/.test(scoped),
        `${handler} must call requireAdmin`
      ).toBe(true);
    }
  });

  it("every cron route checks a shared secret", () => {
    const cronRoutes = routeFiles(API_ROOT)
      .map((file) => ({ file, key: routeKey(API_ROOT, file) }))
      .filter(({ key }) => key.startsWith("cron/"));

    expect(cronRoutes.length).toBeGreaterThan(0);

    const unguarded = cronRoutes
      .filter(({ file }) => !/\bCRON_SECRET\b/.test(readFileSync(file, "utf8")))
      .map(({ key }) => `src/app/api/${key}.ts`);

    expect(unguarded).toEqual([]);
  });
});
