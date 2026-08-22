# troche

A web-based song-form arranger. Build vertical arrangements of song parts
(intro, verse, chorus), set measures and per-part time signatures, and play back
a visual and audible click that scrolls and highlights sections in time. I built
it to sketch arrangements and hand them to bandmates as JSON.

Named as a nod to Lozenger, my band's informal name.

Live at https://ironprogrammer.github.io/troche/

## Features

- Vertical arrangement of named, colored parts. Drag to reorder.
- Per-part time signatures override the song's master meter, so a 6/8 bridge
  can sit inside a 4/4 song.
- Playback runs a click metronome with an optional count-in. A progress fill
  highlights the active part and scrolls it into view.
- An optional full-screen flash on every beat, hard on the downbeat and dim on
  the rest. It runs off the same audio clock as the click, so it can't drift.
  The click and flash toggles persist per device.
- Multiple songs in one library, with a song switcher and per-song BPM, time
  signature, and count-in bars.
- Three cue lanes per part: chords, lyric cue, and performance direction. Chords
  render in mono, the lyric plain, the direction italic. Hide any lane from the
  transport bar, and that choice sticks per device rather than per song. Empty
  lanes collapse during playback. The chords field has caret-insert buttons for
  `♭ ♯ Δ ° | % /`.
- Per-part colors and sample links. Paste an mp3/wav URL on a part as a
  reference. It opens in a new tab, and the app never plays it.
- Autosave to `localStorage`, plus a Save button that flushes on demand.
- JSON import and export. Every export uses the same versioned envelope,
  `{ format: "troche", version: 1, songs: [...] }`. A single-song export is that
  shape with one entry. Filenames end in `.troche.json`.
- Share links encode the library in the URL hash (`#data=...`). Opening one
  merges those songs into your library, then strips the hash.
- Undo when you remove a part (6-second toast).

## Stack

- React 19
- [lucide-react](https://lucide.dev) for icons
- Vite (dev server + static build)
- No backend; persists to `localStorage`

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
and publishes `dist/` to GitHub Pages. The repo's Settings → Pages must have
Source = GitHub Actions.

## WordPress plugin

The same app can run from a WordPress site, storing songs on the server behind a
login, so bandmates load and save through the site instead of passing JSON files
around. Without WordPress, the app stays `localStorage`-only.

The plugin lives in `wp-plugin/`. It serves the built app behind login, saves
each song as a revisioned custom post, and mounts at a URL slug you choose
(default `/troche`). Viewing requires a login. Editing requires a capability you
grant per user on Settings → Troche.

### Build

```bash
npm run build:wp
```

Builds the app and copies `dist/` into `wp-plugin/dist/`. The root `dist/` used
by GitHub Pages is left untouched.

### Test locally

Runs on [WordPress Playground](https://developer.wordpress.org/playground/), so
there's no Docker and no database to set up.

From the repo root:

```bash
npm run build:wp
npx @wp-playground/cli@latest start --port 9400 \
  --mount wp-plugin:/wordpress/wp-content/plugins/troche \
  --blueprint wp-plugin/.playground/blueprint.json --login
```

That mounts and activates the plugin and signs you in as an administrator. Open
<http://127.0.0.1:9400/troche/>, then set the URL slug and editors on Settings →
Troche. To check the view and edit gates, add a Subscriber user, grant them
editing, and sign in as them.

### Release and install

Pushing a version tag builds the app, packages `troche.zip`, and attaches it to
a GitHub release (`.github/workflows/release.yml`):

```bash
git tag v1.0.0
git push --tags
```

Install or update by uploading `troche.zip` on Plugins → Add New → Upload Plugin
in wp-admin.

## Limitations

- Playback is a metronome, visual and audible. It never plays the linked audio
  samples.
- One beat is one count at a constant duration set by BPM, whatever the time
  signature's denominator says. A 6/8 section is 6 counts per bar at the same
  pulse as 4/4, so the bar gets longer but the pulse doesn't change. The
  denominator is just a label. 6/8 and 6/4 behave identically.
- Tempo, time signatures, part measures, reordering, and add/remove are locked
  during playback. It isn't built for live tweaking.
