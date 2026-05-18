import { StableFXClient, type StableFXCurrency, type StableFXTypedData } from "@origin/circle";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Multi-currency collateral FX conversion via Circle StableFX.
 *
 * This is the engine behind Origin's "Global Exchange" pillar — the ability for an
 * institution to hold collateral in EURC, JPYC, KRW1, BRLA, or any other Circle-supported
 * stablecoin and still trade USDC-denominated perpetuals.
 *
 * Settlement model:
 *   - Institutional funds are held in Origin's on-chain CollateralVault.
 *   - Origin keeps a per-institution off-chain ledger; on-chain custody is pooled.
 *   - Origin acts as the StableFX taker from an operator address. The operator signs
 *     the Permit2 typed data; settlement lands USDC back into the CollateralVault.
 *   - Internal ledger debits the source currency and credits the destination after
 *     the StableFX webhook confirms `settled`.
 *
 * Flow when an FX leg is needed:
 *   1. MarginEngine determines a USDC-denominated obligation must be covered from a
 *      non-USDC collateral balance (e.g., EURC).
 *   2. This handler requests a tradable StableFX quote.
 *   3. The Origin operator account signs the Permit2 typed data.
 *   4. Origin creates the trade and funds it.
 *   5. StableFX settles PvP on Arc; the destination currency lands at the vault.
 *   6. The off-chain ledger is updated for the requesting account.
 */

export interface FXConversionRequest {
  /** Off-chain ledger key for the requesting institution / sub-account. Funds remain
   *  pooled in the on-chain CollateralVault; this id is for accounting only. */
  accountId: string;
  /** On-chain recipient for the destination currency — always the CollateralVault. */
  recipientAddress: `0x${string}`;
  /** Source currency drawn from the pooled vault on behalf of the account. */
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

/**
 * Sign a StableFX Permit2 typed-data payload with the Origin operator key.
 *
 * The operator account is the on-chain identity that takes the StableFX side on
 * Origin's behalf. Funds flow from the CollateralVault to the StableFX escrow under
 * an allowance granted to Permit2; the operator signature authorizes that movement.
 */
async function signWithOperator(typedData: StableFXTypedData): Promise<`0x${string}`> {
  const pk = process.env.ORIGIN_OPERATOR_PRIVATE_KEY;
  if (!pk) throw new Error("ORIGIN_OPERATOR_PRIVATE_KEY is not configured");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return account.signTypedData({
    domain: typedData.domain,
    types: typedData.types as never,
    primaryType: typedData.primaryType,
    message: typedData.message as never,
  });
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
    recipientAddress: req.recipientAddress,
  });

  // 2. Sign the Permit2 typed data with the Origin operator key.
  const signature = await signWithOperator(quote.typedData);

  // 3. Create the trade.
  const trade = await stablefx.createTrade({
    quoteId: quote.id,
    address: req.recipientAddress,
    message: quote.typedData.message,
    signature,
  });

  // 4. Get funding presign data and sign it.
  const funding = await stablefx.getFundingPresign({
    contractTradeIds: [trade.contractTradeId],
    type: "taker",
  });
  const fundingSig = await signWithOperator(funding.typedData);

  // 5. Submit funding. After this, StableFX handles settlement on Arc and the
  //    settlement webhook updates the off-chain ledger for `req.accountId`.
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
