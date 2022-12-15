// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MetaPoolETH is ERC20, Ownable {
    constructor() ERC20("MetaPoolETH", "mpETH") {}

    function mint(address _to, uint _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
