import fs from "fs"
const { NETWORK } = require("../env")
const constants = require(`./network/${NETWORK}`)

constants.DEPLOYED_ADDRESSES_FILE = "deploys.json"
const deployments = JSON.parse(fs.readFileSync(constants.DEPLOYED_ADDRESSES_FILE).toString())
constants.DEPLOYED_ADDRESSES = deployments ? deployments : {}
constants.NETWORK_DEPLOYED_ADDRESSES = deployments[NETWORK] ? { ...deployments[NETWORK] } : {}
constants.DEPOSIT_ABI = require("../abi/DepositContract.json")
constants.WETH_ABI = require("../abi/WETH.json")
constants.DEPOSIT_DATA = require(`../../test/validators/${NETWORK}.json`)
constants.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
constants.GNOSIS_SAFE_ABI = require("../abi/GnosisSafe.json")

export = {
  ...constants,
}
