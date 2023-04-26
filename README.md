# Metapool Ethereum Staking

## Introduction

Metapool product for staking on Ethereum, receiving in exchange mpETH.

Allows users to stake ETH or WETH, instant redeem of mpETH (with a small fee) or delayed redeem (1 to 7 days) and add liquidity with ETH or WETH (for instant redeem).

### Goerli Testnet Deploys

Staking deployed to [0x7BA5EA4C1e1EE3d965ee1f54C6574b0E8EFF8eB4](https://goerli.etherscan.io/address/0x7BA5EA4C1e1EE3d965ee1f54C6574b0E8EFF8eB4)
LiquidUnstakePool deployed to [0x5A4966a4ecf7E2200657cE15F15Bc236d00731aA](https://goerli.etherscan.io/address/0x5A4966a4ecf7E2200657cE15F15Bc236d00731aA)
Withdrawal deployed to [0xef46F998303E8B67DAe5722123662e2B28180FF5](https://goerli.etherscan.io/address/0xef46F998303E8B67DAe5722123662e2B28180FF5)

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

![diagrams figures](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/figures.png?raw=true)
![staking diagram](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/staking.png?raw=true)
![liquidUnstakePool diagram](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/liquidUnstakePool.png?raw=true)
![withdrawal diagram](https://github.com/Meta-Pool/metapool-ethereum/blob/main/diagrams/withdrawal.png?raw=true)