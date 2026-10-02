import { beforeEach, describe, expect, it } from "vitest";
import { createSign, generateKeyPairSync } from "node:crypto";
import { crc32 } from "node:zlib";
import {
  buildSignedMessage,
  clearCertificateCache,
  isTrustedCertUrl,
  readPayPalHeaders,
  verifyPayPalSignature,
  verifySignatureAgainstPublicKey,
  type PayPalSignatureHeaders,
} from "@/lib/payments/paypal-signature";

// A self-signed pair standing in for PayPal's certificate, so the cryptography
// is exercised for real. A verifier that is only ever tested with "expect false"
// is indistinguishable from one that is simply broken.
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PRIVATE_PEM = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
const PUBLIC_PEM = publicKey.export({ type: "spki", format: "pem" }) as string;

const WEBHOOK_ID = "0NH55953DH663215D";
const RAW_BODY = JSON.stringify({
  id: "WH-1",
  event_type: "PAYMENT.CAPTURE.COMPLETED",
  resource: { custom_id: "bk-1" },
});

function sign(rawBody: string, headers: PayPalSignatureHeaders): string {
  const message = buildSignedMessage(headers, rawBody, WEBHOOK_ID);
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(PRIVATE_PEM, "base64");
}

function headersFor(rawBody: string, over: Partial<PayPalSignatureHeaders> = {}) {
  const base: PayPalSignatureHeaders = {
    authAlgo: "SHA256withRSA",
    certUrl: "https://api.paypal.com/v1/notifications/certs/CERT-abc123",
    transmissionId: "db49fb10-1343-11ef-ac58-e32457403f67",
    transmissionTime: "2026-01-14T05:19:23Z",
    webhookId: WEBHOOK_ID,
    transmissionSig: sign(rawBody, {
      authAlgo: "SHA256withRSA",
      certUrl: "https://api.paypal.com/v1/notifications/certs/CERT-abc123",
      transmissionId: "db49fb10-1343-11ef-ac58-e32457403f67",
      transmissionTime: "2026-01-14T05:19:23Z",
      webhookId: WEBHOOK_ID,
      transmissionSig: null,
    }),
  };
  return { ...base, ...over };
}

describe("signed message format", () => {
  it("is transmissionId|transmissionTime|webhookId|crc32-in-decimal", () => {
    const h = headersFor(RAW_BODY);
    const message = buildSignedMessage(h, RAW_BODY, WEBHOOK_ID);
    const expectedCrc = crc32(Buffer.from(RAW_BODY, "utf8"));

    expect(message).toBe(
      `${h.transmissionId}|${h.transmissionTime}|${WEBHOOK_ID}|${expectedCrc}`
    );
    // Decimal, not hex: "0x..." would silently fail against PayPal.
    expect(message.endsWith(`|${expectedCrc}`)).toBe(true);
    expect(message).not.toContain("0x");
  });

  it("changes the checksum when a single byte of the body changes", () => {
    const h = headersFor(RAW_BODY);
    const a = buildSignedMessage(h, RAW_BODY, WEBHOOK_ID);
    const b = buildSignedMessage(h, RAW_BODY.replace("bk-1", "bk-2"), WEBHOOK_ID);
    expect(a).not.toBe(b);
  });
});

describe("cryptographic verification", () => {
  it("accepts a genuine PayPal signature", () => {
    const outcome = verifySignatureAgainstPublicKey(
      headersFor(RAW_BODY),
      RAW_BODY,
      WEBHOOK_ID,
      PUBLIC_PEM
    );
    expect(outcome).toEqual({ verified: true });
  });

  it("rejects a body swapped after signing", () => {
    // THE ATTACK: keep every header, including the original signature, but
    // change the payload so a different booking is marked paid.
    const signed = headersFor(RAW_BODY);
    const forgedBody = RAW_BODY.replace("bk-1", "bk-victim");

    const outcome = verifySignatureAgainstPublicKey(signed, forgedBody, WEBHOOK_ID, PUBLIC_PEM);
    expect(outcome.verified).toBe(false);
  });

  it("rejects a signature replayed against a different configured webhook id", () => {
    const outcome = verifySignatureAgainstPublicKey(
      headersFor(RAW_BODY),
      RAW_BODY,
      "SOME-OTHER-WEBHOOK",
      PUBLIC_PEM
    );
    expect(outcome.verified).toBe(false);
  });

  it("rejects a signature made by a different key", () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const outcome = verifySignatureAgainstPublicKey(
      headersFor(RAW_BODY),
      RAW_BODY,
      WEBHOOK_ID,
      other.publicKey.export({ type: "spki", format: "pem" }) as string
    );
    expect(outcome.verified).toBe(false);
  });

  it("rejects a body whose bytes changed, which is why the raw body is required", () => {
    // Re-parsing and re-serialising JSON routinely rewrites bytes: whitespace,
    // key order, unicode escaping. When that happens the CRC32 no longer
    // matches and a genuine PayPal event would be rejected. This is why the
    // route captures `request.text()` before `JSON.parse`.
    const signed = headersFor(RAW_BODY);
    const reserialised = JSON.stringify(JSON.parse(RAW_BODY), null, 2);

    expect(reserialised).not.toBe(RAW_BODY);
    expect(verifySignatureAgainstPublicKey(signed, reserialised, WEBHOOK_ID, PUBLIC_PEM).verified).toBe(
      false
    );
  });

  it("still accepts a body whose bytes are unchanged by re-serialisation", () => {
    // Guards against over-correcting: byte-identical input must verify, so a
    // well-behaved proxy that does not rewrite the body is not locked out.
    const signed = headersFor(RAW_BODY);
    const same = JSON.stringify(JSON.parse(RAW_BODY));
    expect(verifySignatureAgainstPublicKey(signed, same, WEBHOOK_ID, PUBLIC_PEM).verified).toBe(true);
  });
});

