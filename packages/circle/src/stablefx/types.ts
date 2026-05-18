/**
 * Type definitions for Circle StableFX API.
 * Reference: https://developers.circle.com/stablefx
 */

export type StableFXCurrency = "USDC" | "EURC" | "JPYC" | "KRW1" | "BRLA" | "MXNB" | "PHPC" | "AUDF" | "QCAD" | "ZARU";

export interface StableFXAmount {
  currency: StableFXCurrency;
  amount: string;
}

export interface StableFXQuoteRequest {
  from: { currency: StableFXCurrency; amount?: string };
  to: { currency: StableFXCurrency; amount?: string };
  /** "instant" = immediate settlement (PvP within the same Arc block). */
  tenor: "instant";
  /** "indicative" = price-discovery only; "tradable" = executable quote. */
  type: "indicative" | "tradable";
  /** Required for tradable quotes — the address that receives the destination currency. */
  recipientAddress?: `0x${string}`;
}

export interface StableFXTypedData {
  domain: {
    name: string;
    chainId: number;
    verifyingContract: `0x${string}`;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface StableFXQuote {
  id: string;
  rate: number;
  from: StableFXAmount;
  to: StableFXAmount;
  fee: StableFXAmount;
  createdAt: string;
  expiresAt: string;
  /** Permit2 EIP-712 typed data the taker signs to accept the quote. */
  typedData: StableFXTypedData;
}

export type StableFXTradeStatus =
  | "pending_settlement"
  | "taker_funded"
  | "maker_funded"
  | "settled"
  | "breaching"
  | "breached";

export interface StableFXTrade {
  id: string;
  contractTradeId: string;
  status: StableFXTradeStatus;
  rate: number;
  from: StableFXAmount;
  to: StableFXAmount;
  createDate: string;
  updateDate: string;
  quoteId: string;
}

export interface StableFXFundingSignatureData {
  typedData: StableFXTypedData;
  deliverables: StableFXAmount[];
  receivables: StableFXAmount[];
}
