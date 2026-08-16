// Inline styles for structural layout. Theming/component styling lives in css below.
export const styles = {
  root: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--ink)",
    fontFamily: "'Outfit', system-ui, sans-serif",
    paddingBottom: 80,
  },
  loading: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stickyTop: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "var(--chrome)",
    borderBottom: "1px solid var(--line)",
    backdropFilter: "blur(12px)",
  },
  chrome: {},
  chromeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 18px 0",
    // nowrap is what keeps this a single row: with wrapping allowed the
    // browser drops the actions to a second line instead of squeezing the
    // song title, which is the whole problem we're solving.
    flexWrap: "nowrap",
  },
  // minWidth:0 lets this shrink below its content width (flex items default to
  // min-width:auto), so a long song name squeezes the title instead of pushing
  // the actions onto a second row.
  brandWrap: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 auto" },
  // visual styling moved to .sa-brand in css so we can do the hover flip
  brandMark: {},
  // The actions keep their natural width; the song title absorbs the squeeze.
  chromeActions: { display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 },
  metaField: { display: "flex", flexDirection: "column", gap: 4 },
  metaLabel: {
    fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
    color: "var(--ink-dim)", fontWeight: 600,
  },
  countInField: { display: "flex", alignItems: "center", gap: 8 },
  sheet: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "10px 18px 0",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};

export const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap');

/* Spline Sans Mono has no ♭ or ♯, so those characters already fall through to
   whatever symbol face the OS happens to pick — which is why they land small
   and faint beside the letters. Claiming just those three codepoints pins the
   fallback and scales it: size-adjust applies to this face alone, so the
   accidentals grow while B, D and | keep their metrics. It's the only way to
   size individual characters inside an <input>. Needs Safari 16.4+; older
   engines just render them at normal size, which is the pre-existing look. */
@font-face {
  font-family: 'TrocheAccidental';
  src: local('Apple Symbols'), local('Segoe UI Symbol'), local('Arial Unicode MS'),
       local('DejaVu Sans'), local('Noto Music'), local('Symbola');
  unicode-range: U+266D, U+266F, U+00B0;
  size-adjust: 165%;
}

:root {
  --bg: #faf8f4;
  --chrome: rgba(250,248,244,.85);
  --ink: #1c1a17;
  --ink-dim: #8a8378;
  --line: #e6e0d6;
  --card: #fff;
  --accent: #d8483b;
  /* Grey, but pulled toward ink so a direction doesn't read as disabled. */
  --direction-ink: #545049;
}

* { box-sizing: border-box; }

.sa-brand {
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--accent); color: #fff;
  display: grid; place-items: center;
  flex-shrink: 0;
  /* keep the perspective settled so the flip is purely planar */
  perspective: 600px;
}
.sa-brand svg {
  transition: transform .28s cubic-bezier(.55,.05,.25,1);
  transform-origin: 50% 50%;
  will-change: transform;
}
.sa-brand:hover svg { transform: rotateY(180deg); }

.sa-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 7px 12px; border-radius: 8px;
  border: 1px solid var(--line); background: var(--card);
  color: var(--ink); cursor: pointer;
  transition: all .15s;
}
.sa-btn:hover { border-color: var(--ink-dim); }
.sa-btn.ghost { background: transparent; }
.sa-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.sa-btn.primary:hover { filter: brightness(1.05); }
.sa-btn.primary.muted { background: var(--card); border-color: var(--line); color: var(--ink-dim); }

/* Autosave status indicator (WP mode) — replaces the Save button. Passive by
   default; the "session expired" variant is a link back to wp-login. */
