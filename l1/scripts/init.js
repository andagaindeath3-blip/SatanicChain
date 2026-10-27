#!/usr/bin/env node
/**
 * SatanicChain L1 — BNB Chain–style PoSA genesis
 * PoSA, max 21 validators, 1s blocks, 60M gas, native SATAN
 */
const fs = require('fs');
const path = require('path');
const { Wallet, parseEther } = require('ethers');

const root = path.join(__dirname, '..');
const force = process.argv.includes('--force');
const nVal = (() => {
  const a = process.argv.find((x) => x.startsWith('--validators='));
  return a ? Math.max(1, Math.min(21, parseInt(a.split('=')[1], 10) || 7)) : 7;
})();

const CHAIN_ID = 666;
const TREASURY = '0x1F51415288f00e50161882A7702D8511208B3Dd8';
const PERIOD = 1;
const GAS_LIMIT = '0x3938700';
const SYSTEM_STAKING = '0x0000000000000000000000000000000000001000';
const SYSTEM_SLASH = '0x0000000000000000000000000000000000001001';
const hex = (n) => '0x' + BigInt(n).toString(16);

function main() {
  const secretsDir = path.join(root, 'secrets');
  fs.mkdirSync(secretsDir, { recursive: true });

  const validators = [];
  for (let i = 0; i < nVal; i++) {
    const keyFile = path.join(secretsDir, `validator-${i}.key`);
    let wallet;
    if (fs.existsSync(keyFile) && !force) {
      wallet = new Wallet(fs.readFileSync(keyFile, 'utf8').trim());
    } else {
      wallet = Wallet.createRandom();
      fs.writeFileSync(keyFile, wallet.privateKey + '\n', { mode: 0o600 });
    }
    validators.push({ index: i, address: wallet.address });
  }

  const pwdFile = path.join(secretsDir, 'password.txt');
  const password = fs.existsSync(pwdFile) && !force
    ? fs.readFileSync(pwdFile, 'utf8').trim()
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  fs.writeFileSync(pwdFile, password + '\n', { mode: 0o600 });

  const sorted = [...validators].sort((a, b) =>
    a.address.toLowerCase().localeCompare(b.address.toLowerCase())
  );
  const extraData =
    '0x' + '00'.repeat(32) +
    sorted.map((v) => v.address.slice(2).toLowerCase()).join('') +
    '00'.repeat(65);

  const alloc = {
    [TREASURY]: { balance: hex(parseEther('500000000')) },
    [SYSTEM_STAKING]: { balance: '0x0' },
    [SYSTEM_SLASH]: { balance: '0x0' },
  };
  for (const v of validators) {
    alloc[v.address] = { balance: hex(parseEther('50000000')) };
  }

  const genesis = {
    config: {
      chainId: CHAIN_ID,
      homesteadBlock: 0, eip150Block: 0, eip155Block: 0, eip158Block: 0,
      byzantiumBlock: 0, constantinopleBlock: 0, petersburgBlock: 0,
      istanbulBlock: 0, berlinBlock: 0, londonBlock: 0,
      mergeNetsplitBlock: null, terminalTotalDifficulty: 0,
      shanghaiTime: 0, cancunTime: 0,
      clique: { period: PERIOD, epoch: 200 },
    },
    nonce: '0x0',
    timestamp: hex(Math.floor(Date.now() / 1000)),
    extraData,
    gasLimit: GAS_LIMIT,
    difficulty: '0x1',
    mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    coinbase: '0x0000000000000000000000000000000000000000',
    alloc,
    baseFeePerGas: '0x3b9aca00',
    number: '0x0',
    gasUsed: '0x0',
    parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  };

  fs.writeFileSync(path.join(root, 'genesis.json'), JSON.stringify(genesis, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'validators.json'), JSON.stringify({
    chainId: CHAIN_ID,
    chainName: 'SatanicChain',
    nativeToken: 'SATAN',
    consensus: 'PoSA (Proof of Staked Authority) — BNB Chain model',
    engine: 'clique + SystemStaking election',
    blockTimeSeconds: PERIOD,
    gasLimit: 60_000_000,
    maxValidators: 21,
    epochBlocks: 200,
    bootstrapValidators: validators.map((v) => ({ index: v.index, address: v.address })),
    systemContracts: { SystemStaking: SYSTEM_STAKING, SystemSlash: SYSTEM_SLASH },
    treasury: TREASURY,
    createdAt: new Date().toISOString(),
  }, null, 2) + '\n');

  fs.writeFileSync(path.join(root, '.env'), [
    `CHAIN_ID=${CHAIN_ID}`,
    `VALIDATOR=${validators[0].address}`,
    ...validators.map((v, i) => `VALIDATOR_${i + 1}=${v.address}`),
    `SYSTEM_STAKING=${SYSTEM_STAKING}`,
    '',
  ].join('\n'));

  console.log('SatanicChain PoSA genesis ready');
  console.log('chainId', CHAIN_ID, '| block', PERIOD + 's | gas 60M | validators', nVal);
  validators.forEach((v) => console.log(' ', v.index, v.address));
  console.log('Next: ./scripts/up.sh');
}

main();
