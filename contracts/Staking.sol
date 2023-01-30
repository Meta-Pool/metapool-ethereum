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
    uint public nodesTotalBalance;

    constructor(IDeposit _depositContract, Node[] memory _nodes) payable {
        require(address(this).balance % 32 ether == 0, "Invalid ETH amount");
        uint newNodesAmount = address(this).balance / 32 ether;
        uint nodesLength = _nodes.length;
        require(newNodesAmount >= 2, "Deposit at least 64 ETH");
        require(newNodesAmount < nodesLength, "ETH amount gt nodes");
        uint i = 0;
        for (; i < newNodesAmount; i++) {
            nodes[i] = _nodes[i];
            _depositContract.deposit{value: 32 ether}(
                _nodes[i].pubkey,
                _nodes[i].withdrawCredentials,
                _nodes[i].signature,
                _nodes[i].depositDataRoot
            );
        }
        for (; i < nodesLength; i++) nodes[i] = _nodes[i];
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

    function stake() external payable {
        // Check msg.value
        // If msg.value + balance > 32 init for loop
        // Get mpETH from LiquidUnstakePool if any
        // Mint mpETH if needed to user
    }

    /// @notice Returns mpETH price in ETH againts nodes balance
    /// Starts in 1 and should increase with the nodes rewards
    function getmpETHPrice() public view returns (uint) {
        return (nodesTotalBalance == 0
            ? 1
            : nodesTotalBalance / mpETH.totalSupply()
        )
    }

    /// @notice Updates nodes total balance
    function updateNodesBalance(uint _newBalance) external onlyOwner {
        nodesTotalBalance = _newBalance;
    }

    // Cons: Breaks if too many users deposit at the same time
    // function depositByAddress(, , ,) external {
    //     address node = nodesByAddress[currentNode];
    //     // depositContract.deposit()
    //     // mint mpETH token
    // }
}