.sa-savestate {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 7px 10px; color: var(--ink-dim);
  text-decoration: none; white-space: nowrap;
  background: transparent; border: none;
}
.sa-savestate.pending { color: var(--ink); }
.sa-savestate.offline { color: #b0692c; }
.sa-savestate.expired { color: var(--accent); }
.sa-savestate.stale { color: var(--accent); }
/* Clickable states (Unsaved → save now, Offline → retry) read as actions. */
.sa-savestate.clickable { cursor: pointer; }
.sa-savestate.clickable.pending { color: var(--accent); }
.sa-savestate.clickable:hover { text-decoration: underline; }
a.sa-savestate.expired:hover { text-decoration: underline; }

.sa-switcher {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 20px;
  background: transparent; border: none; color: var(--ink);
  cursor: pointer; padding: 4px 6px; border-radius: 8px;
  /* A <button> sizes to fit-content, so it would happily overflow its wrapper;
     cap it so the title inside is the thing that shrinks. */
  min-width: 0; max-width: 100%;
}
.sa-switcher:hover { background: rgba(0,0,0,.04); }
/* Cap the visible song name so a long title can't push the header actions
   (the autosave status) onto a second row. Truncates with an ellipsis; the
   full name is always available in the dropdown. */
.sa-switcher .title {
  letter-spacing: -.01em;
  max-width: 340px;      /* stylistic cap on wide screens */
  min-width: 0;          /* ...but always allowed to shrink to fit one row */
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sa-switcher svg { flex-shrink: 0; }

.sa-menu {
  position: absolute; top: 110%; left: 0; min-width: 230px;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.14);
  padding: 6px; z-index: 50;
}
.sa-menu-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 10px; border-radius: 8px; cursor: pointer;
  font-size: 14px; font-weight: 500;
}
.sa-menu-item:hover { background: rgba(0,0,0,.05); }
.sa-menu-item.on { color: var(--accent); }
.sa-menu-item.add { color: var(--accent); font-weight: 600; }
.sa-menu-item .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sa-menu-del {
  border: none; background: transparent; color: var(--ink-dim);
  cursor: pointer; padding: 3px; border-radius: 5px; display: grid; place-items: center;
}
.sa-menu-del:hover { color: var(--accent); background: rgba(216,72,59,.1); }
.sa-menu-sep { height: 1px; background: var(--line); margin: 5px 4px; }

.sa-input {
  font-family: 'Outfit', sans-serif; font-size: 15px; line-height: 1.2;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 8px; padding: 7px 10px; color: var(--ink);
  transition: border-color .15s;
  height: 36px;
}
select.sa-input { padding-right: 28px; appearance: none; -webkit-appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--ink-dim) 50%),
                    linear-gradient(135deg, var(--ink-dim) 50%, transparent 50%);
  background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
  background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
}
.sa-input:focus { outline: none; border-color: var(--accent); }
.sa-input:disabled { opacity: .4; cursor: not-allowed; }
.sa-input.name { width: 220px; font-weight: 500; }
.sa-input.num { width: 78px; font-family: 'Spline Sans Mono', monospace; }
.sa-input.tiny { width: 48px; text-align: center; font-family: 'Spline Sans Mono', monospace; padding: 7px 4px; }
.sa-input.tiny.select { width: 58px; }
.sa-input.countin-select { width: 96px; font-family: 'Spline Sans Mono', monospace; }
.sa-input.keysel { width: 76px; font-family: 'Spline Sans Mono', monospace; }
.sa-input.sample { flex: 1; font-size: 13px; }
.sa-btn.danger { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, var(--line)); }
.sa-btn.danger:hover { border-color: var(--accent); background: rgba(216,72,59,.06); }

/* Length is a derived read-only display. It used to be a meta-row field that
   wrapped onto its own line on mobile (eating vertical space); it now lives in
   the transport's status area, which is empty until playback starts. Bars is
   dropped on narrow screens — the time is the part that matters. */
.sa-length-inline {
  display: flex; align-items: baseline; gap: 8px;
  font-family: 'Spline Sans Mono', monospace; font-size: 15px;
  color: var(--ink);
}
.sa-length-time { font-variant-numeric: tabular-nums; }
.sa-length-bars { font-size: 12px; color: var(--ink-dim); }

.sa-metarow {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 18px; padding: 12px 18px 14px; flex-wrap: wrap;
}

/* Collapsed song-meta summary (mobile only). A one-line, tappable disclosure
   that expands into the full .sa-metarow fields. */
