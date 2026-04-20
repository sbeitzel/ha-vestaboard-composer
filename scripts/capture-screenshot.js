#!/usr/bin/env node
// Launches a headless browser against the Playwright fixture, pre-populates
// the board with representative content, and saves screenshot.png at the repo
// root. Requires the dev server to NOT already be running on port 3737 (it
// starts its own).
import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT   = 3737;
const OUTPUT = resolve(ROOT, 'screenshot.png');

// Start serve and wait until it is accepting connections.
const server = await new Promise((resolve) => {
  const proc = spawn('npx', ['serve', '-l', String(PORT), ROOT], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  proc.stdout.on('data', (chunk) => {
    if (chunk.toString().includes('Accepting')) resolve(proc);
  });
  // Fallback: give it 2 s regardless.
  setTimeout(() => resolve(proc), 2000);
});

const browser = await chromium.launch();
const page    = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/tests/fixture.html`);
await page.waitForFunction(() =>
  !!document.querySelector('vestaboard-composer')?.shadowRoot?.getElementById('boardGrid'),
);

// Pre-populate the board with representative content so the screenshot is not blank.
await page.evaluate(() => {
  const el = document.querySelector('vestaboard-composer');

  // Row 0 — solid red stripe
  el._board[0] = Array(22).fill(63);

  // Row 1 — "VESTABOARD" centered (10 chars → pad 6 each side)
  const row1 = Array(22).fill(0);
  [22, 5, 19, 20, 1, 2, 15, 1, 18, 4].forEach((code, i) => { row1[6 + i] = code; });
  el._board[1] = row1;

  // Row 2 — "COMPOSER" centered (8 chars → pad 7 each side)
  const row2 = Array(22).fill(0);
  [3, 15, 13, 16, 15, 19, 5, 18].forEach((code, i) => { row2[7 + i] = code; });
  el._board[2] = row2;

  // Row 3 — blank
  el._board[3] = Array(22).fill(0);

  // Row 4 — color sampler: 2 cells of each color
  const colors = [63, 64, 65, 66, 67, 68, 69, 70, 71];
  const row4 = [];
  for (const c of colors) row4.push(c, c);
  while (row4.length < 22) row4.push(0);
  el._board[4] = row4;

  // Row 5 — solid blue stripe
  el._board[5] = Array(22).fill(67);

  el._renderBoard();
});

// Allow fonts to finish loading before capturing.
await page.waitForTimeout(1500);

await page.screenshot({ path: OUTPUT });
await browser.close();
server.kill();

console.log(`Screenshot saved → ${OUTPUT}`);
