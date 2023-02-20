// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LiquidUnstakePool is ERC4626, Ownable, ReentrancyGuard {
    using Address for address payable;
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    address public treasury;
    address payable public immutable STAKING;
    uint public MIN_RESERVES = 64 ether;
    uint64 public constant MIN_DEPOSIT = 0.01 ether;
    uint16 public MIN_FEE = 30;
    uint16 public MAX_FEE = 500;

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
        _checkAccount(STAKING);
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
        address payable staking,
        IWETH _weth,
        address _treasury
    ) ERC4626(IERC20(_weth)) ERC20("MetaETHLP", "mpETH/ETH") {
        require(
            _weth.decimals() == 18,
            "wNative token error, implementation for 18 decimals"
        );
        STAKING = staking;
        treasury = _treasury;
    }

    function minDeposit(address) public pure returns (uint) {
        return MIN_DEPOSIT;
    }

    /// @notice Return the amount of ETH and mpETH equivalent to ETH in the pool
    function totalAssets() public view override returns (uint) {
        return
            address(this).balance +
            Staking(STAKING).convertToAssets(
                Staking(STAKING).balanceOf(address(this))
            );
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
    ) internal virtual override nonReentrant {
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
    ) public virtual override nonReentrant returns (uint) {
        if (msg.sender != _owner) {
            _spendAllowance(_owner, msg.sender, _shares);
        }
        uint256 poolPercentage = (_shares * 1 ether) / totalSupply();
        uint256 ETHToSend = (poolPercentage * address(this).balance) / 1 ether;
        uint256 mpETHToSend = (poolPercentage *
            Staking(STAKING).balanceOf(address(this))) / 1 ether;
        _burn(msg.sender, _shares);
        payable(_receiver).sendValue(ETHToSend);
        IERC20(STAKING).safeTransfer(_receiver, mpETHToSend);
        emit RemoveLiquidity(msg.sender, _shares, ETHToSend, mpETHToSend);
        return ETHToSend;
    }

    function swapmpETHforETH(
        uint _amount
    ) external nonReentrant returns (uint) {
        address payable staking = STAKING;
        uint16 feeRange = MAX_FEE - MIN_FEE;
        uint amountToETH = Staking(staking).convertToAssets(_amount);
        uint reservesAfterSwap = address(this).balance.sub(
            amountToETH,
            "Not enough ETH"
        );
        uint proportionalBp = (feeRange * reservesAfterSwap) / MIN_RESERVES;
        uint finalFee = MAX_FEE - proportionalBp;
        uint feeAmount = (_amount * finalFee) / 10000;
        uint finalAmountOut = amountToETH - feeAmount;
        uint feeToTreasury = (feeAmount * 2500) / 10000;
        IERC20(staking).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(staking).safeTransfer(treasury, feeToTreasury);
        payable(msg.sender).sendValue(finalAmountOut);
        return finalAmountOut;
    }

    function swapETHFormpETH(
        address _to
    ) external payable nonReentrant onlyStaking returns (uint) {
        address payable staking = STAKING;
        uint mpETHToSend = Staking(staking).previewDeposit(msg.value);
        require(
            Staking(staking).balanceOf(address(this)) >= mpETHToSend,
            "Liquid unstake not enough mpETH"
        );
        IERC20(staking).safeTransfer(_to, mpETHToSend);
        return mpETHToSend;
    }
}
