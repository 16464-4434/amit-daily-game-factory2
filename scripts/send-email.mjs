import fs from 'node:fs/promises';
import tls from 'node:tls';
import path from 'node:path';
import { PUBLIC_DIR, escapeHtml, requiredEnv } from './common.mjs';

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`;
}
function chunkBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
}
function dotStuff(value) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

class SmtpClient {
  constructor(host, port) {
    this.host = host; this.port = port; this.socket = null; this.buffer = ''; this.waiters = [];
  }
  async connect() {
    this.socket = tls.connect({ host: this.host, port: this.port, servername: this.host, minVersion: 'TLSv1.2' });
    this.socket.setEncoding('utf8');
    this.socket.on('data', chunk => { this.buffer += chunk; this.flush(); });
    this.socket.on('error', error => { while (this.waiters.length) this.waiters.shift().reject(error); });
    await new Promise((resolve, reject) => { this.socket.once('secureConnect', resolve); this.socket.once('error', reject); });
    await this.readResponse([220]);
  }
  flush() {
    while (this.waiters.length) {
      const match = this.buffer.match(/^(?:\d{3}-.*\r?\n)*(\d{3}) ([^\r\n]*)(?:\r?\n|$)/m);
      if (!match) return;
      const end = match.index + match[0].length;
      const raw = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end);
      const waiter = this.waiters.shift();
      const code = Number(match[1]);
      if (waiter.expected.includes(code)) waiter.resolve({ code, raw });
      else waiter.reject(new Error(`SMTP returned ${code}: ${raw.trim()}`));
    }
  }
  readResponse(expected) {
    return new Promise((resolve, reject) => { this.waiters.push({ resolve, reject, expected }); this.flush(); });
  }
  async command(command, expected = [250]) {
    this.socket.write(`${command}\r\n`);
    return this.readResponse(expected);
  }
  async close() {
    try { await this.command('QUIT', [221]); } catch {}
    this.socket.end();
  }
}

const gmailUser = requiredEnv('GMAIL_USER');
const gmailAppPassword = requiredEnv('GMAIL_APP_PASSWORD').replaceAll(' ', '');
const emailTo = process.env.EMAIL_TO?.trim() || gmailUser;
const deployedBase = (process.env.DEPLOYED_SITE_URL || process.env.SITE_URL || '').replace(/\/$/, '');
if (!deployedBase) throw new Error('Missing DEPLOYED_SITE_URL or SITE_URL.');

const manifest = JSON.parse(await fs.readFile(path.join(PUBLIC_DIR, 'games.json'), 'utf8'));
const latest = manifest[0];
if (!latest) throw new Error('No game found in public/games.json.');
const gameUrl = `${deployedBase}/${String(latest.url || '').replace(/^\/+/, '')}`;
const subject = `🎮 משחק חדש: ${latest.title}`;
const textBody = `המשחק החדש ${latest.title} מוכן.\n\nלמשחק: ${gameUrl}\nלגלריה: ${deployedBase}\n\nAmit's Game Factory V5`;
const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0b1020;color:#f5f7ff;border-radius:22px"><div style="font-size:12px;color:#78f4ff;font-weight:800;letter-spacing:1px">AMIT'S GAME FACTORY V5</div><h1 style="font-size:31px;margin:14px 0 8px">${escapeHtml(latest.title)}</h1><p style="color:#bbc5e6;line-height:1.65">${escapeHtml(latest.description || '')}</p><p><a href="${escapeHtml(gameUrl)}" style="display:inline-block;padding:14px 22px;background:#78f4ff;color:#07101a;text-decoration:none;border-radius:12px;font-weight:900">פתח את המשחק</a></p><p style="font-size:13px;color:#8793bd">גלריה: <a style="color:#b9c5ff" href="${escapeHtml(deployedBase)}">${escapeHtml(deployedBase)}</a></p></div>`;
const boundary = `amit-v3-${Date.now().toString(36)}`;
const message = [
  `From: ${encodeHeader("Amit's Game Factory V5")} <${gmailUser}>`,
  `To: <${emailTo}>`,
  `Subject: ${encodeHeader(subject)}`,
  'MIME-Version: 1.0',
  `Content-Type: multipart/alternative; boundary="${boundary}"`,
  '',
  `--${boundary}`,
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  chunkBase64(textBody),
  `--${boundary}`,
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  chunkBase64(htmlBody),
  `--${boundary}--`,
  ''
].join('\r\n');

const smtp = new SmtpClient('smtp.gmail.com', 465);
try {
  await smtp.connect();
  await smtp.command(`EHLO github-actions`, [250]);
  await smtp.command('AUTH LOGIN', [334]);
  await smtp.command(Buffer.from(gmailUser).toString('base64'), [334]);
  await smtp.command(Buffer.from(gmailAppPassword).toString('base64'), [235]);
  await smtp.command(`MAIL FROM:<${gmailUser}>`, [250]);
  await smtp.command(`RCPT TO:<${emailTo}>`, [250, 251]);
  await smtp.command('DATA', [354]);
  smtp.socket.write(`${dotStuff(message)}\r\n.\r\n`);
  await smtp.readResponse([250]);
  console.log(`Email sent to ${emailTo}: ${gameUrl}`);
} finally {
  await smtp.close();
}
