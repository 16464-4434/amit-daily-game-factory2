import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const GAMES_DIR = path.join(PUBLIC_DIR, 'games');
export const AUTO_DIR = path.join(ROOT, '.automation');

export async function ensureFolders() {
  await fs.mkdir(GAMES_DIR, { recursive: true });
  await fs.mkdir(AUTO_DIR, { recursive: true });
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

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54) || `game-${Date.now()}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function deterministicPick(list, seed) {
  const hash = crypto.createHash('sha256').update(seed).digest();
  return list[hash.readUInt32BE(0) % list.length];
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
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function responseText(payload) {
  return (payload?.candidates ?? [])
    .flatMap(candidate => candidate?.content?.parts ?? [])
    .map(part => part?.text ?? '')
    .join('')
    .trim();
}

export async function callGemini({ prompt, json = false, temperature = 0.8, maxOutputTokens = 32768 }) {
  const key = requiredEnv('GEMINI_API_KEY');
  const configured = process.env.GEMINI_MODEL?.trim();
  const models = [...new Set([configured, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(Boolean))];
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
          const message = `Gemini ${model} returned ${response.status}: ${body.slice(0, 600)}`;
          if ([404, 400].includes(response.status)) {
            lastError = new Error(message);
            break;
          }
          throw new Error(message);
        }

        const payload = JSON.parse(body);
        const text = responseText(payload);
        if (!text) throw new Error(`Gemini ${model} returned an empty response.`);
        return { text, model };
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  throw lastError ?? new Error('All Gemini model attempts failed.');
}

export function parseJsonLoose(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error('Could not parse Gemini JSON response.');
  }
}

export function extractGameHtml(text) {
  const marker = text.match(/===GAME_HTML_START===\s*([\s\S]*?)\s*===GAME_HTML_END===/i);
  let html = marker?.[1]?.trim();
  if (!html) {
    const fenced = text.match(/```html\s*([\s\S]*?)```/i);
    html = fenced?.[1]?.trim();
  }
  if (!html && /<!doctype html/i.test(text)) {
    html = text.slice(text.search(/<!doctype html/i)).trim();
  }
  if (!html) throw new Error('The AI response did not contain a complete HTML game.');
  return html;
}

export function validateGameHtml(html) {
  const errors = [];
  const minSize = Number(process.env.MIN_GAME_SIZE || 18000);
  if (html.length < minSize) errors.push(`Game is too small (${html.length} chars; minimum ${minSize}).`);
  if (!/<!doctype html/i.test(html)) errors.push('Missing <!doctype html>.');
  if (!/<canvas[\s>]/i.test(html)) errors.push('Missing a canvas element.');
  if (!/requestAnimationFrame\s*\(/.test(html)) errors.push('Missing requestAnimationFrame game loop.');
  if (!/localStorage/.test(html)) errors.push('Missing localStorage progress saving.');
  if (!/(touchstart|pointerdown)/.test(html)) errors.push('Missing touch or pointer controls.');
  if (!/(pause|paused)/i.test(html)) errors.push('Missing pause system.');
  if (/<iframe[\s>]/i.test(html)) errors.push('iframes are not allowed.');
  if (/<script[^>]+src\s*=|<img[^>]+src\s*=\s*["']https?:/i.test(html)) errors.push('External scripts/images are not allowed.');
  if (/fetch\s*\(\s*["']https?:/i.test(html)) errors.push('External network calls are not allowed.');
  if (/\b(eval|document\.write)\s*\(/.test(html)) errors.push('Unsafe eval/document.write usage is not allowed.');

  const scriptPattern = /<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  while ((match = scriptPattern.exec(html))) {
    const code = match[1].trim();
    if (!code) continue;
    scriptCount += 1;
    try {
      new vm.Script(code, { filename: `embedded-game-script-${scriptCount}.js` });
    } catch (error) {
      errors.push(`JavaScript syntax error: ${error.message}`);
    }
  }
  if (!scriptCount) errors.push('No embedded JavaScript found.');

  return errors;
}

export function injectSeo(html, { title, description, canonicalUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  let output = html;
  if (!/<title>[\s\S]*?<\/title>/i.test(output)) {
    output = output.replace(/<head[^>]*>/i, match => `${match}\n<title>${safeTitle}</title>`);
  }
  if (!/<meta\s+name=["']description["']/i.test(output)) {
    output = output.replace(/<head[^>]*>/i, match => `${match}\n<meta name="description" content="${safeDescription}">`);
  }
  if (canonicalUrl && !/<link\s+rel=["']canonical["']/i.test(output)) {
    output = output.replace(/<head[^>]*>/i, match => `${match}\n<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`);
  }
  return output;
}
