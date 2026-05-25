import { useEffect, useState } from "react";
import { Upload, Download, Save, Check, Loader2, Trash2, Share2 } from "lucide-react";
import { TIME_SIGS, KEYS } from "../constants.js";
import { sigKey } from "../utils.js";
import { SongSwitcher } from "./SongSwitcher.jsx";
import { NumberInput } from "./NumberInput.jsx";
import TrocheLogo from "./TrocheLogo.jsx";
import { styles } from "../styles.js";

function MetaField({ label, children }) {
  return (
    <label style={styles.metaField}>
      <span style={styles.metaLabel}>{label}</span>
      {children}
    </label>
  );
}

export function Header({
  library, activeSong, playing, dirty, saving, savedFlash,
  fileInputRef,
  onSwitch, onNew, onDelete, onExportLibrary, onExportSong, onImport,
  onSave, onReset, onShare, shareFlash, setField, updateSong,
}) {
  // Hold Alt/Option to reveal the destructive "Reset" button.
  const [altHeld, setAltHeld] = useState(false);
  useEffect(() => {
    const down = (e) => { if (e.key === "Alt") setAltHeld(true); };
    const up = (e) => { if (e.key === "Alt") setAltHeld(false); };
    const blur = () => setAltHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return (
    <header style={styles.chrome}>
      <div style={styles.chromeRow}>
        <div style={styles.brandWrap}>
          <div className="sa-brand" style={styles.brandMark}>
            <TrocheLogo size={22} />
          </div>
          <SongSwitcher
            library={library}
            onSwitch={onSwitch}
            onNew={onNew}
            onDelete={onDelete}
            onExportLibrary={onExportLibrary}
          />
        </div>

        <div style={styles.chromeActions}>
          {altHeld && (
            <button
              className="sa-btn ghost danger"
              onClick={onReset}
              title="Clear all saved songs from this browser"
            >
              <Trash2 size={15} /> Reset
            </button>
          )}
          <button className="sa-btn ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> Import
          </button>
          <button className="sa-btn ghost" onClick={onExportSong}>
            <Download size={15} /> Export
          </button>
          <button
            className="sa-btn ghost"
            onClick={onShare}
            title="Copy a link that imports this library"
          >
            {shareFlash ? <Check size={15} /> : <Share2 size={15} />}
            {shareFlash ? "Link copied" : "Share"}
          </button>
          <button
            className={`sa-btn primary ${dirty && !saving ? "" : "muted"}`}
            onClick={onSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <Loader2 size={15} className="sa-spin" />
            ) : savedFlash ? (
              <Check size={15} />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving…" : savedFlash ? "Saved" : dirty ? "Save" : "Saved"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onImport}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <div style={styles.metaRow}>
        <MetaField label="Song">
          <input
            className="sa-input name"
            value={activeSong.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </MetaField>
        <MetaField label="BPM">
          <NumberInput
            className="sa-input num"
            min={20}
            max={400}
            value={activeSong.bpm}
            disabled={playing}
            onCommit={(v) => setField("bpm", v)}
          />
        </MetaField>
        <MetaField label="Time">
          <select
            className="sa-input sig"
            value={sigKey(activeSong.timeSigTop, activeSong.timeSigBottom)}
            disabled={playing}
            onChange={(e) => {
              const [t, b] = e.target.value.split("/").map(Number);
              updateSong((s) => ({ ...s, timeSigTop: t, timeSigBottom: b }));
            }}
          >
            {TIME_SIGS.map(([t, b]) => (
              <option key={sigKey(t, b)} value={sigKey(t, b)}>{t}/{b}</option>
            ))}
          </select>
        </MetaField>
        <MetaField label="Key">
          <select
            className="sa-input keysel"
            value={activeSong.musicalKey || ""}
            onChange={(e) => setField("musicalKey", e.target.value)}
          >
            <option value="">—</option>
            {KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </MetaField>
        <MetaField label="Count-in">
          <div style={styles.countInField}>
            <button
              className={`sa-toggle ${activeSong.countIn ? "on" : ""}`}
              onClick={() => setField("countIn", !activeSong.countIn)}
              disabled={playing}
              role="switch"
              aria-checked={activeSong.countIn}
            >
              <span className="knob" />
            </button>
            <select
              className="sa-input countin-select"
              value={activeSong.countInBars || 1}
              disabled={!activeSong.countIn || playing}
              onChange={(e) => setField("countInBars", Number(e.target.value))}
            >
              {[1, 2].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "bar" : "bars"}</option>
              ))}
            </select>
          </div>
        </MetaField>
      </div>
    </header>
  );
}
