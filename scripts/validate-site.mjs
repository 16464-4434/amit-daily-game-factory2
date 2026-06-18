import fs from 'node:fs/promises';
import path from 'node:path';
import { GAMES_DIR, PUBLIC_DIR, ensureFolders, readJson, validateGameHtml } from './common.mjs';

await ensureFolders();
const manifest = await readJson(path.join(PUBLIC_DIR, 'games.json'), []);
if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('public/games.json contains no games.');

const seen = new Set();
for (const game of manifest) {
  if (!game?.slug || seen.has(game.slug)) throw new Error(`Invalid or duplicate game slug: ${game?.slug}`);
  seen.add(game.slug);
  const file = path.join(GAMES_DIR, game.slug, 'index.html');
  const html = await fs.readFile(file, 'utf8');
  const errors = validateGameHtml(html);
  if (errors.length) throw new Error(`${game.slug}: ${errors.join(' | ')}`);
}

const gallery = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
if (!/<title>/i.test(gallery) || !/Game Factory V3/i.test(gallery)) throw new Error('Gallery page is incomplete.');
if (!await fs.stat(path.join(PUBLIC_DIR, '.nojekyll')).catch(() => null)) throw new Error('Missing public/.nojekyll.');
console.log(`Validated ${manifest.length} V3 game(s) and the gallery.`);
