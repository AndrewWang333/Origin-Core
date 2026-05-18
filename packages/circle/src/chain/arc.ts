import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import type { Chain, PublicClient, WalletClient } from "viem";

/**
 * Arc Mainnet chain definition.
 *
 * Arc is Circle's stablecoin-native L1 — USDC-denominated gas, sub-second deterministic
 * finality via the Malachite consensus engine, and regulated-entity validators. Origin's
 * canonical deployment lives here.
 *
 * Chain ID is a placeholder pending Arc mainnet launch; update when Circle publishes.
 */
export const arcMainnet: Chain = defineChain({
  id: 2818,
  name: "Arc",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [process.env.ARC_MAINNET_RPC ?? "https://arc-rpc.circle.com"],
    },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer.arc.network" },
  },
});

/**
 * Arc Testnet — used by Origin staging and CI.
 */
export const arcTestnet: Chain = defineChain({
  id: 421614,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin (Testnet)",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [process.env.ARC_TESTNET_RPC ?? "https://arc-testnet-rpc.circle.com"],
    },
  },
  testnet: true,
});

/**
 * USDC contract address on Arc. This is the primary collateral and settlement asset for
 * every Origin market. Matches the address referenced in Circle StableFX documentation.
 */
export const USDC_ARC = "0x3600000000000000000000000000000000000000" as const;

/**
 * EURC contract address on Arc. Used for euro-denominated collateral and FX trading pairs.
 */
export const EURC_ARC = "0x4200000000000000000000000000000000000000" as const;

/**
 * Permit2 contract address on Arc — gasless approvals required by Circle StableFX.
 */
export const PERMIT2_ARC = "0xffd21ca8F0876DaFAD7de09404E0c1f868bbf1AE" as const;

/**
 * Public client factory for read-only Arc interaction (querying balances, contract state,
 * etc.). Used by every Origin service that needs to read from Arc.
 */
export function createArcPublicClient(network: "mainnet" | "testnet" = "mainnet"): PublicClient {
  return createPublicClient({
    chain: network === "mainnet" ? arcMainnet : arcTestnet,
    transport: http(),
  });
}

/**
 * Wallet client factory for write operations against Arc. The signing account is supplied
 * by the caller — Origin services typically pass the operator account loaded from
 * `ORIGIN_OPERATOR_PRIVATE_KEY` (or a downstream KMS-backed signer in production).
 */
export function createArcWalletClient(
  account: Parameters<typeof createWalletClient>[0]["account"],
  network: "mainnet" | "testnet" = "mainnet",
): WalletClient {
  return createWalletClient({
    account,
    chain: network === "mainnet" ? arcMainnet : arcTestnet,
    transport: http(),
  });
}
