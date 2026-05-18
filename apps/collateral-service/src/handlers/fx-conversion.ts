import { StableFXClient, type StableFXCurrency } from "@origin/circle";
// NOTE: corrected relative path — the wallet-service signer is three levels up from
// `apps/collateral-service/src/handlers/`. The original brief printed `../..` which
// resolved inside collateral-service; the correct prefix is `../../..` to reach `apps/`.
import { signTypedDataWithCircleWallet } from "../../../wallet-service/src/signer.js";

/**
 * Multi-currency collateral FX conversion via Circle StableFX.
 *
 * This is the engine behind Origin's "Global Exchange" pillar — the ability for an
 * institution to hold collateral in EURC, JPYC, KRW1, BRLA, or any other Circle-supported
 * stablecoin and still trade USDC-denominated perpetuals.
 *
 * The flow when an FX leg is needed:
 *   1. Origin's MarginEngine determines that a USDC-denominated obligation must be
 *      settled from a non-USDC collateral balance (e.g., EURC).
 *   2. This handler requests a StableFX quote for EURC -> USDC.
 *   3. Origin signs the Permit2 typed data with the sub-account's Circle wallet.
 *   4. Origin creates the trade and funds it.
 *   5. The StableFX settlement contract escrows both sides PvP; the swap settles on Arc.
 *   6. The settled USDC is credited to the appropriate margin account.
 */

export interface FXConversionRequest {
  /** Origin sub-account performing the conversion. */
  subAccountWalletId: string;
  /** Sub-account on-chain address (also the recipientAddress for the destination currency). */
  subAccountAddress: `0x${string}`;
  /** Source currency held by the sub-account. */
  from: StableFXCurrency;
  /** Destination currency required for settlement. */
  to: StableFXCurrency;
  /** Amount of the source currency to convert, as a decimal string. */
  amount: string;
}

export interface FXConversionResult {
  tradeId: string;
  contractTradeId: string;
  rate: number;
  fromAmount: string;
  toAmount: string;
  status: string;
}

export async function executeFXConversion(
  req: FXConversionRequest,
): Promise<FXConversionResult> {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) throw new Error("CIRCLE_API_KEY is not configured");
  const stablefx = new StableFXClient(apiKey);

  // 1. Request a tradable quote.
  const quote = await stablefx.requestQuote({
    from: { currency: req.from, amount: req.amount },
    to: { currency: req.to },
    tenor: "instant",
    type: "tradable",
    recipientAddress: req.subAccountAddress,
  });

  // 2. Sign the Permit2 typed data with the sub-account's Circle wallet.
  const signature = await signTypedDataWithCircleWallet({
    walletId: req.subAccountWalletId,
    typedData: quote.typedData,
  });

  // 3. Create the trade.
  const trade = await stablefx.createTrade({
    quoteId: quote.id,
    address: req.subAccountAddress,
    message: quote.typedData.message,
    signature,
  });

  // 4. Get funding presign data and sign it.
  const funding = await stablefx.getFundingPresign({
    contractTradeIds: [trade.contractTradeId],
    type: "taker",
  });
  const fundingSig = await signTypedDataWithCircleWallet({
    walletId: req.subAccountWalletId,
    typedData: funding.typedData,
  });

  // 5. Submit funding. After this, StableFX handles settlement on Arc.
  await stablefx.fundTrade({
    type: "taker",
    signature: fundingSig,
    permit2: funding.typedData.message,
  });

  return {
    tradeId: trade.id,
    contractTradeId: trade.contractTradeId,
    rate: trade.rate,
    fromAmount: trade.from.amount,
    toAmount: trade.to.amount,
    status: trade.status,
  };
}
