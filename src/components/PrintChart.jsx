import React from "react";
import { partSig } from "../utils.js";
import { CUE_LANES } from "../constants.js";

// Read-only, print-only rendering of the active song's arrangement. Hidden on
// screen (see .sa-print in styles.js) and revealed only inside @media print,
// so the browser's native Print (⌘P) produces a clean one-page chart while the
// interactive app chrome is hidden.
//
// It renders from the same `song` state and the same partSig/timing math the
// app uses, so it can never drift out of sync — there's no snapshot, just a
// second render of the single source of truth.
export function PrintChart({ song }) {
  if (!song) return null;

  const secPerBeat = 60 / song.bpm;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  const totalMeasures = song.parts.reduce((a, p) => a + p.measures, 0);
  const totalSeconds = song.parts.reduce(
    (a, p) => a + p.measures * partSig(p, song).top * secPerBeat,
    0
  );

  const meta = [
    { v: song.bpm, u: "BPM" },
    { v: `${song.timeSigTop}/${song.timeSigBottom}`, u: "" },
    ...(song.musicalKey ? [{ v: song.musicalKey, u: "key" }] : []),
    { v: totalMeasures, u: "bars" },
    { v: fmt(totalSeconds), u: "" },
  ];

  return (
    <div className="sa-print" aria-hidden="true">
      <div className="sa-print-head">
        <div className="sa-print-title">{song.name}</div>
        <div className="sa-print-meta">
          {meta.map((m, i) => (
            <span key={i}>
              <b>{m.v}</b>{m.u ? ` ${m.u}` : ""}
            </span>
          ))}
        </div>
      </div>

      {song.parts.map((p) => {
        const sig = partSig(p, song);
        const differs = sig.top !== song.timeSigTop || sig.bottom !== song.timeSigBottom;
        // Every lane the part actually fills, each on its own line — the same
        // stacking the block uses on screen, and what a chart looks like on
        // paper. Empty lanes are simply absent; the header toggles are a
        // screen-reading preference and don't apply here.
        const filled = CUE_LANES.filter(({ key }) => p[key]);
        return (
          <div className="sa-print-row" key={p.id}>
            <div className="sa-print-bars">{p.measures}</div>
            <div className="sa-print-main">
              <div className="sa-print-name">{p.name}</div>
              {differs && (
                <div className="sa-print-cue">
                  <span className="sa-print-sig">{sig.top}/{sig.bottom}</span>
                </div>
              )}
              {filled.map(({ key }) => (
                <div className={`sa-print-cue ${key}`} key={key}>{p[key]}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
