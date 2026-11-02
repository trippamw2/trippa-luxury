/**
 * Guest auth provisioning.
 *
 * `ensureGuestAuthUser` is the server-side half of the guest portal: the
 * portal's OTP flow never creates users (anti-enumeration), so the auth user
 * is provisioned from the booking side instead. These tests drive the helper
 * through injected seams, so nothing here touches the network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminMock } = vi.hoisted(() => ({
  adminMock: { createAdminClient: vi.fn() },
}));

// The real admin client is replaced so the default (unseamed) path can be
// exercised without env vars or a network.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: adminMock.createAdminClient,
}));

import {
  ensureGuestAuthUser,
  resetGuestAuthProvisionBudget,
  type GuestAuthListUsersPage,
  type GuestAuthProvisionDeps,
  type GuestAuthProvisionResult,
} from "@/lib/guest-auth-provision";

type ListUsers = GuestAuthProvisionDeps["listUsers"];
type CreateUser = GuestAuthProvisionDeps["createUser"];

const NO_USERS: GuestAuthListUsersPage = { users: [], error: null };

/** A `listUsers` double that reports no user at all. */
function emptyListUsers() {
  return vi.fn<ListUsers>().mockResolvedValue(NO_USERS);
}

/** A `createUser` double that succeeds. */
function workingCreateUser() {
  return vi.fn<CreateUser>().mockResolvedValue({ error: null });
}

/** Silence (and capture) the helper's error logging for the duration of a test. */
function captureErrors() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

beforeEach(() => {
  vi.clearAllMocks();
  adminMock.createAdminClient.mockReset();
  resetGuestAuthProvisionBudget();
});

describe("ensureGuestAuthUser", () => {
  it("creates a guest auth user when the address is not registered yet", async () => {
    const listUsers = emptyListUsers();
    const createUser = workingCreateUser();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({ created: true, skipped: false, failed: false });
    expect(createUser).toHaveBeenCalledTimes(1);

    const attributes = createUser.mock.calls[0][0];
    expect(attributes.email).toBe("guest@example.com");
    expect(attributes.email_confirm).toBe(true);
    expect(attributes.user_metadata.guest).toBe(true);
    expect(attributes.user_metadata.provisioned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("normalizes the address before it creates the user", async () => {
    const listUsers = emptyListUsers();
    const createUser = workingCreateUser();

    await ensureGuestAuthUser("  Guest@Example.COM  ", { listUsers, createUser });

    expect(createUser.mock.calls[0][0].email).toBe("guest@example.com");
  });

  it("skips when a user already exists for the address", async () => {
    const listUsers = vi.fn<ListUsers>().mockResolvedValue({
      users: [{ email: "  Guest@Example.com " }],
      error: null,
    });
    const createUser = workingCreateUser();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({ created: false, skipped: true, failed: false });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("skips when the existing user arrives in the raw Supabase response shape", async () => {
    const listUsers = vi.fn<ListUsers>().mockResolvedValue({
      data: { users: [{ email: "guest@example.com" }] },
      error: null,
    });
    const createUser = workingCreateUser();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({ created: false, skipped: true, failed: false });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("keeps scanning pages until the address is found", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ email: `other${i}@example.com` }));
    const listUsers = vi
      .fn<ListUsers>()
      .mockResolvedValueOnce({ users: firstPage, error: null })
      .mockResolvedValueOnce({ users: [{ email: "guest@example.com" }], error: null });
    const createUser = workingCreateUser();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({ created: false, skipped: true, failed: false });
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(listUsers.mock.calls[0][0]).toEqual({ page: 1, perPage: 1000 });
    expect(listUsers.mock.calls[1][0]).toEqual({ page: 2, perPage: 1000 });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("reports a failure without throwing when the create call rejects", async () => {
    const listUsers = emptyListUsers();
    const createUser = vi.fn<CreateUser>().mockRejectedValue(new Error("auth service down"));
    const errors = captureErrors();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({
      created: false,
      skipped: false,
      failed: true,
      reason: "auth service down",
    });
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("reports a failure without throwing when the lookup rejects", async () => {
    const listUsers = vi.fn<ListUsers>().mockRejectedValue(new Error("lookup down"));
    const createUser = workingCreateUser();
    const errors = captureErrors();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({
      created: false,
      skipped: false,
      failed: true,
      reason: "lookup down",
    });
    expect(createUser).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("reports a failure without throwing when the admin client cannot be created", async () => {
    adminMock.createAdminClient.mockImplementation(() => {
      throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
    });
    const errors = captureErrors();

    await expect(ensureGuestAuthUser("guest@example.com")).resolves.toEqual({
      created: false,
      skipped: false,
      failed: true,
      reason: "Missing env: NEXT_PUBLIC_SUPABASE_URL",
    });
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("reports a failure when Supabase answers with an error instead of throwing", async () => {
    const listUsers = emptyListUsers();
    const createUser = vi.fn<CreateUser>().mockResolvedValue({ error: { message: "email taken" } });
    const errors = captureErrors();

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({
      created: false,
      skipped: false,
      failed: true,
      reason: "email taken",
    });
    errors.mockRestore();
  });

  it("skips an invalid address without touching Supabase", async () => {
    const listUsers = emptyListUsers();
    const createUser = workingCreateUser();

    for (const invalid of ["", "   ", "not-an-email", "guest@", "@example.com", "a b@example.com"]) {
      const result = await ensureGuestAuthUser(invalid, { listUsers, createUser });

      expect(result).toEqual({
        created: false,
        skipped: true,
        failed: false,
        reason: "invalid_email",
      });
    }

    expect(listUsers).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("stops creating after 50 creations and reports the cap", async () => {
    const listUsers = emptyListUsers();
    const createUser = workingCreateUser();
    const errors = captureErrors();

    const results: GuestAuthProvisionResult[] = [];
    for (let i = 0; i < 51; i++) {
      results.push(await ensureGuestAuthUser(`guest${i}@example.com`, { listUsers, createUser }));
    }

    expect(createUser).toHaveBeenCalledTimes(50);
    expect(results[49]).toEqual({ created: true, skipped: false, failed: false });
    expect(results[50]).toEqual({
      created: false,
      skipped: false,
      failed: false,
      reason: "creation_cap",
    });
    errors.mockRestore();
  });

  it("reports an existing user as skipped even when the creation budget is spent", async () => {
    const listUsers = vi.fn<ListUsers>().mockResolvedValue({
      users: [{ email: "guest@example.com" }],
      error: null,
    });
    const createUser = workingCreateUser();
    const errors = captureErrors();

    for (let i = 0; i < 50; i++) {
      await ensureGuestAuthUser(`guest${i}@example.com`, {
        listUsers: emptyListUsers(),
        createUser,
      });
    }

    const result = await ensureGuestAuthUser("guest@example.com", { listUsers, createUser });

    expect(result).toEqual({ created: false, skipped: true, failed: false });
    expect(createUser).toHaveBeenCalledTimes(50);
    errors.mockRestore();
  });
});
