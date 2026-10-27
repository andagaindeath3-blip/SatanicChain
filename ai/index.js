#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { collect } = require('./lib/collect');
const { process88x5 } = require('./lib/process88x5');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

async function runOnce() {
  const raw = await collect();
  const report = process88x5(raw, cfg.alertThresholds);
  printReport(report);
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(report, null, 2));
  return report;
}

function printReport(r) {
  console.log('\n=== SatanicChain AI  8x8x5 ===');
  console.log('Global health: ' + (r.globalScore * 100).toFixed(1) + '%');
  console.log('Grid: ' + r.gridSummary);
  console.log('Chain: id=' + r.raw.chainId + ' block=' + r.raw.blockNumber + ' lag=' + r.raw.lagSec + 's latency=' + r.raw.latencyMs + 'ms peers=' + r.raw.peerCount);
  if (r.alerts.length) {
    console.log('Alerts:');
    r.alerts.forEach((a) => console.log('  [' + a.level + '] ' + a.domain + ': ' + a.message));
  }
  if (r.suggestions.length) {
    console.log('Suggestions:');
    r.suggestions.forEach((s) => console.log('  -> ' + s));
  }
  console.log('');
}

async function watch() {
  console.log('Watching every ' + cfg.pollIntervalMs + 'ms ...');
  for (;;) {
    try { await runOnce(); } catch (e) { console.error('AI cycle error', e.message); }
    await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
  }
}

const cmd = process.argv[2] || 'once';
if (cmd === 'watch') watch();
else runOnce().catch((e) => { console.error(e); process.exit(1); });

module.exports = { runOnce };
