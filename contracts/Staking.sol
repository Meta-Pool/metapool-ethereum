// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IDeposit.sol";
import "./MetaPoolETH.sol";
import "hardhat/console.sol";

contract Staking is Ownable {
    struct Node {
        bytes pubkey;
        bytes withdrawCredentials;
        bytes signature;
        bytes32 depositDataRoot;
    }
    mapping(uint => Node) public nodes;

    IDeposit public immutable depositContract;
    MetaPoolETH public immutable mpETH;
    uint public currentNode;

    constructor(IDeposit _depositContract, Node[] memory _nodes) payable {
        require(address(this).balance % 32 ether == 0, "Invalid ETH amount");
        uint newNodesAmount = address(this).balance / 32 ether;
        uint nodesLength = _nodes.length;
        require(newNodesAmount >= 2, "Deposit at least 64 ETH");
        require(newNodesAmount < nodesLength, "ETH amount gt nodes");
        for (uint i = 0; i < newNodesAmount; i++) {
            nodes[i] = _nodes[i];
            _depositContract.deposit{value: 32 ether}(
                _nodes[i].pubkey,
                _nodes[i].withdrawCredentials,
                _nodes[i].signature,
                _nodes[i].depositDataRoot
            );
        }
        for (uint i = newNodesAmount; i < nodesLength; i++) {
            nodes[i] = _nodes[i];
        }
        mpETH = new MetaPoolETH();
        mpETH.mint(address(this), newNodesAmount * 1e18);
        currentNode = newNodesAmount;
        depositContract = _depositContract;
    }

    function updateNode(uint _nodeId, Node memory _node) external onlyOwner {
        // TODO: Create error codes
        require(
            _nodeId > currentNode,
            "ERROR: Trying to update a previous node"
        );
        nodes[_nodeId] = _node;
    }

    function depositETH() external payable {}

    // Cons: Breaks if too many users deposit at the same time
    // function depositByAddress(, , ,) external {
    //     address node = nodesByAddress[currentNode];
    //     // depositContract.deposit()
    //     // mint mpETH token
    // }
}
