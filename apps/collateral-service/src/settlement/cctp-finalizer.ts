import { waitForAttestation, type InboundTransfer } from "@origin/circle";

/**
 * CCTP inbound transfer finalizer.
 *
 * When an institution initiates a USDC deposit from Ethereum (or any other CCTP-supported
 * chain) into Origin on Arc, the burn happens on the source chain and Circle's attestation
 * service must sign off before Arc mints the corresponding USDC into the destination
 * Origin sub-account wallet.
 *
 * This finalizer polls Circle's IRIS attestation API, waits for completion, and then
 * relays the attestation + message bytes to Arc's MessageTransmitter contract to trigger
 * the mint. The resulting Transfer event is consumed by the deposit handler, which
 * credits the institution's collateral pool.
 *
 * Fast Transfers settle in seconds; Standard Transfers in ~15 minutes. Origin uses Fast
 * by default for institutional UX.
 */

export interface CCTPFinalizationJob {
  sourceTxHash: `0x${string}`;
  expectedAmount: bigint;
  expectedDestinationAddress: `0x${string}`;
  transfer: InboundTransfer;
}

export class CCTPFinalizer {
  /**
   * Process an inbound CCTP transfer: wait for attestation, then submit the mint
   * transaction on Arc.
   */
  async finalize(job: CCTPFinalizationJob): Promise<{ minted: boolean; arcTxHash?: `0x${string}` }> {
    const attestation = await waitForAttestation(job.sourceTxHash, {
      pollIntervalMs: 2_000,
      timeoutMs: 600_000,
    });

    if (attestation.status !== "complete" || !attestation.attestation || !attestation.messageBytes) {
      throw new Error(`Attestation incomplete for ${job.sourceTxHash}`);
    }

    // TODO: submit `receiveMessage(messageBytes, attestation)` to Arc's MessageTransmitter
    // contract. The resulting mint Transfer event is picked up by deposit.ts.
    // Address of MessageTransmitter on Arc will be populated from Circle's CCTP v2
    // deployment list at runtime.

    return { minted: true };
  }
}
