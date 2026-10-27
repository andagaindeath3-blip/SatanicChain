const NETWORKS = [
  { key: 'satanic', name: 'SatanicChain', chainId: 666, rpc: process.env.RPC_SATANIC || 'http://127.0.0.1:8545', explorer: '/explorer', currency: 'SATAN', native: true },
  { key: 'ethereum', name: 'Ethereum', chainId: 1, rpc: process.env.RPC_ETHEREUM || 'https://ethereum-rpc.publicnode.com', currency: 'ETH' },
  { key: 'base', name: 'Base', chainId: 8453, rpc: process.env.RPC_BASE || 'https://base-rpc.publicnode.com', currency: 'ETH' },
  { key: 'bsc', name: 'BNB Smart Chain', chainId: 56, rpc: process.env.RPC_BSC || 'https://bsc-rpc.publicnode.com', currency: 'BNB' },
  { key: 'arbitrum', name: 'Arbitrum One', chainId: 42161, rpc: process.env.RPC_ARBITRUM || 'https://arbitrum-one-rpc.publicnode.com', currency: 'ETH' },
  { key: 'optimism', name: 'OP Mainnet', chainId: 10, rpc: process.env.RPC_OPTIMISM || 'https://optimism-rpc.publicnode.com', currency: 'ETH' },
  { key: 'polygon', name: 'Polygon', chainId: 137, rpc: process.env.RPC_POLYGON || 'https://polygon-bor-rpc.publicnode.com', currency: 'POL' },
  { key: 'avalanche', name: 'Avalanche C-Chain', chainId: 43114, rpc: process.env.RPC_AVALANCHE || 'https://avalanche-c-chain-rpc.publicnode.com', currency: 'AVAX' },
  { key: 'linea', name: 'Linea', chainId: 59144, rpc: process.env.RPC_LINEA || 'https://linea-rpc.publicnode.com', currency: 'ETH' },
  { key: 'scroll', name: 'Scroll', chainId: 534352, rpc: process.env.RPC_SCROLL || 'https://scroll-rpc.publicnode.com', currency: 'ETH' },
  { key: 'sepolia', name: 'Sepolia', chainId: 11155111, rpc: process.env.RPC_SEPOLIA || 'https://ethereum-sepolia-rpc.publicnode.com', currency: 'ETH', testnet: true },
  { key: 'baseSepolia', name: 'Base Sepolia', chainId: 84532, rpc: process.env.RPC_BASE_SEPOLIA || 'https://base-sepolia-rpc.publicnode.com', currency: 'ETH', testnet: true },
];
function allRoutes() {
  const keys = NETWORKS.map((n) => n.key);
  const routes = [];
  for (const a of keys) {
    for (const b of keys) {
      if (a === b) continue;
      routes.push({
        from: a, to: b,
        paths: [
          { type: 'direct_bridge', hops: [a, b] },
          { type: 'via_satanic', hops: a === 'satanic' || b === 'satanic' ? [a, b] : [a, 'satanic', b] },
          { type: 'via_ethereum', hops: a === 'ethereum' || b === 'ethereum' ? [a, b] : [a, 'ethereum', b] },
          { type: 'via_base', hops: a === 'base' || b === 'base' ? [a, b] : [a, 'base', b] },
        ],
      });
    }
  }
  return routes;
}
function byKey(key) {
  return NETWORKS.find((n) => n.key === key || String(n.chainId) === String(key));
}
module.exports = { NETWORKS, allRoutes, byKey };
