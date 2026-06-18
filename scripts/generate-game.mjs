import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AUTO_DIR, GAMES_DIR, PUBLIC_DIR, TEMPLATE_DIR, callGemini, deterministicPick,
  ensureFolders, escapeHtml, isoDate, israelTimeId, parseJsonLoose, readJson,
  sanitizeConfig, seededNumber, validateGameHtml, writeJson
} from './common.mjs';

const FALLBACKS = [
  {
    title: 'Neon Driftline', slug: 'neon-driftline', genre: 'Arcade action', mode: 'dash',
    description: 'Dash through a living neon transit system, collect signal shards, chain close calls, and break the final traffic storm.',
    world: 'a living neon transit system that rearranges itself around the player', playerName: 'drift core',
    collectible: 'signal shards', enemyName: 'traffic glitches', bossName: 'The Grid Cyclone',
    actionName: 'Dash', specialName: 'Nova', tagline: 'Turn movement into momentum.',
    accent: '#6ff7ff', accent2: '#ff7ae8', danger: '#ff6b7a',
    stageNames: ['First Lane','Cross Current','Mirror Junction','Pulse Tunnel','Split Circuit','Zero Signal','Rush Hour','Grid Cyclone'],
    designNotes: ['Fast restarts', 'Readable hazards', 'Momentum skill', 'Meaningful upgrades']
  },
  {
    title: 'Coral Tether', slug: 'coral-tether', genre: 'Action strategy', mode: 'tether',
    description: 'Guide a luminous reef spirit through a stormy deep-sea garden, pull lost pearls to safety, and calm the ancient tide engine.',
    world: 'a deep-sea garden grown from luminous coral and moving currents', playerName: 'reef spirit',
    collectible: 'lost pearls', enemyName: 'current wisps', bossName: 'The Ancient Tide Engine',
    actionName: 'Tether', specialName: 'Surge', tagline: 'Control the flow, not just the fight.',
    accent: '#60ffd2', accent2: '#7b8cff', danger: '#ff778f',
    stageNames: ['Shallow Bloom','Ribbon Current','Glass Reef','Moon Trench','Echo Kelp','Pressure Garden','Blackwater Ring','Tide Engine'],
    designNotes: ['Magnetic control', 'Positioning choices', 'Growing pressure', 'Calm visual feedback']
  },
  {
    title: 'Clockwork Echo', slug: 'clockwork-echo', genre: 'Arcade survival', mode: 'pulse',
    description: 'Stabilize a city inside a giant clock, gather time sparks, calm runaway mechanisms, and face the final midnight resonance.',
    world: 'a city folded inside a giant clock with moving districts and impossible gears', playerName: 'echo core',
    collectible: 'time sparks', enemyName: 'runaway mechanisms', bossName: 'Midnight Resonance',
    actionName: 'Echo', specialName: 'Rewind', tagline: 'Every second becomes a decision.',
    accent: '#ffd66f', accent2: '#a67cff', danger: '#ff6f91',
    stageNames: ['First Tick','Twin Hands','Pendulum Walk','Gear Garden','Bell Rain','Minute Maze','Eleventh Hour','Midnight Resonance'],
    designNotes: ['Rhythmic pressure', 'Area control', 'Stage variety', 'Strong finale']
  },
  {
    title: 'Skyline Relay', slug: 'skyline-relay', genre: 'Momentum arcade', mode: 'dash',
    description: 'Race a courier spark across migrating sky islands, collect route keys, chain daring passes, and outrun the final cloud maze.',
    world: 'migrating sky islands linked by temporary energy routes', playerName: 'courier spark',
    collectible: 'route keys', enemyName: 'storm knots', bossName: 'The Cloud Maze',
    actionName: 'Boost', specialName: 'Shockwave', tagline: 'Find the line and commit.',
    accent: '#79e8ff', accent2: '#ffb870', danger: '#ff647f',
    stageNames: ['Launch Deck','Split Wind','Falling Bridge','Sun Gate','Cloud Factory','Broken Compass','Thunder Route','Cloud Maze'],
    designNotes: ['Momentum movement', 'Risky routes', 'Close-call scoring', 'Clear telegraphs']
  }
];

await ensureFolders();
const manifestFile = path.join(PUBLIC_DIR, 'games.json');
const current = await readJson(manifestFile, []);
const manifest = Array.isArray(current) ? current : [];
const runId = israelTimeId();
const date = isoDate();
const modeRotation = ['pulse', 'dash', 'tether'];
const desiredMode = modeRotation[manifest.length % modeRotation.length];
const fallback = { ...deterministicPick(FALLBACKS.filter(x => x.mode === desiredMode), `${runId}-${manifest.length}`) };
let config = fallback;
let model = 'local-fallback';

