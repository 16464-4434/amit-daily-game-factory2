import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { AUTO_DIR, PUBLIC_DIR, ensureFolders, requiredEnv } from './common.mjs';

await ensureFolders();
const token = requiredEnv('NETLIFY_AUTH_TOKEN');
const site = requiredEnv('NETLIFY_SITE_ID');

const args = ['--yes', 'netlify-cli@latest', 'deploy', '--dir', PUBLIC_DIR, '--prod', '--site', site, '--auth', token, '--json'];
console.log('Deploying the complete gallery to Netlify...');

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  cwd: path.resolve(PUBLIC_DIR, '..'),
  env: { ...process.env, NETLIFY_AUTH_TOKEN: token },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
child.stdout.on('data', chunk => { stdout += chunk; process.stdout.write(chunk); });
child.stderr.on('data', chunk => { stderr += chunk; process.stderr.write(chunk); });

const exitCode = await new Promise(resolve => child.on('close', resolve));
await fs.writeFile(path.join(AUTO_DIR, 'netlify-output.log'), `${stdout}\n${stderr}`, 'utf8');
if (exitCode !== 0) throw new Error(`Netlify deploy failed with exit code ${exitCode}.`);

let result = {};
const clean = stdout.trim();
try {
  result = JSON.parse(clean);
} catch {
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try { result = JSON.parse(clean.slice(firstBrace, lastBrace + 1)); } catch {}
  }
}
const latest = JSON.parse(await fs.readFile(path.join(AUTO_DIR, 'latest-game.json'), 'utf8'));
const deploymentUrl = result.url || result.deploy_url || result.deploy_ssl_url || process.env.SITE_URL || latest.absoluteUrl;
const gameUrl = process.env.SITE_URL
  ? `${process.env.SITE_URL.replace(/\/$/, '')}${latest.url}`
  : latest.absoluteUrl || deploymentUrl;

const deployResult = { ...result, deploymentUrl, gameUrl, title: latest.title, slug: latest.slug, date: latest.date };
await fs.writeFile(path.join(AUTO_DIR, 'deploy-result.json'), `${JSON.stringify(deployResult, null, 2)}\n`, 'utf8');
console.log(`Published game: ${gameUrl}`);
