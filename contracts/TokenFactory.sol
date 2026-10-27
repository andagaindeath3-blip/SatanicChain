// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./UserToken.sol";

/// @title TokenFactory — create ERC-20 coins on this EVM chain
contract TokenFactory {
    struct TokenInfo {
        address token;
        address creator;
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        uint256 createdAt;
    }

    address public immutable feeRecipient;
    uint256 public createFee;
    uint256 public tokenCount;

    mapping(uint256 => TokenInfo) public tokens;
    mapping(address => uint256[]) public creatorTokens;
    mapping(address => bool) public isFactoryToken;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        uint256 indexed id
    );
    event CreateFeeUpdated(uint256 fee);

    constructor(address feeRecipient_, uint256 createFee_) {
        require(feeRecipient_ != address(0), "feeRecipient");
        feeRecipient = feeRecipient_;
        createFee = createFee_;
    }

    function setCreateFee(uint256 fee) external {
        require(msg.sender == feeRecipient, "only fee recipient");
        createFee = fee;
        emit CreateFeeUpdated(fee);
    }

    function createToken(
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 initialSupply
    ) external payable returns (address tokenAddr) {
        require(bytes(name_).length > 0 && bytes(symbol_).length > 0, "name/symbol");
        require(decimals_ <= 18, "decimals");
        require(msg.value >= createFee, "fee");

        if (createFee > 0) {
            (bool ok, ) = feeRecipient.call{value: createFee}("");
            require(ok, "fee transfer");
        }
        if (msg.value > createFee) {
            (bool ok2, ) = msg.sender.call{value: msg.value - createFee}("");
            require(ok2, "refund");
        }

        UserToken t = new UserToken(name_, symbol_, decimals_, initialSupply, msg.sender);
        tokenAddr = address(t);

        uint256 id = tokenCount++;
        tokens[id] = TokenInfo({
            token: tokenAddr,
            creator: msg.sender,
            name: name_,
            symbol: symbol_,
            decimals: decimals_,
            initialSupply: initialSupply,
            createdAt: block.timestamp
        });
        creatorTokens[msg.sender].push(id);
        isFactoryToken[tokenAddr] = true;

        emit TokenCreated(tokenAddr, msg.sender, name_, symbol_, decimals_, initialSupply, id);
    }

    function getCreatorTokenIds(address creator) external view returns (uint256[] memory) {
        return creatorTokens[creator];
    }

    function getToken(uint256 id) external view returns (TokenInfo memory) {
        return tokens[id];
    }
}