describe("certificate URL trust (SSRF)", () => {
  it("accepts PayPal hosts", () => {
    expect(isTrustedCertUrl("https://api.paypal.com/v1/notifications/certs/CERT-1")).toBe(true);
    expect(isTrustedCertUrl("https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1")).toBe(
      true
    );
  });

  it("rejects attacker-controlled and non-TLS URLs", () => {
    expect(isTrustedCertUrl("https://evil.example.com/cert.pem")).toBe(false);
    expect(isTrustedCertUrl("http://api.paypal.com/cert")).toBe(false);
    expect(isTrustedCertUrl("https://paypal.com.evil.test/cert")).toBe(false);
    expect(isTrustedCertUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isTrustedCertUrl("not-a-url")).toBe(false);
  });

  it("never fetches a certificate from an untrusted host", async () => {
    let fetched = false;
    const outcome = await verifyPayPalSignature(
      headersFor(RAW_BODY, { certUrl: "https://evil.example.com/cert.pem" }),
      RAW_BODY,
      WEBHOOK_ID,
      async () => {
        fetched = true;
        return "";
      }
    );
    expect(outcome).toEqual({ verified: false, reason: "untrusted-cert-url" });
    expect(fetched).toBe(false);
  });
});

describe("fail-closed behaviour", () => {
  beforeEach(() => clearCertificateCache());

  it("rejects a missing signature header", async () => {
    const outcome = await verifyPayPalSignature(
      headersFor(RAW_BODY, { transmissionSig: null }),
      RAW_BODY,
      WEBHOOK_ID,
      async () => ""
    );
    expect(outcome).toEqual({ verified: false, reason: "missing-headers" });
  });

  it("rejects when no webhook id is configured, rather than trusting the header", async () => {
    const outcome = await verifyPayPalSignature(headersFor(RAW_BODY), RAW_BODY, "", async () => "");
    expect(outcome.verified).toBe(false);
  });

  it("rejects a header webhook id that disagrees with configuration", async () => {
    const outcome = await verifyPayPalSignature(
      headersFor(RAW_BODY, { webhookId: "ATTACKER-CHOSEN" }),
      RAW_BODY,
      WEBHOOK_ID,
      async () => ""
    );
    expect(outcome).toEqual({ verified: false, reason: "webhook-id-mismatch" });
  });

  it("refuses to negotiate the signature algorithm down", async () => {
    const outcome = await verifyPayPalSignature(
      headersFor(RAW_BODY, { authAlgo: "SHA1withRSA" }),
      RAW_BODY,
      WEBHOOK_ID,
      async () => ""
    );
    expect(outcome).toEqual({
      verified: false,
      reason: "unsupported-algorithm",
      detail: "SHA1withRSA",
    });
  });

  it("fails closed when the certificate cannot be fetched", async () => {
    const outcome = await verifyPayPalSignature(headersFor(RAW_BODY), RAW_BODY, WEBHOOK_ID, async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(outcome.verified).toBe(false);
    expect(outcome).toMatchObject({ reason: "cert-fetch-failed" });
  });

  it("fails closed on a certificate that is not valid X.509", async () => {
    const outcome = await verifyPayPalSignature(headersFor(RAW_BODY), RAW_BODY, WEBHOOK_ID, async () =>
      "-----BEGIN CERTIFICATE-----\nnot-a-real-cert\n-----END CERTIFICATE-----\n"
    );
    expect(outcome.verified).toBe(false);
    expect(outcome).toMatchObject({ reason: "bad-certificate" });
  });
});

describe("header parsing", () => {
  it("reads the six PayPal headers", () => {
    const parsed = readPayPalHeaders(
      new Headers({
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api.paypal.com/cert",
        "paypal-transmission-sig": "sig",
        "paypal-transmission-id": "tid",
        "paypal-transmission-time": "2026-01-14T05:19:23Z",
        "paypal-webhook-id": WEBHOOK_ID,
      })
    );
    expect(parsed).toEqual({
      authAlgo: "SHA256withRSA",
      certUrl: "https://api.paypal.com/cert",
      transmissionSig: "sig",
      transmissionId: "tid",
      transmissionTime: "2026-01-14T05:19:23Z",
      webhookId: WEBHOOK_ID,
    });
  });

  it("reads them case-insensitively, as HTTP requires", () => {
    const parsed = readPayPalHeaders(
      new Headers({ "PAYPAL-TRANSMISSION-SIG": "upper", "PayPal-Auth-Algo": "SHA256withRSA" })
    );
    expect(parsed.transmissionSig).toBe("upper");
    expect(parsed.authAlgo).toBe("SHA256withRSA");
  });
});
