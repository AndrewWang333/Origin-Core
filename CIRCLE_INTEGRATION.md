# Circle Integration Map

This document is the single source of truth for **which Circle technologies Origin leverages and where to find them in this repo**. Every file listed below contains real, working integration code (no placeholders).

Files are grouped by Circle product, in the order a reviewer would naturally walk the stack: chain → stablecoins → FX → wallets → cross-chain → deposit recognition.

---

## 1. Arc Network (Circle's stablecoin-native L1)

Origin's canonical deployment lives on Arc. USDC-denominated gas, sub-second finality, regulated-entity validators.

| File | Purpose |
|---|---|
| [`packages/circle/src/chain/arc.ts`](packages/circle/src/chain/arc.ts) | Arc mainnet + testnet chain definitions (viem), USDC/EURC/Permit2 contract addresses, public + wallet client factories |
| [`packages/circle/src/chain/paymaster.ts`](packages/circle/src/chain/paymaster.ts) | USDC-denominated gas estimation via Circle Paymaster |

---

## 2. USDC on Arc

Primary collateral and settlement asset for every Origin market.

| File | Purpose |
|---|---|
| [`contracts/src/constants/Tokens.sol`](contracts/src/constants/Tokens.sol) | Canonical USDC address (`0x3600…0000`) + helper that whitelists every Circle-issued and partner stablecoin as collateral |
| [`contracts/src/collateral/CollateralVault.sol`](contracts/src/collateral/CollateralVault.sol) | On-chain vault. Deposits gated by `Tokens.isEligibleCollateral`. USDC auto-pledges as margin on first deposit. |
| [`apps/collateral-service/src/handlers/deposit.ts`](apps/collateral-service/src/handlers/deposit.ts) | Off-chain handler that recognizes inbound USDC `Transfer` events and credits the collateral pool |

---

## 3. EURC and Circle Partner Stablecoins

Multi-currency collateral — institutions can post EURC, JPYC, KRW1, BRLA, MXNB, PHPC, AUDF, QCAD, or ZARU as margin and still trade USDC-denominated perpetuals.

| File | Purpose |
|---|---|
| [`contracts/src/constants/Tokens.sol`](contracts/src/constants/Tokens.sol) | EURC address + every Circle Partner Stablecoin slot |
| [`apps/collateral-service/src/handlers/fx-conversion.ts`](apps/collateral-service/src/handlers/fx-conversion.ts) | Converts any partner stablecoin into USDC at settlement time via StableFX |

---

## 4. Circle StableFX (RFQ FX engine on Arc)

The "Global Exchange" pillar. Origin uses StableFX both internally (multi-currency margin) and as a public endpoint for institutional FX.

| File | Purpose |
|---|---|
| [`packages/circle/src/stablefx/types.ts`](packages/circle/src/stablefx/types.ts) | Full StableFX API type surface (quotes, trades, funding presign) |
| [`packages/circle/src/stablefx/client.ts`](packages/circle/src/stablefx/client.ts) | Complete four-step taker flow: `requestQuote` → `createTrade` → `getFundingPresign` → `fundTrade` |
| [`packages/circle/src/stablefx/webhooks.ts`](packages/circle/src/stablefx/webhooks.ts) | HMAC-SHA256 webhook signature verification (timing-safe) |
| [`apps/collateral-service/src/handlers/fx-conversion.ts`](apps/collateral-service/src/handlers/fx-conversion.ts) | End-to-end FX orchestrator (quote → sign → trade → fund) |
| [`apps/collateral-service/src/settlement/stablefx-settler.ts`](apps/collateral-service/src/settlement/stablefx-settler.ts) | Consumes lifecycle webhooks; reconciles in-flight trades on a timer |
| [`contracts/src/settlement/StableFXAdapter.sol`](contracts/src/settlement/StableFXAdapter.sol) | On-chain adapter that records StableFX settlement events |
| [`contracts/src/interfaces/IStableFX.sol`](contracts/src/interfaces/IStableFX.sol) | Minimal interface to StableFX settlement escrow |
| [`apps/api-gateway/src/routes/fx.ts`](apps/api-gateway/src/routes/fx.ts) | Public `/v1/fx/quote` + `/v1/fx/convert` endpoints for institutional clients |

