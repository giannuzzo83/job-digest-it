#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initEnv } from '../config.js';
import { getDigestRun, getLatestDigestRun, listDigestRuns } from '../storage/db.js';

initEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.WEB_PORT ?? 3847);
const webToken = process.env.WEB_TOKEN?.trim() || '';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function isAuthorized(req, url) {
  if (!webToken) return true;
  const auth = req.headers.authorization ?? '';
  if (auth === `Bearer ${webToken}`) return true;
  return url.searchParams.get('token') === webToken;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (!isAuthorized(req, url)) {
    sendJson(res, 401, { error: 'Token non valido. Imposta WEB_TOKEN in .env.' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/digest/latest') {
    const run = getLatestDigestRun();
    if (!run) {
      sendJson(res, 404, {
        error: 'Nessuno snapshot disponibile. Esegui prima: npm run digest:dry',
      });
      return;
    }
    sendJson(res, 200, run);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/digest/runs') {
    sendJson(res, 200, { runs: listDigestRuns() });
    return;
  }

  const runMatch = url.pathname.match(/^\/api\/digest\/runs\/(\d+)$/);
  if (req.method === 'GET' && runMatch) {
    const run = getDigestRun(Number(runMatch[1]));
    if (!run) {
      sendJson(res, 404, { error: 'Snapshot non trovato' });
      return;
    }
    sendJson(res, 200, run);
    return;
  }

  sendJson(res, 404, { error: 'Endpoint non trovato' });
}

function serveStatic(req, res, url) {
  const relPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, 'Not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] ?? 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

server.listen(port, () => {
  console.log(`[web] Job Digest IT — http://localhost:${port}`);
  if (webToken) {
    console.log('[web] Protezione attiva: usa ?token=... oppure Authorization: Bearer');
  } else {
    console.log('[web] Nessun WEB_TOKEN impostato (accesso aperto in rete locale)');
  }
});
