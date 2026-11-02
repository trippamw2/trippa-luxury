// src/lib/supplier-documents.ts
export type ExpiryBadge = "neutral" | "amber" | "red";

export function expiryBadge(expiresOn: string | null | undefined, now: Date = new Date()): ExpiryBadge {
  if (!expiresOn) return "neutral";
  const expiry = new Date(expiresOn).getTime();
  if (Number.isNaN(expiry)) return "neutral";
  const diffDays = (expiry - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "red";
  if (diffDays <= 60) return "amber";
  return "neutral";
}