import fs from 'node:fs/promises';
import tls from 'node:tls';
import path from 'node:path';
import { PUBLIC_DIR } from './common.mjs';

function env(name) { const v = process.env[name]?.trim(); if (!v) throw new Error(`Missing required environment variable: ${name}`); return v; }
function enc(value) { return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`; }
function b64(value) { return Buffer.from(value, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || ''; }
function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function dotStuff(value) { return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..'); }

class SMTP {
  constructor(host, port) { this.host=host; this.port=port; this.buf=''; this.wait=[]; }
  async connect(){
    this.socket=tls.connect({host:this.host,port:this.port,servername:this.host,minVersion:'TLSv1.2'});
    this.socket.setEncoding('utf8');
    this.socket.on('data', d => { this.buf += d; this.flush(); });
    this.socket.on('error', e => { while(this.wait.length) this.wait.shift().reject(e); });
    await new Promise((resolve,reject)=>{this.socket.once('secureConnect',resolve);this.socket.once('error',reject)});
    await this.read([220]);
  }
  flush(){
    while(this.wait.length){
      const m=this.buf.match(/^(?:\d{3}-.*\r?\n)*(\d{3}) [^\r\n]*(?:\r?\n|$)/m);
      if(!m) return;
      const raw=this.buf.slice(0,m.index+m[0].length); this.buf=this.buf.slice(m.index+m[0].length);
      const w=this.wait.shift(), code=Number(m[1]);
      w.expected.includes(code) ? w.resolve(raw) : w.reject(new Error(`SMTP returned ${code}: ${raw.trim()}`));
    }
  }
  read(expected){ return new Promise((resolve,reject)=>{this.wait.push({resolve,reject,expected});this.flush();}); }
  async cmd(line, expected=[250]){ this.socket.write(line+'\r\n'); return this.read(expected); }
  async close(){ try{ await this.cmd('QUIT',[221]); }catch{} this.socket?.end(); }
}

const gmailUser = env('GMAIL_USER');
const pass = env('GMAIL_APP_PASSWORD').replaceAll(' ', '');
const emailTo = process.env.EMAIL_TO?.trim() || gmailUser;
const base = (process.env.DEPLOYED_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/$/, '');
if (!base) throw new Error('Missing DEPLOYED_SITE_URL or SITE_URL');
const manifest = JSON.parse(await fs.readFile(path.join(PUBLIC_DIR, 'games.json'), 'utf8'));
const latest = manifest[0];
if (!latest) throw new Error('No game found in public/games.json');
const gameUrl = `${base}/${String(latest.url).replace(/^\/+/, '')}`;
const text = `המשחק החדש מוכן: ${latest.title}\n\n${latest.description}\n\nלמשחק: ${gameUrl}\nלגלריה: ${base}`;
const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;background:#071020;color:white;border-radius:24px"><div style="color:#61f4ff;font-weight:900">AMIT GAME FACTORY V7</div><h1>${esc(latest.title)}</h1><p>${esc(latest.description)}</p><p><a href="${esc(gameUrl)}" style="display:inline-block;background:#ffe36e;color:#111;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:900">פתח את המשחק</a></p><p><a href="${esc(base)}" style="color:#61f4ff">כל הגלריה</a></p></div>`;
const boundary = `amit-${Date.now().toString(36)}`;
const msg = [
  `From: ${enc('Amit Game Factory')} <${gmailUser}>`,
  `To: <${emailTo}>`,
  `Subject: ${enc('🎮 משחק חדש ושונה: ' + latest.title)}`,
  'MIME-Version: 1.0',
  `Content-Type: multipart/alternative; boundary="${boundary}"`,
  '',
  `--${boundary}`,
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64','',b64(text),
  `--${boundary}`,
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64','',b64(html),
  `--${boundary}--`,''
].join('\r\n');
const smtp = new SMTP('smtp.gmail.com', 465);
try {
  await smtp.connect();
  await smtp.cmd('EHLO github-actions');
  await smtp.cmd('AUTH LOGIN', [334]);
  await smtp.cmd(Buffer.from(gmailUser).toString('base64'), [334]);
  await smtp.cmd(Buffer.from(pass).toString('base64'), [235]);
  await smtp.cmd(`MAIL FROM:<${gmailUser}>`);
  await smtp.cmd(`RCPT TO:<${emailTo}>`, [250,251]);
  await smtp.cmd('DATA', [354]);
  smtp.socket.write(dotStuff(msg) + '\r\n.\r\n');
  await smtp.read([250]);
  console.log(`Email sent to ${emailTo}: ${gameUrl}`);
} finally { await smtp.close(); }