.sa-meta-summary {
  display: flex; align-items: center; gap: 8px; width: 100%;
  font-family: 'Spline Sans Mono', monospace; font-size: 13px;
  color: var(--ink-dim);
  background: transparent; border: none; cursor: pointer;
  padding: 6px 18px 10px; text-align: left;
}
.sa-meta-summary:hover { color: var(--ink); }
.sa-meta-summary svg { flex-shrink: 0; opacity: .6; }
.sa-meta-summary-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sa-meta-summary.open {
  color: var(--ink-dim); font-family: inherit; font-weight: 600;
  font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
  padding-bottom: 2px;
}
.sa-transport {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 18px;
  max-width: 760px; margin: 0 auto;
}
.sa-statuswrap {
  flex: 1; display: flex; align-items: center; min-height: 48px;
}

.sa-play {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: inherit; font-weight: 600; font-size: 14px;
  background: var(--ink); color: var(--bg);
  border: none; border-radius: 10px; padding: 11px 20px;
  cursor: pointer; transition: all .15s;
  /* fixed width so "Play" → "Stop" doesn't reflow the row */
  min-width: 102px;
}
.sa-play:hover { transform: translateY(-1px); }
.sa-play:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.sa-play.stop { background: var(--accent); color: #fff; }

.sa-metro {
  display: inline-flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; flex-shrink: 0;
  border: 1px solid var(--line); background: var(--card);
  border-radius: 10px; cursor: pointer; color: var(--ink-dim);
  transition: all .15s;
}
.sa-metro:hover { border-color: var(--ink-dim); color: var(--ink); }
.sa-metro.on { color: var(--accent); border-color: var(--accent); background: rgba(216,72,59,.06); }

/* Beat flash overlay. Transparent at rest; the playback engine animates the
   inner fill's opacity per beat (Web Animations API, so the fade is composited
   off the main thread) and swaps .downbeat on for accented beats.
   Off-beat: dim, edge-weighted, the sheet stays readable underneath.
   Downbeat: flat fill at near-full opacity — it can hide the sheet because
   the engine keeps it to ~70ms.

   Safari 26 tints the status bar and toolbar by sampling fixed/sticky elements
   near the viewport edges rather than from theme-color, and a full-viewport
   fixed overlay is the candidate at both edges. So the wrapper is display:none
   between beats (opacity 0 is not enough — Safari still reads the background
   off a hidden fixed element), and the color sits on an absolutely positioned
   child, leaving the fixed wrapper nothing to sample even mid-beat. The chrome
   then falls back to the paper background set on html/body in index.html. */
.sa-flash {
  display: none;
  position: fixed; inset: 0; z-index: 100;
  pointer-events: none; background: transparent;
}
.sa-flash.live { display: block; }
.sa-flash-fill {
  position: absolute; inset: 0;
  opacity: 0;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--accent) 55%, transparent) 0%,
    var(--accent) 100%
  );
}
.sa-flash-fill.downbeat { background: var(--accent); }

.sa-input.sig { width: 84px; font-family: 'Spline Sans Mono', monospace; }
.sa-input.editor-sig { width: auto; min-width: 170px; }
.sa-sigbadge {
  flex-shrink: 0;
  font-family: 'Spline Sans Mono', monospace; font-size: 11px; font-weight: 600;
  color: var(--clr); background: color-mix(in srgb, var(--clr) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--clr) 35%, transparent);
  padding: 1px 6px; border-radius: 5px;
}

.sa-toggle {
  width: 42px; height: 24px; border-radius: 999px;
  border: none; background: var(--line); cursor: pointer;
  position: relative; transition: background .18s; padding: 0;
}
.sa-toggle .knob {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25);
  transition: transform .18s;
}
.sa-toggle.on { background: var(--accent); }
.sa-toggle.on .knob { transform: translateX(18px); }

