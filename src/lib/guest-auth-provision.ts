// ─── Guest auth provisioning ─────────────────────────────────────────────
// Server-side helper that makes sure a guest has a Supabase auth user.
//
// The guest portal signs a guest in with a magic link / OTP. That flow
// deliberately never creates users (`shouldCreateUser: false` in
// src/lib/guest-auth.ts): it only signs in addresses that already exist, so
// the login form can neither mint an account nor be used to enumerate who
// booked a trip.
//
// This module is the other half. It provisions the auth user from the
// *booking* side (payment settlement, admin booking writes, the backfill
// runner), long before the guest ever reaches the login page.
//
// Guarantees:
//   - Idempotent. An existing auth user for the address is never touched; a
//     repeat call reports `skipped`.
//   - Never throws. Every failure comes back in the result (`failed: true`)
//     and is logged, so a payment webhook or an admin route is never broken
//     by provisioning.
//   - Creates nothing but the auth user: no staff / `admin_profiles` row, and
//     no email is ever sent. The guest still receives their magic link from
//     the portal's own OTP flow.

import { normalizeEmail } from "@/lib/email-consent";
import { createAdminClient } from "@/lib/supabase/admin";

export type GuestAuthProvisionResult = {
  /** A new auth user was created for this address. */
  created: boolean;
  /** Nothing was created: the address is invalid, or the user already exists. */
  skipped: boolean;
  /** The attempt failed; `reason` carries the message. */
  failed: boolean;
  /** Machine-readable detail: "invalid_email", "creation_cap", or an error message. */
  reason?: string;
};

/** The slice of a Supabase auth user this helper cares about. */
export type GuestAuthUserSummary = {
  email?: string | null;
};

/**
 * The shape `listUsers` may answer with.
 *
 * Both the flattened seam shape (`{ users, error }`) and the raw Supabase
 * response shape (`{ data: { users }, error }`) are accepted, so a test double
 * can be written either way.
 */
export type GuestAuthListUsersPage = {
  users?: GuestAuthUserSummary[] | null;
  data?: { users?: GuestAuthUserSummary[] | null } | null;
  error?: { message?: string } | string | null;
};

/** The attributes this helper creates a guest with. */
export type GuestAuthCreateAttributes = {
  email: string;
  email_confirm: boolean;
  user_metadata: { guest: boolean; provisioned_at: string };
};

/** The shape `createUser` may answer with (flattened or raw Supabase shape). */
export type GuestAuthCreateResult = {
  error?: { message?: string } | string | null;
};

/**
 * The two server-side calls this helper makes. Injecting them keeps the
 * helper unit-testable without a network; the defaults are the real admin
 * client calls.
 */
export type GuestAuthProvisionDeps = {
  listUsers: (params: { page: number; perPage: number }) => Promise<GuestAuthListUsersPage>;
  createUser: (attributes: GuestAuthCreateAttributes) => Promise<GuestAuthCreateResult>;
};

/** Supabase's maximum page size for `auth.admin.listUsers`. */
const PER_PAGE = 1000;

/** At most three pages are scanned for an existing user (3 000 users). */
const MAX_PAGES = 3;

/**
 * Creation budget - the backfill safety net.
 *
 * A guest is provisioned from several places (payment settlement, admin
 * booking writes, the backfill runner), and the backfill runner walks up to
 * 500 booking addresses in one request. The budget bounds how many auth users
 * one process may create inside one window, so a runaway loop can never mint
 * an unbounded number of accounts.
 *
 * The window (rather than a permanent counter) is deliberate: a permanent
 * counter would wedge provisioning forever in a long-lived process (`next
 * start`, or a warm serverless instance) after the first 50 guests, and a
 * re-run of the backfill could never make progress. With a window, each
 * window allows 50 creations and the next window allows 50 more, so an
 * operator can simply re-run the backfill to continue.
 */
const MAX_CREATIONS_PER_WINDOW = 50;
const CREATION_WINDOW_MS = 60_000;

let creationWindow: { startedAt: number; created: number } = {
  startedAt: 0,
  created: 0,
};

/**
 * Clear the creation budget. A bulk runner may call this at the start of its
 * run to get a fresh window; tests use it to stay independent of each other.
 */
export function resetGuestAuthProvisionBudget(): void {
  creationWindow = { startedAt: 0, created: 0 };
}

/** Creations recorded in the current window, rolling the window if it expired. */
function creationsInCurrentWindow(): number {
  const now = Date.now();
  if (now - creationWindow.startedAt >= CREATION_WINDOW_MS) {
    creationWindow = { startedAt: now, created: 0 };
  }
  return creationWindow.created;
}

/** True when this window's creation budget is used up. */
function creationBudgetExhausted(): boolean {
  return creationsInCurrentWindow() >= MAX_CREATIONS_PER_WINDOW;
}

