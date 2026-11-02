import { NextRequest } from "next/server";
import { handleGetList, handleCreate } from "@/lib/api-helpers";
import { ensureGuestAuthUser } from "@/lib/guest-auth-provision";

const TABLE = "bookings";

/**
 * The guest's address from a booking payload, or null when it carries none.
 *
 * The admin editor posts `client_email` (snake_case, the column name);
 * `clientEmail` is accepted too, because the generic admin helpers accept
 * both spellings. A booking without an address has no guest to provision.
 */
function readClientEmail(body: Record<string, unknown>): string | null {
  const raw = body.client_email ?? body.clientEmail;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  return handleGetList(TABLE, request, { orderBy: { column: "created_at", direction: "desc" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await handleCreate(TABLE, body, request);

  // Guest portal access: the booking is where the guest's address enters the
  // system, so the portal's auth user is provisioned from the booking side.
  // The portal's own login flow never creates users (it only signs in
  // addresses that already exist), so this is the only place a guest can be
  // given portal access.
  //
  // Only a successful create provisions, and the call is isolated: the helper
  // never throws, and the try/catch makes sure of it. A provisioning problem
  // must never turn a created booking into a failed request.
  if (result.status === 201) {
    const email = readClientEmail(body);
    if (email) {
      try {
        const outcome = await ensureGuestAuthUser(email);
        if (outcome.failed) {
          console.error(
            `Guest portal provisioning failed for ${email}: ${outcome.reason ?? "unknown_error"}`
          );
        } else {
          console.log(
            `Guest portal provisioning for ${email}: ${outcome.created ? "created" : "skipped"}`
          );
        }
      } catch (err) {
        console.error(`Guest portal provisioning error for ${email}:`, err);
      }
    }
  }

  return result;
}
