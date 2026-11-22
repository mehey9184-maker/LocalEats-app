import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DISABLED_WRITES, prepareStagingEnv, requireCleanEnvFiles,
  requireStagingApiOrigin, verifyStaticOutput
} from '../scripts/build-cloudflare-staging.mjs';

const example = 'https://localeats-api-cf1-staging.example.workers.dev';

test('CF1 refuses non-Cloudflare, insecure, unspecified or credentialed API endpoints', () => {
  assert.equal(requireStagingApiOrigin(example), example);
  for (const value of ['', 'http://example.workers.dev',
    'https://localeats-api.vercel.app', 'https://www.localeatssa.co.za',
    example + '/api/v1', 'https://u:p@example.workers.dev',
    'https://example.workers.dev?token=x']) {
    assert.throws(() => requireStagingApiOrigin(value));
  }
});

test('CF1 staging build forces all Customer write gates off', () => {
  const built = prepareStagingEnv({
    VITE_LOCALEATS_API_URL: example,
    VITE_PICKUP_ORDERING_ENABLED: 'true',
    VITE_PROFILE_WRITES_ENABLED: 'true',
    VITE_LOCALPAY_ENABLED: 'true',
    PICKUP_WRITES_ENABLED: 'true'
  });
  assert.equal(built.VITE_LOCALEATS_API_URL, example);
  for (const [name, value] of Object.entries(DISABLED_WRITES)) {
    assert.equal(built[name], value, name);
  }
});

test('CF1 does not allow server secrets into a public Vite build', () => {
  for (const key of ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY', 'FIREBASE_PRIVATE_KEY', 'CLOUDFLARE_API_TOKEN']) {
    assert.throws(() => prepareStagingEnv({VITE_LOCALEATS_API_URL: example, [key]: 'secret'}));
  }
});

test('CF1 refuses local .env and bundled server files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'localeats-cf1-'));
  try {
    requireCleanEnvFiles(dir);
    writeFileSync(join(dir, '.env'), 'SECRET=do-not-publish');
    assert.throws(() => requireCleanEnvFiles(dir));
    rmSync(join(dir, '.env'));
    mkdirSync(join(dir, 'dist'));
    const output = join(dir, 'dist');
    writeFileSync(join(output, 'index.html'), '<html></html>');
    verifyStaticOutput(output);
    writeFileSync(join(output, 'server.cjs'), 'server code');
    assert.throws(() => verifyStaticOutput(output));
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
