import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Render-free guard for the guest portal login copy.
 *
 * The OTP flow answers the same way whether or not a booking exists for the
 * address, so the page must not confirm that a code was sent. This asserts the
 * generic success copy stays in place (and the previous "we've sent a code to
 * <email>" wording does not come back), while the error rendering and the
 * two-step flow are left intact.
 */

const LOGIN_PAGE = join(
  process.cwd(),
  "src",
  "app",
  "(guest-portal)",
  "portal",
  "login",
  "page.tsx",
);

const GENERIC_SUCCESS_COPY =
  "If a booking exists for this email, your code is on its way.";

describe("guest portal login page", () => {
  const source = readFileSync(LOGIN_PAGE, "utf8");

  it("uses the generic anti-enumeration success copy in the OTP step", () => {
    expect(source).toContain(GENERIC_SUCCESS_COPY);
    expect(source.match(/If a booking exists for this email/g)?.length).toBe(1);

    const otpStepStart = source.indexOf("Check Your Email");
    const otpStepEnd = source.indexOf("Verification Code", otpStepStart);
    expect(otpStepStart).toBeGreaterThan(-1);
    expect(source.slice(otpStepStart, otpStepEnd)).toContain(GENERIC_SUCCESS_COPY);

    // The address-confirming wording must not come back: it would tell a
    // stranger whether the email they typed belongs to a booking.
    expect(source).not.toContain("We&apos;ve sent a 6-digit code");
    expect(source).not.toContain("code to <strong");
  });

  it("keeps the existing error rendering and two-step flow", () => {
    expect(source).toContain('setStep("otp")');
    expect(source).toContain('setStep("email")');
    expect(source).toContain("setError(json.error || \"Failed to send verification code\")");
    expect(source).toContain("setError(json.error || \"Invalid code. Please try again.\")");
    expect(source.match(/\{error && <p className="text-sm text-red-600">\{error\}<\/p>\}/g)?.length).toBe(2);
  });
});
