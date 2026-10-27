// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title SatanicStaking — permissionless PoS для SatanicChain
/// @notice Любой может застейкать native SATAN и стать кандидатом в валидаторы.
///         Активный набор = топ-N по стейку. Слэшинг за misbehavior.

contract SatanicStaking {
    uint256 public constant MIN_STAKE = 10_000 ether;
    uint256 public constant MAX_VALIDATORS = 21;
    uint256 public constant UNBONDING_PERIOD = 7 days;
    uint256 public constant JAIL_DURATION = 2 days;
    uint256 public constant SLASH_FRACTION_BPS = 500;
    uint256 public constant COMMISSION_MAX_BPS = 2000;
    uint256 public constant EPOCH_BLOCKS = 100;

    struct Validator {
        address operator;
        address rewardAddr;
        uint256 selfStake;
        uint256 totalDelegated;
        uint256 commissionBps;
        bool    jailed;
        uint256 jailUntil;
        bool    active;
        string  moniker;
    }

    struct Delegation {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct Unbonding {
        uint256 amount;
        uint256 releaseTime;
    }

    address public owner;
    address public treasury;

    mapping(address => Validator) public validators;
    address[] public validatorList;
    address[] public activeSet;

    mapping(address => mapping(address => Delegation)) public delegations;
    mapping(address => Unbonding[]) public unbondings;

    uint256 public totalStaked;
    uint256 public lastEpochBlock;
    uint256 public rewardPerTokenStored;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;

    event ValidatorRegistered(address indexed operator, string moniker, uint256 commissionBps);
    event Staked(address indexed operator, address indexed delegator, uint256 amount);
    event UnstakeRequested(address indexed operator, address indexed delegator, uint256 amount, uint256 releaseTime);
    event UnstakeClaimed(address indexed delegator, uint256 amount);
    event Slashed(address indexed operator, uint256 amount, string reason);
    event Jailed(address indexed operator, uint256 until);
    event Unjailed(address indexed operator);
    event ActiveSetUpdated(address[] newSet, uint256 epochBlock);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error NotOwner();
    error BelowMinStake();
    error InvalidCommission();
    error AlreadyRegistered();
    error NotRegistered();
    error JailedValidator();
    error InsufficientStake();
    error NothingToClaim();
    error StillBonding();
    error ZeroAmount();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury == address(0) ? msg.sender : _treasury;
        lastUpdateTime = block.timestamp;
        lastEpochBlock = block.number;
    }

    function registerValidator(
        address rewardAddr,
        uint256 commissionBps,
        string calldata moniker
    ) external payable {
        if (msg.value < MIN_STAKE) revert BelowMinStake();
        if (commissionBps > COMMISSION_MAX_BPS) revert InvalidCommission();
        if (validators[msg.sender].operator != address(0)) revert AlreadyRegistered();

        validators[msg.sender] = Validator({
            operator: msg.sender,
            rewardAddr: rewardAddr == address(0) ? msg.sender : rewardAddr,
            selfStake: msg.value,
            totalDelegated: 0,
            commissionBps: commissionBps,
            jailed: false,
            jailUntil: 0,
            active: false,
            moniker: moniker
        });
        validatorList.push(msg.sender);
        totalStaked += msg.value;

        emit ValidatorRegistered(msg.sender, moniker, commissionBps);
        emit Staked(msg.sender, msg.sender, msg.value);
        _tryUpdateActiveSet();
    }

    function stake(address operator) external payable {
        if (msg.value == 0) revert ZeroAmount();
        Validator storage v = validators[operator];
        if (v.operator == address(0)) revert NotRegistered();
        if (v.jailed) revert JailedValidator();

        if (msg.sender == operator) {
            v.selfStake += msg.value;
        } else {
            v.totalDelegated += msg.value;
        }
        delegations[operator][msg.sender].amount += msg.value;
        totalStaked += msg.value;

        emit Staked(operator, msg.sender, msg.value);
        _tryUpdateActiveSet();
    }

    function requestUnstake(address operator, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Delegation storage d = delegations[operator][msg.sender];
        if (d.amount < amount) revert InsufficientStake();

        d.amount -= amount;
        Validator storage v = validators[operator];
        if (msg.sender == operator) {
            if (v.selfStake < amount) revert InsufficientStake();
            v.selfStake -= amount;
        } else {
            v.totalDelegated -= amount;
        }
        totalStaked -= amount;

        uint256 release = block.timestamp + UNBONDING_PERIOD;
        unbondings[msg.sender].push(Unbonding({ amount: amount, releaseTime: release }));

        emit UnstakeRequested(operator, msg.sender, amount, release);
        _tryUpdateActiveSet();
    }

    function claimUnbonded() external {
        Unbonding[] storage q = unbondings[msg.sender];
        uint256 total;
        uint256 i = 0;
        while (i < q.length) {
            if (q[i].releaseTime <= block.timestamp) {
                total += q[i].amount;
                q[i] = q[q.length - 1];
                q.pop();
            } else {
                i++;
            }
        }
        if (total == 0) revert NothingToClaim();
        (bool ok, ) = msg.sender.call{value: total}("");
        if (!ok) revert TransferFailed();
        emit UnstakeClaimed(msg.sender, total);
    }

    function slash(address operator, string calldata reason) external onlyOwner {
        Validator storage v = validators[operator];
        if (v.operator == address(0)) revert NotRegistered();

        uint256 slashable = v.selfStake + v.totalDelegated;
        uint256 amount = (slashable * SLASH_FRACTION_BPS) / 10_000;
        if (amount > v.selfStake) {
            uint256 fromDelegated = amount - v.selfStake;
            v.selfStake = 0;
            v.totalDelegated -= fromDelegated;
        } else {
            v.selfStake -= amount;
        }
        totalStaked -= amount;

        (bool ok, ) = treasury.call{value: amount}("");
        if (!ok) revert TransferFailed();

        v.jailed = true;
        v.jailUntil = block.timestamp + JAIL_DURATION;
        v.active = false;

        emit Slashed(operator, amount, reason);
        emit Jailed(operator, v.jailUntil);
        _forceUpdateActiveSet();
    }

    function unjail() external {
        Validator storage v = validators[msg.sender];
        if (v.operator == address(0)) revert NotRegistered();
        if (!v.jailed) return;
        if (block.timestamp < v.jailUntil) revert StillBonding();
        if (v.selfStake < MIN_STAKE) revert BelowMinStake();
        v.jailed = false;
        v.jailUntil = 0;
        emit Unjailed(msg.sender);
        _tryUpdateActiveSet();
    }

    function _power(address op) internal view returns (uint256) {
        Validator storage v = validators[op];
        if (v.jailed || v.operator == address(0)) return 0;
        return v.selfStake + v.totalDelegated;
    }

    function _computeActiveSet() internal view returns (address[] memory) {
        uint256 n = validatorList.length;
        address[] memory candidates = new address[](n);
        uint256[] memory powers = new uint256[](n);
        uint256 count;

        for (uint256 i = 0; i < n; i++) {
            address op = validatorList[i];
            uint256 p = _power(op);
            if (p >= MIN_STAKE) {
                candidates[count] = op;
                powers[count] = p;
                count++;
            }
        }

        uint256 k = count < MAX_VALIDATORS ? count : MAX_VALIDATORS;
        for (uint256 i = 0; i < k; i++) {
            uint256 maxIdx = i;
            for (uint256 j = i + 1; j < count; j++) {
                if (powers[j] > powers[maxIdx]) maxIdx = j;
            }
            if (maxIdx != i) {
                (powers[i], powers[maxIdx]) = (powers[maxIdx], powers[i]);
                (candidates[i], candidates[maxIdx]) = (candidates[maxIdx], candidates[i]);
            }
        }

        address[] memory result = new address[](k);
        for (uint256 i = 0; i < k; i++) result[i] = candidates[i];
        return result;
    }

    function _tryUpdateActiveSet() internal {
        if (block.number < lastEpochBlock + EPOCH_BLOCKS) return;
        _forceUpdateActiveSet();
    }

    function _forceUpdateActiveSet() internal {
        address[] memory newSet = _computeActiveSet();
        for (uint256 i = 0; i < activeSet.length; i++) {
            validators[activeSet[i]].active = false;
        }
        for (uint256 i = 0; i < newSet.length; i++) {
            validators[newSet[i]].active = true;
        }
        activeSet = newSet;
        lastEpochBlock = block.number;
        emit ActiveSetUpdated(newSet, lastEpochBlock);
    }

    function updateActiveSet() external {
        _forceUpdateActiveSet();
    }

    function getActiveSet() external view returns (address[] memory) {
        return activeSet;
    }

    function getValidator(address op) external view returns (Validator memory) {
        return validators[op];
    }

    function validatorCount() external view returns (uint256) {
        return validatorList.length;
    }

    function stakeOf(address operator, address delegator) external view returns (uint256) {
        return delegations[operator][delegator].amount;
    }

    function votingPower(address operator) external view returns (uint256) {
        return _power(operator);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setTreasury(address t) external onlyOwner {
        treasury = t;
    }

    receive() external payable {}
}
