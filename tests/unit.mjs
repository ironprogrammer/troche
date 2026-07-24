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

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
