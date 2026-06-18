import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const GAMES_DIR = path.join(PUBLIC_DIR, 'games');
export const AUTO_DIR = path.join(ROOT, '.automation');
export const TEMPLATE_DIR = path.join(ROOT, 'templates');

export async function ensureFolders() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(GAMES_DIR, { recursive: true });
  await fs.mkdir(AUTO_DIR, { recursive: true });
  await fs.mkdir(TEMPLATE_DIR, { recursive: true });
}

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function isoDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function israelTimeId(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const get = type => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}-${get('hour')}${get('minute')}${get('second')}`;
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || `game-${Date.now()}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

export function deterministicPick(list, seed) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('deterministicPick requires a non-empty array.');
  }
  const hash = crypto.createHash('sha256').update(String(seed)).digest();
  return list[hash.readUInt32BE(0) % list.length];
}

export function seededNumber(seed, min, max) {
  const hash = crypto.createHash('sha256').update(String(seed)).digest();
  const n = hash.readUInt32BE(4) / 0xffffffff;
  return min + (max - min) * n;
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function responseText(payload) {
  return (payload?.candidates ?? [])
    .flatMap(candidate => candidate?.content?.parts ?? [])
    .map(part => part?.text ?? '')
    .join('')
    .trim();
}

export async function callGemini({
  prompt,
  json = false,
  temperature = 0.85,
  maxOutputTokens = 4096
}) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY is not configured.');

  const configured = process.env.GEMINI_MODEL?.trim();
  const models = [...new Set([
    configured,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ].filter(Boolean))];

  let lastError;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens,
              ...(json ? { responseMimeType: 'application/json' } : {})
            }
          })
        });

        const body = await response.text();
        if (!response.ok) {
          const message = `Gemini ${model} returned ${response.status}: ${body.slice(0, 700)}`;
          if ([400, 404].includes(response.status)) {
            lastError = new Error(message);
            break;
          }
          throw new Error(message);
        }

        const text = responseText(JSON.parse(body));
        if (!text) throw new Error(`Gemini ${model} returned an empty response.`);
        return { text, model };
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1800));
        }
      }
    }
  }

  throw lastError ?? new Error('All Gemini model attempts failed.');
}

export function parseJsonLoose(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error('Could not parse JSON response.');
  }
}

export function extractGameHtml(text) {
  let source = String(text ?? '').trim();
  if (!source) return '';

  const startMarker = '===GAME_HTML_START===';
  const endMarker = '===GAME_HTML_END===';
  const start = source.indexOf(startMarker);
  const end = source.lastIndexOf(endMarker);

  if (start >= 0 && end > start) {
    source = source.slice(start + startMarker.length, end).trim();
  }

  source = source
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const doctypeIndex = source.search(/<!doctype\s+html/i);
  const htmlIndex = source.search(/<html[\s>]/i);
  const documentStart = doctypeIndex >= 0 ? doctypeIndex : htmlIndex;
  if (documentStart > 0) source = source.slice(documentStart);

  const closingHtml = source.toLowerCase().lastIndexOf('</html>');
  if (closingHtml >= 0) source = source.slice(0, closingHtml + 7);

  return source.trim();
}