.sa-status {
  display: flex; align-items: center; gap: 12px;
  font-family: 'Spline Sans Mono', monospace;
}
.sa-status .beatgroup { display: flex; align-items: flex-end; gap: 18px; }
.sa-status .cell {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
}
.sa-status .cell .lbl {
  font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--ink-dim); font-weight: 600;
}
.sa-status .cell b {
  font-size: 28px; font-weight: 600; line-height: 1;
  font-variant-numeric: tabular-nums;
  min-width: 20px; text-align: left;
}
.sa-status.countin .cell b { color: var(--accent); }
.sa-status .tag {
  font-size: 10px; font-weight: 700; letter-spacing: .14em;
  padding: 3px 7px; border-radius: 5px;
  background: var(--accent); color: #fff;
  align-self: center;
}
.sa-status .tag.hidden { visibility: hidden; }
.sa-status.idle { color: var(--ink-dim); font-size: 13px; }

.sa-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 16px;
  background: var(--ink); color: var(--bg);
  padding: 10px 12px 10px 18px; border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
  font-size: 14px; z-index: 60;
  animation: sa-toast-in .2s ease;
}
@keyframes sa-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }
@keyframes sa-spin { to { transform: rotate(360deg); } }
.sa-spin { animation: sa-spin .7s linear infinite; }
.sa-btn:disabled { cursor: default; opacity: 1; }
.sa-toast-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  background: rgba(255,255,255,.15); color: var(--bg);
  border: none; border-radius: 7px; padding: 7px 11px; cursor: pointer;
}
.sa-toast-btn:hover { background: rgba(255,255,255,.28); }

/* ---- block ---- */
/* Resting background is just a hint of the part's identity color. The
   progress fill on top is materially more saturated so it reads clearly as
   it sweeps L→R. No CSS width transition — we already update width every
   RAF frame; a transition on top adds lag and can stutter against the
   per-frame writes. */
.sa-block {
  position: relative;
  background: color-mix(in srgb, var(--clr) 4%, var(--card));
  border: 1px solid color-mix(in srgb, var(--clr) 22%, var(--line));
  border-left: 4px solid var(--clr);
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow .2s, transform .15s, border-color .2s;
}
.sa-block.active {
  box-shadow: 0 0 0 2px var(--clr), 0 8px 24px rgba(0,0,0,.1);
}
.sa-block.dragging {
  z-index: 30;
  box-shadow: 0 12px 32px rgba(0,0,0,.22);
  transition: none;
  opacity: .96;
  position: relative;
}

.sa-block-fill {
  position: absolute; inset: 0 auto 0 0;
  background: var(--clr); opacity: .40;
  pointer-events: none;
}
.sa-block.active .sa-block-fill {
  opacity: .58;
  border-right: 3px solid var(--clr);
  box-shadow: 0 0 12px color-mix(in srgb, var(--clr) 45%, transparent);
}
/* Top-aligned: with up to three cue lanes the main column is taller than the
   bar count, and centering everything against it floats the controls. */
.sa-block-inner {
  position: relative;
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px;
}
.sa-grip {
  color: var(--ink-dim); display: flex; opacity: .5;
  cursor: grab; touch-action: none; padding: 12px 4px 4px; margin: -4px;
}
.sa-grip:hover { opacity: 1; }
.sa-grip:active { cursor: grabbing; }
.sa-grip.disabled { cursor: default; opacity: .25; }
.sa-grip.disabled:hover { opacity: .25; }

.sa-measures {
  width: 52px; height: 52px; flex-shrink: 0;
  font-family: 'Spline Sans Mono', monospace; font-size: 22px; font-weight: 600;
  text-align: center; color: var(--ink);
  background: var(--bg); border: 1px solid var(--line);
  border-radius: 10px;
}
.sa-measures:focus { outline: none; border-color: var(--clr); }

.sa-block-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sa-partname {
  font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600;
  border: none; background: transparent; color: var(--ink);
  width: 100%; padding: 2px 0; letter-spacing: -.01em;
}
.sa-partname:focus { outline: none; }
/* Locked during playback, but this is exactly when the chart has to be most
   readable — so no dimming. WebKit greys disabled input text via text-fill,
   which opacity/color alone don't override. Each lane restates its own color
   because -webkit-text-fill-color doesn't inherit from a shared rule. */
