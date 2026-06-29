import fs from 'node:fs/promises';
import path from 'node:path';
import { GAMES_DIR, PUBLIC_DIR, readJson, validateGameHtml } from './common.mjs';

const manifestPath = path.join(PUBLIC_DIR, 'games.json');
const manifest = await readJson(manifestPath, []);
if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('No games in public/games.json');
const latest = manifest[0];
if (!latest.url || !latest.title || !latest.engineId) throw new Error('Latest game entry is missing required fields');
const latestHtml = await fs.readFile(path.join(PUBLIC_DIR, latest.url, 'index.html'), 'utf8');
const errors = validateGameHtml(latestHtml);
if (errors.length) throw new Error(errors.join(' | '));
try { await fs.access(path.join(PUBLIC_DIR, 'index.html')); } catch { throw new Error('Missing public/index.html'); }
console.log(`Validated ${latest.title} (${latest.engineId}). Total games: ${manifest.length}`);
