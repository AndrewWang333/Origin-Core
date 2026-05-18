// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.26;

import {Tokens} from "../constants/Tokens.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title CollateralVault
/// @notice Origin's primary collateral vault on Arc. Accepts Circle-issued stablecoins
///         (USDC, EURC) and Circle Partner Stablecoins (JPYC, KRW1, BRLA, etc.) as
///         margin for perpetual positions. Non-stable collateral (BTC, ETH, RWAs) is
///         held in separate vaults and pledged via the HaircutOracle.
/// @dev Per-account, per-asset balance accounting. All assets are denominated in their
///      native units; conversion to USD-equivalent margin is performed by the off-chain
///      MarginEngine using HaircutOracle prices and, for non-USDC stables, Circle StableFX
///      mid-quotes.
contract CollateralVault {
    /// @notice account => asset => balance
    mapping(address => mapping(address => uint256)) public balances;

    /// @notice account => asset => pledged-as-margin flag
    mapping(address => mapping(address => bool)) public pledged;

    address public immutable clearinghouse;

    event Deposited(address indexed account, address indexed asset, uint256 amount);
    event Withdrawn(address indexed account, address indexed asset, uint256 amount);
    event Pledged(address indexed account, address indexed asset, bool pledged);
    event SettlementApplied(address indexed account, address indexed asset, int256 delta);

    error AssetNotEligible();
    error InsufficientBalance();
    error NotClearinghouse();

    modifier onlyClearinghouse() {
        if (msg.sender != clearinghouse) revert NotClearinghouse();
        _;
    }

    constructor(address _clearinghouse) {
        clearinghouse = _clearinghouse;
    }

    /// @notice Deposit Circle-issued or partner stablecoin into the vault.
    function deposit(address asset, uint256 amount) external {
        if (!Tokens.isEligibleCollateral(asset)) revert AssetNotEligible();
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender][asset] += amount;

        // Default: stablecoins are auto-pledged as collateral on first deposit.
        // Users can unpledge via setPledged(asset, false) if they want pure inventory.
        if (!pledged[msg.sender][asset]) {
            pledged[msg.sender][asset] = true;
            emit Pledged(msg.sender, asset, true);
        }

        emit Deposited(msg.sender, asset, amount);
    }

    /// @notice Withdraw stablecoin from the vault. Reverts if the off-chain MarginEngine
    ///         has not signed off (enforced via Clearinghouse hook in production).
    function withdraw(address asset, uint256 amount) external {
        if (balances[msg.sender][asset] < amount) revert InsufficientBalance();
        balances[msg.sender][asset] -= amount;
        IERC20(asset).transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, asset, amount);
    }

    /// @notice Toggle whether an asset counts toward the account's collateral pool.
    function setPledged(address asset, bool _pledged) external {
        pledged[msg.sender][asset] = _pledged;
        emit Pledged(msg.sender, asset, _pledged);
    }

    /// @notice Apply realized PnL / funding / fee settlement to an account's balance.
    ///         Called only by the Clearinghouse after off-chain matching and risk checks.
    function applySettlement(address account, address asset, int256 delta) external onlyClearinghouse {
        if (delta > 0) {
            balances[account][asset] += uint256(delta);
        } else {
            uint256 deduction = uint256(-delta);
            if (balances[account][asset] < deduction) revert InsufficientBalance();
            balances[account][asset] -= deduction;
        }
        emit SettlementApplied(account, asset, delta);
    }

    /// @notice View helper for the off-chain MarginEngine to enumerate pledged assets.
    function isPledged(address account, address asset) external view returns (bool) {
        return pledged[account][asset];
    }
}