.sa-partname:disabled { opacity: 1; color: var(--ink); -webkit-text-fill-color: var(--ink); }
.sa-laneinput:disabled { opacity: 1; }
.sa-laneinput.chords:disabled,
.sa-laneinput.lyric:disabled { color: var(--ink); -webkit-text-fill-color: var(--ink); }
.sa-laneinput.direction:disabled { -webkit-text-fill-color: var(--direction-ink); }
.sa-laneinput:disabled:hover { border-bottom-color: transparent; }

/* The three cue lanes. No labels: typography and the gutter icon carry the
   identity, and labels would cost width the phone layout hasn't got. */
.sa-namerow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sa-lanes { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sa-lane {
  display: grid; grid-template-columns: 15px minmax(0, 1fr);
  align-items: center; gap: 8px; min-width: 0;
}
.sa-lane-mark { display: grid; place-items: center; color: var(--ink-dim); opacity: .45; }
.sa-laneinput {
  width: 100%; min-width: 0;
  background: transparent; border: none;
  border-bottom: 1px dashed transparent;
  padding: 2px 0; color: var(--ink);
  transition: border-color .15s;
}
.sa-laneinput:hover { border-bottom-color: var(--line); }
.sa-laneinput:focus { outline: none; border-bottom-color: var(--clr); }
.sa-laneinput::placeholder { color: var(--ink-dim); opacity: .65; font-style: italic; }
/* The prompt is noise on a field you can't type in — and the text-fill above
   would otherwise render it in full ink. */
.sa-laneinput:disabled::placeholder { -webkit-text-fill-color: transparent; }

.sa-laneinput.chords {
  font-family: 'TrocheAccidental', 'Spline Sans Mono', monospace;
  font-size: 13px; font-weight: 600; letter-spacing: .02em;
}
.sa-laneinput.lyric { font-family: 'Outfit', sans-serif; font-size: 14px; }
/* Matched to the lyric's size — at 12.5px the italic was doing all the work
   and it read as disabled text rather than a direction. */
.sa-laneinput.direction {
  font-family: 'Outfit', sans-serif; font-size: 14px; font-style: italic;
  color: var(--direction-ink);
}

/* Chord entry helpers, shown only while the chords lane holds focus. */
.sa-chordhelp {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
  padding: 5px 0 3px 23px;
}
.sa-chordbtn {
  display: inline-flex; align-items: center; justify-content: center;
  font-family: 'TrocheAccidental', 'Spline Sans Mono', monospace;
  font-size: 13px; font-weight: 600; line-height: 1;
  min-width: 26px; height: 24px; padding: 0 6px;
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
  border-radius: 6px; cursor: pointer;
}
.sa-chordbtn:hover { border-color: var(--clr); color: var(--clr); background: var(--bg); }
/* ♭ ♯ ° are scaled by the TrocheAccidental face, so no per-glyph sizes here.
   A lone ° centered in a square still reads better off its superscript
   height; inside the chords lane it stays raised, where convention wants it. */
.sa-chordbtn.deg .g { display: block; transform: translateY(3px); }

.sa-samplelink {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'Spline Sans Mono', monospace; font-size: 12px;
  color: var(--accent); text-decoration: none;
}
.sa-samplelink:hover { text-decoration: underline; }

.sa-lanetoggles { display: inline-flex; align-items: center; gap: 8px; }

.sa-block-tools { display: flex; align-items: center; gap: 6px; padding-top: 9px; }
.sa-config {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid var(--line); background: var(--card);
  height: 34px; padding: 0 10px; border-radius: 8px;
  cursor: pointer; color: var(--ink-dim); transition: all .15s;
}
.sa-config:hover { border-color: var(--ink-dim); color: var(--ink); }
/* Half opacity rather than a grey-out: the swatch still carries enough color
   at .5 to identify the part while it's locked. */
.sa-config:disabled { opacity: .5; cursor: default; }
.sa-config:disabled:hover { border-color: var(--line); color: var(--ink-dim); }
.sa-config.open { border-color: var(--clr); color: var(--ink); background: var(--bg); }
.sa-swatch { width: 16px; height: 16px; border-radius: 5px; display: block; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }

.sa-editor {
  position: relative;
  border-top: 1px dashed var(--line);
  padding: 12px 14px;
  background: var(--bg);
  display: flex; flex-direction: column; gap: 10px;
}
.sa-editor-row { display: flex; align-items: center; gap: 12px; }
.sa-editor-label {
  font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  font-weight: 600; color: var(--ink-dim); width: 48px;
}
.sa-palette { display: flex; gap: 6px; flex-wrap: wrap; }
.sa-palettebtn {
  width: 24px; height: 24px; border-radius: 6px;
  border: 2px solid transparent; cursor: pointer; transition: transform .12s;
}
.sa-palettebtn:hover { transform: scale(1.12); }
.sa-palettebtn.on { border-color: var(--ink); }
.sa-editor-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 2px;
}
.sa-editor-foot-left { display: flex; align-items: center; gap: 6px; }
.sa-editor-del {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: inherit; font-size: 12px; font-weight: 600;
  border: 1px solid var(--line); background: transparent; color: var(--ink-dim);
  cursor: pointer; padding: 6px 10px; border-radius: 7px;
}
.sa-editor-del:hover { color: var(--accent); border-color: var(--accent); background: rgba(216,72,59,.06); }
.sa-editor-dup {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: inherit; font-size: 12px; font-weight: 600;
  border: 1px solid var(--line); background: transparent; color: var(--ink-dim);
  cursor: pointer; padding: 6px 10px; border-radius: 7px;
}
.sa-editor-dup:hover { color: var(--ink); border-color: var(--ink-dim); }
.sa-editor-del:disabled, .sa-editor-dup:disabled {
  opacity: .35; cursor: default; pointer-events: none;
}
.sa-toggle:disabled { opacity: .4; cursor: default; }
.sa-editor-close {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: inherit; font-size: 12px; font-weight: 600;
  border: none; background: var(--ink); color: var(--bg);
  cursor: pointer; padding: 7px 12px; border-radius: 7px;
}
.sa-editor-close:hover { filter: brightness(1.15); }

