import { test, expect } from '@playwright/test';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Run fn(shadowRoot) inside the page and return the result. */
function shadow(page, fn) {
  return page.evaluate(
    (fnStr) => {
      const root = document.querySelector('vestaboard-composer').shadowRoot;
      return new Function('root', `return (${fnStr})(root)`)(root);
    },
    fn.toString(),
  );
}

/** Trigger a <select> change inside the shadow root. */
function selectChange(page, id, value) {
  return page.evaluate(
    ([id, value]) => {
      const root = document.querySelector('vestaboard-composer').shadowRoot;
      const el = root.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('change'));
    },
    [id, value],
  );
}

/** getComputedStyle(...).backgroundColor for a shadow-root element. */
function bgColor(page, selector) {
  return page.evaluate((selector) => {
    const root = document.querySelector('vestaboard-composer').shadowRoot;
    return getComputedStyle(root.querySelector(selector)).backgroundColor;
  }, selector);
}

// ── fixtures ─────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixture.html');
  // wait for the custom element to initialise
  await page.waitForFunction(() =>
    !!document.querySelector('vestaboard-composer')?.shadowRoot?.getElementById('boardGrid'),
  );
});

// ── board model ───────────────────────────────────────────────────────────────

test('default model is Flagship: 6 rows × 22 columns', async ({ page }) => {
  const { rows, cols } = await shadow(page, (root) => {
    const cells = root.querySelectorAll('.cell');
    const cols  = parseInt(root.querySelector('.board-grid').style.gridTemplateColumns.match(/repeat\((\d+)/)[1]);
    const rows  = parseInt(root.querySelector('.board-grid').style.gridTemplateRows.match(/repeat\((\d+)/)[1]);
    return { rows, cols, cellCount: cells.length };
  });
  expect(rows).toBe(6);
  expect(cols).toBe(22);
});

test('switching to Note model gives 3 rows × 15 columns', async ({ page }) => {
  await selectChange(page, 'boardModel', 'note');
  const { rows, cols } = await shadow(page, (root) => {
    const cols = parseInt(root.querySelector('.board-grid').style.gridTemplateColumns.match(/repeat\((\d+)/)[1]);
    const rows = parseInt(root.querySelector('.board-grid').style.gridTemplateRows.match(/repeat\((\d+)/)[1]);
    return { rows, cols };
  });
  expect(rows).toBe(3);
  expect(cols).toBe(15);
});

// ── board color — blank cells ────────────────────────────────────────────────

test('blank cells are dark on black board (default)', async ({ page }) => {
  const bg = await bgColor(page, '.cell');
  expect(bg).toBe('rgb(20, 20, 20)');   // --vb-blank: #141414
});

test('blank cells are white on white board', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  const bg = await bgColor(page, '.cell');
  expect(bg).toBe('rgb(255, 255, 255)'); // --vb-white: #ffffff
});

test('switching back to black board restores dark blank cells', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  await selectChange(page, 'boardColor', 'black');
  const bg = await bgColor(page, '.cell');
  expect(bg).toBe('rgb(20, 20, 20)');
});

// ── Filled swatch ─────────────────────────────────────────────────────────────

test('Filled swatch has white background on black board', async ({ page }) => {
  const bg = await bgColor(page, '.color-swatch[data-code="71"]');
  expect(bg).toBe('rgb(255, 255, 255)'); // --vb-white
});

test('Filled swatch has dark background on white board', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  const bg = await bgColor(page, '.color-swatch[data-code="71"]');
  expect(bg).toBe('rgb(20, 20, 20)');    // --vb-black: #141414
});

// ── Filled cell rendering ─────────────────────────────────────────────────────

test('Filled cell is white on a black board (correct behaviour — must stay white after fix)', async ({ page }) => {
  // Black board is the default; no boardColor change needed
  await shadow(page, (root) => root.querySelector('.color-swatch[data-code="71"]').click());
  await shadow(page, (root) => root.querySelector('.cell').click());
  const bg = await bgColor(page, '.cell[data-color="71"]');
  expect(bg).toBe('rgb(255, 255, 255)'); // --vb-white: correct per docs
});

test('Filled cell is black on a white board', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  await shadow(page, (root) => root.querySelector('.color-swatch[data-code="71"]').click());
  await shadow(page, (root) => root.querySelector('.cell').click());
  const bg = await bgColor(page, '.cell[data-color="71"]');
  expect(bg).toBe('rgb(20, 20, 20)'); // --vb-black: #141414
});

// ── Code-71 output remapping ──────────────────────────────────────────────────

async function paintFilledTopLeft(page) {
  await shadow(page, (root) => root.querySelector('.color-swatch[data-code="71"]').click());
  await shadow(page, (root) => root.querySelector('.cell').click());
}

