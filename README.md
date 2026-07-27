# troche

A web-based song-form arranger. Build vertical arrangements of song parts
(intro, verse, chorus…), set measures and per-part time signatures, and play
back a visual + audible click that scrolls and highlights sections in time.
Built for sketching arrangements and sharing them with bandmates via JSON
export/import.

Named in a nod toward Lozenger, my band's informal name.

**Live site:** https://ironprogrammer.github.io/troche/

## Features

- **Vertical arrangement** of named, colored parts — drag to reorder.
- **Per-part time signatures** that override the song's master meter (a 6/8
  bridge inside a 4/4 song, etc.).
- **Visual + audible playback** — click metronome (with optional count-in)
  plus a progress fill that highlights and auto-scrolls to the active part.
- **Multiple songs** in a single library, with a song switcher and per-song
  metadata (BPM, time, count-in bars).
- **Per-part cues, colors, and sample links** — paste an mp3/wav URL on a
  part as a reference (opened in a new tab; not played by the app).
- **Autosave to `localStorage`**, with a Save button that flushes on demand.
- **Import / export** as JSON. All exports use one versioned envelope:
  `{ format: "troche", version: 1, songs: [...] }`. Single-song export is
  just `songs` with one entry — same shape, just N=1. Files are named
  `*.troche.json`.
- **Share link** generates a URL with the library encoded in the hash
  (`#data=…`). Open the link to merge those songs into your library; the
  hash is stripped on load so the cleaned URL no longer carries the data.
- **Undo** when you remove a part (6-second toast).

## Stack

- React 19
- [lucide-react](https://lucide.dev) for icons
- Vite (dev server + static build)
- No backend; persists to `localStorage`

## Develop locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

Saving (the Save button) writes to your browser's `localStorage`, so songs
persist between reloads on that machine.

## Build

```bash
npm run build      # outputs static files to dist/
npm run preview    # serve the production build locally to verify
```

## Deploy

GitHub Actions in `.github/workflows/deploy.yml` builds on every push to
`main` and publishes `dist/` to GitHub Pages. The repo's **Settings → Pages**
must have **Source = GitHub Actions**.

Vite's `base` in `vite.config.js` is `./` (relative), so the same `dist/`
serves from both the GitHub Pages subpath and the WordPress plugin.

## WordPress plugin

The same app can run from a WordPress site with server-side storage and login
gating, so bandmates save and load song forms through the site instead of
passing JSON files around. Songs stay off the public web. The standalone build
is unaffected: without a WordPress host the app runs `localStorage`-only,
exactly as above.

The plugin lives in `wp-plugin/`. It serves the built app behind login, saves
each song as a revisioned custom post, and exposes it under a URL slug you
choose (default `/troche`). Viewing requires being logged in; editing requires
a capability you grant per user on **Settings → Troche**.

Because saving is per song rather than per library, having the app open on two
machines is safe: when a tab comes back into view, and again before it saves, it
checks which songs have moved and folds in anything it hasn't touched itself.
Only a song edited in both places at once needs a decision, and it says so
rather than overwriting quietly. Saves are conditional on the version the tab
last saw, so even a write that races another machine is refused and turned into
that same question.

### Build

```bash
npm run build:wp
```

Builds the app and copies `dist/` into `wp-plugin/dist/` — the plugin serves
its own copy, and the root `dist/` used by GitHub Pages is left untouched.

### Test locally

Uses [WordPress Playground](https://developer.wordpress.org/playground/): real
WordPress on SQLite, no Docker, auto-admin login.

From the repo root:

```bash
npm run build:wp
npx @wp-playground/cli@latest start --port 9400 \
  --mount wp-plugin:/wordpress/wp-content/plugins/troche \
  --blueprint wp-plugin/.playground/blueprint.json --login
```

This mounts and activates the plugin and logs you in as an administrator. Open
<http://127.0.0.1:9400/troche/>, then configure the URL slug and editors on
**Settings → Troche**. To check the view-vs-edit gates, add a Subscriber user,
grant them editing, and sign in as them.

### Release and install

Pushing a version tag builds the app, packages `troche.zip`, and attaches it to
a GitHub release (`.github/workflows/release.yml`):

```bash
git tag v1.0.0
git push --tags
```

Install or update by uploading `troche.zip` on **Plugins → Add New → Upload
Plugin** in wp-admin.

## Notes / known limitations

- Playback is a visual + click metronome only — it does **not** play the
  linked audio samples; sample links are stored and openable, nothing more.
- Timing model: one beat = one count at a constant duration set by BPM,
  regardless of the time-sig denominator. A 6/8 section is simply 6 counts
  per bar at the same pulse as 4/4 (so the bar is longer, the pulse doesn't
  change). Denominator is effectively a label — 6/8 and 6/4 behave
  identically.
- Tempo, time signatures, part measures, reordering, and add/remove are
  locked during playback by design (not built for live tweaking).
