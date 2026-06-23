import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AUTO_DIR, GAMES_DIR, PUBLIC_DIR, TEMPLATE_DIR, callGemini, deterministicPick,
  ensureFolders, escapeHtml, isoDate, israelTimeId, parseJsonLoose, readJson,
  sanitizeConfig, seededNumber, validateGameHtml, writeJson
} from './common.mjs';

const BLUEPRINTS = [
  { id:'gravity-parkour', title:'Gravity Switch Run', slug:'gravity-switch-run', genre:'Gravity parkour', mode:'dash', family:'Parkour', objective:'flip lanes and chain boosts', world:'floating city rooftops where gravity turns sideways', playerName:'gravity runner', collectible:'flip tokens', enemyName:'roof drones', bossName:'The Upside Tower', actionName:'Switch', specialName:'Warp Dash', tagline:'Flip the world before it flips you.', accent:'#72f4ff', accent2:'#ff7adf', danger:'#ff617b', stageNames:['First Flip','Sideways Roof','Magnet Alley','Broken Elevator','Sky Rail','Storm Antenna','Zero-G Market','Upside Tower'], designNotes:['Short stages','Lane flipping','Speed pressure','Vertical feeling'] },
  { id:'bubble-rescue', title:'Bubble Rescue Squad', slug:'bubble-rescue-squad', genre:'Rescue arcade', mode:'tether', family:'Rescue', objective:'pull trapped bubbles to safe gates', world:'a giant fizzy soda ocean full of glowing bubble tunnels', playerName:'bubble pilot', collectible:'lost bubbles', enemyName:'pop sparks', bossName:'The Foam Kraken', actionName:'Tow', specialName:'Foam Wave', tagline:'Save the bubbles before the fizz wins.', accent:'#7dffda', accent2:'#85a8ff', danger:'#ff6f9b', stageNames:['Tiny Fizz','Bottle Cave','Bubble Metro','Sugar Reef','Pop Storm','Straw Spiral','Carbon Castle','Foam Kraken'], designNotes:['Rescue focus','Tether control','Soft chaos','Clear goals'] },
  { id:'meteor-gardener', title:'Meteor Garden Guard', slug:'meteor-garden-guard', genre:'Defense action', mode:'pulse', family:'Defense', objective:'protect living plants from falling meteors', world:'an asteroid greenhouse orbiting a tiny moon', playerName:'garden comet', collectible:'star seeds', enemyName:'meteor mites', bossName:'The Iron Asteroid', actionName:'Bloom', specialName:'Root Shield', tagline:'Grow fast. Guard faster.', accent:'#9cff70', accent2:'#7bb7ff', danger:'#ff775c', stageNames:['Seed Orbit','Glass Leaves','Falling Dust','Moon Sprinkler','Comet Rain','Root Circuit','Solar Bloom','Iron Asteroid'], designNotes:['Defense objective','Growing arena','Protect targets','Big finale'] },
  { id:'mirror-maze', title:'Mirror Maze Sprint', slug:'mirror-maze-sprint', genre:'Reflection runner', mode:'dash', family:'Maze', objective:'escape moving mirrors and collect prism keys', world:'a crystal maze where reflections become obstacles', playerName:'prism scout', collectible:'mirror keys', enemyName:'reflection copies', bossName:'The Glass Minotaur', actionName:'Blink', specialName:'Prism Burst', tagline:'Trust your path, not your reflection.', accent:'#b7f7ff', accent2:'#d37bff', danger:'#ff5e91', stageNames:['First Reflection','Left Is Right','Prism Hall','Copy Chase','Glass River','Turning Room','Broken Doubles','Glass Minotaur'], designNotes:['Puzzle-like movement','Trick paths','Fast reads','Chase tension'] },
  { id:'kitchen-chaos', title:'Kitchen Comet Rush', slug:'kitchen-comet-rush', genre:'Food chaos arcade', mode:'dash', family:'Kitchen', objective:'deliver hot ingredients before the kitchen explodes with chaos', world:'a flying kitchen inside a comet restaurant', playerName:'soup rocket', collectible:'spice stars', enemyName:'angry pans', bossName:'The Giant Mixer', actionName:'Sizzle', specialName:'Turbo Serve', tagline:'Cook at comet speed.', accent:'#ffd56c', accent2:'#ff8fd4', danger:'#ff705a', stageNames:['Soup Launch','Pan Traffic','Pepper Tunnel','Plate Storm','Oven Orbit','Sauce Slide','Dessert Meteor','Giant Mixer'], designNotes:['Delivery energy','Funny theme','Fast dodging','Combo routes'] },
  { id:'toy-factory', title:'Toy Factory Breakout', slug:'toy-factory-breakout', genre:'Factory adventure', mode:'pulse', family:'Factory', objective:'wake friendly toys and shut down jammed machines', world:'a midnight toy factory with conveyor belts and glowing boxes', playerName:'clockwork buddy', collectible:'wind-up keys', enemyName:'jam bots', bossName:'The Broken Claw', actionName:'Wind Up', specialName:'Mega Spring', tagline:'Bring the factory back to play.', accent:'#75f0ff', accent2:'#ffbf63', danger:'#ff6363', stageNames:['First Belt','Box Canyon','Button Room','Paint Wheels','Gift Elevator','Claw Tracks','Midnight Line','Broken Claw'], designNotes:['Conveyors','Toy humor','Awakening objectives','Machine boss'] },
  { id:'music-storm', title:'Bass Storm Arena', slug:'bass-storm-arena', genre:'Rhythm survival', mode:'pulse', family:'Music', objective:'hit pulses with the beat and dodge sound waves', world:'a floating concert stage inside a thundercloud', playerName:'bass spark', collectible:'beat notes', enemyName:'static waves', bossName:'The Thunder Speaker', actionName:'Beat Pulse', specialName:'Drop', tagline:'Survive the beat drop.', accent:'#8afff2', accent2:'#be7bff', danger:'#ff4f8b', stageNames:['Sound Check','Kick Lane','Snare Rain','Laser Chorus','Cloud Drop','Echo Pit','Final Verse','Thunder Speaker'], designNotes:['Rhythm feel','Pulse timing','Concert visuals','Wave hazards'] },
  { id:'mini-golf-galaxy', title:'Galaxy Golf Dash', slug:'galaxy-golf-dash', genre:'Sports arcade', mode:'tether', family:'Sports', objective:'guide energy balls into space holes while dodging blockers', world:'a mini-golf galaxy with planets as bumpers', playerName:'golf comet', collectible:'orbit balls', enemyName:'bumper gremlins', bossName:'The Black Hole Cup', actionName:'Aim Pull', specialName:'Perfect Shot', tagline:'Every orbit is a trick shot.', accent:'#a4ff7b', accent2:'#7bbcff', danger:'#ff647e', stageNames:['First Putt','Moon Ramp','Planet Bumper','Ring Course','Astro Sand','Comet Bank','Gravity Green','Black Hole Cup'], designNotes:['Sports twist','Aim and pull','Bank shots','Puzzle action'] },
  { id:'train-switch', title:'Turbo Train Switch', slug:'turbo-train-switch', genre:'Rail action', mode:'dash', family:'Train', objective:'switch rails, grab tickets, and avoid runaway carts', world:'a neon train station with tracks that move in midair', playerName:'rail spark', collectible:'gold tickets', enemyName:'runaway carts', bossName:'The Midnight Engine', actionName:'Switch Rail', specialName:'Express Boost', tagline:'Change tracks before trouble arrives.', accent:'#6ee7ff', accent2:'#ffb86f', danger:'#ff5c73', stageNames:['Platform One','Signal Split','Tunnel Rush','Ticket Loop','Bridge Switch','Cart Storm','Final Platform','Midnight Engine'], designNotes:['Rail routes','Fast switching','Readable danger','Train fantasy'] },
  { id:'snowball-castle', title:'Snowball Castle Clash', slug:'snowball-castle-clash', genre:'Winter arena', mode:'pulse', family:'Winter', objective:'charge snow shields and collect crystal flakes', world:'a giant snow castle during a friendly winter tournament', playerName:'frost kid', collectible:'crystal flakes', enemyName:'snow sprites', bossName:'The Ice Crown', actionName:'Snow Pop', specialName:'Blizzard', tagline:'Win the coldest arcade tournament.', accent:'#bbf5ff', accent2:'#8f9dff', danger:'#ff6f83', stageNames:['Front Gate','Powder Yard','Ice Kitchen','Crystal Stairs','Snowbridge','Tower Gust','Frozen Throne','Ice Crown'], designNotes:['Friendly combat','Winter visuals','Shield play','Castle stages'] },
  { id:'bee-delivery', title:'Honeybee Delivery', slug:'honeybee-delivery', genre:'Delivery arcade', mode:'tether', family:'Delivery', objective:'pull nectar drops into hives while avoiding wind bugs', world:'a giant flower city buzzing above a sunny meadow', playerName:'honeybee hero', collectible:'nectar drops', enemyName:'wind bugs', bossName:'The Storm Wasp', actionName:'Nectar Pull', specialName:'Hive Shield', tagline:'Deliver sweetness under pressure.', accent:'#ffe66e', accent2:'#64ffbe', danger:'#ff5f70', stageNames:['First Flower','Pollen Lane','Tulip Towers','Wind Garden','Hive Cross','Rose Maze','Storm Meadow','Storm Wasp'], designNotes:['Delivery loops','Cute theme','Wind hazards','Tether strategy'] },
  { id:'museum-night', title:'Museum Night Quest', slug:'museum-night-quest', genre:'Stealth arcade', mode:'dash', family:'Stealth', objective:'collect glowing artifacts while avoiding sleepy guards', world:'a museum where exhibits wake up after midnight', playerName:'night curator', collectible:'lost artifacts', enemyName:'sleepy guards', bossName:'The Pharaoh Clock', actionName:'Sneak Dash', specialName:'Lights Out', tagline:'Quiet feet, fast escapes.', accent:'#d8b4ff', accent2:'#79e8ff', danger:'#ff7a5f', stageNames:['Lobby Lights','Dino Hall','Painting Run','Laser Room','Ancient Wing','Planetarium','Clock Exhibit','Pharaoh Clock'], designNotes:['Stealth feeling','Dash escapes','Artifact routes','Museum variety'] },
  { id:'dragon-mail', title:'Dragon Mail Express', slug:'dragon-mail-express', genre:'Flying delivery', mode:'dash', family:'Flying', objective:'deliver letters across floating kingdoms', world:'a chain of sky castles connected by dragon winds', playerName:'mail dragon', collectible:'royal letters', enemyName:'wind goblins', bossName:'The Storm Griffin', actionName:'Wing Dash', specialName:'Fire Loop', tagline:'Mail moves fastest on dragon wings.', accent:'#ffb86f', accent2:'#78f4ff', danger:'#ff5a6d', stageNames:['First Castle','Cloud Post','Wind Bridge','Bell Tower','Rainbow Route','Goblin Gust','Royal Skyway','Storm Griffin'], designNotes:['Flying fantasy','Delivery pressure','Fast lanes','Clear objectives'] },
  { id:'pirate-puzzle', title:'Pirate Pearl Panic', slug:'pirate-pearl-panic', genre:'Treasure arcade', mode:'tether', family:'Treasure', objective:'pull pearls into treasure chests before the tide changes', world:'a cartoon pirate island with moving tides and secret caves', playerName:'pearl captain', collectible:'rainbow pearls', enemyName:'crab crews', bossName:'The Tide Captain', actionName:'Anchor Pull', specialName:'Treasure Wave', tagline:'Steal the tide, not the ship.', accent:'#70ffd0', accent2:'#ffd36a', danger:'#ff6868', stageNames:['Sandy Start','Crab Dock','Cave Tide','Palm Maze','Shipwreck Run','Pearl Whirlpool','Hidden Cove','Tide Captain'], designNotes:['Treasure routes','Tide pressure','Crab enemies','Anchor control'] },
  { id:'robot-school', title:'Robot School Escape', slug:'robot-school-escape', genre:'School arcade', mode:'pulse', family:'School', objective:'solve energy locks and calm homework bots', world:'a future school where the lockers became a maze', playerName:'student bot', collectible:'logic chips', enemyName:'homework bots', bossName:'The Principal Server', actionName:'Logic Pulse', specialName:'Reboot', tagline:'Class is weird today.', accent:'#7bffdf', accent2:'#8aa0ff', danger:'#ff637d', stageNames:['Locker Start','Math Hall','Science Lab','Gym Circuit','Library Maze','Cafeteria Loop','Exam Elevator','Principal Server'], designNotes:['School humor','Puzzle locks','Bot enemies','Friendly tone'] },
  { id:'jungle-jump', title:'Jungle Jump Circuit', slug:'jungle-jump-circuit', genre:'Jungle arcade', mode:'dash', family:'Jungle', objective:'race through vines and collect ancient seeds', world:'a jungle temple built on giant moving vines', playerName:'vine runner', collectible:'ancient seeds', enemyName:'moss masks', bossName:'The Vine Idol', actionName:'Vine Dash', specialName:'Leaf Storm', tagline:'The jungle moves faster than you think.', accent:'#7dff8d', accent2:'#ffc76e', danger:'#ff6c72', stageNames:['Vine Gate','Monkey Bridge','Temple Moss','River Jump','Leaf Tunnel','Root Spiral','Sun Idol','Vine Idol'], designNotes:['Jungle routes','Dash lanes','Temple hazards','Natural colors'] },
  { id:'candy-lab', title:'Candy Lab Meltdown', slug:'candy-lab-meltdown', genre:'Lab chaos arcade', mode:'pulse', family:'Candy', objective:'cool candy reactors and collect sugar gems', world:'a candy science lab where sweets bounce everywhere', playerName:'sugar scientist', collectible:'sugar gems', enemyName:'gum blobs', bossName:'The Mega Lollipop', actionName:'Cool Pulse', specialName:'Sugar Freeze', tagline:'Sweet science went too far.', accent:'#ff8ee8', accent2:'#7cf8ff', danger:'#ff6a76', stageNames:['Mint Room','Bubble Hall','Gummy Pipes','Sprinkle Lab','Syrup Slide','Candy Reactor','Sugar Alarm','Mega Lollipop'], designNotes:['Candy visuals','Bouncy enemies','Lab objectives','Funny boss'] },
  { id:'moon-miner', title:'Moon Miner Sprint', slug:'moon-miner-sprint', genre:'Mining arcade', mode:'tether', family:'Mining', objective:'pull moon crystals into carts while dodging drills', world:'a low-gravity moon mine with sparkling tunnels', playerName:'moon miner', collectible:'moon crystals', enemyName:'drill bugs', bossName:'The Core Drill', actionName:'Magnet Beam', specialName:'Gravity Cart', tagline:'Mine fast before the moon shakes.', accent:'#b9d6ff', accent2:'#ffe178', danger:'#ff6c5c', stageNames:['Dust Entry','Crystal Track','Drill Bend','Low-G Cave','Cart Loop','Silver Tunnel','Core Gate','Core Drill'], designNotes:['Mining loop','Magnet collection','Low gravity feel','Cart routes'] },
  { id:'circus-cloud', title:'Cloud Circus Flight', slug:'cloud-circus-flight', genre:'Circus arcade', mode:'dash', family:'Circus', objective:'perform sky tricks and collect applause stars', world:'a circus tent floating above the clouds', playerName:'acrobat cloud', collectible:'applause stars', enemyName:'trick balloons', bossName:'The Ringmaster Cloud', actionName:'Flip Dash', specialName:'Encore', tagline:'The sky is the stage.', accent:'#ffce70', accent2:'#7cf6ff', danger:'#ff5f92', stageNames:['Tiny Tent','Balloon Ring','Ribbon Jump','Cloud Trapeze','Popcorn Wind','Spotlight Lane','Encore Spiral','Ringmaster Cloud'], designNotes:['Circus flair','Trick scoring','Air movement','Show finale'] },
  { id:'volcano-skate', title:'Volcano Skate Rush', slug:'volcano-skate-rush', genre:'Skate arcade', mode:'dash', family:'Skate', objective:'skate lava paths and grab cooling gems', world:'a safe cartoon volcano skatepark with glowing ramps', playerName:'lava skater', collectible:'cooling gems', enemyName:'smoke puffs', bossName:'The Lava Ramp', actionName:'Kickflip', specialName:'Mega Grind', tagline:'Skate the heat without losing speed.', accent:'#ffb15e', accent2:'#7dffdc', danger:'#ff4f5f', stageNames:['Warm Ramp','Smoke Bowl','Ash Rail','Magma Curve','Steam Tunnel','Glow Halfpipe','Final Drop','Lava Ramp'], designNotes:['Skate fantasy','Momentum routes','Cartoon lava','Trick energy'] },
  { id:'library-ghost', title:'Library Ghost Chase', slug:'library-ghost-chase', genre:'Spooky arcade', mode:'tether', family:'Spooky', objective:'pull floating books back to shelves before ghosts scramble them', world:'a friendly haunted library with flying books', playerName:'book keeper', collectible:'runaway books', enemyName:'shelf ghosts', bossName:'The Whisper Index', actionName:'Book Pull', specialName:'Quiet Bell', tagline:'Shhh. The books are escaping.', accent:'#b99cff', accent2:'#7dffd9', danger:'#ff708a', stageNames:['Front Desk','Flying Fiction','Puzzle Stacks','Moon Window','Archive Drift','Silent Stair','Secret Shelf','Whisper Index'], designNotes:['Not scary','Book rescue','Tether sorting','Library humor'] },
  { id:'rocket-farm', title:'Rocket Farm Harvest', slug:'rocket-farm-harvest', genre:'Farm arcade', mode:'pulse', family:'Farm', objective:'harvest rocket crops before they launch away', world:'a space farm where vegetables have tiny rockets', playerName:'farm astronaut', collectible:'rocket crops', enemyName:'space crows', bossName:'The Giant Turnip', actionName:'Harvest Pulse', specialName:'Tractor Beam', tagline:'Fresh crops. Zero gravity.', accent:'#9aff78', accent2:'#78d9ff', danger:'#ff7b63', stageNames:['Seed Pad','Carrot Launch','Orbit Barn','Comet Field','Crow Swarm','Pumpkin Boost','Moon Silo','Giant Turnip'], designNotes:['Farm comedy','Harvest goals','Space twist','Boss vegetable'] },
  { id:'aquarium-race', title:'Aquarium Race Team', slug:'aquarium-race-team', genre:'Water racing', mode:'dash', family:'Water', objective:'race through aquarium tunnels and collect air rings', world:'a giant aquarium city with bubble highways', playerName:'bubble racer', collectible:'air rings', enemyName:'kelp racers', bossName:'The Whale Tunnel', actionName:'Bubble Boost', specialName:'Current Cut', tagline:'Fast lanes under water.', accent:'#73eaff', accent2:'#7dffb5', danger:'#ff7383', stageNames:['Tank One','Bubble Highway','Kelp Corner','Glass Loop','Subway Reef','Filter Rush','Deep Lane','Whale Tunnel'], designNotes:['Racing feel','Water paths','Bubble boosts','Friendly rivals'] },
  { id:'planet-zoo', title:'Planet Zoo Dash', slug:'planet-zoo-dash', genre:'Animal rescue arcade', mode:'tether', family:'Zoo', objective:'guide alien pets back to habitats', world:'a space zoo full of cute bouncing alien animals', playerName:'zoo ranger', collectible:'alien pets', enemyName:'gate glitches', bossName:'The Runaway Habitat', actionName:'Guide Beam', specialName:'Ranger Call', tagline:'Every tiny alien needs a home.', accent:'#92ff8d', accent2:'#b788ff', danger:'#ff6980', stageNames:['Tiny Habitat','Bouncy Field','Moon Aviary','Snack Tunnel','Gate Maze','Pet Parade','Cosmic Pen','Runaway Habitat'], designNotes:['Rescue pets','Tether guiding','Cute theme','No violence'] }
];

