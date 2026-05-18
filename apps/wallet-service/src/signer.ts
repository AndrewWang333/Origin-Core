import { createCircleWalletClient } from "@origin/circle";
import type { StableFXTypedData } from "@origin/circle";

/**
 * EIP-712 signing through Circle Developer Wallets.
 *
 * Every StableFX flow requires the taker (or maker) to sign Permit2 typed data with the
 * wallet that holds the source funds. Origin sub-account wallets live inside Circle
 * Developer Wallets, so we use Circle's signing API rather than raw private key access.
 *
 * This keeps Origin out of the key-custody business — the institution's collateral
 * wallets are signed for by Circle's secure enclave, not by Origin servers.
 */
export async function signTypedDataWithCircleWallet(params: {
  walletId: string;
  typedData: StableFXTypedData;
}): Promise<`0x${string}`> {
  const client = createCircleWalletClient();

  const result = await client.signTypedData({
    walletId: params.walletId,
    data: JSON.stringify({
      domain: params.typedData.domain,
      types: params.typedData.types,
      primaryType: params.typedData.primaryType,
      message: params.typedData.message,
    }),
  });

  const signature = result.data?.signature;
  if (!signature) throw new Error("Circle wallet returned no signature");
  return signature as `0x${string}`;
}
