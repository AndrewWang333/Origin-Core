import type { PublicClient } from "viem";

/**
 * USDC-denominated gas via Circle Paymaster on Arc.
 *
 * Arc uses USDC as the canonical gas token, so transaction fees are paid in USDC rather
 * than a volatile native token. For institutional users, this means:
 *   - Treasury can budget gas costs in dollars
 *   - No need to hold or convert a separate gas asset
 *   - Predictable per-transaction cost
 *
 * Origin uses the Paymaster for all user-initiated on-chain actions (deposits, withdrawals,
 * pledging, etc.). Internal Origin operations (matching settlement, liquidations) sign
 * directly from operator wallets that hold USDC balance for gas.
 */
export interface PaymasterEstimate {
  /** Maximum USDC fee for this transaction, in 6-decimal base units. */
  maxFee: bigint;
  /** Expiration time (unix seconds) of this estimate. */
  expiresAt: number;
}

export class ArcPaymaster {
  constructor(private readonly client: PublicClient) {}

  /**
   * Estimate the USDC gas fee for a pending transaction. Origin surfaces this to users
   * before signing so the fee is always disclosed in dollars.
   */
  async estimateFee(_to: `0x${string}`, _data: `0x${string}`): Promise<PaymasterEstimate> {
    // TODO: integrate with Arc's eth_estimateGas + Paymaster fee oracle endpoint
    // once the public Paymaster RPC method names are finalized.
    const gasEstimate = 100_000n;
    const usdcPerGas = 1n; // placeholder; real value comes from Paymaster oracle
    return {
      maxFee: gasEstimate * usdcPerGas,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    };
  }
}