function usedBlueprints(manifest) {
  return new Set(manifest.slice(0, Math.min(22, manifest.length)).map(game => game.blueprintId).filter(Boolean));
}

function pickBlueprint(manifest, runId) {
  const used = usedBlueprints(manifest);
  const fresh = BLUEPRINTS.filter(item => !used.has(item.id));
  const pool = fresh.length ? fresh : BLUEPRINTS;
  return { ...deterministicPick(pool, `${runId}-${manifest.length}-${fresh.length}`) };
}

function titleAlreadyUsed(manifest, title) {
  const key = String(title || '').trim().toLowerCase();
  return manifest.some(game => String(game.title || '').trim().toLowerCase() === key);
}

await ensureFolders();
const manifestFile = path.join(PUBLIC_DIR, 'games.json');
const current = await readJson(manifestFile, []);
const manifest = Array.isArray(current) ? current : [];
const runId = israelTimeId();
const date = isoDate();
const blueprint = pickBlueprint(manifest, runId);
let config = { ...blueprint };
let model = 'local-blueprint-v5';

const recent = manifest.slice(0, 18).map(game => `${game.title} [${game.blueprintId || game.mode || 'old'}] — ${game.description}`).join('\n');
const prompt = `You are a creative director for Amit's kid-friendly browser arcade studio.
Create ONE fresh theme package for an already-tested canvas engine.
You MUST use this gameplay blueprint and not repeat recent games.

Required blueprint:
- blueprintId: ${blueprint.id}
- family: ${blueprint.family}
- engine mode: ${blueprint.mode}
- base objective: ${blueprint.objective}

Recent games that must not be copied:\n${recent || '(none)'}

Return strict JSON with exactly these keys:
{"title":"","slug":"","description":"","genre":"","mode":"${blueprint.mode}","world":"","playerName":"","collectible":"","enemyName":"","bossName":"","actionName":"","specialName":"","tagline":"","accent":"#RRGGBB","accent2":"#RRGGBB","danger":"#RRGGBB","stageNames":["8 distinct names"],"designNotes":["4 concise ideas"]}

Rules:
- Original and family-friendly.
- No copyrighted characters.
- No realistic weapons, gore, gambling, accounts, or ads.
- Do not write code.
- Make the title totally different from the recent titles.
- Stage names must feel like different situations, not generic levels.
- Keep mobile button labels short.`;

