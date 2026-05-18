import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * StableFX webhook signature verification.
 *
 * Circle delivers trade lifecycle events (pending_settlement → taker_funded →
 * maker_funded → settled / breached) to Origin via signed webhooks. The collateral
 * service uses these to update internal margin accounting in real time rather than
 * polling.
 *
 * Signatures are HMAC-SHA256 over the raw request body using the shared webhook secret
 * issued by Circle alongside the StableFX API key.
 */
export function verifyStableFXWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "");

  if (expected.length !== provided.length) return false;

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(provided, "hex"),
  );
}
