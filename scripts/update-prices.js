#!/usr/bin/env node
/**
 * Обновить on-chain цены SatanicExchange с Coinbase.
 * EXCHANGE=0x... PRIVATE_KEY=0x... RPC=https://... node scripts/update-prices.js
 */
const { JsonRpcProvider, Wallet, Contract } = require('ethers');

const ABI = [
  'function setEthPrice(uint256 usd8)',
  'function setSatanPrice(uint256 usd8)',
  'function setSusdPrice(uint256 usd8)',
  'function ethUsd8() view returns (uint256)',
];

async function spot(pair) {
  const res = await fetch('https://api.coinbase.com/v2/prices/' + pair + '/spot');
  if (!res.ok) throw new Error('Coinbase ' + pair + ' ' + res.status);
  const j = await res.json();
  return Number(j.data.amount);
}

function toUsd8(n) {
  return BigInt(Math.round(n * 1e8));
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const exchange = process.env.EXCHANGE;
  const rpc = process.env.RPC || process.env.RPC_BASE || 'https://base-rpc.publicnode.com';
  if (!pk || !exchange) {
    console.error('Usage: EXCHANGE=0x... PRIVATE_KEY=0x... RPC=... node scripts/update-prices.js');
    process.exit(1);
  }

  const eth = await spot('ETH-USD');
  console.log('Coinbase ETH-USD:', eth);

  const provider = new JsonRpcProvider(rpc);
  const wallet = new Wallet(pk, provider);
  const c = new Contract(exchange, ABI, wallet);

  const tx = await c.setEthPrice(toUsd8(eth));
  console.log('setEthPrice tx', tx.hash);
  await tx.wait();
  console.log('on-chain ethUsd8', (await c.ethUsd8()).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
