import {
  createCircleWalletClient,
  createInstitutionWalletSet,
  provisionSubAccountWallet,
} from "@origin/circle";

/**
 * Origin sub-account provisioning.
 *
 * When an institution is onboarded (KYB completed by the compliance-service), Origin
 * creates a Circle wallet set for them. Every sub-account they subsequently create
 * (e.g. "Basis Trade", "Equity L/S", "Treasury") is provisioned as a Circle Developer-
 * Controlled Wallet on Arc inside that wallet set.
 *
 * The result is the hybrid account model Origin uses:
 *   - One KYB'd Entity = one wallet set
 *   - Each named Sub-Account = one Arc wallet
 *   - All wallets controlled by Origin's Circle entity secret (not user-managed keys)
 *
 * This gives institutions the audit trail of a real on-chain address per sub-account
 * while keeping the UX of instant in-app account creation.
 */

export interface ProvisionResult {
  entityId: string;
  walletSetId: string;
  subAccounts: Array<{
    label: string;
    walletId: string;
    address: `0x${string}`;
  }>;
}

export async function provisionInstitution(params: {
  entityId: string;
  institutionName: string;
  initialSubAccountLabels: string[];
  network?: "mainnet" | "testnet";
}): Promise<ProvisionResult> {
  const client = createCircleWalletClient();

  const walletSetId = await createInstitutionWalletSet(client, params.institutionName);

  const subAccounts = await Promise.all(
    params.initialSubAccountLabels.map(async (label) => {
      const { walletId, address } = await provisionSubAccountWallet(
        client,
        walletSetId,
        label,
        params.network ?? "mainnet",
      );
      return { label, walletId, address };
    }),
  );

  return {
    entityId: params.entityId,
    walletSetId,
    subAccounts,
  };
}

export async function provisionSubAccount(params: {
  walletSetId: string;
  label: string;
  network?: "mainnet" | "testnet";
}): Promise<{ label: string; walletId: string; address: `0x${string}` }> {
  const client = createCircleWalletClient();
  const { walletId, address } = await provisionSubAccountWallet(
    client,
    params.walletSetId,
    params.label,
    params.network ?? "mainnet",
  );
  return { label: params.label, walletId, address };
}
