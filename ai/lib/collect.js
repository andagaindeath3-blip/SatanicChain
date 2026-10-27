const path = require('path');
let SATANIC_RPC = process.env.RPC_SATANIC || 'http://127.0.0.1:8545';
try {
  SATANIC_RPC = require(path.join(__dirname, '..', '..', 'scripts', 'rpc')).SATANIC_RPC;
} catch (_) {}

async function rpcCall(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params || [] }),
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

async function collect(rpcUrl) {
  const url = rpcUrl || SATANIC_RPC;
  const out = {
    ts: Date.now(), rpcUrl: url, ok: false,
    chainId: null, blockNumber: null, blockTime: null,
    latencyMs: null, peerCount: null, gasPrice: null, error: null,
  };
  const t0 = Date.now();
  try {
    const chainHex = await rpcCall(url, 'eth_chainId', []);
    out.latencyMs = Date.now() - t0;
    out.chainId = parseInt(chainHex, 16);
    const blockHex = await rpcCall(url, 'eth_blockNumber', []);
    out.blockNumber = parseInt(blockHex, 16);
    const block = await rpcCall(url, 'eth_getBlockByNumber', [blockHex, false]);
    out.blockTime = block && block.timestamp ? parseInt(block.timestamp, 16) : null;
    try { out.gasPrice = parseInt(await rpcCall(url, 'eth_gasPrice', []), 16); } catch (_) {}
    try { out.peerCount = parseInt(await rpcCall(url, 'net_peerCount', []), 16); } catch (_) {}
    out.ok = true;
  } catch (e) {
    out.error = e.message || String(e);
    out.latencyMs = Date.now() - t0;
  }
  return out;
}
module.exports = { collect };
