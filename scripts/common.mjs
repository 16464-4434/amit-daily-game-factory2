import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const GAMES_DIR = path.join(PUBLIC_DIR, 'games');
export const AUTO_DIR = path.join(ROOT, '.automation');

export async function ensureFolders() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(GAMES_DIR, { recursive: true });
  await fs.mkdir(AUTO_DIR, { recursive: true });
}

export async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'game';
}

export function timeId() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

export function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function hashString(input) {
  let h = 2166136261;
  for (const ch of String(input)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded(input, min, max) {
  const n = hashString(input);
  return min + (n % (max - min + 1));
}

export function choice(items, seed) {
  return items[hashString(seed) % items.length];
}

export function validateGameHtml(html) {
  const errors = [];
  if (!html || html.length < 1000) errors.push('Game HTML is too small');
  if (!/<script[\s>]/i.test(html)) errors.push('Missing JavaScript');
  if (!/(canvas|onclick|onkeydown|onmousemove|document\.createElement|querySelector|getElementById)/i.test(html)) errors.push('Missing game interaction code');
  if (!/(requestAnimationFrame|setInterval|onclick|pointerdown|keydown)/i.test(html)) errors.push('Missing game loop or interaction');
  if (/todo|lorem ipsum|placeholder/i.test(html)) errors.push('Contains placeholder text');
  return errors;
}
