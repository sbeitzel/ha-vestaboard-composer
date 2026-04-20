# Contributing

## Prerequisites

- Node.js 22+
- A local Home Assistant instance accessible on the filesystem (for deploy steps only)

## Setup

```bash
npm install
npx playwright install chromium
```

## Local HA config path

`npm run deploy` needs to know where your HA config directory lives.
The default is `/Volumes/config` (a macOS volume mount), but you can
override it by creating a `.env` file in the repo root:

```
HA_CONFIG_DIR=/path/to/your/homeassistant/config
```

This file is gitignored and never committed. Some common values:

| Setup | Path |
|---|---|
| macOS, config volume mounted at default | `/Volumes/config` |
| HA OS / VM via SAMBA share | `/Volumes/homeassistant` or wherever you mounted it |
| Local HA dev install | `~/.homeassistant` or `/home/user/.homeassistant` |
| Docker, bind-mounted config | whatever you passed to `-v` |

The deploy script expects this layout inside that directory:

```
<HA_CONFIG_DIR>/
  configuration.yaml          ← cache-buster updated here
  www/vestaboard/             ← plugin copied here
```

If `HA_CONFIG_DIR` doesn't exist at run time, the deploy step prints a
warning and exits cleanly — useful when running in CI where no HA instance
is present.

## Development

There is no bundler or transpiler. `ha-vestaboard-composer.js` is both the source and the deliverable. Edit it directly.

After making changes, deploy to your local HA instance and force a fresh load:

```bash
npm run deploy
```

This runs the build step (version injection), copies the file to
`<HA_CONFIG_DIR>/www/vestaboard/ha-vestaboard-composer.js`, and updates the
`?v=` cache-buster in `configuration.yaml` to the current version. Restart
Home Assistant to pick up the change.

## Testing

```bash
npm test           # headless Chromium
npm run test:ui    # Playwright interactive UI
```

Tests live in `tests/composer.spec.js`. The fixture at `tests/fixture.html`
mounts the component with a minimal mock `hass` object (empty device list,
no-op `callService`). The `shadow()` and `selectChange()` helpers in the spec
file are the standard pattern for reaching into the Shadow DOM — follow them
when adding new tests.

## Build

```bash
npm run build
```

Reads `version` from `package.json` and injects it into `const VERSION = '...'`
in `ha-vestaboard-composer.js`. This is run automatically as part of `deploy`
and as part of `npm version` (see below).

## Release process

1. **Verify** the feature branch is merged to `main` and CI is green.

2. **Bump the version.** From the `main` branch:

   ```bash
   npm version patch   # 1.2.0 → 1.2.1  (bug fixes)
   npm version minor   # 1.2.0 → 1.3.0  (new features)
   npm version major   # 1.2.0 → 2.0.0  (breaking changes)
   ```

   This command:
   - Runs the test suite (`preversion` hook) — aborts on failure
   - Bumps `package.json`
   - Injects the new version into `ha-vestaboard-composer.js` (`version` hook)
   - Creates a git commit and a `vX.Y.Z` tag

3. **Push** the commit and tag:

   ```bash
   git push --follow-tags
   ```

   Pushing the tag triggers the `release.yml` workflow, which:
   - Builds and tests in CI
   - Creates a GitHub Release named `vX.Y.Z` with auto-generated release notes
   - Attaches `ha-vestaboard-composer.js` as a release asset

   HACS reads the plugin file directly from the tagged commit, so the GitHub
   Release is primarily for human-readable changelogs.

4. **Deploy** to your local HA instance:

   ```bash
   npm run deploy
   ```

## Version references

`package.json` is the single source of truth. Everything else is derived:

| Location | Updated by |
|---|---|
| `const VERSION = '...'` in the JS | `npm run build` |
| `?v=` in `configuration.yaml` | `npm run deploy` |
| Git tag / GitHub Release | `npm version` + `git push --follow-tags` |
| UI header label | Baked in at build time via the JS template literal |