export function injectSeo(html, { title = '', description = '', canonicalUrl = '' } = {}) {
  let output = String(html ?? '');
  if (!output) return output;

  const safeTitle = escapeHtml(title || 'Amit Game');
  const safeDescription = escapeAttribute(description || 'An original browser game from Amit’s Daily Game Factory.');
  const safeCanonical = canonicalUrl ? escapeAttribute(canonicalUrl) : '';

  output = output.replace(/<title>[\s\S]*?<\/title>/i, '');
  output = output.replace(/<meta\s+name=["']description["'][^>]*>/i, '');
  output = output.replace(/<link\s+rel=["']canonical["'][^>]*>/i, '');

  const seo = [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDescription}">`,
    safeCanonical ? `<link rel="canonical" href="${safeCanonical}">` : ''
  ].filter(Boolean).join('\n');

  if (/<head[\s>]/i.test(output)) {
    return output.replace(/<head([^>]*)>/i, `<head$1>\n${seo}`);
  }

  if (/<html[\s>]/i.test(output)) {
    return output.replace(/<html([^>]*)>/i, `<html$1>\n<head>\n${seo}\n</head>`);
  }

  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${seo}\n</head>\n<body>\n${output}\n</body>\n</html>`;
}

export function safeHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
}

export function sanitizeConfig(raw, fallback) {
  const modes = ['pulse', 'dash', 'tether'];
  const stageNames = Array.isArray(raw?.stageNames)
    ? raw.stageNames.map(String).filter(Boolean).slice(0, 8)
    : [];

  while (stageNames.length < 8) {
    stageNames.push(fallback.stageNames[stageNames.length]);
  }

  return {
    title: String(raw?.title || fallback.title).slice(0, 48),
    slug: slugify(raw?.slug || raw?.title || fallback.slug),
    description: String(raw?.description || fallback.description).slice(0, 220),
    genre: String(raw?.genre || fallback.genre).slice(0, 50),
    mode: modes.includes(raw?.mode) ? raw.mode : fallback.mode,
    world: String(raw?.world || fallback.world).slice(0, 120),
    playerName: String(raw?.playerName || fallback.playerName).slice(0, 30),
    collectible: String(raw?.collectible || fallback.collectible).slice(0, 24),
    enemyName: String(raw?.enemyName || fallback.enemyName).slice(0, 24),
    bossName: String(raw?.bossName || fallback.bossName).slice(0, 36),
    actionName: String(raw?.actionName || fallback.actionName).slice(0, 16).toUpperCase(),
    specialName: String(raw?.specialName || fallback.specialName).slice(0, 16).toUpperCase(),
    tagline: String(raw?.tagline || fallback.tagline).slice(0, 100),
    accent: safeHex(raw?.accent, fallback.accent),
    accent2: safeHex(raw?.accent2, fallback.accent2),
    danger: safeHex(raw?.danger, fallback.danger),
    stageNames,
    designNotes: Array.isArray(raw?.designNotes)
      ? raw.designNotes.map(String).slice(0, 5)
      : fallback.designNotes
  };
}

export function validateGameHtml(html) {
  const source = String(html ?? '');
  const errors = [];

  if (source.length < 18000) errors.push(`Game is too small (${source.length} chars).`);
  if (!/<!doctype html/i.test(source)) errors.push('Missing <!doctype html>.');
  if (!/<canvas[\s>]/i.test(source)) errors.push('Missing canvas.');
  if (!/requestAnimationFrame\s*\(/.test(source)) errors.push('Missing requestAnimationFrame loop.');
  if (!/localStorage/.test(source)) errors.push('Missing localStorage saving.');
  if (!/(pointerdown|touchstart)/.test(source)) errors.push('Missing mobile controls.');
  if (!/(AudioContext|webkitAudioContext)/.test(source)) errors.push('Missing generated Web Audio.');
  if (!/(upgrade|perk)/i.test(source)) errors.push('Missing upgrade system.');
  if (!/(boss|final)/i.test(source)) errors.push('Missing final boss/challenge.');
  if (/<script[^>]+src\s*=|<iframe[\s>]/i.test(source)) {
    errors.push('External scripts or iframes are not allowed.');
  }
  if (/fetch\s*\(\s*["']https?:/i.test(source)) {
    errors.push('External network calls are not allowed.');
  }

  const scriptPattern = /<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;

  while ((match = scriptPattern.exec(source))) {
    const code = match[1].trim();
    if (!code) continue;
    count += 1;
    try {
      new vm.Script(code, { filename: `game-script-${count}.js` });
    } catch (error) {
      errors.push(`JavaScript syntax error: ${error.message}`);
    }
  }

  if (!count) errors.push('No embedded JavaScript found.');
  return errors;
}