/** Record one successful creation against the current window. */
function recordCreation(): void {
  creationsInCurrentWindow();
  creationWindow.created += 1;
}

/** The repo's email shape, used by the inquiry and newsletter routes too. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the normalized address is a plausible email address. */
function isValidEmail(email: string): boolean {
  return email.length > 0 && EMAIL_PATTERN.test(email);
}

/** Read the user list out of either accepted response shape. */
function readUsers(page: GuestAuthListUsersPage | undefined | null): GuestAuthUserSummary[] {
  if (Array.isArray(page?.users)) return page.users;
  const nested = page?.data?.users;
  return Array.isArray(nested) ? nested : [];
}

/** Read the error out of either accepted response shape. */
function readError(
  page: GuestAuthListUsersPage | undefined | null,
): { message: string } | null {
  const error = page?.error;
  if (!error) return null;
  if (typeof error === "string") return { message: error };
  return { message: error.message ?? "unknown_error" };
}

/** The admin client, created lazily so env is read at first use and not at module load. */
function createDefaultDeps(): GuestAuthProvisionDeps {
  let client: ReturnType<typeof createAdminClient> | null = null;
  const getClient = (): ReturnType<typeof createAdminClient> => {
    if (!client) client = createAdminClient();
    return client;
  };

  return {
    listUsers: async (params) => {
      const { data, error } = await getClient().auth.admin.listUsers(params);
      return {
        users: data?.users ?? [],
        error: error ? { message: error.message } : null,
      };
    },
    createUser: async (attributes) => {
      const { error } = await getClient().auth.admin.createUser(attributes);
      return { error: error ? { message: error.message } : null };
    },
  };
}

/** Merge injected seams over the real admin client calls. */
function resolveDeps(deps?: Partial<GuestAuthProvisionDeps>): GuestAuthProvisionDeps {
  const fallback = createDefaultDeps();
  return {
    listUsers: deps?.listUsers ?? fallback.listUsers,
    createUser: deps?.createUser ?? fallback.createUser,
  };
}

/**
 * Look for an existing auth user with this address.
 *
 * `listUsers` has no server-side email filter, so the pages are scanned here.
 * At most `MAX_PAGES` pages are read; a short page ends the scan because there
 * is nothing behind it.
 */
async function findExistingUser(
  listUsers: GuestAuthProvisionDeps["listUsers"],
  email: string,
): Promise<{ found: boolean; error: { message: string } | null }> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await listUsers({ page, perPage: PER_PAGE });
    const error = readError(response);
    if (error) return { found: false, error };

    const users = readUsers(response);
    const match = users.find((user) => normalizeEmail(user.email) === email);
    if (match) return { found: true, error: null };
    if (users.length < PER_PAGE) break;
  }

  return { found: false, error: null };
}

/**
 * Make sure a Supabase auth user exists for `email`.
 *
 * Idempotent: an existing user is reported as `skipped`, an absent one is
 * created and reported as `created`. An invalid address is `skipped` with the
 * reason `invalid_email`. A failure is `failed` with the reason, and the
 * promise NEVER rejects - callers (a payment webhook, an admin route, the
 * backfill runner) are never broken by provisioning.
 *
 * @param email The guest's address. Normalized (trimmed, lowercased) before use.
 * @param deps  Optional test seams. Defaults to the real admin client calls.
 */
export async function ensureGuestAuthUser(
  email: string,
  deps?: Partial<GuestAuthProvisionDeps>,
): Promise<GuestAuthProvisionResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { created: false, skipped: true, failed: false, reason: "invalid_email" };
  }

  try {
    const { listUsers, createUser } = resolveDeps(deps);

    const existing = await findExistingUser(listUsers, normalized);
    if (existing.error) {
      console.error(
        "[guest-auth-provision] could not read existing users:",
        existing.error.message,
      );
      return { created: false, skipped: false, failed: true, reason: existing.error.message };
    }
    if (existing.found) {
      return { created: false, skipped: true, failed: false };
    }

    // The budget governs creations only: an address that already has a user
    // is always reported as `skipped`, never as capped.
    if (creationBudgetExhausted()) {
      console.error(
        `[guest-auth-provision] creation budget of ${MAX_CREATIONS_PER_WINDOW} per ${CREATION_WINDOW_MS}ms reached; not creating ${normalized}`,
      );
      return { created: false, skipped: false, failed: false, reason: "creation_cap" };
    }

    const { error } = await createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: { guest: true, provisioned_at: new Date().toISOString() },
    });

    const createError = readError({ error });
    if (createError) {
      console.error("[guest-auth-provision] could not create the user:", createError.message);
      return { created: false, skipped: false, failed: true, reason: createError.message };
    }

    recordCreation();
    return { created: true, skipped: false, failed: false };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    console.error("[guest-auth-provision] provisioning failed:", err);
    return { created: false, skipped: false, failed: true, reason };
  }
}
