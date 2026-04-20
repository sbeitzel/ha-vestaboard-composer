#!/usr/bin/env node
// Stamps the plugin with a UUID-based dev version, then deploys to the local
// HA config volume.  Intended for mid-development testing; does not touch
// package.json or create any git artefacts.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load developer-local overrides from .env if present
try { process.loadEnvFile(resolve(root, '.env')); } catch {}

const configMount = process.env.HA_CONFIG_DIR ?? '/Volumes/config';

if (!existsSync(configMount)) {
  console.warn(`[dev-deploy] ${configMount} not found — skipping HA deploy.`);
  console.warn('[dev-deploy] Set HA_CONFIG_DIR in .env or your environment to point at your HA config volume.');
  process.exit(0);
}

const version = `dev-${randomUUID()}`;

const jsPath  = resolve(root, 'ha-vestaboard-composer.js');
const js      = readFileSync(jsPath, 'utf8');
const updated = js.replace(/^const VERSION = '.*?';/m, `const VERSION = '${version}';`);
writeFileSync(jsPath, updated);
console.log(`[dev-deploy] VERSION → '${version}'`);

const dest = `${configMount}/www/vestaboard/ha-vestaboard-composer.js`;
copyFileSync(jsPath, dest);
console.log(`[dev-deploy] Copied plugin to ${dest}`);

const configPath = `${configMount}/configuration.yaml`;
const config     = readFileSync(configPath, 'utf8');
const pattern    = /ha-vestaboard-composer\.js\?v=[^\s'"]+/;
if (!pattern.test(config)) {
  console.warn('[dev-deploy] Warning: no ?v= pattern found in configuration.yaml — check module_url manually.');
} else {
  writeFileSync(configPath, config.replace(pattern, `ha-vestaboard-composer.js?v=${version}`));
  console.log(`[dev-deploy] configuration.yaml cache-buster → ?v=${version}`);
}
