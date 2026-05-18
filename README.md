# origin-core

Trading server and on-chain infrastructure for **Origin**, the institutional-grade global exchange on **Arc Network**.

Origin lets institutions trade tokenized assets and perpetuals on every major market 24/7, with multi-currency collateral, verifiable execution, instant settlement, and compliance-ready infrastructure for global capital markets.

## Three Pillars

1. **The Global Exchange** — Trade any asset against any stablecoin via Circle StableFX. Not constrained to USD.
2. **The Wall Street Oracle** — 24/7 bounded price discovery for traditional assets during market close.
3. **Institutional DeFi** — KYC, KYB, AML, and surveillance built in for institutional onboarding.

## Architecture

origin-core is a TypeScript + Solidity monorepo. The system is split across:

- `apps/` — independently deployable services
- `contracts/` — Solidity contracts deployed to Arc
- `packages/` — shared libraries (notably `@origin/circle`, the Circle SDK integration layer)

## Circle Integration Map

Reviewers from Circle: see [**CIRCLE_INTEGRATION.md**](./CIRCLE_INTEGRATION.md) for the full per-product file map with a recommended 5-minute reading order. The summary below is the same map, condensed.

The following files contain our integrations with Circle's developer stack. Everything else in the repo is either stubbed for future implementation or is non-Circle infrastructure.

| Circle Technology | Where it's used in origin-core |
|---|---|
| **USDC on Arc** (collateral, settlement, fees) | `contracts/src/constants/Tokens.sol`, `contracts/src/collateral/CollateralVault.sol`, `apps/collateral-service/src/handlers/deposit.ts` |
| **EURC and partner stablecoins** (multi-currency collateral) | `contracts/src/constants/Tokens.sol`, `apps/collateral-service/src/handlers/fx-conversion.ts` |
| **StableFX** (RFQ FX engine for multi-currency margin) | `packages/circle/src/stablefx/*`, `apps/collateral-service/src/handlers/fx-conversion.ts`, `apps/collateral-service/src/settlement/stablefx-settler.ts`, `apps/api-gateway/src/routes/fx.ts`, `contracts/src/settlement/StableFXAdapter.sol` |
| **Permit2** (gasless approvals for StableFX) | `contracts/src/interfaces/IERC20Permit2.sol`, `apps/collateral-service/src/handlers/fx-conversion.ts` |
| **CCTP v2** (cross-chain USDC into Arc) | `packages/circle/src/cctp/bridge.ts`, `apps/collateral-service/src/settlement/cctp-finalizer.ts` |
| **Arc chain client** (chain config, USDC-denominated gas) | `packages/circle/src/chain/arc.ts`, `packages/circle/src/chain/paymaster.ts` |
| **Circle Webhook signatures** (trade lifecycle events) | `packages/circle/src/stablefx/webhooks.ts` |
| **Circle Gateway** (unified USDC balances) | `packages/circle/src/gateway/client.ts` — *roadmap* |
| **Circle Mint** (fiat ramps for institutions) | `packages/circle/src/mint/client.ts` — *roadmap* |
| **Arc opt-in privacy** (TEE-based confidential transfer amounts; view keys for selective disclosure to compliance and auditors) | *Pending Arc feature release ([docs](https://docs.arc.io/arc/concepts/opt-in-privacy))* — *roadmap* |

## Why this is on Arc

Arc is purpose-built for stablecoin-native finance. USDC fees, sub-second finality, regulated-entity validators, compliance primitives at chain layer, and native multi-currency settlement via StableFX. Origin's three pillars require all of these. No other L1 offers them as a coherent stack.

## Local Development

```bash
pnpm install
pnpm build
pnpm dev
```

Contracts:

```bash
cd contracts
forge build
forge test
```

Environment: copy `.env.example` to `.env` and fill in your Circle API keys.
