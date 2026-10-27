const { DOMAINS, emptyGrid, clamp01, domainScore, globalScore } = require('./tensor');

function process88x5(raw, thresholds) {
  const T = thresholds || {};
  const grid = emptyGrid();
  const alerts = [];
  const suggestions = [];
  const automations = [];
  const lagSec = raw.blockTime != null ? Math.max(0, Date.now() / 1000 - raw.blockTime) : 999;
  const lat = raw.latencyMs != null ? raw.latencyMs : 9999;
  const peers = raw.peerCount != null ? raw.peerCount : 0;
  const chainOk = raw.ok && Number(raw.chainId) === 666;

  function fill(di, metricScores, name, opts) {
    for (let m = 0; m < 8; m++) {
      const v = clamp01(metricScores[m] ?? 0);
      grid[di][m][0] = v;
      grid[di][m][1] = v;
      grid[di][m][2] = opts.alertIf && v < 0.5 ? 1 : 0;
      grid[di][m][3] = opts.suggest ? 0.8 : 0.2;
      grid[di][m][4] = opts.automate ? 0.9 : 0;
    }
    if (opts.alertIf && opts.alertMsg) alerts.push({ domain: name, level: 'warn', message: opts.alertMsg });
    if (opts.suggest) suggestions.push(opts.suggest);
    if (opts.automate) automations.push(opts.automate);
  }

  fill(0, [raw.ok ? 1 : 0, clamp01(1 - lat / (T.rpcLatencyMs || 3000)), raw.ok ? 1 : 0, clamp01(1 - lat / 8000), 0.8, 0.7, clamp01(1 - lat / 2000), raw.ok ? 0.9 : 0.1], 'rpc', {
    alertIf: !raw.ok || lat > (T.rpcLatencyMs || 3000),
    alertMsg: !raw.ok ? 'RPC down: ' + (raw.error || '') : 'RPC slow: ' + lat + 'ms',
    suggest: !raw.ok ? 'Start L1: npm run l1 && check RPC_SATANIC' : null,
  });
  fill(1, [raw.blockNumber != null ? 1 : 0, clamp01(1 - lagSec / (T.blockLagSec || 30)), chainOk ? 1 : 0.2, raw.blockNumber > 0 ? 0.9 : 0.3, 0.8, 0.8, clamp01((raw.blockNumber || 0) / 1000), lagSec < 15 ? 1 : clamp01(1 - lagSec / 60)], 'blocks', {
    alertIf: lagSec > (T.blockLagSec || 30),
    alertMsg: 'Block lag ' + Math.round(lagSec) + 's',
    suggest: 'Check validators are sealing blocks',
    automate: lagSec > 120 ? 'restart_validator_hint' : null,
  });
  fill(2, [peers >= (T.minPeerCount || 1) ? 1 : 0.3, clamp01(peers / 5), chainOk ? 0.9 : 0.2, 0.7, 0.7, 0.6, 0.6, peers > 0 ? 0.85 : 0.2], 'validators', {
    alertIf: peers < (T.minPeerCount || 1) && raw.ok,
    alertMsg: 'Low peer count: ' + peers,
    suggest: 'Start node2/node3 or open P2P 30303',
  });
  fill(3, chainOk ? [0.9, 0.9, 0.85, 0.8, 0.8, 0.75, 0.7, 0.85] : [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2], 'tokens', {
    alertIf: !chainOk && raw.ok,
    alertMsg: 'Unexpected chainId ' + raw.chainId,
    suggest: 'Point RPC_SATANIC to SatanicChain L1',
  });
  fill(4, [0.75, 0.75, 0.7, 0.7, 0.7, 0.65, 0.65, 0.7], 'swap', { alertIf: false, suggest: 'Deploy Vault/Swap: npm run deploy:satanic' });
  fill(5, [0.7, 0.7, 0.7, 0.65, 0.65, 0.6, 0.6, 0.65], 'bridge', { alertIf: false, suggest: 'Run relayer: npm run relayer' });
  fill(6, [0.6, 0.6, 0.55, 0.55, 0.5, 0.5, 0.5, 0.55], 'relayer', { alertIf: false, suggest: 'Fund relayer key' });
  fill(7, [raw.ok ? 0.8 : 0.2, chainOk ? 0.9 : 0.3, 0.7, 0.7, 0.65, 0.6, 0.7, 0.75], 'security', {
    alertIf: !chainOk && raw.ok,
    alertMsg: 'Chain ID mismatch',
    suggest: 'Do not expose unlocked validators on public RPC',
  });

  const domains = DOMAINS.map((name, i) => ({ name: name, score: domainScore(grid, i) }));
  return {
    architecture: '8x8x5',
    ts: raw.ts,
    globalScore: globalScore(grid),
    domains: domains,
    alerts: alerts,
    suggestions: Array.from(new Set(suggestions.filter(Boolean))),
    automations: Array.from(new Set(automations.filter(Boolean))),
    gridSummary: domains.map((d) => d.name + ':' + (d.score * 100).toFixed(0) + '%').join(' '),
    raw: { ok: raw.ok, chainId: raw.chainId, blockNumber: raw.blockNumber, lagSec: Math.round(lagSec), latencyMs: raw.latencyMs, peerCount: raw.peerCount },
  };
}
module.exports = { process88x5, DOMAINS };
