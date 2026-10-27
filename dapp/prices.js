/**
 * Coinbase public price feed for SatanicChain dApp
 */
(function () {
  var PAIRS = [
    { id: 'ETH', pair: 'ETH-USD', symbol: 'ETH' },
    { id: 'BTC', pair: 'BTC-USD', symbol: 'BTC' },
    { id: 'SOL', pair: 'SOL-USD', symbol: 'SOL' },
    { id: 'BNB', pair: 'BNB-USD', symbol: 'BNB' },
    { id: 'MATIC', pair: 'MATIC-USD', symbol: 'MATIC' },
    { id: 'AVAX', pair: 'AVAX-USD', symbol: 'AVAX' },
    { id: 'LINK', pair: 'LINK-USD', symbol: 'LINK' },
    { id: 'DOGE', pair: 'DOGE-USD', symbol: 'DOGE' },
    { id: 'USDC', pair: null, symbol: 'USDC', fixed: 1 },
    { id: 'USDT', pair: null, symbol: 'USDT', fixed: 1 },
    { id: 'SATAN', pair: null, symbol: 'SATAN', fixed: 666 },
    { id: 'SUSD', pair: null, symbol: 'SUSD', fixed: 1 }
  ];
  var cache = { ts: 0, prices: {} };
  var TTL = 30000;

  async function fetchSpot(pair) {
    var res = await fetch('https://api.coinbase.com/v2/prices/' + encodeURIComponent(pair) + '/spot');
    if (!res.ok) throw new Error('Coinbase ' + pair + ' HTTP ' + res.status);
    var json = await res.json();
    var amount = json && json.data && json.data.amount;
    if (amount == null) throw new Error('Coinbase empty ' + pair);
    return Number(amount);
  }

  async function refreshPrices(force) {
    if (!force && Date.now() - cache.ts < TTL && Object.keys(cache.prices).length) return cache.prices;
    var next = Object.assign({}, cache.prices);
    next.SATAN = 666; next.SUSD = 1; next.USDC = 1; next.USDT = 1;
    var jobs = PAIRS.filter(function (p) { return p.pair && !p.fixed; }).map(async function (p) {
      try { next[p.id] = await fetchSpot(p.pair); }
      catch (e) { console.warn('price', p.id, e.message); if (next[p.id] == null) next[p.id] = 0; }
    });
    await Promise.all(jobs);
    cache.prices = next; cache.ts = Date.now();
    return next;
  }

  function getPrice(id) { return cache.prices[id] || 0; }
  function convert(amount, fromId, toId) {
    var a = Number(amount);
    if (!(a > 0)) return 0;
    var pf = getPrice(fromId), pt = getPrice(toId);
    if (!(pf > 0) || !(pt > 0)) return 0;
    return (a * pf) / pt;
  }
  function listAssets() { return PAIRS.slice(); }

  window.CoinbasePrices = { PAIRS: PAIRS, refreshPrices: refreshPrices, getPrice: getPrice, convert: convert, listAssets: listAssets, _cache: cache };
})();
