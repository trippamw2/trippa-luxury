import { describe, it, expect, vi, beforeEach } from "vitest";

type MockClient = {
  auth: {
    signInWithOtp: ReturnType<typeof vi.fn>;
    verifyOtp: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
};

const mockClient: MockClient = {
  auth: {
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockClient,
}));

import {
  sendMagicLink,
  verifyOtp,
  getGuestSession,
  signOut,
} from "@/lib/guest-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendMagicLink", () => {
  it("returns success when the OTP email is sent", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({ error: null });
    await expect(sendMagicLink("guest@example.com")).resolves.toEqual({
      success: true,
    });
    expect(mockClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "guest@example.com",
      options: { shouldCreateUser: false },
    });
  });

  it("returns an error message when sign-in fails", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({ error: { message: "Invalid email" } });
    await expect(sendMagicLink("bad@example.com")).resolves.toEqual({
      success: false,
      error: "Invalid email",
    });
  });

  it("gracefully handles a thrown error", async () => {
    mockClient.auth.signInWithOtp.mockRejectedValue(new Error("Network down"));
    await expect(sendMagicLink("guest@example.com")).resolves.toEqual({
      success: false,
      error: "Network down",
    });
  });
});

describe("verifyOtp", () => {
  it("verifies a correct OTP", async () => {
    mockClient.auth.verifyOtp.mockResolvedValue({ error: null });
    await expect(verifyOtp("guest@example.com", "123456")).resolves.toEqual({
      success: true,
    });
    expect(mockClient.auth.verifyOtp).toHaveBeenCalledWith({
      email: "guest@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("returns an error for an incorrect OTP", async () => {
    mockClient.auth.verifyOtp.mockResolvedValue({ error: { message: "invalid token" } });
    await expect(verifyOtp("guest@example.com", "000000")).resolves.toEqual({
      success: false,
      error: "invalid token",
    });
  });

  it("gracefully handles a thrown error", async () => {
    mockClient.auth.verifyOtp.mockRejectedValue(new Error("boom"));
    await expect(verifyOtp("guest@example.com", "123456")).resolves.toEqual({
      success: false,
      error: "boom",
    });
  });
});

describe("getGuestSession", () => {
  it("returns authenticated with email when a session exists", async () => {
    mockClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { email: "guest@example.com" } } },
    });
    await expect(getGuestSession()).resolves.toEqual({
      authenticated: true,
      email: "guest@example.com",
    });
  });

  it("returns unauthenticated when there is no session", async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(getGuestSession()).resolves.toEqual({ authenticated: false });
  });

  it("returns unauthenticated when the user has no email", async () => {
    mockClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { email: undefined } } },
    });
    await expect(getGuestSession()).resolves.toEqual({ authenticated: false });
  });

  it("returns unauthenticated when getSession throws", async () => {
    mockClient.auth.getSession.mockRejectedValue(new Error("boom"));
    await expect(getGuestSession()).resolves.toEqual({ authenticated: false });
  });
});

describe("signOut", () => {
  it("signs the guest out without error", async () => {
    mockClient.auth.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });

  it("swallows errors silently", async () => {
    mockClient.auth.signOut.mockRejectedValue(new Error("boom"));
    await expect(signOut()).resolves.toBeUndefined();
  });
});
