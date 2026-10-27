// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ValidatorSet — мост между on-chain стейкингом и clique-подписантами
interface IStakingView {
    function getActiveSet() external view returns (address[] memory);
    function votingPower(address operator) external view returns (uint256);
}

contract ValidatorSet {
    address public owner;
    IStakingView public staking;

    address[] public signers;
    mapping(address => bool) public isSigner;
    mapping(address => bool) public relayers;

    uint256 public lastSyncBlock;
    uint256 public minSyncInterval = 50;

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event SetSynced(address[] newSigners, uint256 blockNumber);
    event RelayerUpdated(address indexed relayer, bool allowed);

    error NotAuthorized();
    error TooFrequent();
    error InvalidStaking();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyRelayer() {
        if (!relayers[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }

    constructor(address staking_, address[] memory initialSigners) {
        owner = msg.sender;
        staking = IStakingView(staking_);
        for (uint256 i = 0; i < initialSigners.length; i++) {
            _add(initialSigners[i]);
        }
        lastSyncBlock = block.number;
    }

    function setStaking(address s) external onlyOwner {
        if (s == address(0)) revert InvalidStaking();
        staking = IStakingView(s);
    }

    function setRelayer(address r, bool allowed) external onlyOwner {
        relayers[r] = allowed;
        emit RelayerUpdated(r, allowed);
    }

    function setMinSyncInterval(uint256 blocks) external onlyOwner {
        minSyncInterval = blocks;
    }

    function syncFromStaking() external onlyRelayer {
        if (block.number < lastSyncBlock + minSyncInterval) revert TooFrequent();
        address[] memory active = staking.getActiveSet();
        _replaceAll(active);
        lastSyncBlock = block.number;
        emit SetSynced(active, block.number);
    }

    function setSigners(address[] calldata newSigners) external onlyOwner {
        _replaceAll(newSigners);
        lastSyncBlock = block.number;
        emit SetSynced(newSigners, block.number);
    }

    function _replaceAll(address[] memory newSigners) internal {
        for (uint256 i = 0; i < signers.length; i++) {
            isSigner[signers[i]] = false;
            emit SignerRemoved(signers[i]);
        }
        delete signers;
        for (uint256 i = 0; i < newSigners.length; i++) {
            _add(newSigners[i]);
        }
    }

    function _add(address s) internal {
        if (s == address(0) || isSigner[s]) return;
        isSigner[s] = true;
        signers.push(s);
        emit SignerAdded(s);
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function signerCount() external view returns (uint256) {
        return signers.length;
    }

    function diffWithStaking() external view returns (
        address[] memory toAdd,
        address[] memory toRemove
    ) {
        address[] memory active = staking.getActiveSet();
        address[] memory addTmp = new address[](active.length);
        address[] memory remTmp = new address[](signers.length);
        uint256 ai;
        uint256 ri;

        for (uint256 i = 0; i < active.length; i++) {
            if (!isSigner[active[i]]) {
                addTmp[ai++] = active[i];
            }
        }
        for (uint256 i = 0; i < signers.length; i++) {
            bool found;
            for (uint256 j = 0; j < active.length; j++) {
                if (signers[i] == active[j]) { found = true; break; }
            }
            if (!found) remTmp[ri++] = signers[i];
        }

        toAdd = new address[](ai);
        toRemove = new address[](ri);
        for (uint256 i = 0; i < ai; i++) toAdd[i] = addTmp[i];
        for (uint256 i = 0; i < ri; i++) toRemove[i] = remTmp[i];
    }

    function transferOwnership(address n) external onlyOwner {
        require(n != address(0));
        owner = n;
    }
}
