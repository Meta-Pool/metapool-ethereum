// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MetaETHLiquidityPool is ERC20, Ownable {
    constructor() ERC20("LP-ETH-metaETH", "MetaETHLiquidityPool") {}

    function mint(address _to, uint _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function burn(address _from, uint _amount) external onlyOwner {
        _burn(_from, _amount);
    }
}
