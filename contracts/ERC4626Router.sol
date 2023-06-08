// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.18;

/// @title Meta Pool implementation of a ERC4626 Router ☎️

/// @notice The Router was developed using the following repository as reference:
/// https://github.com/fei-protocol/ERC4626

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626Router} from "./interfaces/IERC4626Router.sol";

contract ERC4626Router is IERC4626Router {
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC4626;

    constructor() {}

    /// @dev tested
    /// @inheritdoc IERC4626Router
    function depositToVault(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut) {
        IERC20 asset = IERC20(_vault.asset());
        _pullToken(asset, _amount, address(this));
        asset.safeIncreaseAllowance(address(_vault), _amount);
        return _deposit(_vault, _to, _amount, _minSharesOut);
    }

    /// @dev tested
    /// @inheritdoc IERC4626Router
    function mintToVault(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _maxAmountIn
    ) external returns (uint256 _amountIn) {
        IERC20 asset = IERC20(_vault.asset());
        uint256 _assets = _vault.previewMint(_shares);
        _pullToken(asset, _assets, address(this));
        asset.safeIncreaseAllowance(address(_vault), _assets);
        return _mint(_vault, _to, _shares, _maxAmountIn);
    }

    /// @dev tested
    /// @inheritdoc IERC4626Router
    function redeemFromVault(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _minAmountOut
    ) external returns (uint256 _amountOut) {
        // Using the vault as a safe IER20.
        IERC20 vault = IERC20(_vault);
        _pullToken(vault, _shares, address(this));
        vault.safeIncreaseAllowance(address(_vault), _shares);
        return _redeem(_vault, _to, _shares, _minAmountOut);
    }

    /// @dev tested
    /// @inheritdoc IERC4626Router
    function withdrawFromVault(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _maxSharesOut
    ) external returns (uint256 _sharesOut) {
        // Using the vault as a safe IER20.
        IERC20 vault = IERC20(_vault);
        uint256 _shares = _vault.previewWithdraw(_amount);
        _pullToken(vault, _shares, address(this));
        vault.safeIncreaseAllowance(address(_vault), _shares);
        return _withdraw(_vault, _to, _amount, _maxSharesOut);
    }

    /// @notice Not for release v0.2.0.
    // /// @inheritdoc IERC4626Router
    // function depositMax(
    //     IERC4626 _vault,
    //     address _to,
    //     uint256 _minSharesOut
    // ) external returns (uint256 _sharesOut) {
    //     IERC20 asset = IERC20(_vault.asset());
    //     uint256 assetBalance = asset.balanceOf(msg.sender);
    //     uint256 maxDeposit = _vault.maxDeposit(_to);
    //     uint256 amount = maxDeposit < assetBalance ? maxDeposit : assetBalance;
    //     _pullToken(asset, amount, address(this));
    //     return _deposit(_vault, _to, amount, _minSharesOut);
    // }

    /// @notice Not for release v0.2.0.
    // /// @inheritdoc IERC4626Router
    // function redeemMax(
    //     IERC4626 _vault,
    //     address _to,
    //     uint256 _minAmountOut
    // ) external returns (uint256 _amountOut) {
    //     uint256 shareBalance = _vault.balanceOf(msg.sender);
    //     uint256 maxRedeem = _vault.maxRedeem(msg.sender);
    //     uint256 amountShares = maxRedeem < shareBalance ? maxRedeem : shareBalance;
    //     return _redeem(_vault, _to, amountShares, _minAmountOut);
    // }

    /// ************************
    /// * Private 🦡 functions *
    /// ************************

    /************************** Mint **************************/

    /// @notice mint `shares` from an ERC4626 vault.
    /// @param _vault The ERC4626 vault to mint shares from.
    /// @param _to The destination of ownership shares.
    /// @param _shares The amount of shares to mint from `vault`.
    /// @param _maxAmountIn The max amount of assets used to mint.
    /// @return _amountIn the amount of assets used to mint by `to`.
    /// @dev throws MaxAmountError
    function _mint(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _maxAmountIn
    ) private returns (uint256 _amountIn) {
        if ((_amountIn = _vault.mint(_shares, _to)) > _maxAmountIn) {
            revert MaxAmountError();
        }
    }

    /************************** Deposit **************************/

    /// @notice deposit `amount` to an ERC4626 vault.
    /// @param _vault The ERC4626 vault to deposit assets to.
    /// @param _to The destination of ownership shares.
    /// @param _amount The amount of assets to deposit to `vault`.
    /// @param _minSharesOut The min amount of `vault` shares received by `to`.
    /// @return _sharesOut the amount of shares received by `to`.
    /// @dev throws MinSharesError
    function _deposit(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) private returns (uint256 _sharesOut) {
        if ((_sharesOut = _vault.deposit(_amount, _to)) < _minSharesOut) {
            revert MinSharesError();
        }
    }

    /************************** Withdraw **************************/

    /// @notice withdraw `amount` from an ERC4626 vault.
    /// @param _vault The ERC4626 vault to withdraw assets from.
    /// @param _to The destination of assets.
    /// @param _amount The amount of assets to withdraw from vault.
    /// @param _maxSharesOut The max amount of shares to pay for assets.
    /// @return _sharesOut the amount of shares received by `to`.
    /// @dev throws MaxSharesError
    function _withdraw(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _maxSharesOut
    ) private returns (uint256 _sharesOut) {
        if ((_sharesOut = _vault.withdraw(_amount, _to, address(this))) > _maxSharesOut) {
            revert MaxSharesError();
        }
    }

    /************************** Redeem **************************/

    /// @notice redeem `shares` shares from an ERC4626 vault.
    /// @param _vault The ERC4626 vault to redeem shares from.
    /// @param _to The destination of assets.
    /// @param _shares The amount of shares to redeem from vault.
    /// @param _minAmountOut The min amount of assets received by `to`.
    /// @return _amountOut the amount of assets received by `to`.
    /// @dev throws MinAmountError
    function _redeem(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _minAmountOut
    ) private returns (uint256 _amountOut) {
        if ((_amountOut = _vault.redeem(_shares, _to, address(this))) < _minAmountOut) {
            revert MinAmountError();
        }
    }

    /// @dev Safe Transfer funds from sender to recipient.
    function _pullToken(IERC20 _token, uint256 _amount, address _recipient) private {
        _token.safeTransferFrom(msg.sender, _recipient, _amount);
    }
}
