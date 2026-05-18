import type { FastifyInstance } from "fastify";
import { StableFXClient } from "@origin/circle";
import type { StableFXCurrency } from "@origin/circle";
// NOTE: corrected relative path — fx-conversion lives three levels up from
// `apps/api-gateway/src/routes/`. The original brief printed `../..`, which is
// off by one; the correct prefix is `../../..` to land at `apps/`.
import { executeFXConversion } from "../../../collateral-service/src/handlers/fx-conversion.js";

/**
 * FX API routes.
 *
 * Origin exposes Circle StableFX as a first-class endpoint to institutional clients.
 * Institutions can convert collateral between any supported stablecoin pair on demand
 * — for example, converting EURC to USDC ahead of a USDC-margined position, or
 * converting realized PnL from USDC back to KRW1 for treasury reporting.
 *
 * These endpoints are thin wrappers over StableFX's RFQ flow with Origin acting as the
 * taker on behalf of the user's sub-account. The user signs nothing — Origin signs
 * with their Circle Developer Wallet.
 */

export async function fxRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/fx/quote
   * Indicative quote for a currency pair. Use for pricing display before execution.
   */
  app.post<{
    Body: { from: StableFXCurrency; to: StableFXCurrency; amount: string };
  }>("/v1/fx/quote", async (req) => {
    const apiKey = process.env.CIRCLE_API_KEY;
    if (!apiKey) throw new Error("CIRCLE_API_KEY is not configured");
    const fx = new StableFXClient(apiKey);

    const quote = await fx.requestQuote({
      from: { currency: req.body.from, amount: req.body.amount },
      to: { currency: req.body.to },
      tenor: "instant",
      type: "indicative",
    });

    return {
      rate: quote.rate,
      from: quote.from,
      to: quote.to,
      fee: quote.fee,
      expiresAt: quote.expiresAt,
    };
  });

  /**
   * POST /v1/fx/convert
   * Execute an FX conversion on a sub-account.
   */
  app.post<{
    Body: {
      subAccountWalletId: string;
      subAccountAddress: `0x${string}`;
      from: StableFXCurrency;
      to: StableFXCurrency;
      amount: string;
    };
  }>("/v1/fx/convert", async (req) => {
    const result = await executeFXConversion(req.body);
    return result;
  });
}
