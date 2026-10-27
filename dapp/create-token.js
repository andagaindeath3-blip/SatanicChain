/**
 * SatanicChain — user token creation via connected wallet (injected / Reown WalletConnect)
 */
(function () {
  const FACTORY_ABI = [
    'function createToken(string name_, string symbol_, uint8 decimals_, uint256 initialSupply) payable returns (address)',
    'function createFee() view returns (uint256)',
    'function tokenCount() view returns (uint256)',
    'function getToken(uint256 id) view returns (tuple(address token,address creator,string name,string symbol,uint8 decimals,uint256 initialSupply,uint256 createdAt))',
    'function getCreatorTokenIds(address creator) view returns (uint256[])',
    'event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint8 decimals, uint256 initialSupply, uint256 indexed id)',
  ];

  function factoryAddress(chainId) {
    const C = window.DAPP_CONFIG || {};
    const d = (C.deployments || {})[String(chainId)] || (C.deployments || {})[chainId] || {};
    return d.factory || C.factory || null;
  }

  function createPanel(state, helpers) {
    const short = helpers.short;
    const factory = factoryAddress(state.chainId);
    return (
      '<div class="grid cols-2"><div class="card"><h3>Create coin (ERC-20)</h3>' +
      '<p class="hint">Deploy a real token with your wallet. Visible on explorers.</p>' +
      '<label class="field"><span>Name</span><input class="text" id="tokName" placeholder="My Coin" maxlength="32"></label>' +
      '<label class="field"><span>Symbol</span><input class="text" id="tokSymbol" placeholder="MYC" maxlength="12"></label>' +
      '<label class="field"><span>Decimals</span><input class="text" id="tokDecimals" value="18" inputmode="numeric"></label>' +
      '<label class="field"><span>Initial supply</span><input class="text" id="tokSupply" placeholder="1000000" inputmode="decimal"></label>' +
      '<button class="act" id="doCreateToken" type="button"' + (!factory ? ' disabled' : '') + '>' +
      (!state.account ? 'Connect wallet' : !factory ? 'Factory not deployed' : 'Sign create in wallet') +
      '</button><p class="hint" id="createFeeHint">Fee: …</p>' +
      (factory ? '<p class="hint mono">Factory ' + short(factory) + '</p>' : '<p class="hint">npm run deploy:factory</p>') +
      '</div><div class="card"><h3>Your tokens</h3><div id="myTokensList" class="hint">Connect wallet to list tokens.</div>' +
      '<h3 style="margin-top:18px">Wallet</h3>' +
      '<div class="walletlist">' +
      '<button type="button" data-connect="injected"><div>Browser wallet<small>MetaMask, Rabby</small></div></button>' +
      '<button type="button" data-connect="walletconnect"><div>WalletConnect<small>Reown · mobile</small></div></button>' +
      '</div><p class="hint">projectId from cloud.reown.com in config</p></div></div>'
    );
  }

  async function loadFee(state, provider) {
    const addr = factoryAddress(state.chainId);
    const el = document.querySelector('#createFeeHint');
    if (!el || !addr || !window.ethers) return;
    try {
      const c = new ethers.Contract(addr, FACTORY_ABI, provider);
      el.textContent = 'Create fee: ' + ethers.formatEther(await c.createFee()) + ' native';
    } catch (_) { el.textContent = 'Create fee: —'; }
  }

  async function loadMyTokens(state, provider) {
    const box = document.querySelector('#myTokensList');
    const addr = factoryAddress(state.chainId);
    if (!box) return;
    if (!state.account || !addr) { box.textContent = 'Connect wallet to list tokens.'; return; }
    try {
      const c = new ethers.Contract(addr, FACTORY_ABI, provider);
      const ids = await c.getCreatorTokenIds(state.account);
      if (!ids.length) { box.innerHTML = '<p class="hint">No tokens yet.</p>'; return; }
      const rows = [];
      for (const id of ids) {
        const t = await c.getToken(id);
        rows.push('<div class="ticker"><span class="k">' + t.symbol + ' · ' + t.name + '</span><span class="v mono">' + t.token.slice(0, 10) + '…</span></div>');
      }
      box.innerHTML = rows.join('');
    } catch (e) { box.textContent = e.message || 'Error'; }
  }

  async function doCreateToken(state, getSigner, toast, refresh) {
    if (!state.account) throw new Error('Connect wallet');
    const addr = factoryAddress(state.chainId);
    if (!addr) throw new Error('TokenFactory not deployed');
    const name = (document.querySelector('#tokName') && document.querySelector('#tokName').value || '').trim();
    const symbol = (document.querySelector('#tokSymbol') && document.querySelector('#tokSymbol').value || '').trim().toUpperCase();
    const decimals = Number(document.querySelector('#tokDecimals') && document.querySelector('#tokDecimals').value || 18);
    const supplyHuman = document.querySelector('#tokSupply') && document.querySelector('#tokSupply').value || '0';
    if (!name || !symbol) throw new Error('Name and symbol required');
    if (!(decimals >= 0 && decimals <= 18)) throw new Error('Decimals 0-18');
    if (!(Number(supplyHuman) > 0)) throw new Error('Enter supply');
    const signer = await getSigner();
    const factory = new ethers.Contract(addr, FACTORY_ABI, signer);
    const fee = await factory.createFee();
    const supply = ethers.parseUnits(String(supplyHuman), decimals);
    toast('Sign createToken in wallet…');
    const tx = await factory.createToken(name, symbol, decimals, supply, { value: fee });
    toast('Waiting…');
    const rc = await tx.wait();
    let tokenAddr = null;
    for (const log of rc.logs || []) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === 'TokenCreated') { tokenAddr = parsed.args.token; break; }
      } catch (_) {}
    }
    toast(tokenAddr ? 'Token: ' + tokenAddr : 'Created: ' + tx.hash, 'ok');
    if (refresh) await refresh();
    return tokenAddr;
  }

  async function connectWalletConnect(projectId, chains) {
    const EthereumProvider = window.EthereumProvider || (window['@walletconnect/ethereum-provider'] && window['@walletconnect/ethereum-provider'].EthereumProvider);
    if (!EthereumProvider) throw new Error('WalletConnect script not loaded');
    if (!projectId) throw new Error('Set DAPP_CONFIG.projectId from cloud.reown.com');
    const chainIds = (chains || []).map(function (c) { return Number(c.id); }).filter(Boolean);
    if (chainIds.indexOf(666) < 0) chainIds.unshift(666);
    const provider = await EthereumProvider.init({
      projectId: projectId,
      showQrModal: true,
      chains: chainIds.slice(0, 1),
      optionalChains: chainIds,
      methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData'],
      events: ['chainChanged', 'accountsChanged'],
      metadata: {
        name: (window.DAPP_CONFIG && window.DAPP_CONFIG.appName) || 'SatanicChain',
        description: 'Create ERC-20 on SatanicChain',
        url: (window.DAPP_CONFIG && window.DAPP_CONFIG.appUrl) || location.origin,
        icons: [location.origin + '/logo.png'],
      },
    });
    await provider.enable();
    return provider;
  }

  window.SatanicCreate = { FACTORY_ABI: FACTORY_ABI, factoryAddress: factoryAddress, createPanel: createPanel, loadFee: loadFee, loadMyTokens: loadMyTokens, doCreateToken: doCreateToken, connectWalletConnect: connectWalletConnect };
})();
