import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
// TODO: Get network from process env
import { DEPOSIT_ABI, DEPOSIT_CONTRACT_ADDRESS } from "../lib/constants/goerli";
import { toEthers } from "../lib/utils";

describe("Staking", function () {
  async function deployTest() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy();

    return { staking, owner, otherAccount };
  }

  xdescribe("Staking deposit ethers contract", function () {
    it("Revert deposit with 0 ETH", async function () {
      const { owner } = await loadFixture(deployTest);
      const depositContract = new ethers.Contract(
        DEPOSIT_CONTRACT_ADDRESS,
        DEPOSIT_ABI
      );
      await expect(
        depositContract
          .connect(owner)
          .deposit(
            "0x8e1fce45a66e3b62dd853614acc4e6d76ad1b509186eb5d5da9adc0c56884d028795261d6b3e9b231e7c3ffa62d5a789",
            "0x00625cbc748a8c2e198a702988d9a8a2b69fa81681c57f4a9652f237199c55d5",
            "0xac21b206003aa9ee63b4876a68b3f7031ed3d2d0fd7a5c91e078517d6c6ff8e834a0bbca40ff9bb4096dec1cf52ba01015f2bc1f023b0ad3b4884c39858a9bbbc7883eb506034c05f2aac59cb155f27bf567d4d24679fbd38a5a9656866072a9",
            "0xbe25431a23817785f7609566275585ffcad59a19bd502ae643532bf94233822d",
            { value: toEthers("0") }
          )
      ).to.be.revertedWith("DepositContract: deposit value too low");
    });

    it("Deposit 32 ETH", async () => {
      const { owner } = await loadFixture(deployTest);
      const depositContract = new ethers.Contract(
        DEPOSIT_CONTRACT_ADDRESS,
        DEPOSIT_ABI
      );

      await depositContract
        .connect(owner)
        .deposit(
          "0x8e1fce45a66e3b62dd853614acc4e6d76ad1b509186eb5d5da9adc0c56884d028795261d6b3e9b231e7c3ffa62d5a789",
          "0x00625cbc748a8c2e198a702988d9a8a2b69fa81681c57f4a9652f237199c55d5",
          "0xac21b206003aa9ee63b4876a68b3f7031ed3d2d0fd7a5c91e078517d6c6ff8e834a0bbca40ff9bb4096dec1cf52ba01015f2bc1f023b0ad3b4884c39858a9bbbc7883eb506034c05f2aac59cb155f27bf567d4d24679fbd38a5a9656866072a9",
          "0xbe25431a23817785f7609566275585ffcad59a19bd502ae643532bf94233822d",
          { value: toEthers("32") }
        );
    });
  });

  describe("Staking deposit metapool contract", function () {
    it("Add 10k nodes", async () => {
      const { owner, staking } = await loadFixture(deployTest);

      for (let i = 0; i < 1000; i++) {
        await staking.addNode(
          "0x8e1fce45a66e3b62dd853614acc4e6d76ad1b509186eb5d5da9adc0c56884d028795261d6b3e9b231e7c3ffa62d5a789",
          "0x00625cbc748a8c2e198a702988d9a8a2b69fa81681c57f4a9652f237199c55d5",
          "0xac21b206003aa9ee63b4876a68b3f7031ed3d2d0fd7a5c91e078517d6c6ff8e834a0bbca40ff9bb4096dec1cf52ba01015f2bc1f023b0ad3b4884c39858a9bbbc7883eb506034c05f2aac59cb155f27bf567d4d24679fbd38a5a9656866072a9",
          "0xbe25431a23817785f7609566275585ffcad59a19bd502ae643532bf94233822d"
        );
      }
    });
  });
});
