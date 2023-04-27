# Metapool Ethereum Staking

## Introduction

Metapool product for staking on Ethereum, receiving in exchange mpETH.

Allows users to stake ETH or WETH, instant redeem of mpETH (with a small fee) or delayed redeem (1 to 7 days) and add liquidity with ETH or WETH (for instant redeem).

### Goerli Testnet Deploys

Staking deployed to [0x1e3Ad098876d6619f3741D489456Da283891E814](https://goerli.etherscan.io/address/0x1e3Ad098876d6619f3741D489456Da283891E814)
LiquidUnstakePool deployed to [0xda4BbaA32dF0002614fd1155B6e0463a55CB9126](https://goerli.etherscan.io/address/0xda4BbaA32dF0002614fd1155B6e0463a55CB9126)
Withdrawal deployed to [0x122975b3E5282d76F6d4F5564cC7b22b836107a1](https://goerli.etherscan.io/address/0x122975b3E5282d76F6d4F5564cC7b22b836107a1)

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
