// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWETH is IERC20 {
    function decimals() external view returns (uint8);

    function deposit() external payable;

    function withdraw(uint256) external;
}
