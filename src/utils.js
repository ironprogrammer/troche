export const sigKey = (t, b) => `${t}/${b}`;

// resolve a part's effective time signature, falling back to the song's master
export const partSig = (part, song) => ({
  top: part.sigTop ?? song.timeSigTop,
  bottom: part.sigBottom ?? song.timeSigBottom,
});

export const uid = () => Math.random().toString(36).slice(2, 10);

// A part's cue used to be one free-text string. It's now three lanes —
// `chords`, `lyric`, `direction` — so an old `cue` moves wholesale into
// `lyric`, which is what nearly all of them actually held. Splitting the rest
// out is a manual editorial job, not something to guess at.
function migratePart(part) {
  if (!("cue" in part)) return part;
  const { cue, ...rest } = part;
  return { ...rest, lyric: cue || rest.lyric || "" };
}

// Repair a library's identities: every song gets a unique, non-empty `id`
// (missing/duplicate ids are regenerated — invisible to the user), and exact
// duplicate names get a macOS-style " (2)", " (3)" suffix (first occurrence
// keeps the bare name). Stable: "Song (2)" won't grow to "Song (2) (2)".
// Parts are migrated to the three cue lanes in the same pass.
//
// Meant for the discrete moments a duplicate can appear — load, import,
// share-merge, new song — NOT on every keystroke. Returns the normalized
// library and whether anything actually changed (so callers can flag a save).
export function normalizeLibrary(library) {
  const seenIds = new Set();
  const usedNames = new Set();
  const idRemap = {};
  let changed = false;

  const uniqueName = (name) => {
    const base = typeof name === "string" ? name : "";
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    let n = 2;
    let candidate;
    do {
      candidate = `${base} (${n})`;
      n += 1;
    } while (usedNames.has(candidate));
    usedNames.add(candidate);
    return candidate;
  };

  const songs = library.songs.map((s) => {
    let id = s.id;
    if (!id || seenIds.has(id)) {
      id = uid();
      idRemap[s.id] = id;
      changed = true;
    }
    seenIds.add(id);

    const name = uniqueName(s.name);
    if (name !== s.name) changed = true;

    let parts = s.parts;
    if (Array.isArray(parts) && parts.some((p) => p && "cue" in p)) {
      parts = parts.map(migratePart);
      changed = true;
    }

    if (id === s.id && name === s.name && parts === s.parts) return s;
    const next = { ...s, id, name };
    if (parts !== s.parts) next.parts = parts;
    return next;
  });

  const activeId = idRemap[library.activeId] ?? library.activeId;
  return { library: { ...library, songs, activeId }, changed };
}

export function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
