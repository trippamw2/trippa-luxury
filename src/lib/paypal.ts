// ─── Kivara PayPal Client ───────────────────────────────────────────────
// Server-side PayPal integration using PayPal REST API directly.
// Simpler and more reliable than the SDK for our use case.

export interface CreatePaymentParams {
  amount: string;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentResult {
  paymentId: string;
  approvalUrl: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  const secret = process.env.PAYPAL_CLIENT_SECRET || "";
  const base = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get PayPal access token");
  const data = await res.json();
  return data.access_token;
}

function getBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export class PayPalClient {
  /**
   * Create a PayPal payment and return the approval URL.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const token = await getAccessToken();
    const base = getBaseUrl();

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: params.currency,
              value: params.amount,
            },
            description: params.description,
            custom_id: params.returnUrl.split("bookingId=")[1]?.split("&")[0] || "",
          },
        ],
        application_context: {
          brand_name: "Kivara Luxury Travel",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create PayPal order");
    }

    const data = await res.json();
    const approvalLink = data.links?.find(
      (link: { rel: string; href: string }) => link.rel === "approve"
    );

    if (!approvalLink) {
      throw new Error("No approval link in PayPal response");
    }

    return {
      paymentId: data.id,
      approvalUrl: approvalLink.href,
    };
  }

  /**
   * Execute (capture) a PayPal payment after approval.
   */
  async executePayment(orderId: string): Promise<{ status: string; id: string }> {
    const token = await getAccessToken();
    const base = getBaseUrl();

    const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to capture PayPal order");
    }

    const data = await res.json();
    return {
      id: data.id,
      status: data.status || "COMPLETED",
    };
  }
}