.sa-add {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: inherit; font-size: 14px; font-weight: 600;
  background: transparent; color: var(--ink-dim);
  border: 2px dashed var(--line); border-radius: 12px;
  padding: 16px; cursor: pointer; transition: all .15s;
  margin-top: 4px;
}
.sa-add:hover { border-color: var(--accent); color: var(--accent); background: rgba(216,72,59,.04); }

.sa-footer {
  display: flex; justify-content: center;
  padding: 36px 18px 14px;
  font-size: 12px; color: var(--ink-dim);
  letter-spacing: .04em;
}
.sa-footer .heart { color: var(--accent); font-size: 13px; vertical-align: -1px; }

input[type=number]::-webkit-inner-spin-button { opacity: .4; }

@media (max-width: 560px) {
  .sa-block-inner { gap: 8px; padding: 10px; }
  .sa-measures { width: 44px; height: 44px; font-size: 18px; }
  .sa-partname { font-size: 16px; }
  .sa-config { padding: 0 8px; }
  .sa-status .cell b { font-size: 24px; }
  .sa-status .beatgroup { gap: 12px; }
  .sa-input.name { width: 100%; min-width: 160px; }
  /* icon-only header buttons on narrow screens — text takes too much room
     and we need Import/Export/Share/Save to all fit on one line */
  .sa-btn-text { display: none; }
  .sa-btn { padding: 7px 10px; }
  /* drop the bars sub-label; the time is the part that matters */
  .sa-length-bars { display: none; }
  /* tighten the header bands so form blocks get more room */
  .sa-metarow { gap: 10px; padding: 8px 18px 10px; }
  /* Play plus five 42px squares only fits a ~390px row at this gap and
     padding. What gives instead is the length readout, which wraps to its own
     line while idle — and is replaced by the bar/beat counter during playback
     anyway, so mid-song the row stays single. */
  .sa-transport { padding: 8px 10px; gap: 8px; flex-wrap: wrap; }
  .sa-lanetoggles { gap: 8px; }
  .sa-statuswrap { min-height: 40px; justify-content: flex-end; }
}

