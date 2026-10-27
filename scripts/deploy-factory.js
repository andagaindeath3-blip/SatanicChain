#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const networks = require('./networks');

const only = (() => {
  const i = process.argv.indexOf('--only');
  if (i >= 0) return process.argv[i + 1];
  if (process.argv.includes('--all')) return null;
  return 'satanic';
})();

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'deployments');
const DEFAULT_CREATE_FEE = '0.00013666';

function loadArtifact(name) {
  const p = path.join(ROOT, 'build', name + '.json');
  if (!fs.existsSync(p)) throw new Error('Missing build/' + name + '.json — run npm run compile');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function deployOn(net) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY required');
  const provider = new ethers.JsonRpcProvider(net.rpc, net.chainId, { staticNetwork: true });
  const wallet = new ethers.Wallet(pk, provider);
  console.log('\n->', net.name, 'chainId', net.chainId, 'from', wallet.address);
  const feeRecipient = process.env.FEE_RECIPIENT || wallet.address;
  const createFee = ethers.parseEther(process.env.CREATE_FEE || DEFAULT_CREATE_FEE);
  console.log('  createFee', ethers.formatEther(createFee), net.currency || 'native');
  let factoryAddr, dexAddr;
  try {
    const bootArt = loadArtifact('MultiChainFactoryBootstrap');
    const Boot = new ethers.ContractFactory(bootArt.abi, bootArt.bytecode, wallet);
    const boot = await Boot.deploy(feeRecipient, createFee);
    await boot.waitForDeployment();
    factoryAddr = await boot.factory();
    dexAddr = await boot.dex();
    console.log('  Bootstrap', await boot.getAddress());
  } catch (e) {
    const F = new ethers.ContractFactory(loadArtifact('TokenFactory').abi, loadArtifact('TokenFactory').bytecode, wallet);
    const D = new ethers.ContractFactory(loadArtifact('TokenDEX').abi, loadArtifact('TokenDEX').bytecode, wallet);
    const f = await F.deploy(feeRecipient, createFee);
    await f.waitForDeployment();
    const d = await D.deploy();
    await d.waitForDeployment();
    factoryAddr = await f.getAddress();
    dexAddr = await d.getAddress();
  }
  console.log('  TokenFactory', factoryAddr);
  console.log('  TokenDEX    ', dexAddr);
  const out = {
    chainId: net.chainId,
    network: net.key,
    factory: factoryAddr,
    dex: dexAddr,
    feeRecipient,
    createFee: createFee.toString(),
    createFeeHuman: DEFAULT_CREATE_FEE,
    at: new Date().toISOString(),
  };
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, 'factory-' + net.chainId + '.json'), JSON.stringify(out, null, 2));
  return out;
}

(async () => {
  const list = only ? networks.filter((n) => n.key === only) : networks.filter((n) => !n.testnet);
  const results = [];
  for (const net of list) {
    try { results.push(await deployOn(net)); }
    catch (e) { console.error('  FAIL', net.key, e.shortMessage || e.message); }
  }
  const allPath = path.join(ART, 'factory-all.json');
  let all = fs.existsSync(allPath) ? JSON.parse(fs.readFileSync(allPath, 'utf8')) : {};
  for (const r of results) all[String(r.chainId)] = r;
  fs.writeFileSync(allPath, JSON.stringify(all, null, 2));
  console.log('\nSaved', allPath);
})().catch((e) => { console.error(e); process.exit(1); });
