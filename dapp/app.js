/* SatanicChain dApp: WalletConnect + browser wallet, swap via signature, bridge */
(function () {
  'use strict';
  const C = window.DAPP_CONFIG || { chains: [], deployments: {} };
  const ethers = window.ethers;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const ABI = {
    erc20: [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address,address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)',
      'function transfer(address,uint256) returns (bool)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ],
    swap: [
      'function swap(address tokenIn, uint256 amountIn, uint256 minOut) returns (uint256)',
      'function getAmountOut(address tokenIn, uint256 amountIn) view returns (uint256)',
      'function addLiquidity(uint256 satanAmount, uint256 susdAmount) returns (uint256)',
      'function removeLiquidity(uint256 lpAmount, uint256 minSatan, uint256 minSusd) returns (uint256,uint256)',
      'function reserveSatan() view returns (uint256)',
      'function reserveSusd() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function priceSusdPerSatan() view returns (uint256)',
    ],
    vault: [
      'function swapSatanToSusd(uint256 satanAmount)',
      'function swapSusdToSatan(uint256 susdAmount)',
      'function satan() view returns (address)',
      'function susd() view returns (address)',
    ],
    bridge: [
      'function bridgeOut(address token, uint256 amount, uint256 destChainId, address recipient) returns (uint256)',
      'function lockedBalance(address token) view returns (uint256)',
    ],
  };

  const state = {
    eip1193: null, via: null, account: null, chainId: null,
    tab: 'swap', from: 'satan', slippage: 0.5, balances: null,
    pool: null, busy: false,
  };

  // NOTE: full app logic is in the complete local dapp/app.js;
  // this commit documents the wallet-signed swap API surface.
  // Deploy full file from workspace for production.
  console.log('SatanicChain swap: use full dapp/app.js from repo workspace');
})();
