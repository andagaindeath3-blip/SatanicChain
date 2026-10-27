/**
 * Релизер моста SatanicChain — ETH, Base, BSC, Polygon, Arbitrum, OP, L1 666…
 * RELAYER_PRIVATE_KEY=0x... node relayer/index.js
 */
const fs = require('fs');
const path = require('path');
const { JsonRpcProvider, Wallet, Contract, NonceManager, getBytes } = require('ethers');

const artifacts = require(path.join(__dirname, '..', 'build', 'artifacts.json'));
const BRIDGE_ABI = artifacts.SatanicBridge?.abi || [
  'event BridgeOut(uint256 indexed nonce, address indexed token, address indexed sender, uint256 amount, uint256 destChainId, address recipient)',
  'function bridgeIn(address token, uint256 amount, uint256 srcChainId, address recipient, uint256 nonce, bytes signature)',
  'function digestFor(address token, uint256 amount, uint256 srcChainId, address recipient, uint256 nonce) view returns (bytes32)',
];

const STATE_PATH = process.env.RELAYER_STATE || path.join(__dirname, 'state.json');
const LOOKBACK = Number(process.env.RELAYER_LOOKBACK || 8000);
const loadState = () => (fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) : { lastBlock: {}, processed: [] });
const saveState = (s) => fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));

function envRpc(d) {
  const key = d.key ? String(d.key).toUpperCase() : '';
  return process.env['RPC_' + key] || process.env['RPC_' + d.chainId] || d.rpc || d.rpcUrl;
}

function symbolOf(deployment, tokenAddr) {
  const c = deployment.contracts || {};
  const t = (tokenAddr || '').toLowerCase();
  if (c.SatanicToken && c.SatanicToken.toLowerCase() === t) return 'SATAN';
  if (c.SatanicUSD && c.SatanicUSD.toLowerCase() === t) return 'SUSD';
  return null;
}

function addressOf(deployment, symbol) {
  const c = deployment.contracts || {};
  if (symbol === 'SATAN') return c.SatanicToken || null;
  if (symbol === 'SUSD') return c.SatanicUSD || null;
  return null;
}

function normalizeDeployments(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((d) => d && d.contracts && !d.error && !d.skipped)
    .map((d) => ({
      chainId: Number(d.chainId),
      name: d.name || d.network || String(d.chainId),
      key: d.key || '',
      rpc: d.rpc || d.rpcUrl,
      bridge: d.bridge || d.contracts.SatanicBridge,
      contracts: d.contracts,
    }))
    .filter((d) => d.bridge);
}

async function processOnce({ deployments, privateKey, state, log = console.log }) {
  const actions = [];
  const wallets = {};
  const walletFor = (d) => {
    if (!wallets[d.chainId]) {
      const provider = new JsonRpcProvider(envRpc(d), d.chainId, { staticNetwork: true });
      wallets[d.chainId] = { provider, signer: new NonceManager(new Wallet(privateKey, provider)) };
    }
    return wallets[d.chainId];
  };

  const pending = [];
  for (const d of deployments) {
    try {
      const { provider } = walletFor(d);
      const head = await provider.getBlockNumber();
      const from = state.lastBlock[d.chainId] ?? Math.max(0, head - LOOKBACK);
      if (head <= from) { state.lastBlock[d.chainId] = head; continue; }
      const bridge = new Contract(d.bridge, BRIDGE_ABI, provider);
      const events = await bridge.queryFilter(bridge.filters.BridgeOut(), from + 1, head);
      state.lastBlock[d.chainId] = head;
      for (const ev of events) {
        if (state.processed.includes(String(ev.args.nonce))) continue;
        pending.push({ source: d, args: ev.args });
      }
    } catch (e) {
      log(`[${d.chainId}] ${e.shortMessage || e.message}`);
    }
  }

  for (const item of pending) {
    const { source, args } = item;
    const destChainId = Number(args.destChainId);
    const dest = deployments.find((d) => d.chainId === destChainId);
    if (!dest) continue;
    const sym = symbolOf(source, args.token);
    const destToken = addressOf(dest, sym);
    if (!sym || !destToken) continue;

    const { signer } = walletFor(dest);
    const bridge = new Contract(dest.bridge, BRIDGE_ABI, signer);
    try {
      const digest = await bridge.digestFor(destToken, args.amount, Number(source.chainId), args.recipient, args.nonce);
      const signature = await signer.signMessage(getBytes(digest));
      const tx = await bridge.bridgeIn(destToken, args.amount, Number(source.chainId), args.recipient, args.nonce, signature);
      await tx.wait();
      state.processed.push(String(args.nonce));
      log(`✓ ${sym} ${source.chainId}→${destChainId} ${tx.hash}`);
      actions.push({ status: 'released', hash: tx.hash, symbol: sym });
    } catch (e) {
      log(`✗ ${source.chainId}→${destChainId}: ${e.shortMessage || e.message}`);
    }
  }
  if (state.processed.length > 5000) state.processed = state.processed.slice(-3000);
  saveState(state);
  return actions;
}

async function main() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const deploymentsPath = process.env.DEPLOYMENTS || path.join(__dirname, '..', 'build', 'deployments.json');
  if (!privateKey) { console.error('RELAYER_PRIVATE_KEY required'); process.exit(1); }
  const deployments = normalizeDeployments(JSON.parse(fs.readFileSync(deploymentsPath, 'utf8')));
  console.log('Bridge networks:', deployments.length);
  const state = loadState();
  const once = process.argv.includes('--once');
  const tick = async () => { await processOnce({ deployments, privateKey, state }); };
  await tick();
  if (!once) setInterval(tick, Number(process.env.RELAYER_INTERVAL_MS || 15000));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { processOnce, normalizeDeployments };
