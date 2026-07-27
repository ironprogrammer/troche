export const sigKey = (t, b) => `${t}/${b}`;

// resolve a part's effective time signature, falling back to the song's master
export const partSig = (part, song) => ({
  top: part.sigTop ?? song.timeSigTop,
  bottom: part.sigBottom ?? song.timeSigBottom,
});

export const uid = () => Math.random().toString(36).slice(2, 10);

// Repair a library's identities: every song gets a unique, non-empty `id`
// (missing/duplicate ids are regenerated — invisible to the user), and exact
// duplicate names get a macOS-style " (2)", " (3)" suffix (first occurrence
// keeps the bare name). Stable: "Song (2)" won't grow to "Song (2) (2)".
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

    return id === s.id && name === s.name ? s : { ...s, id, name };
  });

  const activeId = idRemap[library.activeId] ?? library.activeId;
  return { library: { ...library, songs, activeId }, changed };
}

// Fold a sync's conflicts and orphans into the list of songs awaiting a
// decision, keyed by wpId.
//
// A flagged song that this sync didn't mention stays flagged: dismissing a flag
// is what releases that song's save hold, so dropping one would strand it
// unsaveable. A song the sync *did* mention adopts the new entry — the other
// machine has moved again, and "Use theirs" has to mean their copy as it stands
// now, not the one we first saw (taking the stale copy would push it straight
// back over their newer one). Existing entries keep their position so the
// notice strip doesn't reshuffle under the user; genuinely new ones append.
//
// An orphan arriving for a song already flagged as a conflict supersedes it by
// the same rule — once it's been trashed elsewhere there is no "theirs" left.
export function mergeFlags(current, conflicts = [], orphans = []) {
  const incoming = [
    ...conflicts.map((c) => ({ ...c, kind: "conflict" })),
    ...orphans.map((o) => ({ ...o, kind: "orphan" })),
  ];
  const byWpId = new Map(incoming.map((f) => [f.wpId, f]));
  const alreadyFlagged = new Set(current.map((f) => f.wpId));

  return [
    ...current.map((f) => byWpId.get(f.wpId) ?? f),
    ...incoming.filter((f) => !alreadyFlagged.has(f.wpId)),
  ];
}

export function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
