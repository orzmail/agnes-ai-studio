const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CONFIG_PATH = path.join(__dirname, 'config.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { return { baseUrl: '', apiKey: '' }; }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => resolve(d));
  });
}

async function proxyAgnes(req, res, endpoint, method) {
  const cfg = loadConfig();
  if (!cfg.baseUrl || !cfg.apiKey) {
    return sendJson(res, 400, { error: '未配置 Base URL 或 API Key，请先在设置中填写' });
  }
  let body = null;
  if (method === 'POST') body = await readBody(req);
  const url = cfg.baseUrl.replace(/\/+$/, '') + endpoint;
  const opts = {
    method,
    headers: {
      'Authorization': 'Bearer ' + cfg.apiKey,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = body;
  try {
    const r = await fetch(url, opts);
    const txt = await r.text();
    res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(txt);
  } catch (e) {
    sendJson(res, 502, { error: '代理请求失败: ' + e.message });
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  if (p === '/api/config' && req.method === 'GET') {
    const c = loadConfig();
    return sendJson(res, 200, { baseUrl: c.baseUrl || '', hasKey: !!c.apiKey });
  }

  if (p === '/api/settings' && req.method === 'POST') {
    const d = await readBody(req);
    try {
      const o = JSON.parse(d);
      saveConfig({ baseUrl: o.baseUrl || '', apiKey: o.apiKey || '' });
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { error: 'JSON 解析失败' });
    }
  }

  if (p === '/api/image/generate' && req.method === 'POST') return proxyAgnes(req, res, '/images/generations', 'POST');
  if (p === '/api/image/edit' && req.method === 'POST') return proxyAgnes(req, res, '/images/edits', 'POST');
  if (p === '/api/video/create' && req.method === 'POST') return proxyAgnes(req, res, '/videos', 'POST');
  if (p === '/api/video/status' && req.method === 'GET') {
    const vid = u.searchParams.get('video_id');
    return proxyAgnes(req, res, '/agnesapi?video_id=' + encodeURIComponent(vid || ''), 'GET');
  }

  let fp = path.join(PUBLIC_DIR, p === '/' ? 'index.html' : p);
  if (!fp.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log('Agnes AI Studio running at http://localhost:' + PORT));
