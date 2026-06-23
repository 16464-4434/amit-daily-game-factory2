import fs from 'node:fs/promises';
import path from 'node:path';
import * as common from './common.mjs';

const requiredExports = [
  'ROOT', 'PUBLIC_DIR', 'GAMES_DIR', 'AUTO_DIR', 'TEMPLATE_DIR',
  'ensureFolders', 'requiredEnv', 'isoDate', 'israelTimeId', 'slugify',
  'escapeHtml', 'deterministicPick', 'seededNumber', 'readJson', 'writeJson',
  'callGemini', 'parseJsonLoose', 'sanitizeConfig', 'validateGameHtml'
];

const missing = requiredExports.filter(name => !(name in common));
if (missing.length) throw new Error(`common.mjs is missing exports: ${missing.join(', ')}`);

const requiredFiles = [
  '.github/workflows/daily-game.yml',
  'templates/arcade-core.html',
  'scripts/generate-game.mjs',
  'scripts/validate-site.mjs',
  'scripts/send-email.mjs',
  'scripts/deploy-netlify.mjs',
  'public/games.json'
];

for (const relative of requiredFiles) {
  const full = path.join(common.ROOT, relative);
  await fs.access(full).catch(() => { throw new Error(`Missing required file: ${relative}`); });
}

const template = await fs.readFile(path.join(common.TEMPLATE_DIR, 'arcade-core.html'), 'utf8');
for (const token of ['__GAME_CONFIG__', '__TITLE__', '__DESCRIPTION__']) {
  if (!template.includes(token)) throw new Error(`Template is missing token: ${token}`);
}

console.log('V5 self-check passed. All scripts and exports match.');
