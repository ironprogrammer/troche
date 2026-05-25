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

Open the URL Vite prints (usually `http://localhost:5173/troche/`).

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

Vite's `base` in `vite.config.js` is set to `/troche/` to match the repo
name. If you fork under a different name (or move to a custom domain at the
root), update `base` accordingly.


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
