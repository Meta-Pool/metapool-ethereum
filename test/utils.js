"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidator = exports.deployTest = void 0;
const hardhat_1 = require("hardhat");
const deploy_1 = require("../lib/deploy");
const { ADDRESSES, WETH_ABI, NATIVE } = require(`../lib/constants/common`);
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../lib/utils");
const generateRandomBytes = (length) => {
    return "0x" + crypto_1.default.randomBytes(length).toString("hex");
};
const sha256 = (data) => {
    return crypto_1.default.createHash("sha256").update(data).digest();
};
const toLittleEndian64 = (value) => {
    const buf = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
        buf[i] = (value / Math.pow(2, 8 * i)) & 0xff;
    }
    return buf;
};
const getDepositDataRoot = (pubkey, withdrawalCredentials, signature, amount) => {
    const depositAmountGwei = Math.floor(amount.div(1e9).toNumber());
    const amountLE = toLittleEndian64(depositAmountGwei);
    const pubkeyRoot = sha256(Buffer.concat([Buffer.from(pubkey.slice(2), "hex"), Buffer.alloc(16)]));
    const signatureRoot = sha256(Buffer.concat([
        sha256(Buffer.from(signature.slice(2, 130), "hex")),
        sha256(Buffer.concat([Buffer.from(signature.slice(130), "hex"), Buffer.alloc(32)])),
    ]));
    const node = sha256(Buffer.concat([
        sha256(Buffer.concat([pubkeyRoot, Buffer.from(withdrawalCredentials.slice(2), "hex")])),
        sha256(Buffer.concat([amountLE, Buffer.alloc(24), signatureRoot])),
    ]));
    return "0x" + node.toString("hex");
};
const getValidator = (withdrawalCredentials, amount = (0, utils_1.toEthers)(32)) => {
    const pubkey = generateRandomBytes(48);
    const signature = generateRandomBytes(96);
    const depositDataRoot = getDepositDataRoot(pubkey, withdrawalCredentials, signature, amount);
    return { pubkey, signature, depositDataRoot };
};
exports.getValidator = getValidator;
const deployTest = async () => {
    const [owner, updater, activator, treasury, user] = await hardhat_1.ethers.getSigners();
    const { staking, liquidUnstakePool, withdrawal } = await (0, deploy_1.deployProtocol)(owner, updater.address, activator.address, treasury.address);
    const wethC = new hardhat_1.ethers.Contract(ADDRESSES[NATIVE], WETH_ABI);
    const UPDATER_ROLE = await staking.UPDATER_ROLE();
    const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE();
    const withdrawalCredentials = await staking.withdrawalCredential();
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
    };
};
exports.deployTest = deployTest;
