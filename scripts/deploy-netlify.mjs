import fs from 'node:fs/promises';
import path from 'node:path';
import { requiredEnv } from './common.mjs';

const token = requiredEnv('NETLIFY_AUTH_TOKEN');
const siteId = requiredEnv('NETLIFY_SITE_ID');
const zipPath = path.resolve(process.argv[2] || 'site.zip');
const zip = await fs.readFile(zipPath);

const response = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/zip'
  },
  body: zip
});
const text = await response.text();
if (!response.ok) throw new Error(`Netlify deploy failed (${response.status}): ${text.slice(0, 900)}`);
const payload = JSON.parse(text);
const deployUrl = payload.ssl_url || payload.deploy_ssl_url || payload.url || payload.deploy_url;
if (!deployUrl) throw new Error(`Netlify returned no deploy URL: ${text.slice(0, 900)}`);

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) await fs.appendFile(outputFile, `deploy_url=${deployUrl.replace(/\/$/, '')}\n`, 'utf8');
console.log(`Netlify fallback published: ${deployUrl}`);
