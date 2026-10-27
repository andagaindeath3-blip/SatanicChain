#!/usr/bin/env node
const { ethers } = require('ethers');
const { SATANIC_RPC, PUBLIC, CHAIN } = require('./rpc');

async function probe(name, url) {
  try {
    const p = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
    const net = await Promise.race([
      p.getNetwork(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 8s')), 8000)),
    ]);
    const block = await p.getBlockNumber();
    console.log('OK  ' + name.padEnd(14) + ' chainId=' + Number(net.chainId) + ' block=' + block + '  ' + url);
    return true;
  } catch (e) {
    console.log('FAIL ' + name.padEnd(14) + ' ' + String(e.message).slice(0, 60) + '  ' + url);
    return false;
  }
}

(async () => {
  console.log('SatanicChain RPC check\n');
  await probe('satanic-l1', SATANIC_RPC);
  for (const [k, u] of Object.entries(PUBLIC)) {
    await probe(k, u);
  }
  console.log('\nExpected L1 chainId: ' + CHAIN.chainId);
})();
