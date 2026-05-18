import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

/**
 * Circle Developer-Controlled Wallets client.
 *
 * Origin uses Developer-Controlled Wallets to provision per-account on-chain wallets on
 * Arc for each institutional sub-account (strategy / desk / book). This gives every
 * Origin sub-account a real Arc address — auditable, on-chain, with permanent receipts —
 * while abstracting key management away from the user. The institution sees clean
 * "named account" UX; the chain sees real wallets.
 *
 * One wallet is created per sub-account at provisioning time and used for:
 *   - Receiving deposited collateral (USDC, EURC, partner stables, RWAs)
 *   - Signing Permit2 typed data for StableFX trades
 *   - Holding pledged margin during open positions
 *
 * Each wallet is owned by Origin's Circle entity (identified by CIRCLE_ENTITY_SECRET)
 * and grouped under named wallet sets per institutional KYB record.
 */
export type CircleWalletClient = ReturnType<typeof initiateDeveloperControlledWalletsClient>;

export function createCircleWalletClient(): CircleWalletClient {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) {
    throw new Error(
      "CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set to use Circle Developer Wallets",
    );
  }
  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

/**
 * Create a wallet set for a newly KYB'd institutional entity. Every sub-account the
 * institution later creates lives under this wallet set.
 */
export async function createInstitutionWalletSet(
  client: CircleWalletClient,
  institutionName: string,
): Promise<string> {
  const result = await client.createWalletSet({ name: `origin-${institutionName}` });
  const walletSetId = result.data?.walletSet?.id;
  if (!walletSetId) throw new Error("Failed to create wallet set");
  return walletSetId;
}

/**
 * Provision a new sub-account wallet on Arc. Called when an institution adds a strategy
 * or book to its Origin entity.
 */
export async function provisionSubAccountWallet(
  client: CircleWalletClient,
  walletSetId: string,
  subAccountLabel: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<{ walletId: string; address: `0x${string}` }> {
  const blockchain = network === "mainnet" ? "ARC" : "ARC-TESTNET";

  const result = await client.createWallets({
    blockchains: [blockchain as never],
    count: 1,
    walletSetId,
    metadata: [{ name: subAccountLabel, refId: subAccountLabel }],
  });

  const wallet = result.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) throw new Error("Failed to provision wallet");

  return {
    walletId: wallet.id,
    address: wallet.address as `0x${string}`,
  };
}
