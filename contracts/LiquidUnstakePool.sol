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

    event AddLiquidity(address indexed user, uint256 amount, uint256 shares);
    event RemoveLiquidity(
        address indexed user,
        uint256 shares,
        uint256 eth,
        uint256 mpETH
    );

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
        uint256 totalETHValue = address(this).balance +
            mpETH.balanceOf(address(this)) *
            STAKING.getmpETHPrice();
        uint256 sharesToMint = (msg.value * 1 ether) / totalETHValue;
        LP_TOKEN.mint(msg.sender, sharesToMint);
        emit AddLiquidity(msg.sender, msg.value, sharesToMint);
    }

    function removeLiquidty(uint256 _shares) external {
        uint256 poolPercentage = (_shares * 1 ether) / LP_TOKEN.totalSupply();
        uint256 ETHToSend = (poolPercentage * address(this).balance) / 1 ether;
        uint256 mpETHToSend = (poolPercentage *
            mpETH.balanceOf(address(this))) / 1 ether;
        payable(msg.sender).transfer(ETHToSend);
        mpETH.transfer(msg.sender, mpETHToSend);
        LP_TOKEN.burn(msg.sender, _shares);
        emit RemoveLiquidity(msg.sender, _shares, ETHToSend, mpETHToSend);
    }
}
