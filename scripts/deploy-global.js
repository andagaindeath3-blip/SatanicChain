#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const networks = require('./networks');

const TREASURY = process.env.FEE_RECIPIENT || '0x1F51415288f00e50161882A7702D8511208B3Dd8';
const CREATE_FEE = process.env.CREATE_FEE || '0.00013666';
const GLOBAL_KEYS = ['ethereum', 'base', 'bsc', 'arbitrum', 'optimism', 'polygon', 'avalanche', 'satanic'];
const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'deployments');

function load(name) {
  const p = path.join(ROOT, 'build', name + '.json');
  if (!fs.existsSync(p)) throw new Error('compile first: missing ' + name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function deployBootstrap(wallet) {
  const art = load('MultiChainFactoryBootstrap');
  const F = new ethers.ContractFactory(art.abi, art.bytecode, wallet);
  const c = await F.deploy(TREASURY, ethers.parseEther(CREATE_FEE));
  await c.waitForDeployment();
  return {
    bootstrap: await c.getAddress(),
    factory: await c.factory(),
    dex: await c.dex(),
    treasury: await c.treasury(),
  };
}

async function deployBridge(wallet) {
  try {
    const art = load('SatanicBridge');
    const F = new ethers.ContractFactory(art.abi, art.bytecode, wallet);
    let c;
    try { c = await F.deploy(TREASURY); } catch (_) { c = await F.deploy(); }
    await c.waitForDeployment();
    return await c.getAddress();
  } catch (e) {
    console.log('  bridge skip:', (e.shortMessage || e.message || '').slice(0, 100));
    return null;
  }
}

async function runNet(net) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY required');
  const provider = new ethers.JsonRpcProvider(net.rpc, net.chainId, { staticNetwork: true });
  const wallet = new ethers.Wallet(pk, provider);
  console.log('\n===', net.name, 'chainId', net.chainId);
  console.log('  from', wallet.address);
  const stack = await deployBootstrap(wallet);
  console.log('  factory ', stack.factory);
  console.log('  dex     ', stack.dex);
  console.log('  treasury', stack.treasury);
  const bridge = await deployBridge(wallet);
  if (bridge) console.log('  bridge  ', bridge);
  const out = {
    chainId: net.chainId, network: net.key, currency: net.currency,
    rpc: net.rpc, explorer: net.explorer, ...stack, bridge,
    createFee: CREATE_FEE, feeRecipient: TREASURY, at: new Date().toISOString(),
  };
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, 'global-' + net.chainId + '.json'), JSON.stringify(out, null, 2));
  return out;
}

(async () => {
  let list = networks.filter((n) => GLOBAL_KEYS.includes(n.key));
  if (only) list = list.filter((n) => n.key === only);
  const all = {};
  const allPath = path.join(ART, 'global-all.json');
  if (fs.existsSync(allPath)) Object.assign(all, JSON.parse(fs.readFileSync(allPath, 'utf8')));
  for (const net of list) {
    try {
      const r = await runNet(net);
      all[String(r.chainId)] = r;
    } catch (e) {
      console.error('  FAIL', net.key, e.shortMessage || e.message);
    }
  }
  fs.writeFileSync(allPath, JSON.stringify(all, null, 2));
  const dappDep = {};
  for (const [k, v] of Object.entries(all)) {
    dappDep[k] = { factory: v.factory, dex: v.dex, treasury: v.treasury, bridge: v.bridge };
  }
  fs.writeFileSync(path.join(ART, 'dapp-deployments.json'), JSON.stringify(dappDep, null, 2));
  console.log('\nSaved', allPath);
})().catch((e) => { console.error(e); process.exit(1); });
