import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Bytes, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import * as depositData from "../test_deposit_data.json";
import { NETWORK } from "../lib/env";
const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  WETH_ABI,
  NATIVE,
} = require(`../lib/constants/${NETWORK}`);
import { toEthers, toExp } from "../lib/utils";

const getNextValidator = () =>
  Object.values(
    (({ pubkey, withdrawal_credentials, signature, deposit_data_root }) => ({
      pubkey,
      withdrawal_credentials,
      signature,
      deposit_data_root,
    }))(depositData.default.pop())
  );

const provider = ethers.provider;

describe("LiquidUnstakePool", function () {
  async function deployTest() {
    const [owner, updater, activator, treasury, otherAccount] =
      await ethers.getSigners();
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(
      Staking,
      [
        DEPOSIT_CONTRACT_ADDRESS,
        ADDRESSES[NATIVE],
        treasury.address,
        updater.address,
        activator.address,
      ],
      {
        initializer: "initialize",
      }
    );
    await staking.deployed();

    const LiquidUnstakePool = await ethers.getContractFactory(
      "LiquidUnstakePool"
    );
    const liquidUnstakePool = await upgrades.deployProxy(
      LiquidUnstakePool,
      [staking.address, ADDRESSES[NATIVE], treasury.address],
      {
        initializer: "initialize",
      }
    );
    await liquidUnstakePool.deployed();

    await staking.updateLiquidPool(liquidUnstakePool.address);
    const wethC = new ethers.Contract(ADDRESSES[NATIVE], WETH_ABI);
    const UPDATER_ROLE = await staking.UPDATER_ROLE();
    const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE();

    return {
      staking,
      owner,
      updater,
      activator,
      otherAccount,
      treasury,
      wethC,
      liquidUnstakePool,
      UPDATER_ROLE,
      ACTIVATOR_ROLE,
    };
  }

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
      ).to.be.rejectedWith("Deposit at least 0.01 ETH");
    });

    it("Deposit < 0.01 wETH must revert with minAmount", async () => {
      let value = toEthers(0.0099);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(liquidUnstakePool.address, value);
      await expect(
        liquidUnstakePool.deposit(value, owner.address)
      ).to.be.rejectedWith("Deposit at least 0.01 ETH");
    });

    it("Deposit ETH", async () => {
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

    it("Deposit WETH", async () => {
      let value = toEthers(4);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(liquidUnstakePool.address, value);
      await liquidUnstakePool.deposit(value, owner.address);
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(
        toEthers(45.51)
      );
      value = toEthers(22.49);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(liquidUnstakePool.address, value);
      await liquidUnstakePool.deposit(value, owner.address);
      expect(await liquidUnstakePool.balanceOf(owner.address)).to.eq(
        toEthers(68)
      );
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
    });
  });
});
