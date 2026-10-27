// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20Dex {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title TokenDEX — constant-product AMM for any user token pair
contract TokenDEX {
    struct Pair {
        address token0;
        address token1;
        uint112 reserve0;
        uint112 reserve1;
        uint256 totalLiquidity;
        mapping(address => uint256) liquidityOf;
    }

    uint256 public constant FEE_BPS = 30;
    mapping(bytes32 => Pair) private pairs;
    bytes32[] public pairIds;

    event PairCreated(address indexed tokenA, address indexed tokenB, bytes32 indexed pairId);
    event LiquidityAdded(bytes32 indexed pairId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event LiquidityRemoved(bytes32 indexed pairId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(bytes32 indexed pairId, address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut);

    function pairKey(address a, address b) public pure returns (bytes32) {
        (address t0, address t1) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(t0, t1));
    }

    function getReserves(address tokenA, address tokenB) external view returns (uint112 r0, uint112 r1, address t0, address t1) {
        bytes32 id = pairKey(tokenA, tokenB);
        Pair storage p = pairs[id];
        return (p.reserve0, p.reserve1, p.token0, p.token1);
    }

    function createPair(address tokenA, address tokenB) public returns (bytes32 id) {
        require(tokenA != tokenB && tokenA != address(0) && tokenB != address(0), "tokens");
        id = pairKey(tokenA, tokenB);
        Pair storage p = pairs[id];
        require(p.token0 == address(0), "exists");
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        p.token0 = t0;
        p.token1 = t1;
        pairIds.push(id);
        emit PairCreated(t0, t1, id);
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "amounts");
        bytes32 id = pairKey(tokenA, tokenB);
        Pair storage p = pairs[id];
        if (p.token0 == address(0)) {
            createPair(tokenA, tokenB);
            p = pairs[id];
        }
        bool aIs0 = tokenA == p.token0;
        uint256 amount0 = aIs0 ? amountA : amountB;
        uint256 amount1 = aIs0 ? amountB : amountA;
        _pull(p.token0, msg.sender, amount0);
        _pull(p.token1, msg.sender, amount1);
        if (p.totalLiquidity == 0) {
            liquidity = _sqrt(amount0 * amount1);
            require(liquidity > 0, "liquidity");
        } else {
            uint256 l0 = (amount0 * p.totalLiquidity) / uint256(p.reserve0);
            uint256 l1 = (amount1 * p.totalLiquidity) / uint256(p.reserve1);
            liquidity = l0 < l1 ? l0 : l1;
            require(liquidity > 0, "liquidity");
        }
        p.reserve0 = uint112(uint256(p.reserve0) + amount0);
        p.reserve1 = uint112(uint256(p.reserve1) + amount1);
        p.totalLiquidity += liquidity;
        p.liquidityOf[msg.sender] += liquidity;
        emit LiquidityAdded(id, msg.sender, amount0, amount1, liquidity);
    }

    function removeLiquidity(address tokenA, address tokenB, uint256 liquidity) external returns (uint256 amount0, uint256 amount1) {
        bytes32 id = pairKey(tokenA, tokenB);
        Pair storage p = pairs[id];
        require(p.liquidityOf[msg.sender] >= liquidity && liquidity > 0, "lp");
        amount0 = (liquidity * uint256(p.reserve0)) / p.totalLiquidity;
        amount1 = (liquidity * uint256(p.reserve1)) / p.totalLiquidity;
        p.liquidityOf[msg.sender] -= liquidity;
        p.totalLiquidity -= liquidity;
        p.reserve0 = uint112(uint256(p.reserve0) - amount0);
        p.reserve1 = uint112(uint256(p.reserve1) - amount1);
        _push(p.token0, msg.sender, amount0);
        _push(p.token1, msg.sender, amount1);
        emit LiquidityRemoved(id, msg.sender, amount0, amount1, liquidity);
    }

    function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut) {
        require(amountIn > 0 && tokenIn != tokenOut, "input");
        bytes32 id = pairKey(tokenIn, tokenOut);
        Pair storage p = pairs[id];
        require(p.token0 != address(0), "no pair");
        bool inIs0 = tokenIn == p.token0;
        (uint256 rIn, uint256 rOut) = inIs0 ? (uint256(p.reserve0), uint256(p.reserve1)) : (uint256(p.reserve1), uint256(p.reserve0));
        _pull(tokenIn, msg.sender, amountIn);
        uint256 amountInWithFee = amountIn * (10_000 - FEE_BPS);
        amountOut = (amountInWithFee * rOut) / (rIn * 10_000 + amountInWithFee);
        require(amountOut >= minOut && amountOut > 0, "slippage");
        if (inIs0) {
            p.reserve0 = uint112(rIn + amountIn);
            p.reserve1 = uint112(rOut - amountOut);
        } else {
            p.reserve1 = uint112(rIn + amountIn);
            p.reserve0 = uint112(rOut - amountOut);
        }
        _push(tokenOut, msg.sender, amountOut);
        emit Swap(id, msg.sender, tokenIn, amountIn, amountOut);
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut) {
        bytes32 id = pairKey(tokenIn, tokenOut);
        Pair storage p = pairs[id];
        if (p.token0 == address(0) || amountIn == 0) return 0;
        bool inIs0 = tokenIn == p.token0;
        (uint256 rIn, uint256 rOut) = inIs0 ? (uint256(p.reserve0), uint256(p.reserve1)) : (uint256(p.reserve1), uint256(p.reserve0));
        if (rIn == 0 || rOut == 0) return 0;
        uint256 amountInWithFee = amountIn * (10_000 - FEE_BPS);
        return (amountInWithFee * rOut) / (rIn * 10_000 + amountInWithFee);
    }

    function pairCount() external view returns (uint256) { return pairIds.length; }

    function _pull(address token, address from, uint256 amount) internal {
        require(IERC20Dex(token).transferFrom(from, address(this), amount), "pull");
    }
    function _push(address token, address to, uint256 amount) internal {
        require(IERC20Dex(token).transfer(to, amount), "push");
    }
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) { z = 1; }
    }
}
