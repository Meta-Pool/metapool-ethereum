import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { toEthers } from "../lib/utils";
import { deployTest } from "./utils";

const provider = ethers.provider;

describe("LiquidUnstakePool", function () {
  describe("Deposit", function () {
    let staking: Contract,
      liquidUnstakePool: Contract,
      owner: SignerWithAddress,
      wethC: Contract;

    it("Deposit < 0.01 ETH must revert with minAmount", async () => {
      ({ owner, staking, wethC, liquidUnstakePool } = await loadFixture(
        deployTest
      ));
      let value = toEthers(0.0099);
      await expect(
        liquidUnstakePool.depositETH(owner.address, { value })
      ).to.be.revertedWithCustomError(liquidUnstakePool, "DepositTooLow");
    });

    it("Deposit < 0.01 wETH must revert with minAmount", async () => {
      let value = toEthers(0.0099);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(liquidUnstakePool.address, value);
      await expect(
        liquidUnstakePool.deposit(value, owner.address)
      ).to.be.revertedWithCustomError(liquidUnstakePool, "DepositTooLow");
    });

    it("Deposit ETH", async () => {
      let value = toEthers(32);
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(0);
      await liquidUnstakePool.depositETH(owner.address, { value });
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(value);
      value = toEthers(9.51);
      // Add values instead of hardcoded
      await liquidUnstakePool.depositETH(owner.address, { value });
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(
        toEthers(41.51)
      );
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(
        toEthers(41.51)
      );
      // TODO: Check totalAssets, mpETHPrice, stakingBalance
    });

    it("Deposit WETH", async () => {
      let value = toEthers(4);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(liquidUnstakePool.address, value);
      await liquidUnstakePool.deposit(value, owner.address);
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(
        toEthers(45.51)
      );
      // Add values instead of hardcoded
      value = toEthers(22.49);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(liquidUnstakePool.address, value);
      await liquidUnstakePool.deposit(value, owner.address);
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(
        toEthers(68)
      );
      // TODO: Check totalAssets, mpETHPrice, stakingBalance
    });
  });

  describe("Swap", function () {
    let staking: Contract,
      liquidUnstakePool: Contract,
      owner: SignerWithAddress,
      wethC: Contract;

    it("Deposit ETH", async () => {
      ({ owner, staking, wethC, liquidUnstakePool } = await loadFixture(
        deployTest
      ));
      let value = toEthers(32);
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(0);
      await liquidUnstakePool.depositETH(owner.address, { value });
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(value);
      value = toEthers(9.51);
      await liquidUnstakePool.depositETH(owner.address, { value });
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(
        toEthers(41.51)
      );
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(
        toEthers(41.51)
      );
    });

    it("Swap 1 mpETH for ETH", async () => {
      let value = toEthers(1);
      expect(await staking.balanceOf(owner.address)).to.eq(0);
      await staking.depositETH(owner.address, { value });
      expect(await staking.balanceOf(owner.address)).to.eq(value);
      expect(await provider.getBalance(staking.address)).to.eq(toEthers(1));
      await staking.approve(liquidUnstakePool.address, value);
      await liquidUnstakePool.swapmpETHforETH(value, 0);
      // TODO
    });

    // TODO: Add additional tests for swap with estimatedRewardsPerSecond increasing the price
  });
});
