import { Play, Square, Volume2, VolumeX, Zap, ZapOff } from "lucide-react";
import { CUE_LANES } from "../constants.js";

export function Transport({
  playing, togglePlay, metronome, setMetronome, flash, setFlash,
  lanes, toggleLane,
  inCountIn, activePartId, curMeasure, curBeat, ciBeat,
  totalBeats, lengthLabel, barsLabel,
}) {
  return (
    <div className="sa-transport">
      <button
        className={`sa-play ${playing ? "stop" : ""}`}
        onClick={togglePlay}
        disabled={totalBeats <= 0}
      >
        {playing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        <span className="sa-play-label">{playing ? "Stop" : "Play"}</span>
      </button>

      <button
        className={`sa-metro ${metronome ? "on" : ""}`}
        onClick={() => setMetronome((m) => !m)}
        title={metronome ? "Click on — tap to mute" : "Click muted — tap to enable"}
        aria-pressed={metronome}
      >
        {metronome ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      <button
        className={`sa-metro ${flash ? "on" : ""}`}
        onClick={() => setFlash((f) => !f)}
        title={flash ? "Screen flash on — tap to disable" : "Screen flash off — tap to enable"}
        aria-pressed={flash}
        aria-label="Flash the screen on each beat"
      >
        {flash ? <Zap size={16} /> : <ZapOff size={16} />}
      </button>

      {/* Cue lane visibility. Same square as the click and flash toggles —
          these answer the same question those do: how do I want to read the
          chart while I play? Stays live during playback, which is exactly
          when you'd want to drop a lane. */}
      <div className="sa-lanetoggles" role="group" aria-label="Cue lanes">
        {CUE_LANES.map(({ key, label, icon: Icon }) => {
          const on = lanes[key];
          return (
            <button
              key={key}
              className={`sa-metro ${on ? "on" : ""}`}
              onClick={() => toggleLane(key)}
              title={`${label} lane ${on ? "on — tap to hide" : "off — tap to show"}`}
              // Name the thing, not the action: aria-pressed already announces
              // which way it's set, and "Show…" contradicts it while on.
              aria-label={`${label} lane`}
              aria-pressed={on}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="sa-statuswrap">
        {playing ? (
          (inCountIn || activePartId) && (
            <div className={`sa-status ${inCountIn ? "countin" : "live"}`}>
              <span className="beatgroup">
                <span className="cell">
                  <span className="lbl">bar</span>
                  <b>{inCountIn ? 0 : curMeasure}</b>
                </span>
                <span className="cell">
                  <span className="lbl">beat</span>
                  <b>{inCountIn ? ciBeat : curBeat}</b>
                </span>
              </span>
              <span className={`tag ${inCountIn ? "" : "hidden"}`}>COUNT-IN</span>
            </div>
          )
        ) : (
          // When idle, the status area is dead space — show the song length
          // here instead of giving it its own (mobile-wrapping) meta-row line.
          <div className="sa-length-inline">
            <span className="sa-length-time">{lengthLabel}</span>
            <span className="sa-length-bars">{barsLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
