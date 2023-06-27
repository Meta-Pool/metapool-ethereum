# Metapool Ethereum Staking

## Introduction

Metapool product for staking on Ethereum, receiving in exchange mpETH.

Allows users to stake ETH or WETH, instant redeem of mpETH (with a small fee) or delayed redeem (1 to 7 days) and add liquidity with ETH or WETH (for instant redeem).

### Goerli Testnet Deploys

Staking deployed to [0xACF87D0920e0866bCe1B4C3766D24EE743BCe68b](https://goerli.etherscan.io/address/0xACF87D0920e0866bCe1B4C3766D24EE743BCe68b)
LiquidUnstakePool deployed to [0xEa6718D15cF41CCcc12Ba6D5409A7bF11a3903f6](https://goerli.etherscan.io/address/0xEa6718D15cF41CCcc12Ba6D5409A7bF11a3903f6)
Withdrawal deployed to [0x5ba5414Da3bbE6002DB68094887CfF52ee5bF8Bd](https://goerli.etherscan.io/address/0x5ba5414Da3bbE6002DB68094887CfF52ee5bF8Bd)

## Contracts

### Staking

Main contract responsible of managing the staking of ETH/WETH and redeem of mpETH

### LiquidUnstakePool

Liquidity pool to allow users to immediately exchange mpETH for ETH, without any delay but with a small fee.
Also users can provide liquidity with ETH or WETH. This ETH will be slowly converted to mpETH through swaps and the Staking contract can also use this ETH (with some limitations) to create new validators, minting new mpETH for liquidity providers.

### Withdrawal

Manage the delayed mpETH redeem of users. Send ETH from rewards and validators disassemble to users.
Users request the withdraw in the Staking contract and, one epoch later (one week) complete the withdraw on this contract.

## Contracts functions relations

Diagrams with the main functions and most significant relations between contracts.

Diagrams figures

![diagrams figures](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/figures.png?raw=true)

![staking diagram](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/staking.png?raw=true)

![liquidUnstakePool diagram](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/liquidUnstakePool.png?raw=true)

![withdrawal diagram](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/withdrawal.png?raw=true)

## Commands
Note: 
- All commands also compile the contracts
- Replace `goerli` for your target network. Must be on `hardhat.config.ts`
#### Compile contracts
`npm run compile`

#### Run tests
`npm test`

#### Deploy
`npm run deploy goerli`

#### Verify contracts
`npm run verify goerli`

#### Upgrade implementations
`TARGET=Staking npm run upgrade goerli`