import { PALETTE } from "./constants.js";
import { uid } from "./utils.js";

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
    { id: uid(), name: "Intro", measures: 4, color: PALETTE[6], sample: "", cue: "" },
    { id: uid(), name: "Verse", measures: 8, color: PALETTE[3], sample: "", cue: "" },
    { id: uid(), name: "Pre-Chorus", measures: 2, color: PALETTE[1], sample: "", cue: "" },
    { id: uid(), name: "Chorus", measures: 4, color: PALETTE[0], sample: "", cue: "" },
  ],
});

// The starter song when no library has been saved yet.
// Form sized to approximate the radio cut (~3:33 at 113 BPM ≈ 100 bars).
export const rickrollSong = () => ({
  id: uid(),
  name: "Never Gonna Give You Up",
  bpm: 113,
  timeSigTop: 4,
  timeSigBottom: 4,
  musicalKey: "A♭",
  countIn: true,
  countInBars: 1,
  parts: [
    { id: uid(), name: "Intro",       measures:  8, color: PALETTE[6], sample: "", cue: "the iconic synth riff" },
    { id: uid(), name: "Verse 1",     measures:  8, color: PALETTE[3], sample: "", cue: "we're no strangers to love" },
    { id: uid(), name: "Pre-Chorus",  measures:  4, color: PALETTE[1], sample: "", cue: "i just wanna tell you how i'm feeling" },
    { id: uid(), name: "Chorus",      measures: 16, color: PALETTE[0], sample: "", cue: "never gonna give you up, never gonna let you down" },
    { id: uid(), name: "Post-Chorus", measures:  4, color: PALETTE[5], sample: "", cue: "ooh, give you up · ooh, give you up" },
    { id: uid(), name: "Verse 2",     measures:  8, color: PALETTE[3], sample: "", cue: "we've known each other for so long" },
    { id: uid(), name: "Pre-Chorus",  measures:  4, color: PALETTE[1], sample: "", cue: "your heart's been aching but you're too shy" },
    { id: uid(), name: "Chorus",      measures: 16, color: PALETTE[0], sample: "", cue: "never gonna run around and desert you" },
    { id: uid(), name: "Bridge",      measures:  8, color: PALETTE[4], sample: "", cue: "(never gonna give · never gonna give)" },
    { id: uid(), name: "Chorus",      measures: 16, color: PALETTE[0], sample: "", cue: "never gonna tell a lie and hurt you · final lift" },
    { id: uid(), name: "Outro",       measures:  8, color: PALETTE[8], sample: "", cue: "(fade)" },
  ],
});

export const defaultLibrary = () => {
  const s = rickrollSong();
  return { songs: [s], activeId: s.id };
};