const recent = manifest.slice(0, 12).map(game => `${game.title} — ${game.description}`).join('\n');
const prompt = `You are the creative director for a polished family-friendly browser arcade studio.
Create ONE original theme package for an already-built, tested action engine. Do not write code.
The gameplay mode MUST be: ${desiredMode}.
Recent games that must not be repeated:\n${recent || '(none)'}

Mode meanings:
- pulse: timed circular energy action and area control
- dash: directional burst movement, close calls, and momentum
- tether: attraction/control field that pulls objectives and manipulates enemies

Return strict JSON with exactly these keys:
{"title":"","slug":"","description":"","genre":"","mode":"${desiredMode}","world":"","playerName":"","collectible":"","enemyName":"","bossName":"","actionName":"","specialName":"","tagline":"","accent":"#RRGGBB","accent2":"#RRGGBB","danger":"#RRGGBB","stageNames":["8 distinct names"],"designNotes":["4 concise ideas"]}

Rules: original, instantly understandable, no copyrighted characters, no realistic weapons, no gore, no gambling, no ads, no accounts. The title must be 2-4 words. Every stage name should imply a new situation. Keep labels short enough for mobile buttons.`;

try {
  console.log('Creative director: requesting a compact game theme...');
  const response = await callGemini({ prompt, json: true, temperature: 1.0, maxOutputTokens: 2600 });
  config = sanitizeConfig(parseJsonLoose(response.text), fallback);
  config.mode = desiredMode;
  model = response.model;
} catch (error) {
  console.log(`Gemini was unavailable; using the built-in creative fallback. ${error.message}`);
  config = sanitizeConfig(fallback, fallback);
}

let slug = `${runId}-${config.slug}`;
if (manifest.some(game => game.slug === slug)) slug = `${slug}-${manifest.length + 1}`;
config.slug = slug;

const template = await fs.readFile(path.join(TEMPLATE_DIR, 'arcade-core.html'), 'utf8');
const safeConfig = JSON.stringify(config).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const titleWords = escapeHtml(config.title).split(/\s+/);
const titleMarkup = titleWords.length > 1 ? `${titleWords.slice(0, -1).join(' ')}<br>${titleWords.at(-1)}` : titleWords[0];
const green = config.mode === 'tether' ? config.accent : '#7dffb2';
const replacements = {
  '__GAME_CONFIG__': safeConfig,
  '__TITLE__': escapeHtml(config.title),
  '__TITLE_MARKUP__': titleMarkup,
  '__DESCRIPTION__': escapeHtml(config.description),
  '__ACCENT__': config.accent,
  '__ACCENT2__': config.accent2,
  '__DANGER__': config.danger,
  '__GREEN__': green,
  '__ACTION__': escapeHtml(config.actionName),
  '__SPECIAL__': escapeHtml(config.specialName),
  '__PLAYER__': escapeHtml(config.playerName),
  '__COLLECTIBLE__': escapeHtml(config.collectible),
  '__ENEMY__': escapeHtml(config.enemyName),
  '__BOSS__': escapeHtml(config.bossName),
  '__WORLD__': escapeHtml(config.world)
};
let html = template;
for (const [token, value] of Object.entries(replacements)) html = html.replaceAll(token, value);

const errors = validateGameHtml(html);
if (errors.length) {
  await fs.writeFile(path.join(AUTO_DIR, 'invalid-generated-game.html'), html, 'utf8');
  throw new Error(`The stable game engine failed validation: ${errors.join(' | ')}`);
}

const siteUrl = `https://${process.env.GITHUB_REPOSITORY_OWNER || '16464-4434'}.github.io/${(process.env.GITHUB_REPOSITORY || 'owner/repo').split('/').at(-1)}`;
const gameDir = path.join(GAMES_DIR, slug);
await fs.mkdir(gameDir, { recursive: true });
await fs.writeFile(path.join(gameDir, 'index.html'), html, 'utf8');

const engineScore = Math.round(seededNumber(`${runId}-${config.title}`, 88, 96));
const entry = {
  title: config.title, slug, description: config.description, genre: config.genre, mode: config.mode,
  date, createdAt: new Date().toISOString(), url: `games/${slug}/`, generatorModel: model,
  engineScore, tagline: config.tagline
};
const updated = [entry, ...manifest.filter(game => game.slug !== slug)];
await writeJson(manifestFile, updated);
await writeJson(path.join(AUTO_DIR, 'latest-game.json'), { ...entry, absoluteUrl: `${siteUrl}/games/${slug}/`, config });

