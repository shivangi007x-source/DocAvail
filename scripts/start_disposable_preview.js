/**
 * Starts Next.js production build locally on port 3200 bound STRICTLY
 * to the disposable Neon database (RESTORE_TEST_DATABASE_URL) for preview/browser QA.
 */
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const restoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!restoreUrl || !prodUrl) {
  console.error('Missing database URLs in .env');
  process.exit(1);
}

if (new URL(restoreUrl).hostname === new URL(prodUrl).hostname) {
  console.error('FATAL: Disposable URL matches production hostname!');
  process.exit(1);
}

const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
console.log(`Starting Next.js preview on http://127.0.0.1:3200 bound strictly to ${new URL(restoreUrl).hostname}`);

const child = spawn(process.execPath, [nextBin, 'start', '-p', '3200', '-H', '127.0.0.1'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    DATABASE_URL: restoreUrl,
    DIRECT_URL: restoreUrl,
    PORT: '3200',
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
child.on('exit', (code) => process.exit(code ?? 0));
