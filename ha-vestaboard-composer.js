// vestaboard-composer.js
// HACS frontend plugin — Vestaboard Composer Panel for Home Assistant
// https://github.com/sbeitzel/ha-vestaboard-composer

const VERSION = '1.2.0';
console.info(`[vestaboard-composer] v${VERSION} loaded`);

// ── Constants ──────────────────────────────────────────────────────────────

const BOARD_MODELS = {
  flagship: { rows: 6, cols: 22, label: 'Flagship (22\u00d76)' },
  note:     { rows: 3, cols: 15, label: 'Note (15\u00d73)'     },
};

const CHAR_MAP = {
  ' ': 0,
  'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':9,'J':10,
  'K':11,'L':12,'M':13,'N':14,'O':15,'P':16,'Q':17,'R':18,'S':19,
  'T':20,'U':21,'V':22,'W':23,'X':24,'Y':25,'Z':26,
  '1':27,'2':28,'3':29,'4':30,'5':31,'6':32,'7':33,'8':34,'9':35,'0':36,
  '!':37,'@':38,'#':39,'$':40,'(':41,')':42,'-':44,'+':46,'&':47,
  '=':48,';':49,':':50,"'":52,'"':53,'%':54,',':55,'.':56,'/':59,
  '?':60,'°':62,
};

const CODE_TO_CHAR = {};
for (const [k, v] of Object.entries(CHAR_MAP)) CODE_TO_CHAR[v] = k;

// Color codes verified against ha-vestaboard BLACK_COLOR_MAP
const COLORS = [
  { code: 63, label: 'Red'    },
  { code: 64, label: 'Orange' },
  { code: 65, label: 'Yellow' },
  { code: 66, label: 'Green'  },
  { code: 67, label: 'Blue'   },
  { code: 68, label: 'Violet' },
  { code: 69, label: 'White'  },
  { code: 70, label: 'Black'  },
  { code: 71, label: 'Filled' },
];

