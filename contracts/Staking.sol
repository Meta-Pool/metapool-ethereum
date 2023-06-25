// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IDeposit.sol";
import "./interfaces/IWETH.sol";
import "./LiquidUnstakePool.sol";
import "./Withdrawal.sol";

/// @title ETH staking manager and mpETH staking token
/// @author MetaPool
/// @notice Stake ETH and get mpETH as the representation of the portion owned through all the validators
/// @dev Implements ERC4626 and adapts some functions to simulate ETH native token as asset instead of an ERC20. Also allows the deposit of WETH
contract Staking is Initializable, ERC4626Upgradeable, AccessControlUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address payable;

    struct Node {
        bytes pubkey;
        bytes withdrawCredentials;
        bytes signature;
        bytes32 depositDataRoot;
    }

    address public treasury;
    address payable public liquidUnstakePool;
    IDeposit public depositContract;
    uint256 public nodesAndWithdrawalTotalBalance;
    uint256 public stakingBalance;
    uint256 public nodesBalanceUnlockTime;
    uint64 public constant UPDATE_BALANCE_TIMELOCK = 4 hours;
    uint64 public constant MIN_DEPOSIT = 0.01 ether;
    int public estimatedRewardsPerSecond;
    uint32 public totalNodesActivated;
    uint16 public rewardsFee;
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant ACTIVATOR_ROLE = keccak256("ACTIVATOR_ROLE");
    address payable public withdrawal;
    mapping(address => bool) public whitelistedAccounts;
    bool public whitelistEnabled;
    uint16 public constant MAX_REWARDS_FEE = 2000; // 20%
    mapping(bytes => bool) public nodePubkeyUsed;
    uint16 public constant MAX_DEPOSIT_FEE = 100; // 1%
    uint16 public depositFee;

    event Mint(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Stake(uint256 nodeId, bytes indexed pubkey);
    event UpdateNodeData(uint256 nodeId, Node data);
    event UpdateNodesBalance(uint256 balance);

    error UpdateTooBig(
        uint256 _currentNodesBalance,
        uint256 _newSubmittedNodesBalance,
        uint256 _difference,
        uint256 _maxDifference
    );
    error DepositTooLow(uint256 _minAmount, uint256 _amountSent);
    error UserNotWhitelisted(address _user);
    error UpdateBalanceTimestampNotReached(uint256 _unlockTimestamp, uint256 _currentTimestamp);
    error NotEnoughETHtoStake(
        uint256 _stakingBalance,
        uint256 _requestedToPool,
        uint256 _requestedToWithdrawal,
        uint256 _requiredBalance
    );
    error ZeroAddress(string _address);
    error FeeSentTooBig(uint16 _sentFee, uint16 _maxFee);
    error NodeAlreadyUsed(bytes _pubkey);
    error RewardsPerSecondTooBig(int _rewardsPerSecondSent, int _maxRewardsPerSecond);

    modifier checkWhitelisting() {
        if (whitelistEnabled && !whitelistedAccounts[msg.sender])
            revert UserNotWhitelisted(msg.sender);
        _;
    }

    function initialize(
        address _liquidPool,
        address _withdrawal,
        address _depositContract,
        IERC20MetadataUpgradeable _weth,
        address _treasury,
        address _updater,
        address _activator
    ) external initializer {
        if (_treasury == address(0)) revert ZeroAddress("treasury");
        if (_depositContract == address(0)) revert ZeroAddress("depositContract");
        require(_weth.decimals() == 18, "wNative token error, implementation for 18 decimals");
        require(address(this).balance == 0, "Error initialize with no zero balance");
        __ERC4626_init(IERC20Upgradeable(_weth));
        __ERC20_init("MetaPoolETH", "mpETH");
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, _updater);
        _grantRole(ACTIVATOR_ROLE, _activator);
        updateWithdrawal(payable(_withdrawal));
        updateLiquidPool(payable(_liquidPool));
        updateRewardsFee(500);
        treasury = _treasury;
        depositContract = IDeposit(_depositContract);
        nodesBalanceUnlockTime = uint64(block.timestamp);
    }

    /// @dev Needed to receive ETH from WETH deposits
    receive() external payable {}

    /// @notice Calculate ETH held by vault + validators + estimatedRewards
    /// @return assets Returns total ETH in the protocol
    /// @dev To a more accurate balance also includes an estimation of the rewards generated by validators since the last updateNodesBalance
    function totalAssets() public view override returns (uint256 assets) {
        int rewardsSinceUpdate = estimatedRewardsPerSecond *
            int(block.timestamp - (nodesBalanceUnlockTime - UPDATE_BALANCE_TIMELOCK));
        if (rewardsSinceUpdate >= 0) {
            assets =
                stakingBalance +
                nodesAndWithdrawalTotalBalance +
                uint(rewardsSinceUpdate) -
                Withdrawal(withdrawal).totalPendingWithdraw();
        } else {
            assets =
                stakingBalance +
                nodesAndWithdrawalTotalBalance -
                uint(-rewardsSinceUpdate) -
                Withdrawal(withdrawal).totalPendingWithdraw();
        }
    }

    function toggleWhitelistEnabled() external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistEnabled = !whitelistEnabled;
    }

    function addToWhitelist(address[] calldata addresses) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = addresses.length;
        for (uint256 i = 0; i != length; ++i) whitelistedAccounts[addresses[i]] = true;
    }

    function removeFromWhitelist(
        address[] calldata addresses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = addresses.length;
        for (uint256 i = 0; i != length; ++i) whitelistedAccounts[addresses[i]] = false;
    }

    /// @notice Update Withdrawal contract address
    /// @dev Admin function
    function updateWithdrawal(address payable _withdrawal) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_withdrawal == address(0)) revert ZeroAddress("withdrawal");
        withdrawal = _withdrawal;
    }

    /// @notice Update LiquidPool contract address
    /// @dev Admin function
    function updateLiquidPool(address payable _liquidPool) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_liquidPool == address(0)) revert ZeroAddress("liquidPool");
        liquidUnstakePool = _liquidPool;
    }

    /// @notice Update fee from rewards
    /// @dev Admin function
    function updateRewardsFee(uint16 _rewardsFee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_rewardsFee > MAX_REWARDS_FEE) revert FeeSentTooBig(_rewardsFee, MAX_REWARDS_FEE);
        rewardsFee = _rewardsFee;
    }

    /// @notice Update fee from deposits
    /// @dev Admin function
    function updateDepositFee(uint16 _depositFee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_depositFee > MAX_DEPOSIT_FEE) revert FeeSentTooBig(_depositFee, MAX_DEPOSIT_FEE);
        depositFee = _depositFee;
    }

    function updateEstimatedRewardsPerSecond(
        int _estimatedRewardsPerSecond
    ) public onlyRole(UPDATER_ROLE) {
        uint256 maxEstimatedRewardsPerSecond = totalAssets() / 10000000; // 0,00001%
        if (
            _estimatedRewardsPerSecond > int(maxEstimatedRewardsPerSecond) ||
            _estimatedRewardsPerSecond < -int(maxEstimatedRewardsPerSecond)
        )
            revert RewardsPerSecondTooBig(
                _estimatedRewardsPerSecond,
                int(maxEstimatedRewardsPerSecond)
            );
        estimatedRewardsPerSecond = _estimatedRewardsPerSecond;
    }

    /// @notice Updates nodes total balance
    /// @param _newNodesBalance Total current ETH balance from validators
    /// @dev Update the amount of ethers in the protocol, the estimated rewards per second and, if there are rewards, mint new mpETH to treasury
    function updateNodesBalance(
        uint256 _newNodesBalance,
        int _estimatedRewardsPerSecond
    ) external onlyRole(UPDATER_ROLE) {
        updateEstimatedRewardsPerSecond(_estimatedRewardsPerSecond);
        uint256 localNodesBalanceUnlockTime = nodesBalanceUnlockTime;
        if (block.timestamp < localNodesBalanceUnlockTime)
            revert UpdateBalanceTimestampNotReached(localNodesBalanceUnlockTime, block.timestamp);
        uint256 localNodesAndWithdrawalTotalBalance = nodesAndWithdrawalTotalBalance;
        uint256 newNodesAndWithdrawalTotalBalance = _newNodesBalance +
            withdrawal.balance -
            Withdrawal(withdrawal).totalPendingWithdraw();

        bool balanceIncremented = newNodesAndWithdrawalTotalBalance >
            localNodesAndWithdrawalTotalBalance;

        // Check balance difference
        uint256 diff = balanceIncremented
            ? newNodesAndWithdrawalTotalBalance - localNodesAndWithdrawalTotalBalance
            : localNodesAndWithdrawalTotalBalance - newNodesAndWithdrawalTotalBalance;
        if (diff > localNodesAndWithdrawalTotalBalance / 1000)
            revert UpdateTooBig(
                localNodesAndWithdrawalTotalBalance,
                newNodesAndWithdrawalTotalBalance,
                diff,
                localNodesAndWithdrawalTotalBalance / 1000
            );
        // If the balance didn't increase there's no reward to get fees
        if (balanceIncremented) {
            uint256 assetsAsFee = (diff * rewardsFee) / 10000;
            uint256 shares = previewDeposit(assetsAsFee);
            _mint(treasury, shares);
        }

        uint256 newNodesBalanceUnlockTime = block.timestamp + UPDATE_BALANCE_TIMELOCK;
        nodesBalanceUnlockTime = newNodesBalanceUnlockTime;
        nodesAndWithdrawalTotalBalance = newNodesAndWithdrawalTotalBalance;
        emit UpdateNodesBalance(newNodesAndWithdrawalTotalBalance);
    }

    /// @notice Stake ETH in contract to validators
    /// @param _nodes Nodes info for staking
    /// @param _requestPoolAmount ETH amount to take from LiquidUnstakePool
    /// @param _requestWithdrawalAmount ETH amount to take from Withdrawal
    function pushToBeacon(
        Node[] memory _nodes,
        uint256 _requestPoolAmount,
        uint256 _requestWithdrawalAmount
    ) external onlyRole(ACTIVATOR_ROLE) {
        uint32 nodesLength = uint32(_nodes.length);
        uint256 requiredBalance = nodesLength * 32 ether;
        // TODO: Check exact amount of ETH needed to stake
        if (stakingBalance + _requestPoolAmount + _requestWithdrawalAmount < requiredBalance)
            revert NotEnoughETHtoStake(
                stakingBalance,
                _requestPoolAmount,
                _requestWithdrawalAmount,
                requiredBalance
            );

        if (_requestPoolAmount > 0)
            LiquidUnstakePool(liquidUnstakePool).getEthForValidator(_requestPoolAmount);
        if (_requestWithdrawalAmount > 0)
            Withdrawal(withdrawal).getEthForValidator(_requestWithdrawalAmount);

        uint32 _totalNodesActivated = totalNodesActivated;

        for (uint256 i = 0; i != nodesLength; ++i) {
            if (nodePubkeyUsed[_nodes[i].pubkey]) revert NodeAlreadyUsed(_nodes[i].pubkey);
            nodePubkeyUsed[_nodes[i].pubkey] = true;
            depositContract.deposit{value: 32 ether}(
                _nodes[i].pubkey,
                _nodes[i].withdrawCredentials,
                _nodes[i].signature,
                _nodes[i].depositDataRoot
            );
            _totalNodesActivated++;
            emit Stake(_totalNodesActivated, _nodes[i].pubkey);
        }

        uint256 requiredBalanceFromStaking = requiredBalance - _requestWithdrawalAmount;
        // Amount from Withdrawal isn't included as this amount was never substracted from nodesAndWithdrawalTotalBalance and never added to stakingBalance
        stakingBalance -= requiredBalanceFromStaking;
        nodesAndWithdrawalTotalBalance += requiredBalanceFromStaking;
        totalNodesActivated = _totalNodesActivated;
    }

    /// @notice Request ETH from LiquidUnstakePool to Withdrawal
    /// @dev Request LiquidUnstakePool to deposit a certain amount of ETH and then send it to Withdrawal
    /// @param _requestedETH Amount of ETH to request
    function requestEthFromLiquidPoolToWithdrawal(
        uint256 _requestedETH
    ) external onlyRole(UPDATER_ROLE) {
        LiquidUnstakePool(liquidUnstakePool).getEthForValidator(_requestedETH);
        withdrawal.sendValue(_requestedETH);
    }

    /// @notice Deposit WETH
    /// @dev Same function as in ERC4626 but removes maxDeposit check and add validDeposit modifier who checks for minDeposit
    function deposit(uint256 _assets, address _receiver) public override returns (uint256) {
        uint256 _shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, _shares);
        return _shares;
    }

    /// @notice Deposit ETH
    /// @dev Equivalent to deposit function but for native token. Sends assets 0 to _deposit to indicate that the assets amount will be msg.value
    function depositETH(address _receiver) public payable returns (uint256) {
        uint256 _shares = previewDeposit(msg.value);
        _deposit(msg.sender, _receiver, 0, _shares);
        return _shares;
    }

    function completeWithdraw() external {
        (uint256 amount, ) = Withdrawal(withdrawal).pendingWithdraws(msg.sender);
        nodesAndWithdrawalTotalBalance -= amount;
        Withdrawal(withdrawal).completeWithdraw(msg.sender);
    }

    /// @notice Confirm ETH or WETH deposit
    /// @dev Use ETH or get and convert WETH to ETH, get mpETH from pool and/or mint new mpETH
    function _deposit(
        address _caller,
        address _receiver,
        uint256 _assets,
        uint256 _shares
    ) internal override checkWhitelisting {
        _assets = _getAssetsDeposit(_assets);
        if (_assets < MIN_DEPOSIT) revert DepositTooLow(MIN_DEPOSIT, _assets);
        (uint256 sharesFromPool, uint256 assetsToPool) = _getmpETHFromPool(_shares, address(this));
        _shares -= sharesFromPool;
        _assets -= assetsToPool;

        if (_shares > 0) _mint(address(this), _shares);

        uint256 totalShares = sharesFromPool + _shares;
        uint256 sharesToTreasury = msg.sender != liquidUnstakePool
            ? (totalShares * depositFee) / 10000
            : 0;
        uint256 sharesToUser = totalShares - sharesToTreasury;
        stakingBalance += _assets;

        if (sharesToTreasury > 0) _transfer(address(this), treasury, sharesToTreasury);
        _transfer(address(this), _receiver, sharesToUser);

        emit Deposit(_caller, _receiver, _assets + assetsToPool, _shares + sharesFromPool);
    }

    /// @dev Convert WETH to ETH if the deposit is in WETH. Receive _assets as 0 if deposit is in ETH
    /// @return Amount of assets received
    function _getAssetsDeposit(uint256 _assets) private returns (uint256) {
        if (_assets == 0) {
            // ETH deposit
            _assets = msg.value;
        } else {
            // WETH deposit. Get WETH and convert to ETH
            IERC20Upgradeable(asset()).safeTransferFrom(msg.sender, address(this), _assets);
            IWETH(asset()).withdraw(_assets);
        }
        return _assets;
    }

    /// @notice Try to swap ETH for mpETH in the LiquidPool
    /// @dev Avoid try to get mpETH from LiquidPool if this is also the caller bcs LiquidPool.getEthForValidator called on pushToBeacon also calls depositETH, making a loop
    /// @return sharesFromPool Shares (mpETH) received from pool
    /// @return assetsToPool Assets (ETH) sent to pool to swap for shares
    function _getmpETHFromPool(
        uint256 _shares,
        address _receiver
    ) private returns (uint256 sharesFromPool, uint256 assetsToPool) {
        if (msg.sender != liquidUnstakePool) {
            sharesFromPool = MathUpgradeable.min(balanceOf(liquidUnstakePool), _shares);

            if (sharesFromPool > 0) {
                assetsToPool = previewMint(sharesFromPool);
                assert(
                    LiquidUnstakePool(liquidUnstakePool).swapETHFormpETH{value: assetsToPool}(
                        _receiver
                    ) == sharesFromPool
                );
            }
        }
    }

    /// @dev Same function as in ERC4626 implementation but instead of transfer assets set pending withdraw on withdrawal contract
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }
        _burn(owner, shares);
        Withdrawal(withdrawal).requestWithdraw(assets, msg.sender);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }
}
