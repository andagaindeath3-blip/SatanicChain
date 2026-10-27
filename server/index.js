#!/usr/bin/env node
const http = require('http');
const path = require('path');
const fs = require('fs');
const { handleApi } = require('./routes/api');
const { send, sendFile, parseUrl } = require('./lib/http');

const PORT = Number(process.env.PORT || 8787);
const PUBLIC = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  try {
    const url = parseUrl(req);
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url);
      if (handled) return;
      send(res, 404, { error: 'api not found', path: url.pathname });
      return;
    }
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    if (file === '/explorer' || file === '/explorer/') file = '/explorer.html';
    if (file === '/console' || file === '/console/') file = '/console.html';
    const abs = path.join(PUBLIC, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
    if (abs.startsWith(PUBLIC) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      sendFile(res, abs);
      return;
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message || String(e) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('SatanicChain Hub http://127.0.0.1:' + PORT);
  console.log('  /explorer  /console  /api/status  /api/routes');
});
