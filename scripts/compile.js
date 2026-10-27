const fs = require('fs');
const path = require('path');
const solc = require('solc');

const dir = path.join(__dirname, '..', 'contracts');
const sources = {};
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.sol'))) {
  sources[f] = { content: fs.readFileSync(path.join(dir, f), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  const fatal = out.errors.filter(e => e.severity === 'error');
  for (const e of out.errors) console.error(e.formattedMessage || e.message);
  if (fatal.length) process.exit(1);
}

const artifacts = {};
for (const [file, contracts] of Object.entries(out.contracts || {})) {
  for (const [name, c] of Object.entries(contracts)) {
    artifacts[name] = {
      abi: c.abi,
      bytecode: '0x' + c.evm.bytecode.object,
      deployedBytecode: '0x' + (c.evm.deployedBytecode?.object || ''),
    };
  }
}

const buildDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, 'artifacts.json'), JSON.stringify(artifacts, null, 2));
console.log('Compiled:', Object.keys(artifacts).join(', '));
