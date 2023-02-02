// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
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

    event Deposit(address indexed user, uint amount);
    event Stake(uint node_index, bytes indexed pubkey);
    event UpdateNodesBalance(uint balance);

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
            emit Stake(i, _nodes[i].pubkey);
        }
        for (; i < nodesLength; i++) nodes[i] = _nodes[i];
        mpETH = new MetaPoolETH();
        mpETH.mint(address(this), newNodesAmount * 1e18);
        currentNode = newNodesAmount;
        depositContract = _depositContract;
        emit Deposit(msg.sender, msg.value);
    }

    function updateNode(uint _nodeId, Node memory _node) external onlyOwner {
        require(
            _nodeId > currentNode,
            "ERROR: Trying to update a previous node"
        );
        nodes[_nodeId] = _node;
    }

    /// @notice Stake ETH in contract to validators
    function pushToBacon(uint _nodesAmount) external {
        _nodesAmount = Math.min(address(this).balance % 32 ether, _nodesAmount);
        _stake(_nodesAmount, true);
    }

    /// @notice Deposit ETH user and try to stake to validator
    // Just one at a time to avoid high costs
    function stake() external payable {
        require(msg.value > 0, "Deposit must be greater than zero");
        // TODO: Get mpETH from pool
        uint toMint = msg.value / getmpETHPrice();
        _stake(1, false);
        mpETH.mint(msg.sender, toMint);
        emit Deposit(msg.sender, msg.value);
    }

    function _stake(uint _newNodesAmount, bool _revertIfError) private {
        uint _currentNode = currentNode;
        if (_revertIfError) {
            require(_newNodesAmount > 0, "Not enough ethers to stake");
            require(
                nodes[_currentNode + _newNodesAmount].pubkey.length != 0,
                "Last node index is empty"
            );
        } else if (
            _newNodesAmount == 0 ||
            nodes[_currentNode + _newNodesAmount].pubkey.length == 0
        ) return;

        for (uint i = _currentNode; i < _newNodesAmount; i++) {
            Node memory node = nodes[i];
            depositContract.deposit{value: 32 ether}(
                node.pubkey,
                node.withdrawCredentials,
                node.signature,
                node.depositDataRoot
            );
            emit Stake(i, node.pubkey);
        }
        currentNode = _currentNode + _newNodesAmount;
    }

    /// @notice Returns mpETH price in ETH againts nodes balance
    /// Starts in 1 and should increase with the nodes rewards
    function getmpETHPrice() public view returns (uint) {
        return (
            nodesTotalBalance == 0 ? 1 : nodesTotalBalance / mpETH.totalSupply()
        );
    }

    /// @notice Updates nodes total balance
    function updateNodesBalance(uint _newBalance) external onlyOwner {
        nodesTotalBalance = _newBalance;
        emit UpdateNodesBalance(_newBalance);
    }

    // Cons: Breaks if too many users deposit at the same time
    // function depositByAddress(, , ,) external {
    //     address node = nodesByAddress[currentNode];
    //     // depositContract.deposit()
    //     // mint mpETH token
    // }
}
