import type { FastifyInstance } from "fastify";
import { USDC_ARC, EURC_ARC } from "@origin/circle";

/**
 * Collateral API routes.
 *
 * Exposes deposit/withdraw/balance endpoints to institutional clients. The actual
 * on-chain work happens in apps/collateral-service; this gateway is responsible only
 * for authentication, KYC gating, and request validation.
 */

export async function collateralRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/collateral/eligible-assets
   * Returns the list of Circle-issued and partner stablecoins Origin currently accepts.
   */
  app.get("/v1/collateral/eligible-assets", async () => {
    return {
      assets: [
        {
          symbol: "USDC",
          address: USDC_ARC,
          decimals: 6,
          haircutBps: 10_000,
          issuer: "Circle",
          description: "Primary collateral and settlement asset on Arc.",
        },
        {
          symbol: "EURC",
          address: EURC_ARC,
          decimals: 6,
          haircutBps: 10_000,
          issuer: "Circle",
          description: "Euro-denominated collateral. FX-converted to USDC for settlement via StableFX.",
        },
        // Partner stablecoins (JPYC, KRW1, BRLA, etc.) are added here as each
        // Circle Partner Stablecoins program member deploys to Arc.
      ],
    };
  });

  /**
   * POST /v1/collateral/deposit-intent
   * Generates a deposit intent that the institution's wallet uses to fund their
   * sub-account on Arc. For inbound USDC from non-Arc chains, returns the CCTP burn
   * parameters; for native Arc deposits, returns the sub-account address directly.
   */
  app.post("/v1/collateral/deposit-intent", async (_request, reply) => {
    // Body validation, KYC gating, sub-account resolution happen in middleware.
    // Returns either { type: "native", destination } or { type: "cctp", burn: {...} }.
    return reply.code(501).send({ error: "Not yet wired up" });
  });
}
