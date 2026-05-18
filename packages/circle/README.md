# @origin/circle

Origin's integration layer for Circle's developer stack. Every Circle technology Origin uses is wrapped here with a clean, typed API so that downstream services (`collateral-service`, `api-gateway`, etc.) consume a single dependency.

## Surface

- `chain/arc` — Arc Network chain config and viem clients
- `chain/paymaster` — USDC-denominated gas via Circle Paymaster
- `stablefx/client` — StableFX RFQ taker flow (quote → trade → fund → settle)
- `stablefx/types` — StableFX API types
- `stablefx/webhooks` — Webhook signature verification
- `cctp/bridge` — CCTP v2 cross-chain USDC into Arc
- `gateway/client` — Circle Gateway unified balances (roadmap)
- `mint/client` — Circle Mint fiat ramps (roadmap)
