import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR } from './common.mjs';
const port=3000; const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.txt':'text/plain'};
http.createServer(async(req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/' )p='/index.html'; const file=path.join(PUBLIC_DIR,p); if(!file.startsWith(PUBLIC_DIR)){res.writeHead(403).end();return} try{const st=await fs.stat(file); const f=st.isDirectory()?path.join(file,'index.html'):file; res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}); res.end(await fs.readFile(f));}catch{res.writeHead(404).end('Not found')}}).listen(port,()=>console.log(`http://localhost:${port}`));
