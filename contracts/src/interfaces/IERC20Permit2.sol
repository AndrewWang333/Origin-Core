// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IERC20Permit2 — Minimal Permit2 interface used by Circle StableFX
/// @notice Reference: https://github.com/Uniswap/permit2 and Circle StableFX docs.
///         Origin uses Permit2 for all USDC/EURC approvals required by StableFX
///         settlement, avoiding repeated ERC-20 `approve()` transactions.
interface IERC20Permit2 {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;

    function allowance(address owner, address token, address spender)
        external
        view
        returns (uint160 amount, uint48 expiration, uint48 nonce);
}
