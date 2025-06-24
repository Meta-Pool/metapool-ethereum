// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

struct Transfer {
    address receiver_id;
    uint256 amount;
}

contract MultiTransfer is ReentrancyGuard {
    function multiTransfer(
        IERC20 _token,
        Transfer[] calldata _transfers
    ) external nonReentrant {
        uint256 accumAmount;
        uint256 len = _transfers.length;
        for (uint i = 0; i < len; ++i) { accumAmount += _transfers[i].amount; }
        require(accumAmount > 0, "No Amount sent");
        require(_token.transferFrom(msg.sender, address(this), accumAmount), "Not approved");

        for (uint i = 0; i < len; ++i) {
            require(_token.transfer(_transfers[i].receiver_id, _transfers[i].amount), "Transfer failed");
        }
    }
}