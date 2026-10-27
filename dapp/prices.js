/**
 * Coinbase public price feed for SatanicChain dApp
 * https://api.coinbase.com/v2/prices/{PAIR}/spot
 */
(function () {
  const PAIRS = [
    { id: 'ETH', pair: 'ETH-USD', symbol: 'ETH', name: 'Ethereum', kind: 'native' },
    { id: 'BTC', pair: 'BTC-USD', symbol: 'BTC', name: 'Bitcoin', kind: 'quote' },
    { id: 'SOL', pair: 'SOL-USD', symbol: 'SOL', name: 'Solana', kind: 'quote' },
    { id: 'BNB', pair: 'BNB-USD', symbol: 'BNB', name: 'BNB', kind: 'quote' },
    { id: 'MATIC', pair: 'MATIC-USD', symbol: 'MATIC', name: 'Polygon', kind: 'quote' },
    { id: 'AVAX', pair: 'AVAX-USD', symbol: 'AVAX', name: 'Avalanche', kind: 'quote' },
    { id: 'LINK', pair: 'LINK-USD', symbol: 'LINK', name: 'Chainlink', kind: 'quote' },
    { id: 'DOGE', pair: 'DOGE-USD', symbol: 'DOGE', name: 'Dogecoin', kind: 'quote' },
    { id: 'USDC', pair: 'USDT-USD', symbol: 'USDC', name: 'USD Coin', kind: 'stable', fixed: 1 },
    { id: 'USDT', pair: 'USDT-USD', symbol: 'USDT', name: 'Tether', kind: 'stable', fixed: 1 },
    { id: 'SATAN', pair: null, symbol: 'SATAN', name: 'Satanic Token', kind: 'local', fixed: 666 },
    { id: 'SUSD', pair: null, symbol: 'SUSD', name: 'Satanic USD', kind: 'local', fixed: 1 },
  ];

  const cache = { ts: 0, prices: {} };
  const TTL = 30_000;

  async function fetchSpot(pair) {
    const url = 'https://api.coinbase.com/v2/prices/' + encodeURIComponent(pair) + '/spot';
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Coinbase ' + pair + ' HTTP ' + res.status);
    const json = await res.json();
    const amount = json && json.data && json.data.amount;
    if (amount == null) throw new Error('Coinbase empty ' + pair);
    return Number(amount);
  }

  async function refreshPrices(force) {
    if (!force && Date.now() - cache.ts < TTL && Object.keys(cache.prices).length) {
      return cache.prices;
    }
    const next = { ...cache.prices };
    next.SATAN = 666;
    next.SUSD = 1;
    next.USDC = 1;
    next.USDT = 1;

    const jobs = PAIRS.filter(p => p.pair && !p.fixed).map(async (p) => {
      try {
        next[p.id] = await fetchSpot(p.pair);
      } catch (e) {
        console.warn('price', p.id, e.message);
        if (next[p.id] == null) next[p.id] = 0;
      }
    });
    await Promise.all(jobs);
    cache.prices = next;
    cache.ts = Date.now();
    return next;
  }

  function getPrice(id) {
    return cache.prices[id] || 0;
  }

  function convert(amount, fromId, toId) {
    const a = Number(amount);
    if (!(a > 0)) return 0;
    const pf = getPrice(fromId);
    const pt = getPrice(toId);
    if (!(pf > 0) || !(pt > 0)) return 0;
    return (a * pf) / pt;
  }

  function toUsd(amount, id) {
    const a = Number(amount);
    const p = getPrice(id);
    if (!(a > 0) || !(p > 0)) return 0;
    return a * p;
  }

  function toUsd8(id) {
    const p = getPrice(id);
    if (!(p > 0)) return 0n;
    return BigInt(Math.round(p * 1e8));
  }

  function listAssets() {
    return PAIRS.slice();
  }

  window.CoinbasePrices = {
    PAIRS,
    refreshPrices,
    getPrice,
    convert,
    toUsd,
    toUsd8,
    listAssets,
    _cache: cache,
  };
})();
