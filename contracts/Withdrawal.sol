// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./Staking.sol";

struct withdrawRequest {
    uint256 amount;
    uint256 unlockEpoch;
}

/// @title Manage withdrawals from validators to users
/// @notice Receive request for withdrawals from Staking and allow users to complete the withdrawals once the epoch is reached
/// @dev As the disassemble of validators is delayed, this contract manage the pending withdraw from users to allow the to complet it once his unlockEpoch is reached and if the contract has enough ETH
// The epochs are of one week
contract Withdrawal is OwnableUpgradeable {
    using AddressUpgradeable for address payable;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address payable public mpETH;
    // How much do we owe to delayed withdrawals
    uint256 public totalPendingWithdraw;
    uint256 public startTimestamp;
    mapping(address => withdrawRequest) public pendingWithdraws;
    uint8 public withdrawalsStartEpoch;

    event RequestWithdraw(address indexed user, uint256 amount, uint256 unlockEpoch);
    event CompleteWithdraw(address indexed user, uint256 amount, uint256 unlockEpoch);

    error NotAuthorized(address _caller, address _authorized);
    error EpochNotReached(uint256 _currentEpoch, uint256 _unlockEpoch);
    error UserDontHavePendingWithdraw(address _user);
    error NotEnoughETHtoStake(uint256 _requested, uint256 _available);
    error StartEpochTooHigh(uint8 _startEpochSent, uint8 _maxStartEpoch);
    error WithdrawalsNotStarted(uint256 _currentEpoch, uint256 _startEpoch);

    modifier onlyStaking() {
        if (msg.sender != mpETH) revert NotAuthorized(msg.sender, mpETH);
        _;
    }

    receive() external payable {}

    function initialize(address payable _mpETH) external initializer {
        __Ownable_init();
        startTimestamp = block.timestamp;
        mpETH = _mpETH;
        setWithdrawalsStartEpoch(8);
    }

    /// @return epoch Current epoch
    function getEpoch() public view returns (uint256 epoch) {
        return (block.timestamp - startTimestamp) / 7 days;
    }

    /// @return Timestamp until next epoch
    function getEpochTimeLeft() external view returns (uint256) {
        return startTimestamp + (getEpoch() + 1) * 7 days - block.timestamp;
    }

    /// @notice Set first epoch for allow withdrawals
    function setWithdrawalsStartEpoch(uint8 _epoch) public onlyOwner {
        if (_epoch > 32) revert StartEpochTooHigh(_epoch, 32);
        withdrawalsStartEpoch = _epoch;
    }

    /// @notice Queue ETH withdrawal
    /// @dev Multiples withdrawals are accumulative, but will restart the epoch unlock
    /// Shares used for this request should be already bruned in the calling function (Staking._withdraw)
    /// @param _amountOut ETH amount to withdraw
    /// @param _user Owner of the withdrawal
    function requestWithdraw(uint256 _amountOut, address _user) external onlyStaking {
        if (getEpoch() < withdrawalsStartEpoch)
            revert WithdrawalsNotStarted(getEpoch(), withdrawalsStartEpoch);
        uint256 unlockEpoch = getEpoch() + 1;
        pendingWithdraws[_user].amount += _amountOut;
        pendingWithdraws[_user].unlockEpoch = unlockEpoch;
        totalPendingWithdraw += _amountOut;
        emit RequestWithdraw(_user, _amountOut, unlockEpoch);
    }

    // TODO: Add 48hs check after current epoch
    /// @notice Process pending withdrawal if there's enough ETH for the given user
    function completeWithdraw(address _user) external onlyStaking {
        withdrawRequest memory _withdrawR = pendingWithdraws[_user];
        if (getEpoch() < _withdrawR.unlockEpoch)
            revert EpochNotReached(getEpoch(), _withdrawR.unlockEpoch);
        if (_withdrawR.amount == 0) revert UserDontHavePendingWithdraw(_user);
        totalPendingWithdraw -= _withdrawR.amount;
        delete pendingWithdraws[_user];
        payable(_user).sendValue(_withdrawR.amount);
        emit CompleteWithdraw(_user, _withdrawR.amount, _withdrawR.unlockEpoch);
    }

    /// @notice Send ETH _amount to Staking
    /// @dev As the validators are always fully disassembled, the contract can have more ETH than the needed for withdrawals. So the Staking can take this ETH and send it again to validators. This shouldn't mint new mpETH
    function getEthForValidator(uint256 _amount) external onlyStaking {
        if (totalPendingWithdraw > address(this).balance) revert NotEnoughETHtoStake(_amount, 0);
        uint256 ethRemaining = address(this).balance - totalPendingWithdraw;
        if (_amount > ethRemaining) revert NotEnoughETHtoStake(_amount, ethRemaining);
        mpETH.sendValue(_amount);
    }
}