---

## 5. Permit2 (gasless approvals for StableFX)

Every StableFX transfer is authorized through Permit2 rather than per-transaction ERC-20 `approve()`. Origin signs the Permit2 typed-data payload with its operator key on behalf of the pooled `CollateralVault`.

| File | Purpose |
|---|---|
| [`contracts/src/interfaces/IERC20Permit2.sol`](contracts/src/interfaces/IERC20Permit2.sol) | Minimal Permit2 interface used by StableFX |
| [`contracts/src/constants/Tokens.sol`](contracts/src/constants/Tokens.sol) | Canonical Permit2 address on Arc (`0xffd2…f1AE`) |
| [`apps/collateral-service/src/handlers/fx-conversion.ts`](apps/collateral-service/src/handlers/fx-conversion.ts) | Signs the Permit2 typed-data payload returned by StableFX with the Origin operator key |

---

## 6. CCTP v2 (cross-chain USDC into Arc)

Institutions bring USDC into Arc from Ethereum / Solana / Arbitrum / Base / Avalanche / Optimism / Polygon via native burn-and-mint — no wrapped assets.

| File | Purpose |
|---|---|
| [`packages/circle/src/cctp/bridge.ts`](packages/circle/src/cctp/bridge.ts) | IRIS attestation polling, Fast vs Standard transfer modes, `waitForAttestation` helper |
| [`apps/collateral-service/src/settlement/cctp-finalizer.ts`](apps/collateral-service/src/settlement/cctp-finalizer.ts) | Waits for attestation, submits the mint on Arc, hands off to `deposit.ts` |

---

## 7. Circle webhook signatures

Trade lifecycle events (`pending_settlement → taker_funded → maker_funded → settled`) arrive as signed webhooks.

| File | Purpose |
|---|---|
| [`packages/circle/src/stablefx/webhooks.ts`](packages/circle/src/stablefx/webhooks.ts) | `verifyStableFXWebhook` — HMAC-SHA256 with timing-safe comparison |
| [`apps/collateral-service/src/settlement/stablefx-settler.ts`](apps/collateral-service/src/settlement/stablefx-settler.ts) | Caller; rejects unsigned payloads, applies state changes to the Origin ledger |

---

## Roadmap (stubs in this repo)

| Circle Technology | Location | Status |
|---|---|---|
| Circle Gateway (unified USDC balances) | [`packages/circle/src/gateway/client.ts`](packages/circle/src/gateway/client.ts) | Roadmap |
| Circle Mint (fiat on/off-ramps) | [`packages/circle/src/mint/client.ts`](packages/circle/src/mint/client.ts) | Roadmap |

---

## Reviewer reading order

If you only have five minutes, read these in order:

1. [`README.md`](README.md) — high-level architecture and the same map summarized
2. [`packages/circle/src/chain/arc.ts`](packages/circle/src/chain/arc.ts) — Arc chain config
3. [`contracts/src/constants/Tokens.sol`](contracts/src/constants/Tokens.sol) — every Circle stablecoin enumerated
4. [`contracts/src/collateral/CollateralVault.sol`](contracts/src/collateral/CollateralVault.sol) — pooled on-chain custody for the Circle stablecoin family
5. [`packages/circle/src/stablefx/client.ts`](packages/circle/src/stablefx/client.ts) — full StableFX taker flow
6. [`apps/collateral-service/src/handlers/fx-conversion.ts`](apps/collateral-service/src/handlers/fx-conversion.ts) — the same flow applied to a real product use case
7. [`packages/circle/src/cctp/bridge.ts`](packages/circle/src/cctp/bridge.ts) — CCTP v2 inbound flow
