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

// ── board colour — blank cells ────────────────────────────────────────────────

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
