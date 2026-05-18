// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.26;

/// @title Tokens — Canonical addresses of Circle-issued and partner stablecoins on Arc Network
/// @notice Origin uses these tokens as collateral, settlement, and FX pair counterparties.
///         All addresses are reviewed and updated as Circle publishes them for Arc mainnet.
library Tokens {
    // -------------------------------------------------------------------------
    // Circle-issued stablecoins on Arc
    // -------------------------------------------------------------------------

    /// @notice USDC on Arc. Primary collateral and settlement asset for Origin.
    ///         Referenced in Circle StableFX documentation examples.
    address internal constant USDC = 0x3600000000000000000000000000000000000000;

    /// @notice EURC on Arc. Used for euro-denominated collateral and FX trading pairs.
    address internal constant EURC = 0x4200000000000000000000000000000000000000;

    // -------------------------------------------------------------------------
    // Circle Partner Stablecoins (https://www.circle.com/blog/introducing-circle-stablefx-and-circle-partner-stablecoins)
    // Addresses populated as each issuer deploys to Arc.
    // -------------------------------------------------------------------------

    /// @notice JPYC (Japanese yen stablecoin). Partner stablecoin via Circle Partner Stablecoins program.
    address internal constant JPYC = address(0);

    /// @notice KRW1 (Korean won stablecoin). Partner stablecoin via Beyond Digital Asset Custody Services.
    address internal constant KRW1 = address(0);

    /// @notice BRLA (Brazilian real stablecoin). Partner stablecoin via Avenia.
    address internal constant BRLA = address(0);

    /// @notice MXNB (Mexican peso stablecoin). Partner stablecoin via Juno.
    address internal constant MXNB = address(0);

    /// @notice PHPC (Philippine peso stablecoin). Partner stablecoin via Coins.ph.
    address internal constant PHPC = address(0);

    /// @notice AUDF (Australian dollar stablecoin). Partner stablecoin via Forte.
    address internal constant AUDF = address(0);

    /// @notice QCAD (Canadian dollar stablecoin). Partner stablecoin via Stablecorp.
    address internal constant QCAD = address(0);

    /// @notice ZARU (South African rand stablecoin). Partner stablecoin via ZAR Universal Network.
    address internal constant ZARU = address(0);

    // -------------------------------------------------------------------------
    // Circle StableFX & Permit2 infrastructure
    // -------------------------------------------------------------------------

    /// @notice Permit2 on Arc — gasless approvals used by Circle StableFX settlement flow.
    ///         Sourced from Circle StableFX integration docs.
    address internal constant PERMIT2 = 0xffd21ca8F0876DaFAD7de09404E0c1f868bbf1AE;

    /// @notice StableFX settlement contract on Arc — escrow for PvP (Payment-versus-Payment) FX settlement.
    ///         The "spender" address returned in StableFX Permit2 typed data points to this contract.
    ///         Address confirmed at runtime by querying the StableFX API.
    address internal constant STABLEFX_SETTLEMENT = address(0);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// @notice Returns true if the given token is a Circle-issued or partner stablecoin
    ///         recognized by Origin as eligible collateral.
    function isEligibleCollateral(address token) internal pure returns (bool) {
        return token == USDC
            || token == EURC
            || token == JPYC
            || token == KRW1
            || token == BRLA
            || token == MXNB
            || token == PHPC
            || token == AUDF
            || token == QCAD
            || token == ZARU;
    }
}
