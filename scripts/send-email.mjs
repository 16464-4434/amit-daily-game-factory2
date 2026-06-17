import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { AUTO_DIR, escapeHtml, requiredEnv } from './common.mjs';

const gmailUser = requiredEnv('GMAIL_USER');
const gmailAppPassword = requiredEnv('GMAIL_APP_PASSWORD').replaceAll(' ', '');
const emailTo = process.env.EMAIL_TO?.trim() || gmailUser;
const result = JSON.parse(await fs.readFile(path.join(AUTO_DIR, 'deploy-result.json'), 'utf8'));

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: gmailUser, pass: gmailAppPassword }
});

await transport.verify();
await transport.sendMail({
  from: `Amit's Game Factory <${gmailUser}>`,
  to: emailTo,
  subject: `🎮 המשחק החדש מוכן: ${result.title}`,
  text: `המשחק החדש ${result.title} פורסם בהצלחה.\n\nלמשחק: ${result.gameUrl}\nלגלריה: ${result.deploymentUrl}\n`,
  html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;background:#0b1020;color:#f5f7ff;border-radius:20px"><div style="font-size:13px;color:#7df9ff;font-weight:700;letter-spacing:1px">AMIT'S DAILY GAME FACTORY</div><h1 style="font-size:30px;margin:14px 0">${escapeHtml(result.title)}</h1><p style="color:#bbc5e6;line-height:1.6">המשחק החדש נוצר, נבדק ופורסם אוטומטית.</p><p><a href="${escapeHtml(result.gameUrl)}" style="display:inline-block;padding:14px 22px;background:#7df9ff;color:#07101a;text-decoration:none;border-radius:12px;font-weight:800">פתח את המשחק</a></p><p style="font-size:13px;color:#8793bd">קישור לגלריה: <a style="color:#aebdff" href="${escapeHtml(result.deploymentUrl)}">${escapeHtml(result.deploymentUrl)}</a></p></div>`
});

console.log(`Email sent to ${emailTo}.`);
