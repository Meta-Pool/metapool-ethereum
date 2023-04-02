// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

struct withdrawRequest {
    uint amount;
    uint unlockTimestamp;
}

contract Withdrawal is OwnableUpgradeable {
    using AddressUpgradeable for address payable;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public mpETH;
    uint32 public WITHDRAWAL_DELAY;
    uint public totalPendingWithdraw;
    mapping(address => withdrawRequest) public pendingWithdraws;

    event RequestWithdraw(
        address indexed user,
        uint amount,
        uint unlockTimestamp
    );
    event CompleteWithdraw(
        address indexed user,
        uint amount,
        uint unlockTimestamp
    );

    receive() external payable {}

    function initialize(address _mpETH) external initializer {
        mpETH = _mpETH;
        WITHDRAWAL_DELAY = 4 days;
    }

    /// @notice Update withdrawal delay. Will only affect withdrawals after this update
    function updateWithdrawalDelay(uint32 _delay) external onlyOwner {
        WITHDRAWAL_DELAY = _delay;
    }

    /// @notice Queue ETH withdrawal
    /// @dev Multiples withdrawals are accumulative, but will restart the timestamp unlock
    /// @param _amountOut ETH amount to withdraw
    /// @param _user Owner of the withdrawal
    function requestWithdraw(uint _amountOut, address _user) external {
        require(msg.sender == mpETH, "Caller is not staking contract");
        uint unlockTimestamp = block.timestamp + WITHDRAWAL_DELAY;
        pendingWithdraws[_user].amount += _amountOut;
        pendingWithdraws[_user].unlockTimestamp = unlockTimestamp;
        totalPendingWithdraw += _amountOut;
        emit RequestWithdraw(_user, _amountOut, unlockTimestamp);
    }

    /// @notice Process pending withdrawal if there's enough ETH
    function completeWithdraw() external {
        withdrawRequest memory _withdrawR = pendingWithdraws[msg.sender];
        require(
            block.timestamp >= _withdrawR.unlockTimestamp,
            "Withdrawal delay not reached"
        );
        require(_withdrawR.amount > 0, "Nothing to withdraw");
        pendingWithdraws[msg.sender] = withdrawRequest(0, 0);
        totalPendingWithdraw -= _withdrawR.amount;
        payable(msg.sender).sendValue(_withdrawR.amount);
        emit CompleteWithdraw(
            msg.sender,
            _withdrawR.amount,
            _withdrawR.unlockTimestamp
        );
    }

    /// @notice Send ETH balance to Staking
    /// @dev Send ETH over totalPendingWithdraw to Staking without minting mpETH
    function stakeRemaining() external onlyOwner {
        uint availableETH = address(this).balance - totalPendingWithdraw;
        require(availableETH > 0, "No ETH available to stake");
        payable(mpETH).sendValue(availableETH);
    }
}
