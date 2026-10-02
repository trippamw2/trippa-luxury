// PayPal webhook signature verification.
//
// WHY THIS EXISTS
// A webhook is unauthenticated by nature: anyone can POST to its URL. PayPal
// signs every notification precisely so the receiver can prove the message came
// from PayPal, and it must be verified BEFORE the event is trusted. Skipping it
// means anyone who learns the endpoint URL can mark their own booking paid.
//
// THE ALGORITHM (per PayPal's "Integrate webhooks" documentation)
//   1. Reconstruct the signed message:
//        transmissionId | transmissionTime | webhookId | crc32(rawBody)
//      where crc32 is the CRC32 of the ORIGINAL raw body in decimal form.
//      Parsing the body to an object and re-serialising it breaks verification.
//   2. Download the X.509 certificate from `paypal-cert-url` and cache it.
//   3. Verify `paypal-transmission-sig` (base64) against that message using the
//      certificate's public key.
//
// Both steps matter. Verifying only the webhook-id compares a value the attacker
// chooses the value of, so it proves nothing.

import { createVerify, X509Certificate } from "node:crypto";
import { crc32 } from "node:zlib";

export interface PayPalSignatureHeaders {
  authAlgo: string | null;
  certUrl: string | null;
  transmissionSig: string | null;
  transmissionId: string | null;
  transmissionTime: string | null;
  webhookId: string | null;
}

/** Read the six headers PayPal sends, case-insensitively. */
export function readPayPalHeaders(headers: Headers): PayPalSignatureHeaders {
  const get = (name: string) => headers.get(name);
  return {
    authAlgo: get("paypal-auth-algo"),
    certUrl: get("paypal-cert-url"),
    transmissionSig: get("paypal-transmission-sig"),
    transmissionId: get("paypal-transmission-id"),
    transmissionTime: get("paypal-transmission-time"),
    webhookId: get("paypal-webhook-id"),
  };
}

export type SignatureFailure =
  | "missing-headers"
  | "webhook-id-mismatch"
  | "untrusted-cert-url"
  | "unsupported-algorithm"
  | "cert-fetch-failed"
  | "bad-certificate"
  | "bad-signature";

export type SignatureOutcome =
  | { verified: true }
  | { verified: false; reason: SignatureFailure; detail?: string };

/**
 * Rebuild the exact string PayPal signed.
 *
 * The CRC32 is over the raw body bytes and rendered in DECIMAL, not hex. Using
 * the parsed-and-restringified body is the single most common reason this check
 * fails, so `rawBody` must be the untouched request text.
 */
export function buildSignedMessage(
  headers: PayPalSignatureHeaders,
  rawBody: string,
  configuredWebhookId: string
): string {
  const checksum = crc32(Buffer.from(rawBody, "utf8"));
  return `${headers.transmissionId}|${headers.transmissionTime}|${configuredWebhookId}|${checksum}`;
}

/**
 * Only fetch certificates from PayPal.
 *
 * `certUrl` arrives in a request header, so fetching it unvalidated would hand
 * an attacker an SSRF primitive against whatever the app can reach internally.
 */
export function isTrustedCertUrl(certUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(certUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return host === "paypal.com" || host.endsWith(".paypal.com");
}

const CERT_TTL_MS = 60 * 60 * 1000;
const certCache = new Map<string, { pem: string; expiresAt: number }>();

type FetchCert = (certUrl: string) => Promise<string>;

const defaultFetchCert: FetchCert = async (certUrl) => {
  const res = await fetch(certUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`certificate fetch returned ${res.status}`);
  return res.text();
};

/** Exported for tests, which must not depend on cache state. */
export function clearCertificateCache(): void {
  certCache.clear();
}

async function loadCertificate(
  certUrl: string,
  fetchCert: FetchCert
): Promise<string> {
  const cached = certCache.get(certUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.pem;

  const pem = await fetchCert(certUrl);
  certCache.set(certUrl, { pem, expiresAt: Date.now() + CERT_TTL_MS });
  return pem;
}

/**
 * Verify the signature against an already-resolved public key.
 *
 * Split out from certificate fetching so the cryptography can be tested against
 * a real keypair and a real signature. A verifier that is only ever exercised by
 * "returns false" is indistinguishable from one that is simply broken.
 */
export function verifySignatureAgainstPublicKey(
  headers: PayPalSignatureHeaders,
  rawBody: string,
  configuredWebhookId: string,
  publicKeyPem: string
): SignatureOutcome {
  const message = buildSignedMessage(headers, rawBody, configuredWebhookId);
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    verifier.end();
    const valid = verifier.verify(publicKeyPem, Buffer.from(headers.transmissionSig ?? "", "base64"));
    return valid ? { verified: true } : { verified: false, reason: "bad-signature" };
  } catch (cause) {
    return {
      verified: false,
      reason: "bad-signature",
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/**
 * Verify a PayPal notification. Fails closed: every failure path returns
 * `verified: false` rather than throwing, so a caller cannot accidentally treat
 * an error as success.
 */
export async function verifyPayPalSignature(
  headers: PayPalSignatureHeaders,
  rawBody: string,
  configuredWebhookId: string,
  fetchCert: FetchCert = defaultFetchCert
): Promise<SignatureOutcome> {
  if (
    !headers.authAlgo ||
    !headers.certUrl ||
    !headers.transmissionSig ||
    !headers.transmissionId ||
    !headers.transmissionTime
  ) {
    return { verified: false, reason: "missing-headers" };
  }

  if (!configuredWebhookId) {
    return { verified: false, reason: "missing-headers", detail: "PAYPAL_WEBHOOK_ID is not configured" };
  }

  // The header is attacker-controlled, so a mismatch is a signal, not a proof.
  if (headers.webhookId && headers.webhookId !== configuredWebhookId) {
    return { verified: false, reason: "webhook-id-mismatch" };
  }

  if (!isTrustedCertUrl(headers.certUrl)) {
    return { verified: false, reason: "untrusted-cert-url" };
  }

  // PayPal signs with RSA-SHA256. Anything else is rejected rather than passed
  // to the verifier, so a weakened algorithm cannot be negotiated down.
  if (headers.authAlgo !== "SHA256withRSA") {
    return {
      verified: false,
      reason: "unsupported-algorithm",
      detail: headers.authAlgo,
    };
  }

  let pem: string;
  try {
    pem = await loadCertificate(headers.certUrl, fetchCert);
  } catch (cause) {
    return {
      verified: false,
      reason: "cert-fetch-failed",
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }

  let publicKey: string;
  try {
    publicKey = new X509Certificate(pem).publicKey.export({
      type: "spki",
      format: "pem",
    }) as string;
  } catch (cause) {
    return {
      verified: false,
      reason: "bad-certificate",
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }

  return verifySignatureAgainstPublicKey(headers, rawBody, configuredWebhookId, publicKey);
}
