window.DAPP_CONFIG = {
  projectId: '',
  defaultChainId: 1,
  appName: 'SatanicChain',
  appUrl: typeof location !== 'undefined' ? location.origin : 'https://satanicchain.app',
  logo: 'logo.gif',
  deployments: {},
  chains: [
    { id: 666, name: 'SatanicChain', rpc: 'http://127.0.0.1:8545', explorer: 'https://satanic.chain', currency: 'SATAN' },
    { id: 1, name: 'Ethereum', rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io', currency: 'ETH' },
    { id: 56, name: 'BNB Smart Chain', rpc: 'https://bsc-rpc.publicnode.com', explorer: 'https://bscscan.com', currency: 'BNB' },
    { id: 8453, name: 'Base', rpc: 'https://base-rpc.publicnode.com', explorer: 'https://basescan.org', currency: 'ETH' },
    { id: 42161, name: 'Arbitrum One', rpc: 'https://arbitrum-one-rpc.publicnode.com', explorer: 'https://arbiscan.io', currency: 'ETH' },
    { id: 10, name: 'Optimism', rpc: 'https://optimism-rpc.publicnode.com', explorer: 'https://optimistic.etherscan.io', currency: 'ETH' },
    { id: 137, name: 'Polygon', rpc: 'https://polygon-bor-rpc.publicnode.com', explorer: 'https://polygonscan.com', currency: 'POL' },
    { id: 43114, name: 'Avalanche', rpc: 'https://avalanche-c-chain-rpc.publicnode.com', explorer: 'https://snowtrace.io', currency: 'AVAX' },
    { id: 11155111, name: 'Sepolia', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.etherscan.io', currency: 'ETH' }
  ],
  bridge: { minAmount: '1', relayerNote: 'release after relayer confirmation' }
};
