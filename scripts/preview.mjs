import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR } from './common.mjs';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.txt':'text/plain'};
const server = http.createServer(async (req,res)=>{
  try {
    let u = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    if (u === '/') u = '/index.html';
    const file = path.join(PUBLIC_DIR, u);
    const data = await fs.readFile(file);
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(3000, () => console.log('Preview: http://localhost:3000'));