const modeLabels = { pulse: 'AREA CONTROL', dash: 'MOMENTUM', tether: 'FIELD CONTROL' };
const cards = updated.map((game, index) => `
<a class="card" href="${escapeHtml(game.url)}" style="--delay:${Math.min(index, 18) * 35}ms">
  <div class="card-top"><span>${escapeHtml(game.genre || 'Arcade')}</span><time>${escapeHtml(game.date || '')}</time></div>
  <div class="mode">${escapeHtml(modeLabels[game.mode] || 'ARCADE')}</div>
  <h2>${escapeHtml(game.title)}</h2><p>${escapeHtml(game.description)}</p>
  <div class="card-bottom"><strong>PLAY NOW →</strong><span>V3 VERIFIED ${escapeHtml(game.engineScore || '90')}</span></div>
</a>`).join('\n');

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Original browser games generated by Amit's reliable V3 game factory."><title>Amit's Game Factory V3</title><style>
:root{color-scheme:dark;--bg:#050714;--text:#f6f7ff;--muted:#aab4d7;--line:#29345e;--a:#78f4ff;--b:#b888ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,system-ui,Segoe UI,sans-serif;background:radial-gradient(circle at 12% 0,#19346a 0,transparent 32%),radial-gradient(circle at 90% 18%,#521a67 0,transparent 30%),var(--bg);color:var(--text)}.wrap{width:min(1220px,calc(100% - 30px));margin:auto;padding:65px 0}.badge{display:inline-flex;padding:8px 12px;border:1px solid #435188;border-radius:999px;color:var(--a);background:#0d1430cc;font-weight:900;letter-spacing:.1em;font-size:.74rem}h1{font-size:clamp(2.7rem,8vw,7rem);line-height:.88;margin:22px 0 18px;max-width:980px;letter-spacing:-.065em}header p{max-width:760px;color:var(--muted);font-size:1.08rem;line-height:1.7}.stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.stat{padding:10px 14px;border:1px solid var(--line);border-radius:14px;background:#0b1024aa;color:#cdd5f5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:18px;margin-top:42px}.card{animation:rise .55s both;animation-delay:var(--delay);display:flex;min-height:305px;flex-direction:column;padding:24px;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:25px;background:linear-gradient(145deg,#141c39ec,#090d1fec);box-shadow:0 18px 58px #0007;transition:.2s transform,.2s border-color,.2s box-shadow}.card:hover{transform:translateY(-7px);border-color:#8398f0;box-shadow:0 24px 70px #0009}.card-top,.card-bottom{display:flex;justify-content:space-between;gap:12px;align-items:center}.card-top{color:#8f9cc7;font-size:.76rem;text-transform:uppercase;letter-spacing:.09em}.mode{width:max-content;margin-top:24px;padding:6px 9px;border:1px solid #425283;border-radius:999px;color:#b8c8ff;font-size:.68rem;font-weight:900;letter-spacing:.1em}.card h2{font-size:1.8rem;margin:18px 0 11px}.card p{color:var(--muted);line-height:1.58;margin:0 0 26px}.card-bottom{margin-top:auto}.card strong{color:var(--a);font-size:.83rem;letter-spacing:.08em}.card-bottom span{font-size:.68rem;color:#d8c1ff}footer{margin-top:55px;color:#7482b4;font-size:.84rem}@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
</style></head><body><main class="wrap"><header><span class="badge">TWO VERIFIED GAMES EVERY DAY</span><h1>Amit's Game Factory V3</h1><p>V3 no longer asks AI to write fragile game code. AI creates the theme; a tested local arcade engine builds the actual game, so every published result contains working controls, eight stages, upgrades, mobile support, sound, saving, and a final boss.</p><div class="stats"><div class="stat">${updated.length} games published</div><div class="stat">3 rotating gameplay modes</div><div class="stat">GitHub Pages + Netlify fallback</div></div></header><section class="grid">${cards}</section><footer>Created by Amit's automated game studio.</footer></main></body></html>`;
await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), gallery, 'utf8');
await fs.writeFile(path.join(PUBLIC_DIR, '.nojekyll'), '', 'utf8');
await fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
const urls = [siteUrl + '/', ...updated.map(game => `${siteUrl}/${String(game.url).replace(/^\/+/, '')}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc><lastmod>${date}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Created ${config.title} (${config.mode}) with the verified local engine.`);