function outputText(page, id) {
  return page.evaluate((id) => {
    const root = document.querySelector('vestaboard-composer').shadowRoot;
    return root.getElementById(id).textContent;
  }, id);
}

test('Raw Array maps Filled (71) to White (69) on a black board', async ({ page }) => {
  await paintFilledTopLeft(page);
  const raw = await outputText(page, 'outputRaw');
  expect(raw).toContain('69');
  expect(raw).not.toContain('71');
});

test('Raw Array maps Filled (71) to Black (70) on a white board', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  await paintFilledTopLeft(page);
  const raw = await outputText(page, 'outputRaw');
  expect(raw).toContain('70');
  expect(raw).not.toContain('71');
});

test('HA Action YAML maps Filled (71) to White (69) on a black board', async ({ page }) => {
  await paintFilledTopLeft(page);
  const yaml = await outputText(page, 'outputYaml');
  expect(yaml).toContain('69');
  expect(yaml).not.toContain('71');
});

test('HA Action YAML maps Filled (71) to Black (70) on a white board', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  await paintFilledTopLeft(page);
  const yaml = await outputText(page, 'outputYaml');
  expect(yaml).toContain('70');
  expect(yaml).not.toContain('71');
});

test('VBML JSON preserves Filled (71) unchanged — cloud API supports it', async ({ page }) => {
  await paintFilledTopLeft(page);
  const json = await outputText(page, 'outputJson');
  expect(json).toContain('71');
});

test('VBML JSON preserves Filled (71) on white board too', async ({ page }) => {
  await selectChange(page, 'boardColor', 'white');
  await paintFilledTopLeft(page);
  const json = await outputText(page, 'outputJson');
  expect(json).toContain('71');
});

// ── mode badge ────────────────────────────────────────────────────────────────

test('mode badge starts as TEXT MODE', async ({ page }) => {
  const text = await shadow(page, (root) => root.getElementById('modeBadge').textContent);
  expect(text).toBe('TEXT MODE');
});

test('mode badge switches to COLOR MODE when a color swatch is clicked', async ({ page }) => {
  await shadow(page, (root) => root.querySelector('.color-swatch[data-code="63"]').click());
  const text = await shadow(page, (root) => root.getElementById('modeBadge').textContent);
  expect(text).toBe('COLOR MODE');
});

test('clicking the mode badge in COLOR MODE returns to TEXT MODE', async ({ page }) => {
  await shadow(page, (root) => root.querySelector('.color-swatch[data-code="63"]').click());
  await shadow(page, (root) => root.getElementById('modeBadge').click());
  const text = await shadow(page, (root) => root.getElementById('modeBadge').textContent);
  expect(text).toBe('TEXT MODE');
});

test('Escape key returns mode badge to TEXT MODE', async ({ page }) => {
  await shadow(page, (root) => root.querySelector('.color-swatch[data-code="63"]').click());
  await shadow(page, (root) => root.getElementById('boardGrid').focus());
  await page.keyboard.press('Escape');
  const text = await shadow(page, (root) => root.getElementById('modeBadge').textContent);
  expect(text).toBe('TEXT MODE');
});

// ── Load Current button ───────────────────────────────────────────────────────

/** Wait for the device picker to be populated with real options. */
async function waitForDevices(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('vestaboard-composer').shadowRoot;
    const picker = root.getElementById('devicePicker');
    return picker && picker.options.length > 1;
  });
}

/** Read _board[row][col] directly from the component instance. */
function boardCell(page, row, col) {
  return page.evaluate(
    ([r, c]) => document.querySelector('vestaboard-composer')._board[r][c],
    [row, col],
  );
}

/** Set a textarea value inside the shadow root. */
function setTextarea(page, id, value) {
  return page.evaluate(
    ([id, value]) => {
      const root = document.querySelector('vestaboard-composer').shadowRoot;
      root.getElementById(id).value = value;
    },
    [id, value],
  );
}

test('"Load Current" button exists in the DOM', async ({ page }) => {
  const exists = await shadow(page, root => !!root.getElementById('loadCurrentBtn'));
  expect(exists).toBe(true);
});

test('"Load Current" button is disabled when no device is selected', async ({ page }) => {
  await waitForDevices(page);
  const disabled = await shadow(page, root => root.getElementById('loadCurrentBtn').disabled);
  expect(disabled).toBe(true);
});

test('"Load Current" button is enabled after a device is selected', async ({ page }) => {
  await waitForDevices(page);
  await selectChange(page, 'devicePicker', 'device-flagship');
  const disabled = await shadow(page, root => root.getElementById('loadCurrentBtn').disabled);
  expect(disabled).toBe(false);
});

