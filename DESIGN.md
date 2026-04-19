# Vestaboard Composer — Design Document

## Use Cases

### UC1: Compose for Automation
> "As a user, I want to create some YAML that I can paste into a Home Assistant automation or script."

The user designs a board layout visually, then copies the generated YAML output to use in an automation/script. No HA connection required. This use case is fully satisfied by the static HTML page (`vestaboard_panel.html`) as-is.

**Outputs needed:**
- Raw character array (local API format)
- VBML JSON (cloud API format)
- HA Action YAML (ready to paste into Developer Tools → Actions or an automation)

### UC2: Send Now
> "As a user, I want to send a message to a particular Vestaboard right now and I want it to stay there either until it gets replaced, or until some elapsed time (to be specified) elapses and then revert to the previous board state."

The user designs a board layout, selects a target Vestaboard device from a list of devices already known to Home Assistant, optionally sets a duration, and sends the message immediately. Requires HA integration.

---

## Supported Board Types

| Model | Rows | Columns | Template tokens |
|-------|------|---------|----------------|
| Flagship | 6 | 22 | 132 |
| Note | 3 | 15 | 45 |

Both models use the same character code scheme and VBML format. The `vestaboard.message` service automatically applies `style: { height: rows, width: columns }` based on the physical device — so VBML does not need to specify dimensions. The UI must render the correct grid and generate the correct token count based on board type.

---

## VBML Format

- Output is a single `components` array at the root level (not nested inside `props`)
- Each board is expressed as one component using `rawCharacters`
- `rawCharacters` is a 2D array (list of rows, each row a list of 22 codes)
- `template` was tried first but rejected: the VBML engine treats `{0}` tokens as whitespace in a text flow and left-aligns non-zero content, destroying precise cell positioning

### HA Action YAML

The `vbml` field must be a **nested YAML mapping**, not a JSON string scalar. Each row is expressed as a YAML flow sequence:

```yaml
action: vestaboard.message
data:
  vbml:
    components:
      - rawCharacters:
          - [0, 0, 66, 66, ...]
          - [0, 0, 0, ...]
          ...
```

### Duration

- Supplied as integer seconds via the `duration` field on the service call
- Valid range: **10–43200** seconds (10 sec to 12 hours)
- Omitting `duration` makes the message permanent (until replaced)
- When duration expires, the board reverts to its previous persistent message (handled by the ha-vestaboard integration)

---

## Color Codes (Resolved)

Verified by test: sending `{66}` displayed green, confirming the ha-vestaboard `BLACK_COLOR_MAP` is authoritative for VBML template codes. The composer's original CHAR_MAP was wrong. Correct mapping:

| Code | Color |
|------|-------|
| 63 | Red (`#da291c`) |
| 64 | Orange (`#fa7400`) |
| 65 | Yellow (`#fcb81b`) |
| 66 | Green (`#1f9a44`) |
| 67 | Blue (`#2083d5`) |
| 68 | Violet (`#702f8a`) |
| 69 | White (`#ffffff`) |
| 70 | Black (`#141414`) |
| 71 | Filled (white on black board, `#ffffff`) |

The composer's CSS variables, cell color states, swatch colors, and `COLORS` array have all been updated to match.

---

## HA Hosting (UC1 Static Page)

- File lives at `<HA config>/www/vestaboard/vestaboard_panel.html`
- Served at `/local/vestaboard/vestaboard_panel.html`
- Embedded in the HA sidebar via a dashboard with a Webpage card (full-width/height)
- `panel_iframe` YAML is deprecated as of HA 2024.4.0 — do not use
- `panel_custom` YAML is correct for JS module panels

---

## Planned: HACS Frontend Plugin (UC2)

To satisfy UC2, the static HTML page will be complemented by a proper HACS frontend plugin — a JavaScript web component that integrates with HA natively.

### Decisions

- **Frontend-only plugin** — no Python backend needed; `vestaboard.message` already exists
- **Single file** — the HACS plugin panel satisfies both UC1 and UC2; `vestaboard_panel.html` is retired once the plugin is complete
- **Public GitHub repo** — required for HACS distribution; repo is `vbml-ha`
- **Raw Array output box** — retained (useful for local API users)
- **VBML JSON output box** — retained
- **HA Action YAML output box** — retained (UC1: copying into automations/scripts)
- **Duration** — blank by default (permanent); user enters seconds if they want a temporary message; UI should note the 10–43200 second constraint

### Repository structure

```
hacs.json                      ← HACS metadata
vestaboard-composer.js         ← web component (panel)
README.md
DESIGN.md
```

### Web component behavior

- Registers a custom element `<vestaboard-composer>`
- Implements `set hass(hass)` — receives the live HA connection automatically
- On first `hass` set, queries the device registry for all devices belonging to the `vestaboard` integration
- Each device exposes its model (Flagship vs Note); the board grid resizes to match the selected device
- Device picker dropdown lists all Vestaboard devices by friendly name
- **Send** button calls `hass.callService()` directly — no token, URL, or service name fields

### HA registration

```yaml
panel_custom:
  - name: vestaboard-composer
    sidebar_title: Vestaboard
    sidebar_icon: mdi:bulletin-board
    url_path: vestaboard
    module_url: /hacsfiles/vestaboard-composer/vestaboard-composer.js
```

### Key HA APIs used

```javascript
// Enumerate Vestaboard devices
const devices = await hass.connection.sendMessagePromise({
  type: 'config/device_registry/list'
});
const vestaboardDevices = devices.filter(d =>
  d.identifiers.some(([domain]) => domain === 'vestaboard')
);

// Send message
await hass.callService(
  'vestaboard', 'message',
  {
    vbml: { components: [{ template: templateString }] },
    duration: seconds  // omit if blank
  },
  { device_id: selectedDeviceId }
);
```

### UI changes from static page

**Removed from HACS plugin:**
- HA Action YAML output box

**Added to HACS plugin:**
- Device picker dropdown (populated from HA device registry; board grid resizes on selection)
- Duration field (seconds, blank = permanent; hint shown: 10–43200)
- Send button (primary action)

**Retained in both:**
- Board editor with keyboard navigation
- Color palette
- Row actions (Clear All, Clear Row, Center Row, Fill Row)
- Raw Array output box
- VBML JSON output box

---

## Open Questions

- [x] **Color codes** — confirmed by test: VBML `{66}` displays green, matching ha-vestaboard `BLACK_COLOR_MAP`. The correct order is 63=Red, 64=Orange, 65=Yellow, 66=Green, 67=Blue, 68=Violet, 69=White, 70=Black, 71=Filled. Composer updated accordingly.
- [ ] **Device model from device registry** — need to confirm the field name that exposes "flagship" vs "note" on a device registry entry so the HACS plugin can auto-resize the grid. Developer currently has Flagship only; Note support can be added later once the field name is known.
