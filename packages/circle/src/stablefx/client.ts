import axios, { type AxiosInstance } from "axios";
import { randomUUID } from "node:crypto";
import type {
  StableFXQuoteRequest,
  StableFXQuote,
  StableFXTrade,
  StableFXTradeStatus,
  StableFXFundingSignatureData,
} from "./types.js";

const STABLEFX_BASE_URL = "https://api.circle.com/v1/exchange/stablefx";

/**
 * Circle StableFX client.
 *
 * StableFX is Circle's institutional FX engine — RFQ-based offchain execution combined
 * with onchain Payment-versus-Payment settlement on Arc. Origin uses StableFX for two
 * distinct purposes:
 *
 *   1. **Multi-currency collateral conversion.** When an institution holds margin in
 *      EURC or a partner stablecoin (KRW1, JPYC, etc.) and needs to settle a USDC-
 *      denominated obligation (PnL, funding, liquidation), Origin routes the FX leg
 *      through StableFX rather than running its own FX book.
 *
 *   2. **End-user FX endpoints.** Origin exposes StableFX RFQ as a first-class API
 *      surface for institutional clients who want to convert currencies without ever
 *      leaving Origin (see `apps/api-gateway/src/routes/fx.ts`).
 *
 * The full taker flow has four steps:
 *   1. Request a tradable quote (`requestQuote`).
 *   2. Sign the Permit2 typed data with the Origin operator key (see
 *      `apps/collateral-service/src/handlers/fx-conversion.ts`).
 *   3. Create the trade (`createTrade`).
 *   4. Fund the trade by signing and submitting the funding presign (`getFundingPresign`,
 *      then `fundTrade`).
 *
 * Settlement happens automatically on Arc once both taker and maker fund their escrow legs.
 */
export class StableFXClient {
  private readonly http: AxiosInstance;

  constructor(apiKey: string) {
    this.http = axios.create({
      baseURL: STABLEFX_BASE_URL,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 10_000,
    });
  }

  /**
   * Step 1: Request a tradable quote. Multiple liquidity providers compete and Circle
   * returns the best executable rate plus the Permit2 EIP-712 payload to sign.
   */
  async requestQuote(req: StableFXQuoteRequest): Promise<StableFXQuote> {
    const { data } = await this.http.post<StableFXQuote>("/quotes", req);
    return data;
  }

  /**
   * Step 3: Create the trade by submitting the signed Permit2 typed data.
   * `message` must be the exact `typedData.message` object from the quote response.
   */
  async createTrade(params: {
    quoteId: string;
    address: `0x${string}`;
    message: Record<string, unknown>;
    signature: `0x${string}`;
  }): Promise<StableFXTrade> {
    const { data } = await this.http.post<StableFXTrade>("/trades", {
      idempotencyKey: randomUUID(),
      ...params,
    });
    return data;
  }

  /**
   * List trades, optionally filtered by status. Used by the StableFX settler to find
   * trades that need funding.
   */
  async listTrades(filter?: {
    type?: "taker" | "maker";
    status?: StableFXTradeStatus;
  }): Promise<StableFXTrade[]> {
    const { data } = await this.http.get<{ trades: StableFXTrade[] } | StableFXTrade[]>("/trades", {
      params: filter,
    });
    return Array.isArray(data) ? data : data.trades;
  }

  /**
   * Get a single trade by its API id. Used to poll for terminal states after funding.
   */
  async getTrade(tradeId: string): Promise<StableFXTrade> {
    const { data } = await this.http.get<StableFXTrade>(`/trades/${tradeId}`);
    return data;
  }

  /**
   * Step 4a: Generate the funding presign data. Origin signs the returned typed data
   * with the taker's wallet (or the maker's wallet, depending on side) to authorize
   * the Permit2 transfer into StableFX escrow.
   */
  async getFundingPresign(params: {
    contractTradeIds: string[];
    type: "taker" | "maker";
  }): Promise<StableFXFundingSignatureData> {
    const { data } = await this.http.post<StableFXFundingSignatureData>(
      "/signatures/funding/presign",
      params,
    );
    return data;
  }

  /**
   * Step 4b: Fund the trade by submitting the signed funding payload. Circle relays
   * the funding transaction on-chain. A 200 with empty body indicates success.
   */
  async fundTrade(params: {
    type: "taker" | "maker";
    signature: `0x${string}`;
    permit2: Record<string, unknown>;
  }): Promise<void> {
    await this.http.post("/fund", params);
  }
}
