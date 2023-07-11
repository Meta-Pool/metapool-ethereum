import { ethers } from "hardhat"
import { deployProtocol } from "../lib/deploy"
const { ADDRESSES, WETH_ABI, NATIVE, DEPOSIT_DATA } = require(`../lib/constants/common`)

const getNextValidator = () =>
  Object.values(
    (({ pubkey, withdrawal_credentials, signature, deposit_data_root }) => ({
      pubkey,
      withdrawal_credentials,
      signature,
      deposit_data_root,
    }))(DEPOSIT_DATA.pop())
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
