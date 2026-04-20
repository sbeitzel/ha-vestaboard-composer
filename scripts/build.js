#!/usr/bin/env node
// Injects the version from package.json into ha-vestaboard-composer.js.
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const jsPath = resolve(root, 'ha-vestaboard-composer.js');
const js = readFileSync(jsPath, 'utf8');
const updated = js.replace(/^const VERSION = '.*?';/m, `const VERSION = '${version}';`);

if (updated === js) {
  console.log(`[build] VERSION already '${version}' — no change.`);
} else {
  writeFileSync(jsPath, updated);
  console.log(`[build] VERSION → '${version}' in ha-vestaboard-composer.js`);
}
