import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DISABLED_WRITES = Object.freeze({
  VITE_PICKUP_ORDERING_ENABLED: 'false',
  VITE_PROFILE_WRITES_ENABLED: 'false',
  VITE_LOCALPAY_ENABLED: 'false',
  VITE_REWARDS_ENABLED: 'false',
  PROFILE_API_STAGING_WRITES_ENABLED: 'false',
  PROFILE_P5_ENABLE_STAGING_WRITES: 'false',
  PICKUP_WRITES_ENABLED: 'false',
});

const PRIVATE_KEYS = Object.freeze([
  'GEMINI_API_KEY', 'VITE_GEMINI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'FIREBASE_PRIVATE_KEY', 'VITE_FIREBASE_PRIVATE_KEY',
  'CLOUDFLARE_API_TOKEN', 'VITE_CLOUDFLARE_API_TOKEN',
]);

export function requireStagingApiOrigin(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('A dedicated Cloudflare staging API origin is required; no Production fallback.');
  }
  let url;
  try { url = new URL(raw); }
  catch { throw new Error('Invalid staging API origin.'); }
  if (url.protocol !== 'https:' ||
      !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.workers\.dev$/.test(url.hostname) ||
      url.username || url.password || url.port || url.pathname !== '/' ||
      url.search || url.hash || raw !== url.origin) {
    throw new Error('The staging API must be an HTTPS workers.dev origin only (no path, secrets or Production host).');
  }
  return url.origin;
}

export function prepareStagingEnv(source) {
  for (const key of PRIVATE_KEYS) {
    if (typeof source[key] === 'string' && source[key].trim()) {
      throw new Error('Private or server-side key must never enter a static Cloudflare build: ' + key);
    }
  }
  return {
    ...source,
    ...DISABLED_WRITES,
    VITE_LOCALEATS_API_URL: requireStagingApiOrigin(source.VITE_LOCALEATS_API_URL),
    GEMINI_API_KEY: '',
    VITE_GEMINI_API_KEY: '',
  };
}

export function requireCleanEnvFiles(directory) {
  const found = readdirSync(directory).filter((name) => name.startsWith('.env') && name !== '.env.example');
  if (found.length) {
    throw new Error('Cloudflare staging builds may not load local .env files: ' + found.join(', ') + '. Supply reviewed public VITE_* values via CI instead.');
  }
}

export function verifyStaticOutput(directory) {
  if (!existsSync(resolve(directory, 'index.html'))) {
    throw new Error('Missing Vite index.html. The Cloudflare build is not a static frontend.');
  }
  for (const name of ['server.cjs', 'server.js', '.env', '.env.production']) {
    if (existsSync(resolve(directory, name))) {
      throw new Error('Refusing to publish server code or environment file in Cloudflare assets: ' + name);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireCleanEnvFiles(root);
    const env = prepareStagingEnv(process.env);
    const vite = resolve(root, 'node_modules/vite/bin/vite.js');
    if (!existsSync(vite)) throw new Error('Run npm ci before building.');
    // Vite only. npm run build also bundles server.ts into dist/server.cjs,
    // which would expose private server code through Cloudflare static assets.
    const run = spawnSync(process.execPath, [vite, 'build', '--emptyOutDir'], {
      cwd: root, env, stdio: 'inherit'
    });
    if (run.status !== 0) throw new Error('Vite static build failed.');
    verifyStaticOutput(resolve(root, 'dist'));
    console.log('CF1 Customer static staging build ready for review (not deployed).');
  } catch (error) {
    console.error('CF1 Customer staging build BLOCKED:', error.message);
    process.exitCode = 1;
  }
}
