export const STORAGE_KEY = "troche:library:v1";

// Playback toggles (click on/off, screen flash on/off) and cue lane
// visibility. Deliberately separate from the library: these are per-device
// preferences, not song data, so they stay local even when songs live on a
// WordPress site.
export const PREFS_KEY = "troche:prefs:v1";

// A part's cue, split into the three layers a chart already separates. Order
// here is the order they render in the block and on the printed chart.
// `pref` is the loadPrefs()/savePrefs() key holding this lane's visibility.
export const CUE_LANES = [
  { key: "chords",    label: "Chords",    pref: "laneChords",    placeholder: "chords…" },
  { key: "lyric",     label: "Lyric",     pref: "laneLyric",     placeholder: "lyric cue…" },
  { key: "direction", label: "Direction", pref: "laneDirection", placeholder: "feel / direction…" },
];

// Symbols that are a nuisance to type on a phone, inserted at the caret.
// `glyph` marks the ones the TrocheAccidental face scales up (see styles.js).
export const CHORD_HELPERS = [
  { ch: "♭", tip: "Flat",                cls: "glyph" },
  { ch: "♯", tip: "Sharp",               cls: "glyph" },
  { ch: "Δ", tip: "Major 7th",           cls: "" },
  { ch: "°", tip: "Diminished",          cls: "glyph deg" },
  { ch: "|", tip: "Bar line",            cls: "" },
  { ch: "%", tip: "Repeat previous bar", cls: "" },
  { ch: "/", tip: "Beat slash",          cls: "" },
];

export const PALETTE = [
  "#e2574c", "#e08a3c", "#d9b13b", "#5fa055",
  "#3d8b8b", "#4571b0", "#7a5ba6", "#b0517f",
  "#8a8d93", "#5a6b7a",
];

// common time signatures — [top, bottom]. top = beats per measure used for timing.
export const TIME_SIGS = [
  [4, 4], [3, 4], [2, 4], [6, 8], [5, 4], [7, 8], [12, 8], [9, 8],
];

// 24 standard keys, common enharmonic spellings.
export const KEYS = [
  "C",  "D♭", "D",  "E♭", "E",  "F",  "F♯", "G",  "A♭", "A",  "B♭", "B",
  "Cm", "C♯m", "Dm", "E♭m", "Em", "Fm", "F♯m", "Gm", "G♯m", "Am", "B♭m", "Bm",
];
