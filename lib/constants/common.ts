import fs from "fs"
const { NETWORK } = require("../env")
const constants = require(`./network/${NETWORK}`)

constants.DEPLOYED_ADDRESSES_FILE = "deploys.json"
const deployments = fs.readFileSync(constants.DEPLOYED_ADDRESSES_FILE).toString()
constants.DEPLOYED_ADDRESSES = deployments[NETWORK] ? deployments[NETWORK] : {}
constants.DEPOSIT_ABI = require("../abi/DepositContract.json")
constants.WETH_ABI = require("../abi/WETH.json")
constants.DEPOSIT_DATA = require("../../test_deposit_data.json")

export = {
  ...constants,
}
