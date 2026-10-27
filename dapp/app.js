/* SatanicChain dApp - English UI, dark theme, swap + bridge */
(function () {
  'use strict';
  var C = window.DAPP_CONFIG || { chains: [], deployments: {} };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var ABI = {
    erc20: [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address,address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)'
    ],
    swap: [
      'function swap(address tokenIn, uint256 amountIn, uint256 minOut) returns (uint256)',
      'function getAmountOut(address tokenIn, uint256 amountIn) view returns (uint256)',
      'function reserveSatan() view returns (uint256)',
      'function reserveSusd() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function addLiquidity(uint256,uint256) returns (uint256)',
      'function removeLiquidity(uint256,uint256,uint256) returns (uint256,uint256)'
    ],
    vault: [
      'function swapSatanToSusd(uint256 satanAmount)',
      'function swapSusdToSatan(uint256 susdAmount)'
    ],
    exchange: [
      'function buySatanWithEth() payable returns (uint256)',
      'function buySusdWithEth() payable returns (uint256)',
      'function quoteEthToToken(uint256 ethIn, bool toSatan) view returns (uint256)'
    ],
    bridge: [
      'function bridgeOut(address token, uint256 amount, uint256 destChainId, address recipient) returns (uint256)'
    ]
  };

  var state = {
    eip1193: null, account: null, chainId: null,
    tab: 'swap', fromAsset: 'ETH', toAsset: 'SATAN',
    slippage: 0.5, balances: null, nativeBal: null, pool: null
  };

  function deploy(id) {
    return (C.deployments || {})[String(id)] || (C.deployments || {})[Number(id)] || null;
  }
  function chainInfo(id) {
    return (C.chains || []).find(function (c) { return Number(c.id) === Number(id); }) || null;
  }
  function short(a) { return a ? a.slice(0, 6) + '...' + a.slice(-4) : '-'; }
  function fmt(v, d) {
    return Number(v).toLocaleString('en-US', { maximumFractionDigits: d == null ? 4 : d });
  }

  function toast(text, kind) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.className = 'toast show ' + (kind || '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.className = 'toast'; }, 5000);
  }

  function provider() {
    if (!window.ethereum) throw new Error('Install MetaMask');
    return new ethers.BrowserProvider(window.ethereum);
  }

  function readProvider(chainId) {
    var ci = chainInfo(chainId || state.chainId);
    if (!ci || !window.ethers) return null;
    try { return new ethers.JsonRpcProvider(ci.rpc, ci.id, { staticNetwork: true }); }
    catch (e) { return null; }
  }

  async function signer() { return (await provider()).getSigner(); }

  async function connect() {
    if (!window.ethers) throw new Error('ethers failed to load');
    if (!window.ethereum) throw new Error('Install MetaMask');
    var bp = provider();
    await bp.send('eth_requestAccounts', []);
    var net = await bp.getNetwork();
    var sg = await bp.getSigner();
    state.eip1193 = window.ethereum;
    state.account = await sg.getAddress();
    state.chainId = Number(net.chainId);
    toast('Wallet: ' + short(state.account), 'ok');
    await refreshBalance();
    await refreshPool();
    updateHeader();
    renderTab();
  }

  async function switchChain(id) {
    if (!window.ethereum) throw new Error('No wallet');
    var ci = chainInfo(id);
    if (!ci) throw new Error('Unknown network');
    var hex = '0x' + Number(id).toString(16);
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: hex,
            chainName: ci.name,
            nativeCurrency: { name: ci.currency, symbol: ci.currency, decimals: 18 },
            rpcUrls: [ci.rpc],
            blockExplorerUrls: ci.explorer ? [ci.explorer] : []
          }]
        });
      } else throw e;
    }
    state.chainId = Number(id);
    updateHeader();
    renderTab();
  }

  async function refreshBalance() {
    var d = deploy(state.chainId);
    if (!d || !state.account) { state.balances = null; return; }
    try {
      var bp = provider();
      var satan = new ethers.Contract(d.satan, ABI.erc20, bp);
      var susd = new ethers.Contract(d.susd, ABI.erc20, bp);
      var s = await satan.balanceOf(state.account);
      var u = await susd.balanceOf(state.account);
      var nb = await bp.getBalance(state.account);
      state.balances = { satan: ethers.formatEther(s), susd: ethers.formatEther(u) };
      state.nativeBal = ethers.formatEther(nb);
    } catch (e) { state.balances = null; }
  }

  async function refreshPool() {
    var d = deploy(state.chainId);
    var rp = readProvider();
    if (!d || !d.swap || !rp) { state.pool = null; return; }
    try {
      var pool = new ethers.Contract(d.swap, ABI.swap, rp);
      var rs = await pool.reserveSatan();
      var ru = await pool.reserveSusd();
      state.pool = { satan: ethers.formatEther(rs), susd: ethers.formatEther(ru) };
    } catch (e) { state.pool = null; }
  }

  async function quote(amountIn) {
    var amount = Number(amountIn);
    if (!(amount > 0)) return null;
    var fromAsset = ($('#fromAsset') && $('#fromAsset').value) || state.fromAsset || 'ETH';
    var toAsset = ($('#toAsset') && $('#toAsset').value) || state.toAsset || 'SATAN';
    var CP = window.CoinbasePrices;
    if (CP) {
      try {
        await CP.refreshPrices();
        var conv = CP.convert(amount, fromAsset, toAsset);
        if (conv > 0) return String(conv);
      } catch (e) {}
    }
    if ((fromAsset === 'SATAN' || fromAsset === 'SUSD') && (toAsset === 'SATAN' || toAsset === 'SUSD')) {
      var mode = ($('#swapMode') && $('#swapMode').value) || 'pool';
      if (mode === 'fixed') return fromAsset === 'SATAN' ? String(amount * 666) : String(amount / 666);
    }
    return null;
  }

  async function doSwap() {
    if (!state.account) throw new Error('Connect wallet');
    var amountIn = $('#swapAmount') && $('#swapAmount').value;
    if (!(Number(amountIn) > 0)) throw new Error('Enter amount');
    var fromAsset = ($('#fromAsset') && $('#fromAsset').value) || state.fromAsset || 'ETH';
    var toAsset = ($('#toAsset') && $('#toAsset').value) || state.toAsset || 'SATAN';
    var d = deploy(state.chainId);
    var sg = await signer();

    if (fromAsset === 'ETH' && (toAsset === 'SATAN' || toAsset === 'SUSD')) {
      if (!d || !d.exchange) throw new Error('Exchange not deployed');
      var value = ethers.parseEther(String(amountIn));
      var ex = new ethers.Contract(d.exchange, ABI.exchange, sg);
      toast('Sign ETH swap in wallet...');
      var tx = toAsset === 'SATAN' ? await ex.buySatanWithEth({ value: value }) : await ex.buySusdWithEth({ value: value });
      await tx.wait();
      toast('Done: ' + short(tx.hash), 'ok');
      await refreshBalance(); renderTab(); return;
    }

    if (!d) throw new Error('No contracts on this network');
    if ((fromAsset === 'SATAN' || fromAsset === 'SUSD') && (toAsset === 'SATAN' || toAsset === 'SUSD')) {
      var mode = ($('#swapMode') && $('#swapMode').value) || 'fixed';
      var tokenIn = fromAsset === 'SATAN' ? d.satan : d.susd;
      var amount = ethers.parseEther(String(amountIn));
      var token = new ethers.Contract(tokenIn, ABI.erc20, sg);
      if (mode === 'fixed' || !d.swap) {
        if (!d.vault) throw new Error('Vault not deployed');
        if ((await token.allowance(state.account, d.vault)) < amount) {
          toast('1/2 Sign approve...');
          await (await token.approve(d.vault, ethers.MaxUint256)).wait();
        }
        var vault = new ethers.Contract(d.vault, ABI.vault, sg);
        toast('2/2 Sign swap...');
        var tx2 = fromAsset === 'SATAN' ? await vault.swapSatanToSusd(amount) : await vault.swapSusdToSatan(amount);
        await tx2.wait();
        toast('Swap done: ' + short(tx2.hash), 'ok');
      } else {
        if ((await token.allowance(state.account, d.swap)) < amount) {
          toast('1/2 Sign approve...');
          await (await token.approve(d.swap, ethers.MaxUint256)).wait();
        }
        var pool = new ethers.Contract(d.swap, ABI.swap, sg);
        toast('2/2 Sign swap...');
        var q = await quote(amountIn);
        var minOut = q ? ethers.parseEther(q) * 99n / 100n : 0n;
        var tx3 = await pool.swap(tokenIn, amount, minOut);
        await tx3.wait();
        toast('Swap done: ' + short(tx3.hash), 'ok');
      }
      await refreshBalance(); await refreshPool(); renderTab(); return;
    }
    throw new Error('On-chain swap only for ETH/SATAN/SUSD');
  }

  async function doBridge() {
    var d = deploy(state.chainId);
    if (!d || !d.bridge) throw new Error('No bridge');
    if (!state.account) throw new Error('Connect wallet');
    var amount = $('#bridgeAmount') && $('#bridgeAmount').value;
    var dest = Number($('#bridgeDest') && $('#bridgeDest').value);
    var recipient = (($('#bridgeRecipient') && $('#bridgeRecipient').value) || state.account || '').trim();
    var tok = ($('#bridgeToken') && $('#bridgeToken').value) || 'satan';
    if (!(Number(amount) > 0)) throw new Error('Enter amount');
    if (!dest || dest === Number(state.chainId)) throw new Error('Choose another network');
    var token = tok === 'satan' ? d.satan : d.susd;
    var sg = await signer();
    var erc = new ethers.Contract(token, ABI.erc20, sg);
    var value = ethers.parseEther(String(amount));
    if ((await erc.allowance(state.account, d.bridge)) < value) {
      toast('1/2 Sign approve...');
      await (await erc.approve(d.bridge, ethers.MaxUint256)).wait();
    }
    var bridge = new ethers.Contract(d.bridge, ABI.bridge, sg);
    toast('2/2 Sign bridge...');
    var tx = await bridge.bridgeOut(token, value, dest, recipient);
    await tx.wait();
    toast('Locked: ' + short(tx.hash), 'ok');
    await refreshBalance(); renderTab();
  }

  function swapPanel() {
    var d = deploy(state.chainId);
    var b = state.balances || {};
    var CP = window.CoinbasePrices;
    var assets = CP ? CP.listAssets() : [
      { id: 'ETH', symbol: 'ETH' }, { id: 'SATAN', symbol: 'SATAN' }, { id: 'SUSD', symbol: 'SUSD' },
      { id: 'BTC', symbol: 'BTC' }, { id: 'SOL', symbol: 'SOL' }, { id: 'BNB', symbol: 'BNB' }
    ];
    var fromAsset = state.fromAsset || 'ETH';
    var toAsset = state.toAsset || 'SATAN';
    function opts(sel) {
      return assets.map(function (a) {
        var px = CP ? CP.getPrice(a.id) : 0;
        return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' +
          a.symbol + (px ? ' · $' + Number(px).toFixed(2) : '') + '</option>';
      }).join('');
    }
    var bal = fromAsset === 'ETH'
      ? (state.nativeBal != null ? fmt(state.nativeBal) : '-')
      : fromAsset === 'SATAN' ? fmt(b.satan || 0) : fmt(b.susd || 0);
    return '<div class="grid cols-2"><div class="card"><h3>Token swap</h3>' +
      '<p class="hint">Prices from Coinbase. ETH to SATAN/SUSD is on-chain.</p>' +
      '<label class="field"><span>You pay</span><select id="fromAsset">' + opts(fromAsset) + '</select></label>' +
      '<div class="amount" style="margin-top:8px"><input id="swapAmount" inputmode="decimal" placeholder="0.0">' +
      '<div class="side"><b>' + fromAsset + '</b><span>balance ' + bal + '</span></div></div>' +
      '<button class="swapbtn" id="flip" type="button">Flip</button>' +
      '<label class="field"><span>You receive</span><select id="toAsset">' + opts(toAsset) + '</select></label>' +
      '<div class="amount" style="margin-top:8px"><input id="swapOut" readonly placeholder="0.0">' +
      '<div class="side"><b>' + toAsset + '</b><span>estimate</span></div></div>' +
      '<label class="field" style="margin-top:8px"><span>SATAN-SUSD mode</span>' +
      '<select id="swapMode"><option value="pool">AMM pool</option><option value="fixed">Fixed 1 SATAN = 666 SUSD</option></select></label>' +
      '<button class="act" id="doSwap" type="button">' + (state.account ? 'Sign swap in wallet' : 'Connect wallet') + '</button></div>' +
      '<div class="card"><h3>Info</h3>' +
      '<div class="ticker"><span class="k">Native</span><span class="v">' + (state.nativeBal != null ? fmt(state.nativeBal, 5) : '-') + '</span></div>' +
      '<div class="ticker"><span class="k">SATAN</span><span class="v">' + fmt(b.satan || 0) + '</span></div>' +
      '<div class="ticker"><span class="k">SUSD</span><span class="v">' + fmt(b.susd || 0) + '</span></div>' +
      '<button class="act ghost" id="refreshPrices" type="button" style="margin-top:12px">Refresh prices</button></div></div>';
  }

  function bridgePanel() {
    var destOpts = (C.chains || []).filter(function (c) { return Number(c.id) !== Number(state.chainId); })
      .map(function (c) { return '<option value="' + c.id + '">' + c.name + ' (' + c.id + ')</option>'; }).join('');
    return '<div class="card"><h3>Cross-chain bridge</h3>' +
      '<label class="field"><span>Token</span><select id="bridgeToken"><option value="satan">SATAN</option><option value="susd">SUSD</option></select></label>' +
      '<div class="amount"><input id="bridgeAmount" inputmode="decimal" placeholder="0.0"></div>' +
      '<label class="field" style="margin-top:10px"><span>To network</span><select id="bridgeDest">' + destOpts + '</select></label>' +
      '<label class="field"><span>Recipient</span><input class="text" id="bridgeRecipient" value="' + (state.account || '') + '"></label>' +
      '<button class="act" id="doBridge" type="button">' + (state.account ? 'Sign transfer' : 'Connect wallet') + '</button></div>';
  }

  function poolPanel() {
    return '<div class="card"><h3>Liquidity pool</h3><p class="hint">SATAN reserve: ' +
      (state.pool ? fmt(state.pool.satan, 0) : '-') + ' / SUSD: ' + (state.pool ? fmt(state.pool.susd, 0) : '-') +
      '</p><p class="hint">Deploy contracts via /admin to enable LP.</p></div>';
  }

  function walletPanel() {
    if (!state.account) return connectPanel();
    var b = state.balances || {};
    return '<div class="card"><h3>Wallet</h3><p class="mono">' + state.account + '</p>' +
      '<p>SATAN: ' + fmt(b.satan || 0) + ' · SUSD: ' + fmt(b.susd || 0) + '</p>' +
      '<button class="act ghost" type="button" id="disconnect">Disconnect</button></div>';
  }

  function connectPanel() {
    return '<div class="card"><h3>Connect</h3><div class="walletlist">' +
      '<button type="button" data-connect="injected"><div>Browser wallet<small>MetaMask, Rabby, Brave</small></div></button></div></div>';
  }

  function updateHeader() {
    var chip = $('#chainChip');
    var acc = $('#accountChip');
    var sel = $('#netSelect');
    var ci = chainInfo(state.chainId);
    if (chip) {
      chip.innerHTML = '<span class="dot"></span>' + (ci ? ci.name : 'no network');
      if (state.account) chip.classList.add('live'); else chip.classList.remove('live');
    }
    if (acc) acc.textContent = state.account ? short(state.account) : 'Connect wallet';
    if (sel) {
      sel.innerHTML = (C.chains || []).map(function (c) {
        return '<option value="' + c.id + '"' + (Number(c.id) === Number(state.chainId) ? ' selected' : '') + '>' + c.name + '</option>';
      }).join('');
    }
  }

  function renderTab() {
    var el = $('#tab');
    if (!el) return;
    if (state.tab === 'swap') el.innerHTML = swapPanel();
    else if (state.tab === 'bridge') el.innerHTML = state.account ? bridgePanel() : connectPanel();
    else if (state.tab === 'pool') el.innerHTML = state.account ? poolPanel() : connectPanel();
    else el.innerHTML = walletPanel();
    bindTab();
  }

  function bindTab() {
    $$('[data-connect]').forEach(function (b) {
      b.onclick = async function () {
        b.disabled = true;
        try { await connect(); } catch (e) { toast(e.message || 'Failed', 'err'); }
        finally { b.disabled = false; renderTab(); }
      };
    });
    async function refreshQuote() {
      var amt = $('#swapAmount');
      if (!amt) return;
      if ($('#fromAsset')) state.fromAsset = $('#fromAsset').value;
      if ($('#toAsset')) state.toAsset = $('#toAsset').value;
      var v = amt.value;
      if (!v || Number(v) <= 0) { if ($('#swapOut')) $('#swapOut').value = ''; return; }
      try {
        var q = await quote(v);
        if ($('#swapOut')) $('#swapOut').value = q || '-';
      } catch (e) { if ($('#swapOut')) $('#swapOut').value = '-'; }
    }
    if ($('#swapAmount')) $('#swapAmount').oninput = refreshQuote;
    if ($('#fromAsset')) $('#fromAsset').onchange = function () { state.fromAsset = $('#fromAsset').value; renderTab(); };
    if ($('#toAsset')) $('#toAsset').onchange = function () { state.toAsset = $('#toAsset').value; refreshQuote(); };
    if ($('#flip')) $('#flip').onclick = function () {
      var a = state.fromAsset; state.fromAsset = state.toAsset; state.toAsset = a; renderTab();
    };
    if ($('#refreshPrices')) $('#refreshPrices').onclick = async function () {
      try {
        if (window.CoinbasePrices) await window.CoinbasePrices.refreshPrices(true);
        toast('Prices updated', 'ok'); renderTab();
      } catch (e) { toast(e.message, 'err'); }
    };
    if ($('#doSwap')) $('#doSwap').onclick = async function () {
      var btn = $('#doSwap'); btn.disabled = true;
      try {
        if (!state.account) await connect();
        else await doSwap();
      } catch (e) { toast(e.shortMessage || e.message || String(e), 'err'); }
      finally { btn.disabled = false; }
    };
    if ($('#doBridge')) $('#doBridge').onclick = async function () {
      var btn = $('#doBridge'); btn.disabled = true;
      try {
        if (!state.account) await connect();
        else await doBridge();
      } catch (e) { toast(e.shortMessage || e.message || String(e), 'err'); }
      finally { btn.disabled = false; }
    };
    if ($('#disconnect')) $('#disconnect').onclick = function () {
      state.account = null; state.balances = null; updateHeader(); renderTab();
    };
  }

  function boot() {
    $$('.nav [data-tab]').forEach(function (b) {
      b.onclick = function () {
        $$('.nav [data-tab]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        state.tab = b.dataset.tab;
        renderTab();
      };
    });
    if ($('#accountChip')) {
      $('#accountChip').onclick = function () {
        connect().catch(function (e) { toast(e.message, 'err'); });
      };
    }
    var sel = $('#netSelect');
    if (sel) {
      sel.innerHTML = (C.chains || []).map(function (c) {
        return '<option value="' + c.id + '">' + c.name + '</option>';
      }).join('');
      sel.onchange = async function () {
        try { await switchChain(Number(sel.value)); }
        catch (e) { toast(e.message, 'err'); }
      };
    }
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('accountsChanged', function () { location.reload(); });
      window.ethereum.on('chainChanged', function () { location.reload(); });
    }
    if (window.CoinbasePrices) window.CoinbasePrices.refreshPrices().catch(function () {});
    updateHeader();
    renderTab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SatanicApp = { state: state, connect: connect, switchChain: switchChain, doSwap: doSwap, doBridge: doBridge, renderTab: renderTab, toast: toast };
})();
