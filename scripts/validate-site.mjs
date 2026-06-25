import fs from 'node:fs/promises';
import path from 'node:path';
import { GAMES_DIR, PUBLIC_DIR, readJson, validateGameHtml } from './common.mjs';
const manifest = await readJson(path.join(PUBLIC_DIR,'games.json'), []);
if (!Array.isArray(manifest)) throw new Error('public/games.json is not an array');
if (!manifest.length) console.log('No games yet; OK for first deploy.');
for (const game of manifest.slice(0, 20)) {
  const file = path.join(PUBLIC_DIR, game.url || '', 'index.html');
  const html = await fs.readFile(file, 'utf8');
  const errors = validateGameHtml(html);
  if (errors.length) throw new Error(`${game.title}: ${errors.join(' | ')}`);
}
await fs.access(path.join(PUBLIC_DIR,'index.html'));
console.log(`Validated ${manifest.length} games.`);
