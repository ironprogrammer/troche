import { Play, Square, Volume2, VolumeX } from "lucide-react";
import { styles } from "../styles.js";

export function Transport({
  playing, togglePlay, metronome, setMetronome,
  inCountIn, activePartId, curMeasure, curBeat, ciBeat,
  totalBeats,
}) {
  return (
    <div style={styles.transport}>
      <button
        className={`sa-play ${playing ? "stop" : ""}`}
        onClick={togglePlay}
        disabled={totalBeats <= 0}
      >
        {playing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        {playing ? "Stop" : "Play"}
      </button>

      <button
        className={`sa-metro ${metronome ? "on" : ""}`}
        onClick={() => setMetronome((m) => !m)}
        title={metronome ? "Click on — tap to mute" : "Click muted — tap to enable"}
        aria-pressed={metronome}
      >
        {metronome ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      <div style={styles.statusWrap}>
        {playing && (inCountIn || activePartId) && (
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
        )}
      </div>
    </div>
  );
}
