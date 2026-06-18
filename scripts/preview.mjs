import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PUBLIC_DIR } from './common.mjs';

const port = Number(process.env.PORT || 3000);
const mime = { '.html':'text/html; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    let target = path.join(PUBLIC_DIR, urlPath.replace(/^\/+/, ''));
    if (!target.startsWith(PUBLIC_DIR)) throw new Error('Invalid path');
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(target).pipe(res);
  } catch (error) { res.writeHead(400); res.end(error.message); }
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://localhost:${port}`));