// ── Styles ─────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :host {
    display: block;
    height: 100%;
    overflow-y: auto;
    --cell-size: 48px;
    --cell-gap: 3px;
    --bg: #0e0e10;
    --surface: #18181c;
    --surface2: #222228;
    --border: #2e2e38;
    --accent: #e8c84a;
    --accent2: #4ae8b0;
    --text: #f0f0f0;
    --muted: #888;
    --radius: 6px;
    --vb-blank:  #141414;
    --vb-red:    #da291c;
    --vb-orange: #fa7400;
    --vb-yellow: #fcb81b;
    --vb-green:  #1f9a44;
    --vb-blue:   #2083d5;
    --vb-violet: #702f8a;
    --vb-white:  #ffffff;
    --vb-black:  #141414;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .wrapper {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .logo {
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 28px; height: 18px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 2px;
  }
  .logo-icon span { background: var(--accent); border-radius: 1px; opacity: 0.7; }
  .logo-icon span:nth-child(3) { background: var(--vb-red);  opacity: 1; }
  .logo-icon span:nth-child(6) { background: var(--vb-blue); opacity: 1; }

  .header-actions { display: flex; gap: 10px; align-items: center; }

  /* ── Buttons ── */
  button {
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    transition: all 0.15s ease;
  }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--muted); }

  .btn-primary { background: var(--accent); color: #111; font-weight: 600; }
  .btn-primary:hover { background: #f0d060; }
  .btn-primary:active { transform: scale(0.97); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }

  /* ── Main ── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 20px;
    gap: 24px;
  }

  /* ── Board ── */
  .board-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }

  .board-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--muted);
    text-transform: uppercase;
    align-self: flex-start;
    padding-left: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .board-model-select {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: #1a1a2e;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
  }
  .board-model-select:focus {
    outline: 1px solid var(--accent);
  }

  .board-outer {
    background: #0a0a0c;
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    box-shadow: 0 0 40px #000a, inset 0 0 0 1px #ffffff08;
    overflow-x: auto;
    max-width: 100%;
  }

  .board-grid {
    display: grid;
    gap: var(--cell-gap);
    outline: none;
    user-select: none;
  }

  .cell {
    width: var(--cell-size);
    height: var(--cell-size);
    border-radius: 4px;
    background: var(--vb-blank);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Mono', monospace;
    font-size: 22px;
    font-weight: 700;
    color: transparent;
    cursor: pointer;
    transition: box-shadow 0.1s;
    border: 1px solid #ffffff08;
  }

  .cell[data-char]:not([data-char="0"]) { color: var(--vb-white); }

  .cell[data-color="63"] { background: var(--vb-red); }
  .cell[data-color="64"] { background: var(--vb-orange); }
  .cell[data-color="65"] { background: var(--vb-yellow); color: #111 !important; }
  .cell[data-color="66"] { background: var(--vb-green); }
  .cell[data-color="67"] { background: var(--vb-blue); }
  .cell[data-color="68"] { background: var(--vb-violet); }
  .cell[data-color="69"] { background: var(--vb-white); color: #111 !important; }
  .cell[data-color="70"] { background: var(--vb-black); }
  .cell[data-color="71"] { background: var(--vb-white); color: #111 !important; }

  .cell.cursor { box-shadow: 0 0 0 2px var(--accent), 0 0 12px #e8c84a66; z-index: 2; }
  .cell:hover:not(.cursor) { box-shadow: 0 0 0 1px var(--muted); }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 1200px;
  }

  .tool-group { display: flex; flex-direction: column; gap: 6px; }

  .tool-group-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--muted);
    text-transform: uppercase;
    font-family: 'Space Mono', monospace;
  }

  .color-palette { display: flex; gap: 6px; align-items: center; }

  .color-swatch {
    width: 36px; height: 36px;
    border-radius: 5px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.12s, border-color 0.12s;
  }
  .color-swatch:hover { transform: scale(1.12); }
  .color-swatch.active { border-color: var(--accent); transform: scale(1.12); }

  .color-swatch[data-code="63"] { background: var(--vb-red); }
  .color-swatch[data-code="64"] { background: var(--vb-orange); }
  .color-swatch[data-code="65"] { background: var(--vb-yellow); }
  .color-swatch[data-code="66"] { background: var(--vb-green); }
  .color-swatch[data-code="67"] { background: var(--vb-blue); }
  .color-swatch[data-code="68"] { background: var(--vb-violet); }
  .color-swatch[data-code="69"] { background: var(--vb-white); }
  .color-swatch[data-code="70"] { background: var(--vb-black); border-color: var(--border); }
  .color-swatch[data-code="71"] { background: var(--vb-white); }

  .swatch-label { font-size: 9px; text-align: center; color: var(--muted); margin-top: 2px; font-family: 'Space Mono', monospace; }
  .swatch-wrap  { display: flex; flex-direction: column; align-items: center; gap: 2px; }

  .action-buttons { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

  /* ── Output ── */
  .output-section {
    width: 100%;
    max-width: 1200px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }

  .output-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }

  .output-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }

  .output-card-header span {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--accent2);
    text-transform: uppercase;
  }

  .copy-btn {
    font-size: 11px;
    padding: 4px 10px;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .copy-btn:hover { color: var(--text); border-color: var(--muted); }
  .copy-btn.copied { color: var(--accent2); border-color: var(--accent2); }

  .output-text {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #aaa;
    padding: 12px 14px;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    max-height: 160px;
    overflow-y: auto;
    background: var(--bg);
  }

  /* ── Send ── */
  .send-section {
    width: 100%;
    max-width: 1200px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .send-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }

  .send-header span {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--muted);
    text-transform: uppercase;
  }

  .send-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

  .field-row { display: flex; gap: 12px; flex-wrap: wrap; }

  .field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 220px; }

  .field label {
    font-size: 11px;
    color: var(--muted);
    font-family: 'Space Mono', monospace;
    letter-spacing: 0.05em;
  }

  .field input, .field select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 8px 12px;
    outline: none;
    width: 100%;
    transition: border-color 0.15s;
  }
  .field input:focus, .field select:focus { border-color: var(--accent); }
  .field input::placeholder { color: #555; }
  .field select option { background: var(--surface); }

  .send-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

  .status-msg {
    font-size: 12px;
    font-family: 'Space Mono', monospace;
    padding: 6px 12px;
    border-radius: 4px;
    display: none;
  }
  .status-msg.success { background: #27ae6022; color: #2ecc71; border: 1px solid #27ae6044; display: block; }
  .status-msg.error   { background: #c0392b22; color: #e74c3c; border: 1px solid #c0392b44; display: block; }

  /* ── Keyboard hints ── */
  .kbd-hints { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; padding: 4px 0; }
  .kbd-hint  { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }

  kbd {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 2px 6px;
    color: var(--text);
  }

  /* ── Mode badge ── */
  .mode-badge {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    padding: 4px 9px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .mode-badge.text  { background: #27ae6022; color: #2ecc71; border: 1px solid #27ae6044; }
  .mode-badge.color { background: #8e44ad22; color: #a855f7; border: 1px solid #8e44ad44; }

  /* ── Settings modal ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: #000b;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal-overlay.open { display: flex; }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
    width: 420px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal h2 { font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 0.05em; color: var(--accent); }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
`;

// ── HTML template ──────────────────────────────────────────────────────────

const HTML = `
<div class="wrapper">
  <header>
    <div class="logo">
      <div class="logo-icon">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>
      VESTABOARD COMPOSER
    </div>
    <div class="header-actions">
      <span id="modeBadge" class="mode-badge text">TEXT MODE</span>
      <button class="btn-ghost" id="settingsBtn">&#9881; Settings</button>
    </div>
  </header>

  <div class="main">

    <div class="board-wrapper">
      <div class="board-label">
        <select id="boardModel" class="board-model-select">
          <option value="flagship">Flagship (22&times;6)</option>
          <option value="note">Note (15&times;3)</option>
        </select>
        &mdash; click a cell to move cursor, then type
      </div>
      <div class="board-outer">
        <div class="board-grid" id="boardGrid" tabindex="0"></div>
      </div>
    </div>

    <div class="toolbar">
      <div class="tool-group">
        <div class="tool-group-label">Color Tiles</div>
        <div class="color-palette" id="colorPalette"></div>
      </div>
      <div class="tool-group">
        <div class="tool-group-label">Actions</div>
        <div class="action-buttons">
          <button class="btn-secondary" id="clearBoardBtn">Clear All</button>
          <button class="btn-secondary" id="clearRowBtn">Clear Row</button>
          <button class="btn-secondary" id="centerRowBtn">Center Row</button>
          <button class="btn-secondary" id="fillRowBtn">Fill Row w/ Color</button>
        </div>
      </div>
    </div>

    <div class="kbd-hints">
      <div class="kbd-hint"><kbd>Type</kbd> insert character</div>
      <div class="kbd-hint"><kbd>&larr;&rarr;&uarr;&darr;</kbd> move cursor</div>
      <div class="kbd-hint"><kbd>Backspace</kbd> delete &amp; back</div>
      <div class="kbd-hint"><kbd>Del</kbd> delete in place</div>
      <div class="kbd-hint"><kbd>Enter</kbd> next row</div>
      <div class="kbd-hint"><kbd>Esc</kbd> deselect color</div>
      <div class="kbd-hint"><kbd>Tab</kbd> next cell</div>
    </div>

    <div class="output-section">
      <div class="output-card">
        <div class="output-card-header">
          <span>Raw Array (local API)</span>
          <button class="copy-btn" id="copyRaw">Copy</button>
        </div>
        <div class="output-text" id="outputRaw"></div>
      </div>
      <div class="output-card">
        <div class="output-card-header">
          <span>VBML JSON (cloud API)</span>
          <button class="copy-btn" id="copyJson">Copy</button>
        </div>
        <div class="output-text" id="outputJson"></div>
      </div>
      <div class="output-card">
        <div class="output-card-header">
          <span>HA Action YAML</span>
          <button class="copy-btn" id="copyYaml">Copy</button>
        </div>
        <div class="output-text" id="outputYaml"></div>
      </div>
    </div>

    <div class="send-section">
      <div class="send-header">
        <span>&#9889; Send to Vestaboard</span>
      </div>
      <div class="send-body">
        <div class="field-row">
          <div class="field">
            <label>Device</label>
            <select id="devicePicker">
              <option value="">Loading devices&hellip;</option>
            </select>
          </div>
          <div class="field">
            <label>Duration in seconds (10&ndash;43200, blank&nbsp;=&nbsp;permanent)</label>
            <input type="number" id="duration" min="10" max="43200" placeholder="blank = permanent" />
          </div>
        </div>
        <div class="send-actions">
          <button class="btn-primary" id="sendBtn">Send Now</button>
          <div class="status-msg" id="statusMsg"></div>
        </div>
      </div>
    </div>

  </div>

  <div class="modal-overlay" id="settingsModal">
    <div class="modal">
      <h2>Settings</h2>
      <div class="field">
        <label>Cell Size (px)</label>
        <input type="number" id="settingCellSize" value="48" min="24" max="72" step="4" />
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" id="cancelSettingsBtn">Cancel</button>
        <button class="btn-primary" id="applySettingsBtn">Apply</button>
      </div>
    </div>
  </div>
</div>
`;

// ── Web component ──────────────────────────────────────────────────────────

class VestaboardComposer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._rows = 6;
    this._cols = 22;
    this._board = Array.from({ length: 6 }, () => Array(22).fill(0));
    this._cursorRow = 0;
    this._cursorCol = 0;
    this._selectedColor = null;
    this._devices = [];
    this._initialized = false;
    this._statusTimer = null;
  }

  // ── HA panel interface ────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
  }

  // Required by panel_custom; unused
  set panel(_) {}
  set narrow(_) {}
  setConfig(_) {}

  // ── Initialisation ────────────────────────────────────────────────────────

  _init() {
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${HTML}`;

    this._grid         = this._el('boardGrid');
    this._modeBadge    = this._el('modeBadge');
    this._devicePicker = this._el('devicePicker');
    this._durationInput = this._el('duration');
    this._statusMsg    = this._el('statusMsg');
    this._settingsModal = this._el('settingsModal');
    this._wrapper      = this.shadowRoot.querySelector('.wrapper');

    this._el('boardModel').addEventListener('change', e => this._setModel(e.target.value));
    this._applyGridStyle();

    this._buildGrid();
    this._buildPalette();
    this._renderBoard();
    this._updateOutputs();
    this._loadSettings();
    this._loadDevices();

    this._grid.addEventListener('keydown', e => this._onKeyDown(e));

    this._el('clearBoardBtn').addEventListener('click', () => this._clearBoard());
    this._el('clearRowBtn').addEventListener('click',   () => this._clearRow());
    this._el('centerRowBtn').addEventListener('click',  () => this._centerTextInRow());
    this._el('fillRowBtn').addEventListener('click',    () => this._fillRow());

    this._el('copyRaw').addEventListener('click',  () => this._copyOutput('raw'));
    this._el('copyJson').addEventListener('click', () => this._copyOutput('json'));
    this._el('copyYaml').addEventListener('click', () => this._copyOutput('yaml'));

    this._el('sendBtn').addEventListener('click', () => this._sendMessage());

    this._el('settingsBtn').addEventListener('click',       () => this._openSettings());
    this._el('cancelSettingsBtn').addEventListener('click', () => this._closeSettings());
    this._el('applySettingsBtn').addEventListener('click',  () => this._applySettings());

    setTimeout(() => this._grid.focus(), 100);
  }

  _el(id) {
    return this.shadowRoot.getElementById(id);
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  _buildGrid() {
    this._grid.innerHTML = '';
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => {
          this._cursorRow = r;
          this._cursorCol = c;
          if (this._selectedColor !== null) {
            this._board[r][c] = this._selectedColor;
          }
          this._renderBoard();
          this._grid.focus();
        });
        this._grid.appendChild(cell);
      }
    }
  }

  _applyGridStyle() {
    this._grid.style.gridTemplateColumns = `repeat(${this._cols}, var(--cell-size))`;
    this._grid.style.gridTemplateRows    = `repeat(${this._rows}, var(--cell-size))`;
  }

  _setModel(modelKey) {
    const model = BOARD_MODELS[modelKey];
    if (!model) return;
    this._rows = model.rows;
    this._cols = model.cols;
    this._board = Array.from({ length: this._rows }, () => Array(this._cols).fill(0));
    this._cursorRow = 0;
    this._cursorCol = 0;
    this._applyGridStyle();
    this._buildGrid();
    this._renderBoard();
  }

  _getCell(r, c) {
    return this._grid.children[r * this._cols + c];
  }

  _renderBoard() {
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const val  = this._board[r][c];
        const cell = this._getCell(r, c);

        cell.classList.toggle('cursor', r === this._cursorRow && c === this._cursorCol);

        if (val >= 63 && val <= 71) {
          cell.dataset.color = val;
          delete cell.dataset.char;
          cell.textContent = '';
        } else {
          delete cell.dataset.color;
          cell.dataset.char = val;
          cell.textContent = val === 0 ? '' : (CODE_TO_CHAR[val] || '');
          cell.style.background = '';
        }
      }
    }
    this._updateOutputs();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  _onKeyDown(e) {
    const { key } = e;

    if (key === 'Escape')     { this._selectedColor = null; this._updateColorUI(); e.preventDefault(); return; }
    if (key === 'ArrowRight') { this._moveCursor(0,  1); e.preventDefault(); return; }
    if (key === 'ArrowLeft')  { this._moveCursor(0, -1); e.preventDefault(); return; }
    if (key === 'ArrowDown')  { this._moveCursor(1,  0); e.preventDefault(); return; }
    if (key === 'ArrowUp')    { this._moveCursor(-1, 0); e.preventDefault(); return; }
    if (key === 'Tab')        { this._moveCursor(0,  1); e.preventDefault(); return; }
    if (key === 'Home')       { this._cursorCol = 0;          this._renderBoard(); e.preventDefault(); return; }
    if (key === 'End')        { this._cursorCol = this._cols - 1; this._renderBoard(); e.preventDefault(); return; }

    if (key === 'Enter') {
      if (this._cursorRow < this._rows - 1) { this._cursorRow++; this._cursorCol = 0; }
      this._renderBoard(); e.preventDefault(); return;
    }

    if (key === 'Backspace') {
      this._board[this._cursorRow][this._cursorCol] = 0;
      this._moveCursor(0, -1); e.preventDefault(); return;
    }

    if (key === 'Delete') {
      this._board[this._cursorRow][this._cursorCol] = 0;
      this._renderBoard(); e.preventDefault(); return;
    }

    if (key.length === 1) {
      const code = CHAR_MAP[key.toUpperCase()] ?? CHAR_MAP[key];
      if (code !== undefined) {
        this._board[this._cursorRow][this._cursorCol] = code;
        this._moveCursor(0, 1);
      }
      e.preventDefault();
    }
  }

  _moveCursor(dr, dc) {
    this._cursorRow = Math.max(0, Math.min(this._rows - 1, this._cursorRow + dr));
    this._cursorCol = Math.max(0, Math.min(this._cols - 1, this._cursorCol + dc));
    this._renderBoard();
  }

  // ── Colour palette ────────────────────────────────────────────────────────

  _buildPalette() {
    const palette = this._el('colorPalette');
    palette.innerHTML = '';
    for (const color of COLORS) {
      const wrap   = document.createElement('div');
      wrap.className = 'swatch-wrap';

      const swatch = document.createElement('div');
      swatch.className   = 'color-swatch';
      swatch.dataset.code = color.code;
      swatch.title        = color.label;
      swatch.addEventListener('click', () => {
        if (this._selectedColor === color.code) {
          this._selectedColor = null;
        } else {
          this._selectedColor = color.code;
          this._board[this._cursorRow][this._cursorCol] = color.code;
          this._moveCursor(0, 1);
        }
        this._updateColorUI();
        this._grid.focus();
      });

      const label = document.createElement('div');
      label.className   = 'swatch-label';
      label.textContent = color.label;

      wrap.appendChild(swatch);
      wrap.appendChild(label);
      palette.appendChild(wrap);
    }
  }

  _updateColorUI() {
    this.shadowRoot.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.code) === this._selectedColor);
    });
    if (this._selectedColor !== null) {
      this._modeBadge.textContent = 'COLOR MODE';
      this._modeBadge.className   = 'mode-badge color';
    } else {
      this._modeBadge.textContent = 'TEXT MODE';
      this._modeBadge.className   = 'mode-badge text';
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  _clearBoard() {
    this._board = Array.from({ length: this._rows }, () => Array(this._cols).fill(0));
    this._cursorRow = 0; this._cursorCol = 0;
    this._renderBoard();
  }

  _clearRow() {
    this._board[this._cursorRow] = Array(this._cols).fill(0);
    this._cursorCol = 0;
    this._renderBoard();
  }

  _centerTextInRow() {
    const row = this._board[this._cursorRow];
    let first = -1, last = -1;
    for (let c = 0; c < this._cols; c++) {
      const v = row[c];
      if (v !== 0 && !(v >= 63 && v <= 71)) {
        if (first === -1) first = c;
        last = c;
      }
    }
    if (first === -1) return;
    const content = row.slice(first, last + 1);
    const pad     = Math.floor((this._cols - content.length) / 2);
    const newRow  = Array(this._cols).fill(0);
    content.forEach((v, i) => { newRow[pad + i] = v; });
    this._board[this._cursorRow] = newRow;
    this._renderBoard();
  }

  _fillRow() {
    const code = this._selectedColor !== null ? this._selectedColor : 63; // default: Red
    this._board[this._cursorRow] = Array(this._cols).fill(code);
    this._renderBoard();
  }

  // ── Output ────────────────────────────────────────────────────────────────

  _updateOutputs() {
    // Raw array
    const rawLines = this._board.map(row => '[' + row.join(',') + ']');
    this._el('outputRaw').textContent = '[\n  ' + rawLines.join(',\n  ') + '\n]';

    // VBML JSON — rawCharacters preserves exact cell positions
    this._el('outputJson').textContent = JSON.stringify(
      { components: [{ rawCharacters: this._board }] }, null, 2
    );

    // HA Action YAML
    const rowsYaml = this._board
      .map(row => '          - [' + row.join(', ') + ']')
      .join('\n');
    this._el('outputYaml').textContent = [
      'action: vestaboard.message',
      'data:',
      '  vbml:',
      '    components:',
      '      - rawCharacters:',
      rowsYaml,
    ].join('\n');
  }

  async _copyOutput(which) {
    const map = { raw: ['outputRaw','copyRaw'], json: ['outputJson','copyJson'], yaml: ['outputYaml','copyYaml'] };
    const [elId, btnId] = map[which];
    const btn = this._el(btnId);
    try {
      await navigator.clipboard.writeText(this._el(elId).textContent);
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    } catch (_) { /* clipboard unavailable */ }
  }

  // ── Device picker ─────────────────────────────────────────────────────────

  async _loadDevices() {
    if (!this._hass) return;
    try {
      const all = await this._hass.connection.sendMessagePromise({
        type: 'config/device_registry/list',
      });
      this._devices = all.filter(d =>
        Array.isArray(d.identifiers) &&
        d.identifiers.some(([domain]) => domain === 'vestaboard')
      );
      this._updateDevicePicker();
    } catch (err) {
      console.error('[vestaboard-composer] Failed to load devices:', err);
      this._devicePicker.innerHTML = '<option value="">Failed to load devices</option>';
    }
  }

  _updateDevicePicker() {
    if (this._devices.length === 0) {
      this._devicePicker.innerHTML = '<option value="">No Vestaboard devices found</option>';
      return;
    }
    this._devicePicker.innerHTML =
      '<option value="">Select a Vestaboard\u2026</option>' +
      this._devices.map(d => {
        const name = d.name_by_user || d.name || d.id;
        return `<option value="${d.id}">${name}</option>`;
      }).join('');
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async _sendMessage() {
    const deviceId = this._devicePicker.value;
    if (!deviceId) {
      this._showStatus('Please select a Vestaboard device.', 'error');
      return;
    }

    const serviceData = {
      device_id: [deviceId],
      vbml: { components: [{ rawCharacters: this._board }] },
    };

    const raw = this._durationInput.value.trim();
    if (raw !== '') {
      const duration = parseInt(raw, 10);
      if (isNaN(duration) || duration < 10 || duration > 43200) {
        this._showStatus('Duration must be between 10 and 43200 seconds.', 'error');
        return;
      }
      serviceData.duration = duration;
    }

    console.info('[vestaboard-composer] sending service data:', JSON.stringify(serviceData));
    try {
      await this._hass.callService('vestaboard', 'message', serviceData);
      this._showStatus('✓ Message sent!', 'success');
    } catch (err) {
      this._showStatus(`Error: ${err.message || String(err)}`, 'error');
    }
  }

  _showStatus(msg, type) {
    this._statusMsg.textContent  = msg;
    this._statusMsg.className    = 'status-msg ' + type;
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => { this._statusMsg.className = 'status-msg'; }, 5000);
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  _loadSettings() {
    const saved = localStorage.getItem('vb_cell_size');
    if (saved) this._wrapper.style.setProperty('--cell-size', saved + 'px');
  }

  _openSettings() {
    const current = this._wrapper.style.getPropertyValue('--cell-size');
    this._el('settingCellSize').value = current ? parseInt(current) : 48;
    this._settingsModal.classList.add('open');
  }

  _closeSettings() {
    this._settingsModal.classList.remove('open');
  }

  _applySettings() {
    const size = parseInt(this._el('settingCellSize').value);
    if (size >= 24 && size <= 72) {
      this._wrapper.style.setProperty('--cell-size', size + 'px');
      localStorage.setItem('vb_cell_size', size);
    }
    this._closeSettings();
  }
}

if (!customElements.get('vestaboard-composer')) {
  customElements.define('vestaboard-composer', VestaboardComposer);
}
