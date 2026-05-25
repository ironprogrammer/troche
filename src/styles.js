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
    flexWrap: "wrap",
  },
  brandWrap: { display: "flex", alignItems: "center", gap: 12 },
  // visual styling moved to .sa-brand in css so we can do the hover flip
  brandMark: {},
  chromeActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  metaRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 18,
    padding: "12px 18px 14px",
    flexWrap: "wrap",
  },
  metaField: { display: "flex", flexDirection: "column", gap: 4 },
  metaLabel: {
    fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
    color: "var(--ink-dim)", fontWeight: 600,
  },
  countInField: { display: "flex", alignItems: "center", gap: 8 },
  totals: {
    marginLeft: "auto",
    display: "flex", gap: 8, alignItems: "center",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 13, color: "var(--ink-dim)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  transport: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "16px 18px",
    maxWidth: 760, margin: "0 auto",
  },
  statusWrap: {
    flex: 1,
    display: "flex", alignItems: "center",
    minHeight: 48,
  },
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

:root {
  --bg: #faf8f4;
  --chrome: rgba(250,248,244,.85);
  --ink: #1c1a17;
  --ink-dim: #8a8378;
  --line: #e6e0d6;
  --card: #fff;
  --accent: #d8483b;
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

.sa-switcher {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 20px;
  background: transparent; border: none; color: var(--ink);
  cursor: pointer; padding: 4px 6px; border-radius: 8px;
}
.sa-switcher:hover { background: rgba(0,0,0,.04); }
.sa-switcher .title { letter-spacing: -.01em; }

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
/* Resting background uses a very subtle tint so each part's identity color is
   visible even when nothing is playing. The progress fill on top is materially
   more saturated so it reads clearly as it sweeps L→R. */
.sa-block {
  position: relative;
  background: color-mix(in srgb, var(--clr) 6%, var(--card));
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
  background: var(--clr); opacity: .26;
  transition: width .08s linear;
  pointer-events: none;
}
.sa-block.active .sa-block-fill {
  opacity: .42;
  border-right: 3px solid var(--clr);
  box-shadow: 0 0 12px color-mix(in srgb, var(--clr) 45%, transparent);
}
.sa-block-inner {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
}
.sa-grip {
  color: var(--ink-dim); display: flex; opacity: .5;
  cursor: grab; touch-action: none; padding: 4px; margin: -4px;
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

.sa-block-main { flex: 1; min-width: 0; }
.sa-partname {
  font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600;
  border: none; background: transparent; color: var(--ink);
  width: 100%; padding: 2px 0; letter-spacing: -.01em;
}
.sa-partname:focus { outline: none; }
.sa-block-sub {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: var(--ink-dim);
  font-family: 'Spline Sans Mono', monospace;
}
.sa-cue {
  flex: 1; min-width: 0;
  font-family: 'Spline Sans Mono', monospace; font-size: 12px;
  color: var(--ink); background: transparent;
  border: none; border-bottom: 1px dashed transparent;
  padding: 2px 0; transition: border-color .15s;
}
.sa-cue::placeholder { color: var(--ink-dim); opacity: .7; font-style: italic; }
.sa-cue:hover { border-bottom-color: var(--line); }
.sa-cue:focus { outline: none; border-bottom-color: var(--clr); }
.sa-samplelink {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 3px;
  color: var(--accent); text-decoration: none;
}
.sa-samplelink:hover { text-decoration: underline; }

.sa-block-tools { display: flex; align-items: center; gap: 6px; }
.sa-config {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid var(--line); background: var(--card);
  height: 34px; padding: 0 10px; border-radius: 8px;
  cursor: pointer; color: var(--ink-dim); transition: all .15s;
}
.sa-config:hover { border-color: var(--ink-dim); color: var(--ink); }
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
}
`;
