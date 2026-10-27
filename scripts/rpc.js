/**
 * SatanicChain RPC endpoints
 * Override any URL with env: RPC_SATANIC, RPC_ETHEREUM, RPC_BASE, ...
 */
const CHAIN = {
  name: 'SatanicChain',
  chainId: 666,
  chainIdHex: '0x29a',
  symbol: 'SATAN',
  decimals: 18,
  explorer: process.env.EXPLORER_SATANIC || 'https://satanic.chain',
};

const SATANIC_RPC =
  process.env.RPC_SATANIC ||
  process.env.RPC_URL ||
  'http://127.0.0.1:8545';

const SATANIC_WS =
  process.env.WS_SATANIC ||
  'ws://127.0.0.1:8546';

const PUBLIC = {
  ethereum: process.env.RPC_ETHEREUM || 'https://ethereum-rpc.publicnode.com',
  bsc: process.env.RPC_BSC || 'https://bsc-rpc.publicnode.com',
  polygon: process.env.RPC_POLYGON || 'https://polygon-bor-rpc.publicnode.com',
  arbitrum: process.env.RPC_ARBITRUM || 'https://arbitrum-one-rpc.publicnode.com',
  optimism: process.env.RPC_OPTIMISM || 'https://optimism-rpc.publicnode.com',
  base: process.env.RPC_BASE || 'https://base-rpc.publicnode.com',
  avalanche: process.env.RPC_AVALANCHE || 'https://avalanche-c-chain-rpc.publicnode.com',
  linea: process.env.RPC_LINEA || 'https://linea-rpc.publicnode.com',
  scroll: process.env.RPC_SCROLL || 'https://scroll-rpc.publicnode.com',
  sepolia: process.env.RPC_SEPOLIA || 'https://ethereum-sepolia-rpc.publicnode.com',
  baseSepolia: process.env.RPC_BASE_SEPOLIA || 'https://base-sepolia-rpc.publicnode.com',
};

function satanicWalletAdd(rpcUrl) {
  return {
    chainId: CHAIN.chainIdHex,
    chainName: CHAIN.name,
    nativeCurrency: { name: 'SATAN', symbol: 'SATAN', decimals: 18 },
    rpcUrls: [rpcUrl || SATANIC_RPC],
    blockExplorerUrls: CHAIN.explorer ? [CHAIN.explorer] : [],
  };
}

module.exports = {
  CHAIN,
  SATANIC_RPC,
  SATANIC_WS,
  PUBLIC,
  satanicWalletAdd,
};
