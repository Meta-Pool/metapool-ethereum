// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LiquidUnstakePool is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    Staking public immutable STAKING;
    uint64 private constant MIN_DEPOSIT = 0.01 ether;

    event AddLiquidity(
        address indexed user,
        address indexed _receiver,
        uint256 amount,
        uint256 _shares
    );
    event RemoveLiquidity(
        address indexed user,
        uint256 _shares,
        uint256 eth,
        uint256 mpETH
    );

    // TODO: Implement a system of ACL
    modifier onlyStaking() {
        _checkAccount(address(STAKING));
        _;
    }

    modifier validDeposit(uint _amount) {
        _checkDeposit(_amount);
        _;
    }

    function _checkAccount(address _expected) private view {
        require(msg.sender == _expected, "Access error");
    }

    function _checkDeposit(uint _amount) internal view {
        require(
            _amount >= minDeposit(msg.sender),
            "Staking: MIN_DEPOSIT_ERROR"
        );
        require(
            _amount <= maxDeposit(msg.sender),
            "Staking: MAX_DEPOSIT_ERROR"
        );
    }

    constructor(
        Staking _staking,
        IWETH _weth
    ) ERC4626(IERC20(_weth)) ERC20("MetaETHLP", "mpETH/ETH") {
        require(
            _weth.decimals() == 18,
            "wNative token error, implementation for 18 decimals"
        );
        STAKING = _staking;
    }

    function minDeposit(address) public pure returns (uint) {
        return MIN_DEPOSIT;
    }

    /// @notice Return the amount of ETH and mpETH equivalent to ETH in the pool
    function totalAssets() public view override returns (uint) {
        return
            address(this).balance +
            STAKING.convertToAssets(STAKING.balanceOf(address(this)));
    }

    // TODO: Deposit function min and max deposit
    /// @notice Add liquidity with WETH
    function deposit(
        uint256 _assets,
        address _receiver
    ) public override validDeposit(_assets) returns (uint) {
        uint _shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, _shares);
        return _shares;
    }

    function depositETH(
        address _receiver
    ) external payable validDeposit(msg.value) returns (uint) {
        uint shares = previewDeposit(msg.value);
        _deposit(msg.sender, _receiver, 0, shares);
        return shares;
    }

    function _deposit(
        address _caller,
        address _receiver,
        uint256 _assets,
        uint256 _shares
    ) internal virtual override {
        if (_assets != 0) {
            IERC20(asset()).safeTransferFrom(
                msg.sender,
                address(this),
                _assets
            );
            IWETH(asset()).withdraw(_assets);
        } else {
            _assets = msg.value;
        }
        _mint(_receiver, _shares);
        emit AddLiquidity(_caller, _receiver, _assets, _shares);
    }

    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public virtual override returns (uint) {
        // TODO: Imeplemnt fees
        if (msg.sender != _owner) {
            _spendAllowance(_owner, msg.sender, _shares);
        }
        uint256 poolPercentage = (_shares * 1 ether) / totalSupply();
        uint256 ETHToSend = (poolPercentage * address(this).balance) / 1 ether;
        uint256 mpETHToSend = (poolPercentage *
            STAKING.balanceOf(address(this))) / 1 ether;
        _burn(msg.sender, _shares);
        payable(_receiver).transfer(ETHToSend);
        STAKING.transfer(_receiver, mpETHToSend);
        emit RemoveLiquidity(msg.sender, _shares, ETHToSend, mpETHToSend);
        return ETHToSend;
    }

    function swapETHForAsset(
        address _to
    ) external payable onlyStaking returns (uint) {
        uint mpETHToSend = STAKING.previewDeposit(msg.value);
        require(
            STAKING.balanceOf(address(this)) >= mpETHToSend,
            "Liquid unstake not enough mpETH"
        );
        STAKING.transfer(_to, mpETHToSend);
        return mpETHToSend;
    }
}
