// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import {IDeposit} from "../interfaces/IDeposit.sol";

contract MockDeposit is IDeposit {
    bytes private _pubkey;
    bytes private _withdrawal_credentials;
    bytes private _signature;
    bytes32 private _deposit_data_root;

    function deposit(
        bytes memory pubkey,
        bytes memory withdrawal_credentials,
        bytes memory signature,
        bytes32 deposit_data_root
    ) external payable override {
        _pubkey = pubkey;
        _withdrawal_credentials = withdrawal_credentials;
        _signature = signature;
        _deposit_data_root = deposit_data_root;
    }

    function get_deposit_root() external view override returns (bytes32) {
        return _deposit_data_root;
    }
}