test('clicking "Load Current" for flagship populates 132 cells with correct data', async ({ page }) => {
  await waitForDevices(page);
  await selectChange(page, 'devicePicker', 'device-flagship');
  await shadow(page, root => root.getElementById('loadCurrentBtn').click());
  await page.waitForFunction(
    () => document.querySelector('vestaboard-composer')._board[0][0] === 8,
  );
  const cellCount = await shadow(page, root => root.querySelectorAll('.cell').length);
  expect(cellCount).toBe(132);
  expect(await boardCell(page, 0, 0)).toBe(8);
});

test('clicking "Load Current" for flagship sets model dropdown to "flagship"', async ({ page }) => {
  await waitForDevices(page);
  await selectChange(page, 'devicePicker', 'device-flagship');
  await shadow(page, root => root.getElementById('loadCurrentBtn').click());
  await page.waitForFunction(
    () => document.querySelector('vestaboard-composer')._board[0][0] === 8,
  );
  const model = await shadow(page, root => root.getElementById('boardModel').value);
  expect(model).toBe('flagship');
});

test('clicking "Load Current" for flagship sets color dropdown to "black"', async ({ page }) => {
  await waitForDevices(page);
  await selectChange(page, 'devicePicker', 'device-flagship');
  await shadow(page, root => root.getElementById('loadCurrentBtn').click());
  await page.waitForFunction(
    () => document.querySelector('vestaboard-composer')._board[0][0] === 8,
  );
  const color = await shadow(page, root => root.getElementById('boardColor').value);
  expect(color).toBe('black');
});

test('clicking "Load Current" for note gives 45 cells, model="note", color="white"', async ({ page }) => {
  await waitForDevices(page);
  await selectChange(page, 'devicePicker', 'device-note');
  await shadow(page, root => root.getElementById('loadCurrentBtn').click());
  await page.waitForFunction(
    () => document.querySelector('vestaboard-composer')._board[0][0] === 63,
  );
  const cellCount = await shadow(page, root => root.querySelectorAll('.cell').length);
  const model = await shadow(page, root => root.getElementById('boardModel').value);
  const color = await shadow(page, root => root.getElementById('boardColor').value);
  expect(cellCount).toBe(45);
  expect(model).toBe('note');
  expect(color).toBe('white');
});

test('loading a device with no parseable model shows an error and leaves board unchanged', async ({ page }) => {
  await waitForDevices(page);
  await selectChange(page, 'devicePicker', 'device-legacy');
  await shadow(page, root => root.getElementById('loadCurrentBtn').click());
  // Board must remain all-zero (unchanged); cell (0,0) should still be 0
  const cell = await boardCell(page, 0, 0);
  expect(cell).toBe(0);
  // An error status message must be visible
  const statusClass = await shadow(page, root => root.getElementById('statusMsg').className);
  expect(statusClass).toContain('error');
});

// ── Paste import ──────────────────────────────────────────────────────────────

/** Build a 6×22 raw array with first cell = value, rest zero. */
function flagshipArray(firstCell = 0) {
  const row0 = [firstCell, ...Array(21).fill(0)];
  return [row0, ...Array(5).fill(null).map(() => Array(22).fill(0))];
}

test('paste import: a valid raw JSON array of arrays populates the board', async ({ page }) => {
  const payload = JSON.stringify(flagshipArray(5)); // first cell = E (5)
  await setTextarea(page, 'importTextarea', payload);
  await shadow(page, root => root.getElementById('importBtn').click());
  await page.waitForFunction(
    () => document.querySelector('vestaboard-composer')._board[0][0] === 5,
  );
  expect(await boardCell(page, 0, 0)).toBe(5);
});

test('paste import: a valid VBML JSON with rawCharacters populates the board', async ({ page }) => {
  const payload = JSON.stringify({ components: [{ rawCharacters: flagshipArray(12) }] }); // L (12)
  await setTextarea(page, 'importTextarea', payload);
  await shadow(page, root => root.getElementById('importBtn').click());
  await page.waitForFunction(
    () => document.querySelector('vestaboard-composer')._board[0][0] === 12,
  );
  expect(await boardCell(page, 0, 0)).toBe(12);
});

test('paste import: mismatched dimensions shows an inline error', async ({ page }) => {
  const payload = JSON.stringify(Array(4).fill(Array(10).fill(0))); // 4×10, not a known model
  await setTextarea(page, 'importTextarea', payload);
  await shadow(page, root => root.getElementById('importBtn').click());
  const errorText = await shadow(page, root => root.getElementById('importError').textContent);
  expect(errorText.length).toBeGreaterThan(0);
});

test('paste import: invalid JSON shows an inline error', async ({ page }) => {
  await setTextarea(page, 'importTextarea', 'not valid json {{');
  await shadow(page, root => root.getElementById('importBtn').click());
  const errorText = await shadow(page, root => root.getElementById('importError').textContent);
  expect(errorText.length).toBeGreaterThan(0);
});
