import { handleGetList, handleCreate } from "@/lib/api-helpers";
import { NextRequest } from "next/server";
import { registerConciergeRequest } from "@/lib/pipeline/register";

export async function GET(request: NextRequest) {
  return handleGetList("concierge_requests", request);
}

export async function POST(request: Request) {
  const body = await request.json();
  const response = await handleCreate("concierge_requests", body, request);

  // A raised concierge request is a guest-facing flow step: close the loop by
  // registering it on the event bus. Never fatal — the 201 from handleCreate
  // stands even if the event write fails.
  if (response.status === 201) {
    try {
      const created = await response.clone().json();
      if (created?.id) {
        const result = await registerConciergeRequest(created.id);
        if (!result.registered && result.error) {
          console.warn("registerConciergeRequest:", result.error);
        }
      }
    } catch (err: unknown) {
      console.warn("registerConciergeRequest: could not read created row", err);
    }
  }

  return response;
}
