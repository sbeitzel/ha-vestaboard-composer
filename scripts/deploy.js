#!/usr/bin/env node
// Copies the built plugin to the local HA config volume and updates the
// cache-buster in configuration.yaml.  Safe to run in CI — exits cleanly
// when /Volumes/config is not mounted.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load developer-local overrides from .env if present
try { process.loadEnvFile(resolve(root, '.env')); } catch {}

const configMount = process.env.HA_CONFIG_DIR ?? '/Volumes/config';

if (!existsSync(configMount)) {
  console.warn(`[deploy] ${configMount} not found — skipping HA deploy.`);
  console.warn('[deploy] Set HA_CONFIG_DIR in .env or your environment to point at your HA config volume.');
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const src  = resolve(root, 'ha-vestaboard-composer.js');
const dest = `${configMount}/www/vestaboard/ha-vestaboard-composer.js`;
copyFileSync(src, dest);
console.log(`[deploy] Copied plugin to ${dest}`);

const configPath = `${configMount}/configuration.yaml`;
const config     = readFileSync(configPath, 'utf8');
const pattern    = /ha-vestaboard-composer\.js\?v=[^\s'"]+/;
if (!pattern.test(config)) {
  console.warn('[deploy] Warning: no ?v= pattern found in configuration.yaml — check module_url manually.');
} else {
  writeFileSync(configPath, config.replace(pattern, `ha-vestaboard-composer.js?v=${version}`));
  console.log(`[deploy] configuration.yaml cache-buster → ?v=${version}`);
}
