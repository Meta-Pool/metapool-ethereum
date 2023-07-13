# Metapool Ethereum Staking

## Introduction

Metapool product for staking on Ethereum, receiving in exchange mpETH.

Allows users to stake ETH or WETH, instant redeem of mpETH (with a small fee) or delayed redeem (1 to 7 days) and add liquidity with ETH or WETH (for instant redeem).

### Goerli Testnet Deploys

Staking deployed to [0x748c905130CC15b92B97084Fd1eEBc2d2419146f](https://goerli.etherscan.io/address/0x748c905130CC15b92B97084Fd1eEBc2d2419146f)
LiquidUnstakePool deployed to [0x37774000C885e9355eA7C6B025EbF1704141093C](https://goerli.etherscan.io/address/0x37774000C885e9355eA7C6B025EbF1704141093C)
Withdrawal deployed to [0x1A8c25ADc96Fb62183C4CB5B9F0c47746B847e05](https://goerli.etherscan.io/address/0x1A8c25ADc96Fb62183C4CB5B9F0c47746B847e05)

## Contracts

### Staking

Main contract responsible of managing the staking of ETH/WETH and redeem of mpETH

### LiquidUnstakePool

Liquidity pool to allow users to immediately exchange mpETH for ETH, without any delay but with a small fee.
Also users can provide liquidity with ETH or WETH. This ETH will be slowly converted to mpETH through swaps and the Staking contract can also use this ETH (with some limitations) to create new validators, minting new mpETH for liquidity providers.

### Withdrawal

Manage the delayed mpETH redeem of users. Send ETH from rewards and validators disassemble to users.
Users request the withdraw in the Staking contract and, one epoch later (one week) complete the withdraw on this contract.

## Setup .env files
This project use multiple .env files
- `.env` for common variables to all network
- `.env.<network>` for network specific variables

For testing with hardhat generated accounts, the `.env` only requires:
```
NETWORK="Network used for all commands"
```
If NETWORK is not set, hardhat will try to use the `goerli` network.

For production you will need extra variables. Check `.env.sample` for a list of all variables 

Above this, each network requires a `.env.<network>` file with the following variables:
```
RPC_ENDPOINT="RPC endpoint URL"
BLOCK_NUMBER="Block number to fork"
```

## Commands
Note: 
- All commands also compile the contracts
- All commands will use the `NETWORK` variable from `.env`
### Compile contracts
`npm run compile`

### Run tests
`npm test`

### Deploy
`npm run deploy`

### Verify contracts
`npm run verify`

### Upgrade implementations
`TARGET=Staking npm run upgrade`

### Transfer proxies admin to multisig
`npm run transfer_to_multisig`

This only transfer the admin permission to upgrade the contracts implementations, not the `ADMIN_ROLE`