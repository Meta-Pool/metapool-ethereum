// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/utils/Counters.sol";

/*
Contracts:
    - Staking
    - mpETH is ERC20
    - LiquidUnstake
*/

contract Staking {
    // TODO: Buffer 64 ETH
    // TODO: Contract liquid-unstake and look first to get the mpETH from there at the unstake

    // TODO: Counters for currentNode
    // using Counters for Counters.Counter;

    // Brainstormig
    /*
        Contract receives ETH until have at least 32.
        Once 32 ETH, deposit into the node
        Pass to next node
    */
    // Opt 1
    struct Node {
        bytes pubkey;
        bytes withdrawCredentials;
        bytes signature;
        bytes32 depositDataRoot;
    }
    mapping(uint => Node) public nodesByStruct;

    // Opt 2
    mapping(uint => address) public nodesByAddress;

    uint public currentNode;

    constructor(
        bytes memory pubkey,
        bytes memory withdrawCredentials,
        bytes memory signature,
        bytes32 depositDataRoot
    ) {
        nodesByStruct[currentNode] = Node(
            pubkey,
            withdrawCredentials,
            signature,
            depositDataRoot
        );
    }

    function addNode(
        uint nodeId,
        bytes memory pubkey,
        bytes memory withdrawCredentials,
        bytes memory signature,
        bytes32 depositDataRoot
    ) external {
        // TODO: Create error codes
        require(
            nodeId > currentNode,
            "ERROR: Traying to update a previous node"
        );
        nodesByStruct[nodeId] = Node(
            pubkey,
            withdrawCredentials,
            signature,
            depositDataRoot
        );
    }

    function depositByStruct() external payable {
        Node memory node = nodesByStruct[currentNode];
        // mint mpETH token
    }

    // Cons: Breaks if too many users deposit at the same time
    // function depositByAddress(, , ,) external {
    //     address node = nodesByAddress[currentNode];
    //     // depositContract.deposit()
    //     // mint mpETH token
    // }
}
