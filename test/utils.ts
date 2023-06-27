import { ethers } from "hardhat"
import { NETWORK } from "../lib/env"
import { deployProtocol } from "../lib/deploy"
import * as depositData from "../test_deposit_data.json"
const { ADDRESSES, WETH_ABI, NATIVE } = require(`../lib/constants/${NETWORK}`)

const getNextValidator = () =>
  Object.values(
    (({ pubkey, withdrawal_credentials, signature, deposit_data_root }) => ({
      pubkey,
      withdrawal_credentials,
      signature,
      deposit_data_root,
    }))(depositData.default.pop())
  )

async function deployTest() {
  const [owner, updater, activator, treasury, user] = await ethers.getSigners()

  const { staking, liquidUnstakePool, withdrawal } = await deployProtocol(
    owner,
    updater.address,
    activator.address,
    treasury.address
  )

  const wethC = new ethers.Contract(ADDRESSES[NATIVE], WETH_ABI)
  const UPDATER_ROLE = await staking.UPDATER_ROLE()
  const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE()

  return {
    staking,
    owner,
    updater,
    activator,
    user,
    treasury,
    wethC,
    liquidUnstakePool,
    withdrawal,
    UPDATER_ROLE,
    ACTIVATOR_ROLE,
  }
}

export { deployTest, getNextValidator }
