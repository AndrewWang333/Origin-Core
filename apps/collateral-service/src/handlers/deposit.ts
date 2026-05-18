import { USDC_ARC, EURC_ARC } from "@origin/circle";

/**
 * Deposit handler.
 *
 * Recognizes inbound stablecoin transfers into Origin sub-account wallets on Arc and
 * credits the institution's collateral pool. Listens to Transfer events on USDC, EURC,
 * and registered Circle Partner Stablecoins.
 *
 * For inbound USDC arriving via CCTP from other chains, the cctp-finalizer first
 * confirms the attestation and triggers the mint into the sub-account wallet; this
 * handler then picks up the resulting Transfer event identically to any other deposit.
 */

const ELIGIBLE_STABLES: Record<`0x${string}`, "USDC" | "EURC"> = {
  [USDC_ARC]: "USDC",
  [EURC_ARC]: "EURC",
};

export interface IncomingTransfer {
  asset: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

export interface CreditedDeposit {
  subAccountAddress: `0x${string}`;
  asset: `0x${string}`;
  symbol: "USDC" | "EURC" | "PARTNER_STABLE" | "UNKNOWN";
  amount: bigint;
  txHash: `0x${string}`;
  haircutBps: number;
  creditedToCollateralPool: boolean;
}

export function handleIncomingTransfer(transfer: IncomingTransfer): CreditedDeposit {
  const symbol = ELIGIBLE_STABLES[transfer.asset] ?? "UNKNOWN";

  // Haircut policy:
  //   USDC, EURC, partner stables -> 100% (no haircut)
  //   Other ERC-20s -> arrive here only if registered as eligible non-stable collateral;
  //     haircut comes from HaircutOracle (off-chain to this handler).
  const haircutBps = symbol === "USDC" || symbol === "EURC" ? 10_000 : 0;

  return {
    subAccountAddress: transfer.to,
    asset: transfer.asset,
    symbol,
    amount: transfer.amount,
    txHash: transfer.txHash,
    haircutBps,
    creditedToCollateralPool: haircutBps > 0,
  };
}