/* ---- print chart (browser Print / ⌘P) ----
   A read-only, one-page chart of the active song. Hidden on screen; revealed
   only when printing, with the interactive app hidden. Everything is solid
   black so it holds up on a B&W laser. Rendered by PrintChart.jsx from the same
   song state + partSig math as the app, so it can't drift out of sync. */
.sa-print { display: none; }

@media print {
  /* Take the page margin off @page — WebKit/Safari honors it inconsistently and
     also reserves header/footer space on top of it, which enlarges the top
     margin and pushes the last row onto a phantom second page. Zero the @page
     margin (this also drops the browser's date/URL chrome) and recreate the
     margin as padding on the print container, which every engine agrees on. */
  @page { margin: 0; }
  /* Neutralize the app shell so nothing but the chart reaches paper: the root's
     inline cream background and min-height:100vh would otherwise print a tinted
     band and spill onto a second page. body's default margin is zeroed too — a
     stray few px there is enough to tip a tight one-page layout in Safari. */
  html, body { background: #fff !important; margin: 0 !important; }
  #root, #root > div {
    background: transparent !important; min-height: 0 !important; padding: 0 !important;
  }
  /* .sa-print is the first rendered child of the root, so its later siblings
     are the entire interactive app — hide them and show only the chart. */
  .sa-print ~ * { display: none !important; }
  .sa-print { display: block; color: #000; padding: 14mm; }

  .sa-print-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 10px 20px; flex-wrap: wrap;
    border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px;
  }
  .sa-print-title {
    font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800;
    letter-spacing: -.02em; line-height: 1.05;
  }
  /* value-first, unit-suffixed — one consistent order throughout */
  .sa-print-meta {
    font-family: 'Spline Sans Mono', monospace; font-size: 13px; color: #555;
    display: flex; flex-wrap: wrap; gap: 4px 12px; font-variant-numeric: tabular-nums;
  }
  .sa-print-meta span { white-space: nowrap; }
  .sa-print-meta b { color: #000; font-weight: 700; }

  /* Top-aligned so each big bar number and its part name start on one line. */
  .sa-print-row {
    display: flex; align-items: flex-start; gap: 28px; padding: 9px 4px;
    break-inside: avoid;
  }
  .sa-print-row + .sa-print-row { border-top: 1px solid #ccc; }
  .sa-print-bars {
    flex-shrink: 0; width: 46px; text-align: right;
    font-family: 'Spline Sans Mono', monospace; font-size: 27px; font-weight: 700;
    line-height: 1; letter-spacing: -.02em; color: #000; font-variant-numeric: tabular-nums;
  }
  .sa-print-main { flex: 1; min-width: 0; }
  .sa-print-name {
    font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700;
    letter-spacing: -.01em; line-height: 1.05; color: #000;
  }
  /* One line per filled cue lane, stacked the way they are on screen — which
     is also what a chart looks like on paper. Solid black for the two that
     carry musical content; the direction stays grey and italic. */
  .sa-print-cue {
    margin-top: 1px; font-family: 'Spline Sans Mono', monospace; font-size: 11px;
    color: #555; line-height: 1.25;
  }
  .sa-print-cue.chords {
    font-family: 'TrocheAccidental', 'Spline Sans Mono', monospace;
    font-size: 12px; font-weight: 600; color: #000;
  }
  .sa-print-cue.lyric { font-family: 'Outfit', sans-serif; font-size: 11.5px; color: #000; }
  .sa-print-cue.direction { font-family: 'Outfit', sans-serif; font-size: 11.5px; font-style: italic; }
  .sa-print-sig { font-weight: 700; color: #000; margin-right: 4px; }
}

/* iOS Safari zooms the page in whenever a focused text field is smaller than
   16px, and it does not zoom back out when the field blurs — you're left
   panning around a magnified chart mid-song. 16px is a hard threshold, not a
   design choice, so every text field gets it on touch; the desktop sizes are
   untouched. Selects are exempt (they open a picker, not a keyboard) and
   .sa-partname is already 16px+ at every width. Each selector is
   element-qualified to outrank the class rule that sets its smaller size. */
@media (pointer: coarse) {
  input.sa-input,
  input.sa-input.sample,
  input.sa-laneinput { font-size: 16px; }
}
`;
