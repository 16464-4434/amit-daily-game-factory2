import { spawn } from 'node:child_process';

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { stdio: 'inherit', env: process.env });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${script} failed with code ${code}`)));
  });
}

await run('scripts/generate-game.mjs');
await run('scripts/validate-site.mjs');
await run('scripts/deploy-netlify.mjs');
await run('scripts/send-email.mjs');
console.log('All automation stages completed successfully.');
