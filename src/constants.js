export const STORAGE_KEY = "troche:library:v1";

// Playback toggles (click on/off, screen flash on/off). Deliberately separate
// from the library: these are per-device playback preferences, not song data,
// so they stay local even when songs live on a WordPress site.
export const PREFS_KEY = "troche:prefs:v1";

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
