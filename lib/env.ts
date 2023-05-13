require("dotenv").config();
const NETWORK = process.env.NETWORK;

module.exports = {
  BLOCK_NUMBER: parseInt(process.env.BLOCK_NUMBER),
  BOT_ADDRESS: process.env.BOT_ADDRESS,
  NETWORK,
};
