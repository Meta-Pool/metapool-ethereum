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
    uint public targetLiquidity;
    uint public minETHPercentage;
    uint64 public constant MIN_DEPOSIT = 0.01 ether;
    uint16 public constant MIN_FEE = 30;
    uint16 public constant MAX_FEE = 500;

    event AddLiquidity(
        address indexed user,
        address indexed receiver,
        uint amount,
        uint shares
    );
    event RemoveLiquidity(
        address indexed user,
        uint shares,
        uint eth,
        uint mpETH
    );
    event Swap(
        address indexed user,
        uint amountIn,
        uint amountOut,
        uint fees,
        uint treasuryFees
    );
    event SendETHForValidator(uint timestamp, uint amount);

    error DepositTooLow(uint256 _minAmount, uint256 _amountSent);
    error NotAuthorized(address _caller, address _authorized);
    error SwapMinOut(uint256 _minOut, uint256 _amountOut);
    error RequestedETHReachMinProportion(uint256 _ethRequested, uint256 _availableETH);
    error SharesTooLow();

    modifier onlyStaking() {
        if (msg.sender != STAKING) revert NotAuthorized(msg.sender, STAKING);
        _;
    }

    modifier validDeposit(uint _amount) {
        if (_amount < MIN_DEPOSIT) revert DepositTooLow(MIN_DEPOSIT, _amount);
        _;
    }

    function initialize(
        address payable _staking,
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
        STAKING = _staking;
        treasury = _treasury;
        updateTargetLiquidity(30 ether);
        updateMinETHPercentage(5000);
    }

    /// @dev Needed to receive ETH from WETH deposits
    receive() external payable {}

    /// @notice Update targetLiquidity
    /// @dev Reserves value from which the swap mpETHForETH will apply fees
    function updateTargetLiquidity(uint _targetLiquidity) public onlyOwner {
        targetLiquidity = _targetLiquidity;
    }

    /// @notice Update minETHPercentage
    /// @dev Min ETH reserves percentage compared to mpETH reserves to allow Staking to request ETH for validators
    function updateMinETHPercentage(uint _minETHPercentage) public onlyOwner {
        minETHPercentage = _minETHPercentage;
    }

    /// @notice Return the amount of ETH and mpETH equivalent to ETH in the pool
    function totalAssets() public view override returns (uint) {
        return
            ethBalance +
            Staking(STAKING).convertToAssets(
                Staking(STAKING).balanceOf(address(this))
            );
    }

    /// @notice Add liquidity with WETH
    /// @dev Same function as in ERC4626 but removes maxDeposit check and add validDeposit modifier who checks for minDeposit
    function deposit(
        uint _assets,
        address _receiver
    ) public override validDeposit(_assets) returns (uint) {
        uint _shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, _shares);
        return _shares;
    }

    /// @notice Add liquidity with ETH
    /// @dev Equivalent to deposit function but for native token. Sends assets 0 to _deposit to indicate that the assets amount will be msg.value
    function depositETH(
        address _receiver
    ) external payable validDeposit(msg.value) returns (uint) {
        uint shares = previewDeposit(msg.value);
        _deposit(msg.sender, _receiver, 0, shares);
        return shares;
    }

    /// @notice Confirm ETH or WETH deposit
    /// @dev Use ETH or get and convert WETH to ETH
    function _deposit(
        address _caller,
        address _receiver,
        uint _assets,
        uint _shares
    ) internal virtual override nonReentrant {
        _assets = _getAssetsDeposit(_assets);
        _mint(_receiver, _shares);
        ethBalance += _assets;
        emit AddLiquidity(_caller, _receiver, _assets, _shares);
    }

    /// @dev Convert WETH to ETH if the deposit is in WETH. Receive _assets as 0 if deposit is in ETH
    /// @return Amount of assets received
    function _getAssetsDeposit(uint _assets) private returns(uint){
        if (_assets == 0) { // ETH deposit
            _assets = msg.value;
        } else { // WETH deposit. Get WETH and convert to ETH
            IERC20Upgradeable(asset()).safeTransferFrom(
                msg.sender,
                address(this),
                _assets
            );
            IWETH(asset()).withdraw(_assets);
        }
        return _assets;
    }

    /// @dev Override to revert because the "asset" of the pool are really two assets, ETH and mpETH. So the function can't receive only one asset as parameter
    function withdraw(
        uint256,
        address,
        address
    ) public pure override returns (uint) {
        revert("Use redeem");
    }

    /// @dev Overrided to return ETH and mpETH for shares
    /// @return ETHToSend ETH sent to user. Don't includes mpETH sent
    function redeem(
        uint _shares,
        address _receiver,
        address _owner
    ) public virtual override nonReentrant returns (uint ETHToSend) {
        if (msg.sender != _owner) _spendAllowance(_owner, msg.sender, _shares);
        uint poolPercentage = (_shares * 1 ether) / totalSupply();
        if (poolPercentage == 0) revert SharesTooLow();
        ETHToSend = (poolPercentage * ethBalance) / 1 ether;
        uint mpETHToSend = (poolPercentage *
            Staking(STAKING).balanceOf(address(this))) / 1 ether;
        _burn(msg.sender, _shares);
        payable(_receiver).sendValue(ETHToSend);
        IERC20Upgradeable(STAKING).safeTransfer(_receiver, mpETHToSend);
        ethBalance -= ETHToSend;
        emit RemoveLiquidity(msg.sender, _shares, ETHToSend, mpETHToSend);
    }

    /// @notice Swap mpETH for ETH
    /// @dev Send ETH to user and take some mpETH as fee for treasury and pool (liquidity providers)
    function swapmpETHforETH(
        uint _amount,
        uint _minOut
    ) external nonReentrant returns (uint) {
        address payable staking = STAKING;
        (uint amountOut, uint feeAmount) = getAmountOut(_amount);
        if (amountOut < _minOut) revert SwapMinOut(_minOut, amountOut);
        uint feeToTreasury = (feeAmount * 2500) / 10000;
        ethBalance -= amountOut;
        IERC20Upgradeable(staking).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
        IERC20Upgradeable(staking).safeTransfer(treasury, feeToTreasury);
        payable(msg.sender).sendValue(amountOut);
        emit Swap(msg.sender, _amount, amountOut, feeAmount, feeToTreasury);
        return amountOut;
    }

    /// @notice Return amountOut from swap and fee taken from _amountIn
    /// @param _amountIn mpETH amount to swap
    /// @return amountOut ETH amount out from swap
    /// @return feeAmount Total mpETH fee from _amountIn
    function getAmountOut(
        uint _amountIn
    ) public view returns (uint amountOut, uint feeAmount) {
        address payable staking = STAKING;
        uint16 feeRange = MAX_FEE - MIN_FEE;
        amountOut = Staking(staking).convertToAssets(_amountIn);
        uint reservesAfterSwap = ethBalance.sub(amountOut, "Not enough ETH");
        uint finalFee = MIN_FEE;
        if (reservesAfterSwap < targetLiquidity) {
            uint proportionalBp = (feeRange * reservesAfterSwap) /
                targetLiquidity;
            finalFee = MAX_FEE - proportionalBp;
        }
        feeAmount = (_amountIn * finalFee) / 10000;
        amountOut = Staking(staking).convertToAssets(_amountIn - feeAmount);
    }

    /// @notice Deposit ETH into Staking
    /// @dev Called from Staking to get ETH for validators
    function getEthForValidator(uint _amount) external nonReentrant onlyStaking {
        uint currentETHPercentage = (ethBalance * 10000) / totalAssets();
        uint newEthPercentage = ((ethBalance - _amount) * 10000) / totalAssets();
        if (newEthPercentage < minETHPercentage) {
            uint availableETH = ((currentETHPercentage - minETHPercentage) *
                totalAssets()) / 10000;
            revert RequestedETHReachMinProportion(_amount, availableETH);
        }
        ethBalance -= _amount;
        Staking(STAKING).depositETH{value: _amount}(address(this));
        emit SendETHForValidator(block.timestamp, _amount);
    }

    /// @notice Staking swap ETH for mpETH
    function swapETHFormpETH(
        address _to
    ) external payable nonReentrant onlyStaking returns (uint) {
        address payable staking = STAKING;
        uint mpETHToSend = Staking(staking).previewDeposit(msg.value);
        IERC20Upgradeable(staking).safeTransfer(_to, mpETHToSend);
        ethBalance += msg.value;
        return mpETHToSend;
    }
}
