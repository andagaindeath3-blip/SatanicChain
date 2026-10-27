// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ProtocolTreasury — collects protocol revenue (create fees, DEX cuts)
contract ProtocolTreasury {
    address public owner;
    address public immutable preferredRecipient;

    event OwnershipTransferred(address indexed prev, address indexed next);
    event NativeReceived(address indexed from, uint256 amount);
    event NativeWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address preferredRecipient_) {
        require(preferredRecipient_ != address(0), "recipient");
        owner = preferredRecipient_;
        preferredRecipient = preferredRecipient_;
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "zero");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function withdrawNative(uint256 amount, address to) external onlyOwner {
        address dest = to == address(0) ? preferredRecipient : to;
        (bool ok, ) = dest.call{value: amount}("");
        require(ok, "native");
        emit NativeWithdrawn(dest, amount);
    }

    function withdrawAllNative() external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok, ) = preferredRecipient.call{value: bal}("");
        require(ok, "native");
        emit NativeWithdrawn(preferredRecipient, bal);
    }

    function withdrawToken(address token, uint256 amount, address to) external onlyOwner {
        address dest = to == address(0) ? preferredRecipient : to;
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", dest, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "token");
        emit TokenWithdrawn(token, dest, amount);
    }
}
