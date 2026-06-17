import fs from 'node:fs/promises';
import path from 'node:path';
import { GAMES_DIR, PUBLIC_DIR, ensureFolders, readJson, validateGameHtml } from './common.mjs';

await ensureFolders();
const manifest = await readJson(path.join(PUBLIC_DIR, 'games.json'), []);
const failures = [];

for (const game of manifest) {
  const file = path.join(GAMES_DIR, game.slug, 'index.html');
  try {
    const html = await fs.readFile(file, 'utf8');
    const errors = validateGameHtml(html);
    if (errors.length) failures.push(`${game.slug}: ${errors.join(' | ')}`);
  } catch (error) {
    failures.push(`${game.slug}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Validated ${manifest.length} game(s) successfully.`);
