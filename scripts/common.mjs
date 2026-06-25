import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const GAMES_DIR = path.join(PUBLIC_DIR, 'games');
export const AUTO_DIR = path.join(ROOT, '.automation');

export async function ensureFolders() {
  await fs.mkdir(GAMES_DIR, { recursive: true });
  await fs.mkdir(AUTO_DIR, { recursive: true });
}

export async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
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
  return String(value || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'game';
}

export function isoDate() { return new Date().toISOString().slice(0, 10); }
export function timeId() { return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14); }

export function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function pick(arr, seed) { return arr[hash(seed) % arr.length]; }
export function seeded(seed, min, max) { return min + (hash(seed) % (max - min + 1)); }

export function validateGameHtml(html) {
  const errors = [];
  if (!html.includes('<canvas')) errors.push('Missing canvas');
  if (!html.includes('requestAnimationFrame')) errors.push('Missing game loop');
  if (!html.includes('addEventListener')) errors.push('Missing controls');
  if (html.length < 9000) errors.push('Game too small');
  if (!html.includes('function update')) errors.push('Missing update function');
  if (!html.includes('function draw')) errors.push('Missing draw function');
  return errors;
}
