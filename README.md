# Metapool Ethereum Staking

## Introduction

Metapool product for staking on Ethereum, receiving in exchange mpETH.

Allows users to stake ETH or WETH, instant redeem of mpETH (with a small fee) or delayed redeem (1 to 7 days) and add liquidity with ETH or WETH (for instant redeem).

### Goerli Testnet Deploys

Staking deployed to [0xB38694ce9504eC3aB5D2d78c3a3E7bf41Dd1D76a](https://goerli.etherscan.io/address/0xB38694ce9504eC3aB5D2d78c3a3E7bf41Dd1D76a)
LiquidUnstakePool deployed to [0xE111B9617D5313aD074FdA6CE3F351aB47551783](https://goerli.etherscan.io/address/0xE111B9617D5313aD074FdA6CE3F351aB47551783)
Withdrawal deployed to [0xc03c4CeE4113d9BAFE899c67FDEB5ebc02184B18](https://goerli.etherscan.io/address/0xc03c4CeE4113d9BAFE899c67FDEB5ebc02184B18)

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
