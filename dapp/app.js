/* SatanicChain dApp — обмен через подпись в кошельке */
(function () {
  'use strict';
  const C = window.DAPP_CONFIG || { chains: [], deployments: {} };
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const ABI = {
    erc20: [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address,address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)',
    ],
    swap: [
      'function swap(address tokenIn, uint256 amountIn, uint256 minOut) returns (uint256)',
      'function getAmountOut(address tokenIn, uint256 amountIn) view returns (uint256)',
      'function reserveSatan() view returns (uint256)',
      'function reserveSusd() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function addLiquidity(uint256,uint256) returns (uint256)',
      'function removeLiquidity(uint256,uint256,uint256) returns (uint256,uint256)',
      'function totalSupply() view returns (uint256)',
      'function priceSusdPerSatan() view returns (uint256)',
    ],
    vault: [
      'function swapSatanToSusd(uint256 satanAmount)',
      'function swapSusdToSatan(uint256 susdAmount)',
    ],
    bridge: [
      'function bridgeOut(address token, uint256 amount, uint256 destChainId, address recipient) returns (uint256)',
    ],
  };

  const state = {
    eip1193: null, account: null, chainId: null,
    tab: 'swap', from: 'satan', slippage: 0.5, balances: null, pool: null,
  };

  const deploy = id => (C.deployments || {})[String(id)] || (C.deployments || {})[Number(id)] || null;
  const short = a => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '—');
  const fmt = (v, d = 4) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: d });

  function toast(text, kind) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.className = 'toast show ' + (kind || '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast'; }, 4500);
  }

  function provider() {
    if (!window.ethereum) throw new Error('Установите MetaMask');
    return new ethers.BrowserProvider(window.ethereum);
  }

  async function connect() {
    const bp = provider();
    await bp.send('eth_requestAccounts', []);
    const net = await bp.getNetwork();
    state.eip1193 = window.ethereum;
    const signer = await bp.getSigner();
    state.account = await signer.getAddress();
    state.chainId = Number(net.chainId);
    toast('Кошелёк: ' + short(state.account), 'ok');
    await refreshBalance();
    await refreshPool();
    renderTab();
  }

  async function signer() {
    return (await provider()).getSigner();
  }

  async function refreshBalance() {
    const d = deploy(state.chainId);
    if (!d || !state.account) { state.balances = null; return; }
    const bp = provider();
    const satan = new ethers.Contract(d.satan, ABI.erc20, bp);
    const susd = new ethers.Contract(d.susd, ABI.erc20, bp);
    const [s, u] = await Promise.all([satan.balanceOf(state.account), susd.balanceOf(state.account)]);
    state.balances = { satan: ethers.formatEther(s), susd: ethers.formatEther(u) };
  }

  async function refreshPool() {
    const d = deploy(state.chainId);
    if (!d || !d.swap) { state.pool = null; return; }
    const bp = provider();
    const pool = new ethers.Contract(d.swap, ABI.swap, bp);
    try {
      const [rs, ru] = await Promise.all([pool.reserveSatan(), pool.reserveSusd()]);
      state.pool = { satan: ethers.formatEther(rs), susd: ethers.formatEther(ru) };
    } catch { state.pool = null; }
  }

  async function quote(amountIn, fromToken) {
    const d = deploy(state.chainId);
    if (!d || !amountIn || !(Number(amountIn) > 0)) return null;
    const mode = ($('#swapMode') && $('#swapMode').value) || 'pool';
    if (mode === 'fixed') {
      const n = Number(amountIn);
      return fromToken === 'satan' ? String(n * 666) : String(n / 666);
    }
    if (!d.swap) return null;
    const bp = provider();
    const pool = new ethers.Contract(d.swap, ABI.swap, bp);
    const tokenIn = fromToken === 'satan' ? d.satan : d.susd;
    const out = await pool.getAmountOut(tokenIn, ethers.parseEther(String(amountIn)));
    return ethers.formatEther(out);
  }

  async function doSwap() {
    const d = deploy(state.chainId);
    if (!d) throw new Error('В этой сети нет контрактов — задеплойте через /admin/');
    if (!state.account) throw new Error('Подключите кошелёк');
    const amountIn = $('#swapAmount').value;
    if (!(Number(amountIn) > 0)) throw new Error('Введите сумму');

    const mode = ($('#swapMode') && $('#swapMode').value) || 'pool';
    const tokenIn = state.from === 'satan' ? d.satan : d.susd;
    const amount = ethers.parseEther(String(amountIn));
    const sg = await signer();
    const token = new ethers.Contract(tokenIn, ABI.erc20, sg);

    if (mode === 'fixed') {
      if (!d.vault) throw new Error('Vault не задеплоен');
      const allowance = await token.allowance(state.account, d.vault);
      if (allowance < amount) {
        toast('1/2 Подпишите approve в кошельке…');
        await (await token.approve(d.vault, ethers.MaxUint256)).wait();
        toast('Approve OK', 'ok');
      }
      const vault = new ethers.Contract(d.vault, ABI.vault, sg);
      toast('2/2 Подпишите обмен в кошельке…');
      const tx = state.from === 'satan'
        ? await vault.swapSatanToSusd(amount)
        : await vault.swapSusdToSatan(amount);
      toast('Ждём блок…');
      await tx.wait();
      toast('Обмен выполнен (фикс. 666): ' + short(tx.hash), 'ok');
    } else {
      if (!d.swap) throw new Error('Swap-пул не задеплоен');
      const q = await quote(amountIn, state.from);
      if (!q) throw new Error('Пул пуст');
      const minOut = ethers.parseEther(q) * BigInt(Math.floor((100 - state.slippage) * 100)) / 10000n;
      const allowance = await token.allowance(state.account, d.swap);
      if (allowance < amount) {
        toast('1/2 Подпишите approve в кошельке…');
        await (await token.approve(d.swap, ethers.MaxUint256)).wait();
        toast('Approve OK', 'ok');
      }
      const pool = new ethers.Contract(d.swap, ABI.swap, sg);
      toast('2/2 Подпишите обмен в кошельке…');
      const tx = await pool.swap(tokenIn, amount, minOut);
      toast('Ждём блок…');
      await tx.wait();
      toast('Обмен выполнен: ' + short(tx.hash), 'ok');
    }
    await refreshBalance();
    await refreshPool();
    renderTab();
  }

  function swapPanel() {
    const d = deploy(state.chainId);
    const b = state.balances || {};
    const fromSym = state.from === 'satan' ? 'SATAN' : 'SUSD';
    const toSym = state.from === 'satan' ? 'SUSD' : 'SATAN';
    const bal = state.from === 'satan' ? fmt(b.satan || 0, 4) : fmt(b.susd || 0, 4);
    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Обмен токенов</h3>
          <p class="hint">Подпись в кошельке: approve → swap</p>
          <label class="field"><span>Режим</span>
            <select id="swapMode">
              <option value="pool">Пул AMM</option>
              <option value="fixed">Фикс. 1 SATAN = 666 SUSD</option>
            </select>
          </label>
          <div class="amount" style="margin-top:12px">
            <input id="swapAmount" inputmode="decimal" placeholder="0.0">
            <div class="side"><b>${fromSym}</b><span>баланс ${bal}</span></div>
          </div>
          <button class="swapbtn" id="flip" type="button">⇅</button>
          <div class="amount">
            <input id="swapOut" readonly placeholder="0.0">
            <div class="side"><b>${toSym}</b><span>получите</span></div>
          </div>
          <button class="act" id="doSwap">${state.account ? 'Подписать обмен в кошельке' : 'Подключить кошелёк'}</button>
        </div>
        <div class="card">
          <h3>Как обменять</h3>
          <ol class="hint" style="padding-left:18px;line-height:1.7">
            <li>Подключите MetaMask</li>
            <li>Введите сумму</li>
            <li>Нажмите «Подписать обмен»</li>
            <li>В кошельке подтвердите <b>approve</b></li>
            <li>Затем подтвердите <b>swap</b></li>
          </ol>
          <div class="ticker"><span class="k">Пул SATAN</span><span class="v">${state.pool ? fmt(state.pool.satan, 2) : '—'}</span></div>
          <div class="ticker"><span class="k">Пул SUSD</span><span class="v">${state.pool ? fmt(state.pool.susd, 2) : '—'}</span></div>
          ${d ? `<p class="hint mono">SATAN ${short(d.satan)}<br>SUSD ${short(d.susd)}</p>` : '<p class="hint">Нет деплоя в этой сети. Откройте /admin/</p>'}
        </div>
      </div>`;
  }

  function renderTab() {
    const el = $('#tab');
    if (!el) return;
    el.innerHTML = swapPanel();
    bindTab();
  }

  function bindTab() {
    const amt = $('#swapAmount');
    async function rq() {
      const v = amt && amt.value;
      if (!v || Number(v) <= 0) { if ($('#swapOut')) $('#swapOut').value = ''; return; }
      try { $('#swapOut').value = await quote(v, state.from); } catch { $('#swapOut').value = '—'; }
    }
    if (amt) amt.oninput = rq;
    const mode = $('#swapMode');
    if (mode) mode.onchange = rq;
    const flip = $('#flip');
    if (flip) flip.onclick = () => { state.from = state.from === 'satan' ? 'susd' : 'satan'; renderTab(); };
    const btn = $('#doSwap');
    if (btn) btn.onclick = async () => {
      btn.disabled = true;
      try {
        if (!state.account) await connect();
        else await doSwap();
      } catch (e) {
        toast(e.shortMessage || e.message || String(e), 'err');
      } finally {
        btn.disabled = false;
      }
    };
  }

  $$('.nav [data-tab]').forEach(b => b.onclick = () => {
    $$('.nav [data-tab]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state.tab = b.dataset.tab;
    renderTab();
  });

  const acc = $('#accountChip');
  if (acc) acc.onclick = () => connect().catch(e => toast(e.message, 'err'));

  if (window.ethereum) {
    window.ethereum.on?.('accountsChanged', () => location.reload());
    window.ethereum.on?.('chainChanged', () => location.reload());
  }

  renderTab();
  window.SatanicApp = { state, connect, doSwap, quote, toast };
})();
