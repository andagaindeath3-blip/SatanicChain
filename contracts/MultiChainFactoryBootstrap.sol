// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./TokenFactory.sol";
import "./TokenDEX.sol";

/// @title MultiChainFactoryBootstrap — one tx: Factory + DEX on current chain
/// Run identical deploy on every EVM network (deploy:factory:all / Admin)
contract MultiChainFactoryBootstrap {
    address public immutable factory;
    address public immutable dex;
    address public immutable deployer;
    uint256 public immutable chainId;

    event Bootstrapped(address factory, address dex, uint256 chainId);

    constructor(address feeRecipient, uint256 createFee) {
        deployer = msg.sender;
        uint256 id;
        assembly { id := chainid() }
        chainId = id;
        TokenFactory f = new TokenFactory(feeRecipient, createFee);
        TokenDEX d = new TokenDEX();
        factory = address(f);
        dex = address(d);
        emit Bootstrapped(factory, dex, id);
    }
}
