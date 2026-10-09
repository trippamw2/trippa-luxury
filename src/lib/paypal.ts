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

export interface PayPalCapture {
  id: string;
  status: string;
  currency: string;
  /** NaN when PayPal returned no readable amount: treat as unknown, not zero. */
  amount: number;
  /** custom_id of the captured order, used to bind the payment to a booking. */
  bookingReference: string | null;
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
          brand_name: "kivara.africa",
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
  /**
   * A verified capture: what PayPal actually took, in the booking's terms.
   *
   * `amount` is NaN when the capture response did not carry a readable amount.
   * Callers must treat NaN as "unknown, so do not confirm the booking" rather
   * than coercing it to 0.
   */
  async executePayment(orderId: string): Promise<PayPalCapture> {
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
    const unit = data.purchase_units?.[0];
    const capture = data.payments?.captures?.[0];
    const raw = capture?.amount?.value ?? unit?.amount?.value;

    return {
      // The capture id, not the order id: the webhook's
      // PAYMENT.CAPTURE.COMPLETED resource carries the capture id as
      // `resource.id`, so keying the payments ledger on the capture id keeps
      // execute and webhook writes to the same transaction idempotent.
      id: capture?.id ?? data.id,
      status: data.status || "COMPLETED",
      currency: capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? "",
      amount: typeof raw === "string" || typeof raw === "number" ? Number(raw) : Number.NaN,
      bookingReference: unit?.custom_id ?? null,
    };
  }
}
