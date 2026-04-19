# Vestaboard Composer — Home Assistant Custom Panel

## Files

```
config/
  www/
    vestaboard/
      vestaboard_panel.html   ← the composer UI
  configuration.yaml          ← add the panel entry here
```

---

## Installation

### 1. Copy the panel file

Copy `vestaboard_panel.html` into your Home Assistant config directory under `www/vestaboard/`:

```
<your HA config dir>/www/vestaboard/vestaboard_panel.html
```

Create the `www/vestaboard/` folder if it doesn't exist.

### 2. Add the panel to configuration.yaml

Add this block to your `configuration.yaml`:

```yaml
panel_custom:
  - name: vestaboard
    sidebar_title: Vestaboard
    sidebar_icon: mdi:bulletin-board
    url_path: vestaboard
    module_url: /local/vestaboard/vestaboard_panel.html
    embed_iframe: true
```

> **Note:** `embed_iframe: true` tells HA to load the file in an iframe.
> `/local/` maps to `<config>/www/` in Home Assistant.

### 3. Restart Home Assistant

After editing `configuration.yaml`, restart HA (Developer Tools → Restart, or full restart).

The "Vestaboard" entry will appear in your sidebar.

---

## Usage

### Board Editor
- **Click any cell** to move the cursor there
- **Type** to insert characters (letters, numbers, basic punctuation)
- **Arrow keys** move the cursor
- **Backspace** clears a cell and moves back; **Delete** clears in place
- **Enter** jumps to the start of the next row
- **Tab** advances one cell

### Color Tiles
- Click a color swatch to enter **Color Mode** — the current cursor cell gets that color and the cursor advances
- Click the same swatch again (or press **Esc**) to return to Text Mode
- In Color Mode, clicking any cell also applies the selected color

### Row Actions
| Button | Action |
|---|---|
| Clear All | Blank the entire board |
| Clear Row | Blank the cursor's row |
| Center Row | Center the text content of the cursor's row |
| Fill Row w/ Color | Fill the entire cursor row with the selected color |

### Copying VBML Output
Two output boxes update live as you edit:

- **Raw Array** — a `[[...], ...]` 6×22 array of character codes for the **local API**
- **VBML JSON** — `{"props": {"components": [...]}}` format for the **cloud API**

Click **Copy** on either to put it on your clipboard, ready to paste into a HA automation or script.

### Sending via Home Assistant Service
Expand the **Send to Home Assistant** section and fill in:

| Field | Example |
|---|---|
| HA Base URL | `http://homeassistant.local:8123` |
| Long-Lived Access Token | Generate in your HA Profile page |
| Service | `vestaboard.send_message` |
| Service Data Key | `characters` (check your integration's docs) |

Click **Save Settings** to persist URL/service/key (token is never saved for security).
Click **Send to Vestaboard** to post the current board state.

### Settings
Click ⚙ **Settings** in the header to adjust the cell size (24–72px).

---

## Vestaboard Character Codes Reference

| Code | Character |
|---|---|
| 0 | Blank |
| 1–26 | A–Z |
| 27–36 | 1–9, 0 |
| 37 | ! |
| 38 | @ |
| 39 | # |
| 40 | $ |
| 41 | ( |
| 42 | ) |
| 44 | - |
| 46 | + |
| 47 | & |
| 48 | = |
| 49 | ; |
| 50 | : |
| 52 | ' |
| 53 | " |
| 54 | % |
| 55 | , |
| 56 | . |
| 59 | / |
| 60 | ? |
| 62 | ° |
| 63 | Blank (color) |
| 64 | White |
| 65 | Black |
| 66 | Red |
| 67 | Orange |
| 68 | Yellow |
| 69 | Green |
| 70 | Blue |
| 71 | Violet |

