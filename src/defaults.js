import { PALETTE } from "./constants.js";
import { uid } from "./utils.js";

// A part's three cue lanes, all empty. Mirrors how a chart layers them:
// chords above, lyric cue below, performance direction in italics.
const blankCues = () => ({ chords: "", lyric: "", direction: "" });

// Used by the "New song" action — a blank canvas.
export const defaultSong = (name) => ({
  id: uid(),
  name: name || "Untitled Song",
  bpm: 120,
  timeSigTop: 4,
  timeSigBottom: 4,
  musicalKey: "",
  countIn: false,
  countInBars: 1,
  parts: [
    { id: uid(), name: "Intro", measures: 4, color: PALETTE[6], sample: "", ...blankCues() },
    { id: uid(), name: "Verse", measures: 8, color: PALETTE[3], sample: "", ...blankCues() },
    { id: uid(), name: "Pre-Chorus", measures: 2, color: PALETTE[1], sample: "", ...blankCues() },
    { id: uid(), name: "Chorus", measures: 4, color: PALETTE[0], sample: "", ...blankCues() },
  ],
});

// The starter song when no library has been saved yet.
// Form sized to approximate the radio cut (~3:33 at 113 BPM ≈ 100 bars).
// The `demo: true` flag marks this as the seeded demo so it can be excluded
// from share-link payloads. Any user edit clears the flag (see App.updateSong).
//
// Doubles as the worked example for the three cue lanes: not every part fills
// all three, which is the normal case and what the empty-lane collapse during
// playback is for.
export const rickrollSong = () => ({
  id: uid(),
  demo: true,
  name: "Never Gonna Give You Up",
  bpm: 113,
  timeSigTop: 4,
  timeSigBottom: 4,
  musicalKey: "A♭",
  countIn: true,
  countInBars: 1,
  parts: [
    { id: uid(), name: "Intro",       measures:  8, color: PALETTE[6], sample: "",
      chords: "| A♭ | B♭m | Cm | B♭m |", lyric: "", direction: "the iconic synth riff" },
    { id: uid(), name: "Verse 1",     measures:  8, color: PALETTE[3], sample: "",
      chords: "| A♭ | B♭m | Cm | B♭m |", lyric: "we're no strangers to love", direction: "" },
    { id: uid(), name: "Pre-Chorus",  measures:  4, color: PALETTE[1], sample: "",
      chords: "| D♭ | E♭ | Cm | Fm |", lyric: "i just wanna tell you how i'm feeling", direction: "build" },
    { id: uid(), name: "Chorus",      measures: 16, color: PALETTE[0], sample: "",
      chords: "| A♭ | B♭m | D♭ | A♭ |", lyric: "never gonna give you up, never gonna let you down", direction: "" },
    { id: uid(), name: "Post-Chorus", measures:  4, color: PALETTE[5], sample: "",
      chords: "| D♭ | E♭ | A♭ | % |", lyric: "ooh, give you up · ooh, give you up", direction: "" },
    { id: uid(), name: "Verse 2",     measures:  8, color: PALETTE[3], sample: "",
      chords: "| A♭ | B♭m | Cm | B♭m |", lyric: "we've known each other for so long", direction: "" },
    { id: uid(), name: "Pre-Chorus",  measures:  4, color: PALETTE[1], sample: "",
      chords: "| D♭ | E♭ | Cm | Fm |", lyric: "your heart's been aching but you're too shy", direction: "build" },
    { id: uid(), name: "Chorus",      measures: 16, color: PALETTE[0], sample: "",
      chords: "| A♭ | B♭m | D♭ | A♭ |", lyric: "never gonna run around and desert you", direction: "" },
    { id: uid(), name: "Bridge",      measures:  8, color: PALETTE[4], sample: "",
      chords: "| Cm | B♭m | A♭ | E♭ |", lyric: "(never gonna give · never gonna give)", direction: "drop to voices and pad" },
    { id: uid(), name: "Chorus",      measures: 16, color: PALETTE[0], sample: "",
      chords: "| A♭ | B♭m | D♭ | A♭ |", lyric: "never gonna tell a lie and hurt you", direction: "final lift" },
    { id: uid(), name: "Outro",       measures:  8, color: PALETTE[8], sample: "",
      chords: "| A♭ | B♭m | D♭ | A♭ |", lyric: "", direction: "fade" },
  ],
});

export const defaultLibrary = () => {
  const s = rickrollSong();
  return { songs: [s], activeId: s.id };
};
