/* SatanicChain Admin — multi-chain deploy via MetaMask */
(function () {
  const { BrowserProvider, ContractFactory, Contract, parseUnits, formatUnits, getAddress } = ethers;
  const logEl = document.getElementById('log');
  const netList = document.getElementById('netList');
  const results = [];
  let provider = null;
  let signer = null;
  let account = null;

  const SATAN_ALLOC = parseUnits('100000000', 18);
  const SUSD_ALLOC = parseUnits('50000000000', 18);

  function log(msg, cls) {
    const t = new Date().toISOString().slice(11, 19);
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = `[${t}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderNets() {
    netList.innerHTML = '';
    (window.NETWORKS || []).forEach((n) => {
      const id = 'net_' + n.key;
      const lab = document.createElement('label');
      lab.innerHTML = `<input type="checkbox" id="${id}" data-key="${n.key}" ${n.testnet ? '' : 'checked'}> ${n.name} <span style="color:#666">(${n.chainId})</span>`;
      netList.appendChild(lab);
    });
  }

  async function connect() {
    if (!window.ethereum) {
      log('MetaMask / EIP-1193 провайдер не найден', 'err');
      return;
    }
    provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    document.getElementById('walletStatus').textContent = account.slice(0, 6) + '…' + account.slice(-4);
    document.getElementById('walletStatus').className = 'pill ok';
    document.getElementById('btnDeploy').disabled = false;
    log('Подключён: ' + account, 'ok');
  }

  async function switchChain(net) {
    const hexId = '0x' + Number(net.chainId).toString(16);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexId }],
      });
    } catch (e) {
      if (e.code === 4902 || (e.message && e.message.includes('Unrecognized'))) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: hexId,
            chainName: net.name,
            nativeCurrency: { name: net.currency, symbol: net.currency, decimals: 18 },
            rpcUrls: [net.rpc],
            blockExplorerUrls: net.explorer ? [net.explorer] : undefined,
          }],
        });
      } else {
        throw e;
      }
    }
    provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
  }

  async function deployOne(net) {
    log(`→ ${net.name} (chainId ${net.chainId})...`);
    await switchChain(net);
    const deployer = await signer.getAddress();
    const recipient = getAddress(document.getElementById('recipient').value.trim() || deployer);
    let relayer = document.getElementById('relayer').value.trim();
    if (!relayer) relayer = deployer;
    else relayer = getAddress(relayer);

    const bal = await provider.getBalance(deployer);
    log(`  баланс: ${formatUnits(bal, 18)} ${net.currency}`);
    if (bal === 0n) {
      log(`  ПРОПУСК: нет газа`, 'warn');
      return { network: net.name, chainId: net.chainId, skipped: 'нет газа' };
    }

    const arts = window.ARTIFACTS;
    const deploy = async (name, args = []) => {
      const f = new ContractFactory(arts[name].abi, arts[name].bytecode, signer);
      const c = await f.deploy(...args);
      log(`  deploying ${name}...`);
      await c.deploymentTransaction().wait();
      const addr = await c.getAddress();
      log(`  ${name} → ${addr}`, 'ok');
      return c;
    };

    const satan = await deploy('SatanicToken', [deployer]);
    const susd = await deploy('SatanicUSD', [deployer]);
    const vault = await deploy('SatanicVault', [await satan.getAddress(), await susd.getAddress()]);
    const swap = await deploy('SatanicSwap', [await satan.getAddress(), await susd.getAddress()]);
    const bridge = await deploy('SatanicBridge');

    await (await susd.setMinter(await vault.getAddress())).wait();
    log('  setMinter(vault) ok');
    try {
      await (await bridge.setRelayer(relayer, true)).wait();
      log('  setRelayer ok');
    } catch (e) {
      log('  setRelayer: ' + (e.shortMessage || e.message), 'warn');
    }
    await (await satan.mint(recipient, SATAN_ALLOC)).wait();
    await (await susd.mint(recipient, SUSD_ALLOC)).wait();
    log('  mint SATAN + SUSD ok', 'ok');

    const out = {
      network: net.name,
      chainId: net.chainId,
      explorer: net.explorer,
      deployer,
      recipient,
      contracts: {
        SatanicToken: await satan.getAddress(),
        SatanicUSD: await susd.getAddress(),
        SatanicVault: await vault.getAddress(),
        SatanicSwap: await swap.getAddress(),
        SatanicBridge: await bridge.getAddress(),
      },
      relayer,
    };
    out.links = {
      token: `${net.explorer}/token/${out.contracts.SatanicToken}`,
      stablecoin: `${net.explorer}/token/${out.contracts.SatanicUSD}`,
    };
    log(`✓ ${net.name} готово`, 'ok');
    return out;
  }

  async function deployAll() {
    const checks = [...netList.querySelectorAll('input[type=checkbox]:checked')];
    if (!checks.length) {
      log('Выберите хотя бы одну сеть', 'err');
      return;
    }
    document.getElementById('btnDeploy').disabled = true;
    results.length = 0;
    logEl.innerHTML = '';
    log(`Старт деплоя в ${checks.length} сетей...`);

    for (const cb of checks) {
      const key = cb.dataset.key;
      const net = (window.NETWORKS || []).find((n) => n.key === key);
      if (!net) continue;
      try {
        const r = await deployOne(net);
        results.push(r);
      } catch (e) {
        const msg = e.shortMessage || e.message || String(e);
        log(`✗ ${net.name}: ${msg}`, 'err');
        results.push({ network: net.name, chainId: net.chainId, error: msg });
      }
    }
    log('——— Готово ———', 'ok');
    document.getElementById('btnDeploy').disabled = false;
  }

  document.getElementById('btnConnect').onclick = connect;
  document.getElementById('btnDeploy').onclick = deployAll;
  document.getElementById('btnSelectAll').onclick = () => netList.querySelectorAll('input').forEach((i) => (i.checked = true));
  document.getElementById('btnSelectNone').onclick = () => netList.querySelectorAll('input').forEach((i) => (i.checked = false));
  document.getElementById('btnMainnet').onclick = () => {
    (window.NETWORKS || []).forEach((n) => {
      const el = document.getElementById('net_' + n.key);
      if (el) el.checked = !n.testnet;
    });
  };
  document.getElementById('btnTestnet').onclick = () => {
    (window.NETWORKS || []).forEach((n) => {
      const el = document.getElementById('net_' + n.key);
      if (el) el.checked = !!n.testnet;
    });
  };
  document.getElementById('btnCopy').onclick = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    log('JSON скопирован в буфер');
  };
  document.getElementById('btnDownload').onclick = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deployments.json';
    a.click();
  };

  renderNets();
  log('Админка готова. Подключите кошелёк.');
})();
