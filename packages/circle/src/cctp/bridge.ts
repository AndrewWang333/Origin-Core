import axios from "axios";

/**
 * Circle CCTP v2 — Cross-Chain Transfer Protocol.
 *
 * Origin lets institutional clients bring USDC into Arc from any CCTP-supported chain
 * (Ethereum, Solana, Arbitrum, Base, Avalanche, OP, Polygon, etc.) via native burn-and-
 * mint, not bridge wrappers. This is critical for institutions whose treasury already
 * holds USDC on other chains — they don't need to convert to a wrapped asset to deposit.
 *
 * The collateral service's `cctp-finalizer.ts` watches for inbound mint events on Arc
 * and credits the depositing institution's collateral pool once attestation is verified.
 *
 * CCTP v2 introduces Fast Transfers (sub-second finality with attestation fees) alongside
 * Standard Transfers (free, ~15min). Origin defaults to Fast for institutional UX.
 */

const CCTP_ATTESTATION_BASE = "https://iris-api.circle.com";

export type CCTPSourceChain = "ETH" | "AVAX" | "OP" | "ARB" | "BASE" | "POLYGON" | "SOL";

export interface CCTPAttestation {
  status: "pending_confirmations" | "complete";
  attestation?: `0x${string}`;
  messageBytes?: `0x${string}`;
  messageHash?: `0x${string}`;
}

/**
 * Fetch an attestation for a burn transaction. Origin polls this until status is
 * "complete", then submits the attestation + message to Arc's MessageTransmitter to
 * trigger the mint into the destination wallet.
 */
export async function fetchAttestation(
  sourceChainTxHash: `0x${string}`,
): Promise<CCTPAttestation> {
  const { data } = await axios.get<CCTPAttestation>(
    `${CCTP_ATTESTATION_BASE}/v2/messages/${sourceChainTxHash}`,
    { timeout: 10_000 },
  );
  return data;
}

/**
 * Origin's preferred CCTP transfer mode. Fast transfers cost a small attestation fee
 * but settle in seconds; Standard transfers are free and settle in ~15min.
 */
export type CCTPTransferMode = "fast" | "standard";

export interface InboundTransfer {
  /** The Origin sub-account wallet address that receives the minted USDC on Arc. */
  destinationAddress: `0x${string}`;
  /** USDC amount in 6-decimal base units. */
  amount: bigint;
  /** The originating chain. */
  sourceChain: CCTPSourceChain;
  /** Transaction hash on the source chain that triggered the burn. */
  sourceTxHash: `0x${string}`;
  /** Transfer mode (fast or standard). */
  mode: CCTPTransferMode;
}

/**
 * Watcher used by `apps/collateral-service/src/settlement/cctp-finalizer.ts`. Polls for
 * attestation, then surfaces the InboundTransfer to be credited to the institution's
 * collateral pool on the Origin ledger.
 */
export async function waitForAttestation(
  sourceChainTxHash: `0x${string}`,
  opts: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<CCTPAttestation> {
  const pollInterval = opts.pollIntervalMs ?? 2_000;
  const timeout = opts.timeoutMs ?? 600_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const attestation = await fetchAttestation(sourceChainTxHash);
    if (attestation.status === "complete") return attestation;
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(`CCTP attestation timed out for tx ${sourceChainTxHash}`);
}
