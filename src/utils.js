export const sigKey = (t, b) => `${t}/${b}`;

// resolve a part's effective time signature, falling back to the song's master
export const partSig = (part, song) => ({
  top: part.sigTop ?? song.timeSigTop,
  bottom: part.sigBottom ?? song.timeSigBottom,
});

export const uid = () => Math.random().toString(36).slice(2, 10);

export function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
