import { ethers } from "hardhat"
import { deployProtocol } from "../lib/deploy"
const { ADDRESSES, WETH_ABI, NATIVE } = require(`../lib/constants/common`)
import crypto from "crypto"
import { toEthers } from "../lib/utils"
import { BigNumber } from "ethers"

const generateRandomBytes = (length: number): string => {
  return "0x" + crypto.randomBytes(length).toString("hex")
}

const sha256 = (data: Buffer): Buffer => {
  return crypto.createHash("sha256").update(data).digest()
}

const toLittleEndian64 = (value: number): Buffer => {
  const buf = Buffer.alloc(8)
  for (let i = 0; i < 8; i++) {
    buf[i] = (value / Math.pow(2, 8 * i)) & 0xff
  }
  return buf
}

const getDepositDataRoot = (
  pubkey: string,
  withdrawalCredentials: string,
  signature: string,
  amount: BigNumber
): string => {
  const depositAmountGwei = Math.floor(amount.div(1e9).toNumber())
  const amountLE = toLittleEndian64(depositAmountGwei)
  const pubkeyRoot = sha256(Buffer.concat([Buffer.from(pubkey.slice(2), "hex"), Buffer.alloc(16)]))
  const signatureRoot = sha256(
    Buffer.concat([
      sha256(Buffer.from(signature.slice(2, 130), "hex")),
      sha256(Buffer.concat([Buffer.from(signature.slice(130), "hex"), Buffer.alloc(32)])),
    ])
  )
  const node = sha256(
    Buffer.concat([
      sha256(Buffer.concat([pubkeyRoot, Buffer.from(withdrawalCredentials.slice(2), "hex")])),
      sha256(Buffer.concat([amountLE, Buffer.alloc(24), signatureRoot])),
    ])
  )

  return "0x" + node.toString("hex")
}

const getValidator = (
  withdrawalCredentials: string,
  amount: BigNumber = toEthers(32)
): { pubkey: string; signature: string; depositDataRoot: string } => {
  const pubkey = generateRandomBytes(48)
  const signature = generateRandomBytes(96)

  const depositDataRoot = getDepositDataRoot(pubkey, withdrawalCredentials, signature, amount)

  return { pubkey, signature, depositDataRoot }
}

const deployTest = async () => {
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
  const withdrawalCredentials = await staking.withdrawalCredential()

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
    withdrawalCredentials,
  }
}

export { deployTest, getValidator }
