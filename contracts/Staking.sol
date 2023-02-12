// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IDeposit.sol";
import "./MetaPoolETH.sol";
import "./IWETH.sol";

contract Staking is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    struct Node {
        bytes pubkey;
        bytes withdrawCredentials;
        bytes signature;
        bytes32 depositDataRoot;
    }
    mapping(uint => Node) public nodes;

    uint private constant MAX_DEPOSIT = 100 ether; // TODO: Define max deposit if any
    uint private constant MIN_DEPOSIT = 0.01 ether;
    IDeposit public immutable depositContract;
    uint public currentNode;
    uint public nodesTotalBalance;
    uint public pendingStake;
    IWETH public immutable WETH;

    event Stake(uint nodeId, bytes indexed pubkey);
    event UpdateNodeData(uint nodeId, Node data);
    event UpdateNodesBalance(uint balance);

    modifier validDeposit(uint amount) {
        _checkDeposit(amount);
        _;
    }

    function _checkDeposit(uint amount) internal view {
        require(amount >= minDeposit(msg.sender), "Staking: MIN_DEPOSIT_ERROR");
        require(amount <= maxDeposit(msg.sender), "Staking: MAX_DEPOSIT_ERROR");
    }

    constructor(
        IDeposit _depositContract,
        Node[] memory _nodes,
        IWETH _weth
    ) payable ERC4626(IERC20(_weth)) ERC20("MetaPoolETH", "mpETH") {
        require(
            _weth.decimals() == 18,
            "wNative token error, implementation for 18 decimals"
        );
        uint initialStake = address(this).balance;
        require(initialStake % 32 ether == 0, "Invalid ETH amount");
        uint newNodesAmount = initialStake / 32 ether;
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
        _mint(msg.sender, initialStake);
        nodesTotalBalance = initialStake;
        currentNode = newNodesAmount;
        depositContract = _depositContract;
        WETH = _weth;
        emit Deposit(msg.sender, msg.sender, initialStake, initialStake);
    }

    receive() external payable {}

    /// @notice Returns total ETH held by vault + validators
    function totalAssets() public view override returns (uint) {
        return pendingStake + nodesTotalBalance;
    }

    function maxDeposit(address) public pure override returns (uint) {
        return MAX_DEPOSIT;
    }

    function minDeposit(address) public pure returns (uint) {
        return MIN_DEPOSIT;
    }

    /// @notice Will return the max withdraw for an user once Ethereum enable staking withdraw
    function maxWithdraw(address) public pure override returns (uint) {
        return 0;
    }

    /// @notice Update node data
    function updateNode(uint _nodeId, Node memory _node) external onlyOwner {
        require(
            _nodeId > currentNode,
            "ERROR: Trying to update a previous node"
        );
        nodes[_nodeId] = _node;
        emit UpdateNodeData(_nodeId, _node);
    }

    /// @notice Updates nodes total balance
    function updateNodesBalance(uint _newBalance) external onlyOwner {
        // TODO: Track users deposit and send a percentage of rewards to MetaPool
        nodesTotalBalance = _newBalance;
        emit UpdateNodesBalance(_newBalance);
    }

    /// @notice Stake ETH in contract to validators
    function pushToBacon(uint _nodesAmount) external {
        _nodesAmount = Math.min(address(this).balance % 32 ether, _nodesAmount);
        require(
            _nodesAmount > 0,
            "Not enough balance or trying to push 0 nodes"
        );
        require(_stake(_nodesAmount), "ERROR: Node data empty at last index");
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public override returns (uint256) {
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        WETH.withdraw(assets);
        uint256 shares = previewDeposit(assets);
        _deposit(msg.sender, receiver, assets, shares);
        return shares;
    }

    /// @notice Deposit ETH user and try to stake to validator
    /// Just one at a time to avoid high costs
    function depositETH(address receiver) external payable returns (uint256) {
        uint256 shares = previewDeposit(msg.value);
        _deposit(msg.sender, receiver, msg.value, shares);
        // TODO: Get mpETH from pool
        return shares;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override validDeposit(assets) {
        _mint(receiver, shares);
        _tryToStake();
        emit Deposit(caller, receiver, assets, shares);
    }

    function _tryToStake() private {
        _stake(Math.min(1, address(this).balance % 32 ether));
    }

    function _stake(uint _newNodesAmount) private returns (bool) {
        uint _currentNode = currentNode;
        uint _lastNode = _currentNode + _newNodesAmount;
        if (nodes[_lastNode].pubkey.length == 0) return false;

        for (uint i = _currentNode; i < _lastNode; i++) {
            Node memory node = nodes[i];
            depositContract.deposit{value: 32 ether}(
                node.pubkey,
                node.withdrawCredentials,
                node.signature,
                node.depositDataRoot
            );
            emit Stake(i, node.pubkey);
        }
        pendingStake = address(this).balance;
        nodesTotalBalance += _newNodesAmount * 32 ether;
        currentNode = _lastNode;
        return true;
    }
}
