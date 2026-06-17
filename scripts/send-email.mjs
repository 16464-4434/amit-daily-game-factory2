import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { AUTO_DIR, escapeHtml, requiredEnv } from './common.mjs';

const gmailUser = requiredEnv('GMAIL_USER');
const gmailAppPassword = requiredEnv('GMAIL_APP_PASSWORD').replaceAll(' ', '');
const emailTo = process.env.EMAIL_TO?.trim() || gmailUser;
const latest = JSON.parse(await fs.readFile(path.join(AUTO_DIR, 'latest-game.json'), 'utf8'));
const deployedBase = (process.env.DEPLOYED_SITE_URL || process.env.SITE_URL || '').replace(/\/$/, '');
const relativeGameUrl = String(latest.url || '').replace(/^\/+/, '');
const gameUrl = deployedBase ? `${deployedBase}/${relativeGameUrl}` : latest.absoluteUrl;
const score = Number(latest.qualityScore || latest.quality?.score || 0);
const strengths = (latest.quality?.strengths || latest.qualityHighlights || []).slice(0, 3);

const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailAppPassword } });
await transport.verify();
await transport.sendMail({
  from: `Amit's Game Factory V2 <${gmailUser}>`, to: emailTo,
  subject: `🎮 משחק חדש (${score}/100): ${latest.title}`,
  text: `המשחק החדש ${latest.title} עבר את בדיקות האיכות וקיבל ${score}/100.\n\nלמשחק: ${gameUrl}\nלגלריה: ${deployedBase}\n`,
  html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:30px;background:#0b1020;color:#f5f7ff;border-radius:22px"><div style="font-size:12px;color:#78f4ff;font-weight:800;letter-spacing:1px">AMIT'S GAME FACTORY V2</div><h1 style="font-size:31px;margin:14px 0 8px">${escapeHtml(latest.title)}</h1><div style="display:inline-block;padding:7px 11px;border:1px solid #6d57a0;border-radius:999px;color:#dac8ff;font-weight:700">Quality score: ${score}/100</div><p style="color:#bbc5e6;line-height:1.65">המשחק תוכנן, נבנה, נבדק ושופר אוטומטית לפני הפרסום.</p>${strengths.length ? `<ul style="color:#bbc5e6;line-height:1.6">${strengths.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}<p><a href="${escapeHtml(gameUrl)}" style="display:inline-block;padding:14px 22px;background:#78f4ff;color:#07101a;text-decoration:none;border-radius:12px;font-weight:900">פתח את המשחק</a></p><p style="font-size:13px;color:#8793bd">גלריה: <a style="color:#b9c5ff" href="${escapeHtml(deployedBase)}">${escapeHtml(deployedBase)}</a></p></div>`
});
console.log(`Email sent to ${emailTo}: ${gameUrl}`);
