// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";
import "./MetaETHLiquidityPool.sol";
import "./MetaPoolETH.sol";

contract LiquidUnstakePool is Ownable {
    Staking public immutable STAKING;
    MetaETHLiquidityPool public immutable LP_TOKEN;
    MetaPoolETH public immutable mpETH;

    event AddLiquidity(address indexed user, uint amount, uint shares);

    constructor(
        Staking _staking,
        MetaETHLiquidityPool _lpToken,
        MetaPoolETH _mpETH
    ) {
        STAKING = _staking;
        LP_TOKEN = _lpToken;
        mpETH = _mpETH;
    }

    function addLiquidity() external payable {
        require(msg.value > 0, "Can't deposit 0 ETH");
        uint totalETHValue = address(this).balance +
            mpETH.balanceOf(address(this)) *
            STAKING.getmpETHPrice();
        uint sharesToMint = (msg.value * 1 ether) / totalETHValue;
        LP_TOKEN.mint(msg.sender, sharesToMint);
        emit AddLiquidity(msg.sender, msg.value, sharesToMint);
    }
}