try {
  console.log(`V5 creative director: selected blueprint ${blueprint.id} (${blueprint.family}).`);
  const response = await callGemini({ prompt, json: true, temperature: 1.15, maxOutputTokens: 2800 });
  config = sanitizeConfig(parseJsonLoose(response.text), blueprint);
  config.mode = blueprint.mode;
  config.blueprintId = blueprint.id;
  config.family = blueprint.family;
  if (titleAlreadyUsed(manifest, config.title)) {
    config.title = blueprint.title;
    config.slug = blueprint.slug;
  }
  model = response.model;
} catch (error) {
  console.log(`Gemini unavailable or over quota; using non-repeating built-in blueprint. ${error.message}`);
  config = sanitizeConfig(blueprint, blueprint);
  config.blueprintId = blueprint.id;
  config.family = blueprint.family;
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

html = html.replaceAll('Amit’s Game Factory V5', 'Amit’s Game Factory V5');

const errors = validateGameHtml(html);
if (errors.length) {
  await fs.writeFile(path.join(AUTO_DIR, 'invalid-generated-game.html'), html, 'utf8');
  throw new Error(`The stable V5 game engine failed validation: ${errors.join(' | ')}`);
}

const repoName = (process.env.GITHUB_REPOSITORY || 'owner/amit-daily-game-factory2').split('/').at(-1);
const siteUrl = `https://${process.env.GITHUB_REPOSITORY_OWNER || '16464-4434'}.github.io/${repoName}`;
const gameDir = path.join(GAMES_DIR, slug);
await fs.mkdir(gameDir, { recursive: true });
await fs.writeFile(path.join(gameDir, 'index.html'), html, 'utf8');

const engineScore = Math.round(seededNumber(`${runId}-${config.title}-${config.blueprintId}`, 88, 97));
const entry = {
  title: config.title,
  slug,
  description: config.description,
  genre: config.genre,
  mode: config.mode,
  family: config.family,
  blueprintId: config.blueprintId,
  date,
  createdAt: new Date().toISOString(),
  url: `games/${slug}/`,
  generatorModel: model,
  engineScore,
  tagline: config.tagline
};
const updated = [entry, ...manifest.filter(game => game.slug !== slug)];
await writeJson(manifestFile, updated);
await writeJson(path.join(AUTO_DIR, 'latest-game.json'), { ...entry, absoluteUrl: `${siteUrl}/games/${slug}/`, config });

const modeLabels = { pulse: 'AREA CONTROL', dash: 'MOMENTUM', tether: 'FIELD CONTROL' };
const cards = updated.map((game, index) => `
<a class="card" href="${escapeHtml(game.url)}" style="--delay:${Math.min(index, 24) * 30}ms">
  <div class="card-top"><span>${escapeHtml(game.family || game.genre || 'Arcade')}</span><time>${escapeHtml(game.date || '')}</time></div>
  <div class="mode">${escapeHtml(modeLabels[game.mode] || 'ARCADE')} · ${escapeHtml(game.blueprintId || 'classic')}</div>
  <h2>${escapeHtml(game.title)}</h2><p>${escapeHtml(game.description)}</p>
  <div class="card-bottom"><strong>PLAY NOW →</strong><span>V5 DIVERSE ${escapeHtml(game.engineScore || '90')}</span></div>
</a>`).join('\n');

const uniqueFamilies = new Set(updated.map(game => game.family || game.blueprintId || game.mode).filter(Boolean)).size;
const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Original browser games generated by Amit's diverse V5 game factory."><title>Amit's Game Factory V5</title><style>
:root{color-scheme:dark;--bg:#050714;--text:#f6f7ff;--muted:#aab4d7;--line:#29345e;--a:#78f4ff;--b:#b888ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,system-ui,Segoe UI,sans-serif;background:radial-gradient(circle at 12% 0,#19346a 0,transparent 32%),radial-gradient(circle at 90% 18%,#521a67 0,transparent 30%),var(--bg);color:var(--text)}.wrap{width:min(1220px,calc(100% - 30px));margin:auto;padding:65px 0}.badge{display:inline-flex;padding:8px 12px;border:1px solid #435188;border-radius:999px;color:var(--a);background:#0d1430cc;font-weight:900;letter-spacing:.1em;font-size:.74rem}h1{font-size:clamp(2.7rem,8vw,6.8rem);line-height:.88;letter-spacing:-.07em;margin:18px 0}p{color:var(--muted);line-height:1.7;max-width:780px}.stats{display:flex;gap:10px;flex-wrap:wrap;margin:26px 0 42px}.stat{border:1px solid #2b3a68;background:#0b122acc;border-radius:17px;padding:13px 16px;color:#dbe5ff;font-weight:850}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}.card{display:flex;min-height:280px;flex-direction:column;text-decoration:none;color:inherit;border:1px solid #2a3a68;border-radius:24px;padding:21px;background:linear-gradient(145deg,#101936dd,#080d20ee);box-shadow:0 20px 70px #0007;transform:translateY(10px);opacity:0;animation:rise .45s forwards;animation-delay:var(--delay)}.card:hover{border-color:#78f4ff;transform:translateY(-4px)}.card-top,.card-bottom{display:flex;justify-content:space-between;gap:12px;color:#8fa1d0;font-size:.78rem;font-weight:850;text-transform:uppercase}.mode{margin-top:18px;color:#78f4ff;font-weight:950;font-size:.76rem;letter-spacing:.1em}.card h2{font-size:1.75rem;line-height:1.02;letter-spacing:-.04em;margin:12px 0}.card p{font-size:.95rem;flex:1}.card-bottom strong{color:#fff}.card-bottom span{color:#9fffd3}footer{margin-top:40px;color:#7280ab}@keyframes rise{to{opacity:1;transform:none}}@media(max-width:700px){.wrap{padding:42px 0}h1{font-size:3.2rem}.grid{grid-template-columns:1fr}}
</style></head><body><main class="wrap"><header><div class="badge">AMIT GAME FACTORY V5 · DIVERSITY LOCK</div><h1>Different games,<br>not repeats.</h1><p>V5 rotates through ${BLUEPRINTS.length} different blueprints and avoids the recent ones before choosing a new game. Gemini can rename and polish the theme, but the local engine guarantees the game still works even when Gemini is unavailable.</p><div class="stats"><div class="stat">${updated.length} games published</div><div class="stat">${uniqueFamilies} families used</div><div class="stat">${BLUEPRINTS.length} blueprints available</div><div class="stat">GitHub Pages + Netlify fallback</div></div></header><section class="grid">${cards}</section><footer>Created by Amit's automated game studio.</footer></main></body></html>`;
await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), gallery, 'utf8');
await fs.writeFile(path.join(PUBLIC_DIR, '.nojekyll'), '', 'utf8');
await fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
const urls = [siteUrl + '/', ...updated.map(game => `${siteUrl}/${String(game.url).replace(/^\/+/, '')}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc><lastmod>${date}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Created ${config.title} from blueprint ${config.blueprintId} (${config.mode}).`);
