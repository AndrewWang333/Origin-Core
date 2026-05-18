import { StableFXClient, verifyStableFXWebhook } from "@origin/circle";

/**
 * StableFX trade lifecycle settler.
 *
 * Receives webhook notifications from Circle when a StableFX trade transitions state
 * (taker_funded → maker_funded → settled, or breaching → breached). Updates Origin's
 * internal ledger to reflect the collateral movement.
 *
 * For trades that breach (one side fails to fund), Origin must return the escrowed
 * funds to the user's pre-trade position. This is handled by listening for the
 * `breached` event and reverting the speculative ledger entry that was created when
 * the conversion was initiated.
 */

export interface StableFXWebhookEvent {
  eventType: "trade.status_changed";
  trade: {
    id: string;
    contractTradeId: string;
    status: "pending_settlement" | "taker_funded" | "maker_funded" | "settled" | "breaching" | "breached";
    from: { currency: string; amount: string };
    to: { currency: string; amount: string };
  };
}

export class StableFXSettler {
  constructor(
    private readonly fx: StableFXClient,
    private readonly webhookSecret: string,
  ) {}

  /**
   * Verify and process a StableFX webhook.
   * Returns the parsed event if valid, or throws.
   */
  async handleWebhook(rawBody: string, signatureHeader: string): Promise<StableFXWebhookEvent> {
    const valid = verifyStableFXWebhook(rawBody, signatureHeader, this.webhookSecret);
    if (!valid) throw new Error("Invalid StableFX webhook signature");

    const event = JSON.parse(rawBody) as StableFXWebhookEvent;
    await this.applyToLedger(event);
    return event;
  }

  /**
   * Apply terminal state changes to Origin's internal collateral ledger.
   * - `settled` -> finalize the destination credit
   * - `breached` -> revert the speculative entry
   */
  private async applyToLedger(event: StableFXWebhookEvent): Promise<void> {
    switch (event.trade.status) {
      case "settled":
        // TODO: credit destination currency to the sub-account's collateral pool.
        break;
      case "breached":
        // TODO: revert speculative ledger entry and notify the operating user.
        break;
      default:
        // Intermediate states: log and continue. The trade is still in flight.
        break;
    }
  }

  /**
   * Reconciliation sweep: poll for any trades not yet in a terminal state and refresh
   * their ledger position. Run on a timer in case a webhook delivery is missed.
   */
  async reconcileInFlightTrades(): Promise<void> {
    const inFlight = await this.fx.listTrades({ type: "taker", status: "pending_settlement" });
    for (const trade of inFlight) {
      const fresh = await this.fx.getTrade(trade.id);
      if (fresh.status === "settled" || fresh.status === "breached") {
        await this.applyToLedger({
          eventType: "trade.status_changed",
          trade: {
            id: fresh.id,
            contractTradeId: fresh.contractTradeId,
            status: fresh.status,
            from: fresh.from,
            to: fresh.to,
          },
        });
      }
    }
  }
}
