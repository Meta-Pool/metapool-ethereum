// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./Staking.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract LiquidUnstakePool is
    Initializable,
    ERC4626Upgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using AddressUpgradeable for address payable;
    using SafeMathUpgradeable for uint;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public treasury;
    address payable public STAKING;
    uint public ethBalance;
    uint public constant MIN_RESERVES = 30 ether;
    uint64 public constant MIN_DEPOSIT = 0.01 ether;
    uint16 public constant MIN_FEE = 30;
    uint16 public constant MAX_FEE = 500;

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

    function initialize(
        address payable staking,
        IERC20MetadataUpgradeable _weth,
        address _treasury
    ) external initializer {
        __ERC4626_init(IERC20Upgradeable(_weth));
        __ERC20_init("MetaETHLP", "mpETH/ETH");
        __Ownable_init();
        __ReentrancyGuard_init();
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
            ethBalance +
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
            IERC20Upgradeable(asset()).safeTransferFrom(
                msg.sender,
                address(this),
                _assets
            );
            IWETH(asset()).withdraw(_assets);
        } else {
            _assets = msg.value;
        }
        _mint(_receiver, _shares);
        ethBalance += _assets;
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
        uint256 ETHToSend = (poolPercentage * ethBalance) / 1 ether;
        uint256 mpETHToSend = (poolPercentage *
            Staking(STAKING).balanceOf(address(this))) / 1 ether;
        _burn(msg.sender, _shares);
        payable(_receiver).sendValue(ETHToSend);
        IERC20Upgradeable(STAKING).safeTransfer(_receiver, mpETHToSend);
        ethBalance -= ETHToSend;
        emit RemoveLiquidity(msg.sender, _shares, ETHToSend, mpETHToSend);
        return ETHToSend;
    }

    function swapmpETHforETH(
        uint _amount,
        uint _minOut
    ) external nonReentrant returns (uint) {
        address payable staking = STAKING;
        uint16 feeRange = MAX_FEE - MIN_FEE;
        uint amountToETH = Staking(staking).convertToAssets(_amount);
        uint reservesAfterSwap = ethBalance.sub(amountToETH, "Not enough ETH");
        uint proportionalBp = (feeRange * reservesAfterSwap) / MIN_RESERVES;
        uint finalFee = MAX_FEE - proportionalBp;
        uint feeAmount = (_amount * finalFee) / 10000;
        uint finalAmountOut = amountToETH - feeAmount;
        require(finalAmountOut >= _minOut, "Swap doesn't reach min amount");
        uint feeToTreasury = (feeAmount * 2500) / 10000;
        IERC20Upgradeable(staking).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
        IERC20Upgradeable(staking).safeTransfer(treasury, feeToTreasury);
        payable(msg.sender).sendValue(finalAmountOut);
        ethBalance -= finalAmountOut;
        return finalAmountOut;
    }

    function getEthForValidator(
        uint _amount
    ) external nonReentrant onlyStaking {
        require(
            ethBalance - _amount >= MIN_RESERVES,
            "Error, ETH request surpass min reserves"
        );
        address payable staking = STAKING;
        ethBalance -= _amount;
        Staking(staking).depositETH{value: _amount}(address(this));
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
        IERC20Upgradeable(staking).safeTransfer(_to, mpETHToSend);
        return mpETHToSend;
    }
}
