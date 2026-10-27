#!/usr/bin/env node
/**
 * SatanicChain PoS Relayer
 * Синхронизирует SatanicStaking active set → geth clique.propose
 *
 * STAKING_ADDRESS=0x... VALIDATOR_SET=0x... PRIVATE_KEY=0x... \
 *   RPC=http://127.0.0.1:8545 node scripts/pos-relayer.js
 */
const { ethers } = require('ethers');

const RPC = process.env.RPC || 'http://127.0.0.1:8545';
const PK = process.env.PRIVATE_KEY;
const STAKING = process.env.STAKING_ADDRESS;
const VALSET = process.env.VALIDATOR_SET;
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '30000', 10);

if (!PK) {
  console.error('Нужен PRIVATE_KEY (clique signer)');
  process.exit(1);
}

const STAKING_ABI = [
  'function getActiveSet() view returns (address[])',
  'function updateActiveSet()',
  'function votingPower(address) view returns (uint256)',
];
const VALSET_ABI = [
  'function getSigners() view returns (address[])',
  'function syncFromStaking()',
  'function diffWithStaking() view returns (address[] toAdd, address[] toRemove)',
];

async function cliquePropose(provider, address, auth) {
  try {
    await provider.send('clique_propose', [address, auth]);
    return true;
  } catch (e) {
    console.warn('clique_propose failed:', e.shortMessage || e.message);
    return false;
  }
}

async function cliqueGetSigners(provider) {
  try {
    return await provider.send('clique_getSigners', ['latest']);
  } catch {
    return [];
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, 666, { staticNetwork: true });
  const wallet = new ethers.Wallet(PK, provider);
  console.log('PoS Relayer');
  console.log('  signer:', await wallet.getAddress());
  console.log('  rpc:   ', RPC);

  const staking = STAKING ? new ethers.Contract(STAKING, STAKING_ABI, wallet) : null;
  const valset = VALSET ? new ethers.Contract(VALSET, VALSET_ABI, wallet) : null;

  async function tick() {
    try {
      if (staking) {
        try {
          const tx = await staking.updateActiveSet();
          await tx.wait();
          console.log(new Date().toISOString(), 'updateActiveSet ok');
        } catch (e) {}
      }

      if (valset) {
        try {
          const tx = await valset.syncFromStaking();
          await tx.wait();
          console.log(new Date().toISOString(), 'valset.syncFromStaking ok');
        } catch (e) {}

        const [toAdd, toRemove] = await valset.diffWithStaking();
        for (const addr of toAdd) {
          const ok = await cliquePropose(provider, addr, true);
          console.log(new Date().toISOString(), 'clique.propose ADD', addr, ok ? '✓' : '✗');
        }
        for (const addr of toRemove) {
          const ok = await cliquePropose(provider, addr, false);
          console.log(new Date().toISOString(), 'clique.propose REM', addr, ok ? '✓' : '✗');
        }
      }

      if (staking) {
        const active = await staking.getActiveSet();
        console.log(new Date().toISOString(), 'activeSet:', active.length);
      }
    } catch (e) {
      console.error(new Date().toISOString(), 'tick error:', e.shortMessage || e.message);
    }
  }

  await tick();
  setInterval(tick, INTERVAL_MS);
  console.log('Relayer running every', INTERVAL_MS, 'ms');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
