// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.26;

import {Tokens} from "../constants/Tokens.sol";
import {IStableFX} from "../interfaces/IStableFX.sol";

/// @title StableFXAdapter
/// @notice On-chain adapter that lets Origin's Clearinghouse settle multi-currency
///         margin moves through Circle StableFX. When an institution holds collateral
///         in EURC and incurs a USDC-denominated loss, the Clearinghouse routes the
///         FX leg through this adapter, which interacts with the StableFX settlement
///         escrow contract on Arc.
/// @dev StableFX trades are initiated off-chain (RFQ via Circle's API). The adapter's
///      role is limited to:
///        1. Approving Permit2 to spend collateral on behalf of Origin.
///        2. Receiving settlement callbacks once StableFX's PvP escrow releases funds.
contract StableFXAdapter {
    address public immutable clearinghouse;
    address public immutable permit2 = Tokens.PERMIT2;

    event StableFXSettlementReceived(
        uint256 indexed contractTradeId,
        address indexed account,
        address fromAsset,
        address toAsset,
        uint256 fromAmount,
        uint256 toAmount
    );

    error NotClearinghouse();
    error NotStableFX();

    modifier onlyClearinghouse() {
        if (msg.sender != clearinghouse) revert NotClearinghouse();
        _;
    }

    constructor(address _clearinghouse) {
        clearinghouse = _clearinghouse;
    }

    /// @notice Called by the Clearinghouse to record an inbound StableFX settlement.
    ///         The actual token transfer happens via StableFX's escrow contract;
    ///         this function emits the canonical Origin event for off-chain indexing.
    function recordSettlement(
        uint256 contractTradeId,
        address account,
        address fromAsset,
        address toAsset,
        uint256 fromAmount,
        uint256 toAmount
    ) external onlyClearinghouse {
        emit StableFXSettlementReceived(
            contractTradeId,
            account,
            fromAsset,
            toAsset,
            fromAmount,
            toAmount
        );
    }
}
