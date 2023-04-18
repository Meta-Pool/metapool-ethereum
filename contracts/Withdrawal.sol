// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./Staking.sol";

struct withdrawRequest {
    uint amount;
    uint unlockEpoch;
}

contract Withdrawal is OwnableUpgradeable {
    using AddressUpgradeable for address payable;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address payable public mpETH;
    uint public totalPendingWithdraw;
    uint private startTimestamp;
    mapping(address => withdrawRequest) public pendingWithdraws;

    event RequestWithdraw(address indexed user, uint amount, uint unlockEpoch);
    event CompleteWithdraw(address indexed user, uint amount, uint unlockEpoch);

    receive() external payable {}

    function initialize(address payable _mpETH) external initializer {
        startTimestamp = block.timestamp;
        mpETH = _mpETH;
        __Ownable_init();
        transferOwnership(_mpETH);
    }

    function getEpoch() public view returns (uint epoch) {
        return (block.timestamp - startTimestamp) / 7 days;
    }

    /// @notice Queue ETH withdrawal
    /// @dev Multiples withdrawals are accumulative, but will restart the timestamp unlock
    /// @param _amountOut ETH amount to withdraw
    /// @param _user Owner of the withdrawal
    function requestWithdraw(uint _amountOut, address _user) external {
        require(msg.sender == mpETH, "Caller is not staking contract");
        uint unlockEpoch = getEpoch() + 1;
        pendingWithdraws[_user].amount += _amountOut;
        pendingWithdraws[_user].unlockEpoch = unlockEpoch;
        totalPendingWithdraw += _amountOut;
        emit RequestWithdraw(_user, _amountOut, unlockEpoch);
    }

    /// @notice Process pending withdrawal if there's enough ETH
    function completeWithdraw() external {
        withdrawRequest memory _withdrawR = pendingWithdraws[msg.sender];
        require(
            getEpoch() >= _withdrawR.unlockEpoch,
            "Withdrawal delay not reached"
        );
        require(_withdrawR.amount > 0, "Nothing to withdraw");
        pendingWithdraws[msg.sender] = withdrawRequest(0, 0);
        totalPendingWithdraw -= _withdrawR.amount;
        payable(msg.sender).sendValue(_withdrawR.amount);
        emit CompleteWithdraw(
            msg.sender,
            _withdrawR.amount,
            _withdrawR.unlockEpoch
        );
    }

    /// @notice Send ETH balance to Staking
    /// @dev Send ETH to Staking. This shouldn't mint new mpETH
    function getEthForValidator(uint _amount) external onlyOwner {
        require(_amount <= ethRemaining(), "Not enough ETH to stake");
        mpETH.sendValue(_amount);
    }

    function ethRemaining() public view returns (uint) {
        return
            (address(this).balance > totalPendingWithdraw)
                ? address(this).balance - totalPendingWithdraw
                : 0;
    }
}
