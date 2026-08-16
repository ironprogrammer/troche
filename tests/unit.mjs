// Unit tests for pure client logic (no browser, no WordPress).
//   node tests/unit.mjs     # or: npm run test:unit
import { normalizeLibrary } from "../src/utils.js";

let pass = 0;
let fail = 0;
const check = (label, cond) => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + ": " + label);
};

// Duplicate + missing ids and duplicate names get repaired.
let r = normalizeLibrary({
  activeId: "s1",
  songs: [
    { id: "s1", name: "Never Gonna Give You Up" },
    { id: "s2", name: "Test in 6/8" },
    { id: "s1", name: "Never Gonna Give You Up" },
    { id: "s2", name: "Test in 6/8" },
    { name: "Bandmate Song" }, // missing id
    { id: "s1", name: "Never Gonna Give You Up" },
  ],
});
const ids = r.library.songs.map((s) => s.id);
check("changed flagged", r.changed === true);
check("all ids unique", new Set(ids).size === ids.length);
check("all ids non-empty strings", ids.every((x) => typeof x === "string" && x.length > 0));
check(
  "names deduped macOS-style",
  JSON.stringify(r.library.songs.map((s) => s.name)) ===
    JSON.stringify([
      "Never Gonna Give You Up",
      "Test in 6/8",
      "Never Gonna Give You Up (2)",
      "Test in 6/8 (2)",
      "Bandmate Song",
      "Never Gonna Give You Up (3)",
    ])
);
check("first occurrence keeps the bare name", r.library.songs[0].name === "Never Gonna Give You Up");
check("activeId still points at a real song", r.library.songs.some((s) => s.id === r.library.activeId));

// Idempotent: running again changes nothing, no "(2) (2)".
const r2 = normalizeLibrary(r.library);
check("stable on re-run (no change)", r2.changed === false);
check("no double-suffix", !r2.library.songs.some((s) => /\(\d+\) \(\d+\)/.test(s.name)));

// A clean library is left untouched.
const r3 = normalizeLibrary({ activeId: "a", songs: [{ id: "a", name: "One" }, { id: "b", name: "Two" }] });
check("clean library unchanged", r3.changed === false);

// ---- cue -> three lanes ----
// An old single-string `cue` becomes `lyric`; chords and direction are left
// for the user to split out by hand.
const m = normalizeLibrary({
  activeId: "a",
  songs: [
    {
      id: "a",
      name: "Old Song",
      parts: [
        { id: "p1", name: "Intro", cue: "the iconic synth riff" },
        { id: "p2", name: "Verse", cue: "" },
      ],
    },
  ],
});
const mParts = m.library.songs[0].parts;
check("migration flagged as changed", m.changed === true);
check("cue key is gone", mParts.every((p) => !("cue" in p)));
check("cue text landed in lyric", mParts[0].lyric === "the iconic synth riff");
check("empty cue becomes empty lyric", mParts[1].lyric === "");
check("other part fields survive", mParts[0].name === "Intro" && mParts[0].id === "p1");

// Idempotent: a migrated library is not rewritten (and so never flags a save).
check("migration stable on re-run", normalizeLibrary(m.library).changed === false);

// A part already on the new shape keeps all three lanes untouched.
const kept = normalizeLibrary({
  activeId: "a",
  songs: [
    {
      id: "a",
      name: "New Song",
      parts: [{ id: "p1", name: "Chorus", chords: "| A♭ |", lyric: "hook", direction: "build" }],
    },
  ],
});
const keptPart = kept.library.songs[0].parts[0];
check("new-shape library unchanged", kept.changed === false);
check(
  "all three lanes preserved",
  keptPart.chords === "| A♭ |" && keptPart.lyric === "hook" && keptPart.direction === "build"
);

// Songs without a parts array (bare fixtures, partial imports) must not gain one.
const bare = normalizeLibrary({ activeId: "a", songs: [{ id: "a", name: "Bare" }] });
check("no phantom parts key added", !("parts" in bare.library.songs[0]));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
