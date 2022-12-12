// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/utils/Counters.sol";

/*
Contratos:
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
        Contrato recibe ETH hasta tener al menos 32
        Con deposito que llegue a 32 los deposita en el nodo
        Pasa al siguiente nodo
    */
    // Opt 1
    struct Node {
        bytes pubkey;
        bytes withdrawCredentials;
        bytes signature;
        bytes32 depositDataRoot;
    }
    // TODO: Test gas add 10 thousand nodes
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
