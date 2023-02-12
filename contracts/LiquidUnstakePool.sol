// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";
import "./MetaETHLiquidityPool.sol";

contract LiquidUnstakePool is Ownable {
    Staking public immutable STAKING;
    MetaETHLiquidityPool public immutable LP_TOKEN;

    event AddLiquidity(address indexed user, uint256 amount, uint256 shares);
    event RemoveLiquidity(
        address indexed user,
        uint256 shares,
        uint256 eth,
        uint256 mpETH
    );

    // TODO: Implement a system of ACL
    modifier onlyStaking() {
        _checkAccount(address(STAKING));
        _;
    }

    function _checkAccount(address expected) private view {
        require(msg.sender == expected, "Access error");
    }

    constructor(Staking _staking, MetaETHLiquidityPool _lpToken) {
        STAKING = _staking;
        LP_TOKEN = _lpToken;
    }

    function addLiquidity() external payable {
        require(msg.value > 0, "Can't deposit 0 ETH");
        uint256 totalETHValue = address(this).balance +
            STAKING.convertToAssets(STAKING.balanceOf(address(this)));
        uint256 sharesToMint = (msg.value * 1 ether) / totalETHValue;
        LP_TOKEN.mint(msg.sender, sharesToMint);
        emit AddLiquidity(msg.sender, msg.value, sharesToMint);
    }

    function removeLiquidty(uint256 _shares) external {
        uint256 poolPercentage = (_shares * 1 ether) / LP_TOKEN.totalSupply();
        uint256 ETHToSend = (poolPercentage * address(this).balance) / 1 ether;
        uint256 mpETHToSend = (poolPercentage *
            STAKING.balanceOf(address(this))) / 1 ether;
        payable(msg.sender).transfer(ETHToSend);
        STAKING.transfer(msg.sender, mpETHToSend);
        LP_TOKEN.burn(msg.sender, _shares);
        emit RemoveLiquidity(msg.sender, _shares, ETHToSend, mpETHToSend);
    }

    function depositETH(
        address _to
    ) external payable onlyStaking returns (uint) {
        uint mpETHToSend = STAKING.previewDeposit(msg.value);
        require(
            STAKING.balanceOf(address(this)) >= mpETHToSend,
            "Liquid unstake not enough mpETH"
        );
        STAKING.transfer(_to, mpETHToSend);
        return mpETHToSend;
    }
}
