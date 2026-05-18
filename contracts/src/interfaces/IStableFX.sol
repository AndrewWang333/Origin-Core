// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IStableFX — Minimal interface to Circle StableFX settlement escrow on Arc
/// @notice StableFX settlement is initiated via the off-chain API; on-chain we only
///         need read access to trade state for verification and event indexing.
interface IStableFX {
    enum TradeState {
        PendingSettlement,
        TakerFunded,
        MakerFunded,
        Settled,
        Breaching,
        Breached
    }

    function getTradeState(uint256 contractTradeId) external view returns (TradeState);
}
