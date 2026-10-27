#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'genesis.json'), 'utf8'));
const v = JSON.parse(fs.readFileSync(path.join(__dirname, 'validators.json'), 'utf8'));
let ok = true;
const check = (cond, msg) => { if (!cond) { console.error('✗', msg); ok = false; } else console.log('✓', msg); };
check(g.config.chainId === 666, 'chainId === 666');
check(g.config.clique && g.config.clique.period >= 1, 'clique.period set');
check(g.config.londonBlock === 0, 'London enabled');
check(parseInt(g.gasLimit, 16) >= 30_000_000, 'gasLimit >= 30M');
const extra = g.extraData.slice(2);
check(extra.length >= (32 + 20 + 65) * 2, 'extraData length');
const nSigners = (extra.length / 2 - 32 - 65) / 20;
check(nSigners >= 1 && Number.isInteger(nSigners), `signers in extraData: ${nSigners}`);
console.log(ok ? '\nGenesis OK' : '\nGenesis FAILED');
process.exit(ok ? 0 : 1);
