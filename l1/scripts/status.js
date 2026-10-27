#!/usr/bin/env node
const http = require('http');
const RPC = process.env.RPC || 'http://127.0.0.1:8545';

function rpc(method, params = []) {
  return new Promise((resolve, reject) => {
    const u = new URL(RPC);
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const req = http.request({
      hostname: u.hostname, port: u.port || 80, path: u.pathname || '/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d).result); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const [chainId, block, peerCount, syncing] = await Promise.all([
      rpc('eth_chainId'), rpc('eth_blockNumber'), rpc('net_peerCount'), rpc('eth_syncing'),
    ]);
    console.log('══════════════════════════════════════');
    console.log('  SatanicChain L1 Status (PoSA)');
    console.log('══════════════════════════════════════');
    console.log('RPC:       ', RPC);
    console.log('chainId:   ', parseInt(chainId, 16), `(${chainId})`);
    console.log('block:     ', parseInt(block, 16));
    console.log('peers:     ', parseInt(peerCount, 16));
    console.log('syncing:   ', syncing === false ? 'no (synced)' : JSON.stringify(syncing));
    console.log('══════════════════════════════════════');
  } catch (e) {
    console.error('RPC unavailable:', e.message);
    console.error('Run: ./scripts/up.sh');
    process.exit(1);
  }
})();
