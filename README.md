# troche

Web-based song form arranger and practice tool. Build arrangements of song parts, set bar counts and per-part time signatures, and play back with click and auto scroll. I built it to sketch arrangements to share with my bandmates.

Comes in two flavors: standalone app (browser storage) or WordPress plugin.

Named as a nod to [Lozenger](https://coolbandshirt.com), my band's informal name.

Live at https://ironprogrammer.github.io/troche/

## Features

- Quickly create, name, and drag and drop parts.
- Parts support meta for chords, lyric cue, and performance direction.
- Per-part time signature option (keeps same master BPM).
- Practice with click and/or flash metronome, with optional count-in.
- Autosave to browser `localStorage` or WordPress CPT (plugin only).
- Exportable library of multiple songs, JSON format.
- Shareable links that include entire library.

## Develop locally

```bash
nvm use
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

## Build

```bash
npm run build      # outputs static files to dist/
npm run preview    # serve the production build locally to verify
```

## Deploy

GitHub Actions in `.github/workflows/deploy.yml` builds on every push to `main`
and publishes `dist/` to GitHub Pages.

## WordPress plugin

Store songs with WP as the backend. Require user auth to view and edit.

The plugin lives in `/wp-plugin/`. Songs are saved to a CPT, and app mounts at configurable slug (default: `/troche/`).

### Build

```bash
npm run build:wp
```

Builds the app and copies `dist/` into `wp-plugin/dist/`. The root `dist/` used
by GitHub Pages is left untouched.

### Test locally

Runs on [WordPress Playground](https://developer.wordpress.org/playground/).

From the repo root:

```bash
npm run build:wp
npx @wp-playground/cli@latest start --port 9400 \
  --mount wp-plugin:/wordpress/wp-content/plugins/troche \
  --blueprint wp-plugin/.playground/blueprint.json --login
```

Open the playground at <http://127.0.0.1:9400/troche/>, set the URL slug, and assign editors on the Settings → Troche page.

### Release and install

Pushing a version tag builds the app, packages `troche.zip`, and attaches it to a GitHub release (`.github/workflows/release.yml`):

```bash
git tag v1.0.0
git push --tags
```

Install or update by uploading `troche.zip` on Plugins → Add New → Upload Plugin in wp-admin.
