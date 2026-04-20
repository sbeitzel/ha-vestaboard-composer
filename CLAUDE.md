# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single-file HACS frontend plugin (`ha-vestaboard-composer.js`) that adds a visual Vestaboard board composer panel to Home Assistant. It requires the [ha-vestaboard](https://github.com/natekspencer/ha-vestaboard) integration to send messages.

There is no build step, no package.json, no bundler. The deliverable is the raw JS file.

## Deployment

The deployed copy lives at `/Volumes/config/www/vestaboard/ha-vestaboard-composer.js` (HA's `www/` directory, served as `/local/`). After editing, copy the file there and bump the `?v=N` query string in `/Volumes/config/configuration.yaml` under `panel_custom.module_url`, then restart Home Assistant.

```bash
cp ha-vestaboard-composer.js /Volumes/config/www/vestaboard/ha-vestaboard-composer.js
```

The current `module_url` in `/Volumes/config/configuration.yaml`:
```yaml
module_url: /local/vestaboard/ha-vestaboard-composer.js?v=5
```

ES modules are cached aggressively by the browser. Incrementing `?v=N` and restarting HA is required to force a fresh load.

## Architecture

`ha-vestaboard-composer.js` is a Shadow DOM web component (`<vestaboard-composer>`) registered via `customElements.define`. HA loads it as a `panel_custom` module and injects the `hass` object via the `set hass(hass)` setter, which triggers `_init()` on first call.

All DOM references use `this.shadowRoot.getElementById()` (via `_el(id)`), not `document.getElementById()`.

Key internal state:
- `this._board` — 2D array of character/color codes, dimensions `this._rows × this._cols`
- `this._rows` / `this._cols` — board dimensions, set by `_setModel()` when the model dropdown changes
- `this._cursorRow` / `this._cursorCol` — current cursor position
- `this._selectedColor` — currently selected color code, or `null` for text mode

Board models are defined in `BOARD_MODELS`: Flagship (6×22) and Note (3×15).

VBML output uses `rawCharacters` (a 2D array) — not the `template` string format. This preserves exact cell positions when sent to the `ha-vestaboard` integration.

Service calls go to `vestaboard.message` with `device_id` (array) and `vbml` in the service data. `device_id` is not a HA target — it goes inside the data payload.

## HACS

- `hacs.json` declares `"filename": "ha-vestaboard-composer.js"` (must match the repo name)
- The HACS validation workflow is at `.github/workflows/validate.yml`
- The `hassfest` workflow does **not** apply to frontend plugins and has been intentionally omitted

## Color codes

Verified against `ha-vestaboard`'s `BLACK_COLOR_MAP`: 63=Red, 64=Orange, 65=Yellow, 66=Green, 67=Blue, 68=Violet, 69=White, 70=Black, 71=Filled. Values 1–62 are character codes (0=blank, 1–26=A–Z, 27–36=1–9,0).
