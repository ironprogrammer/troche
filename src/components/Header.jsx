import { useEffect, useState } from "react";
import {
  Upload, Download, Save, Check, Loader2, Trash2, Share2,
  WifiOff, TriangleAlert, Eye, ChevronRight, ChevronDown,
} from "lucide-react";
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

// The autosave status indicator that replaces the Save button in WP mode.
// "Unsaved" and "Offline" are clickable to save immediately (skip the debounce
// / retry); the rest are passive, and "Session expired" is a login link.
function StatusPill({ state, loginUrl, onSave, onReload }) {
  const map = {
    saving: { icon: <Loader2 size={15} className="sa-spin" />, label: "Saving…" },
    saved: { icon: <Check size={15} />, label: "Saved" },
    pending: { icon: <Save size={15} />, label: "Save now" },
    offline: { icon: <WifiOff size={15} />, label: "Offline — changes kept locally" },
    expired: { icon: <TriangleAlert size={15} />, label: "Session expired" },
    stale: { icon: <TriangleAlert size={15} />, label: "Reload before saving" },
    viewonly: { icon: <Eye size={15} />, label: "View only" },
  };
  const s = map[state] || map.saved;

  if (state === "expired" && loginUrl) {
    return (
      <a className="sa-savestate expired" href={loginUrl} title="Your session expired — log in again. Your changes are kept locally.">
        <TriangleAlert size={15} /> <span className="sa-btn-text">Session expired — log in</span>
      </a>
    );
  }

  if (state === "stale" && onReload) {
    return (
      <button
        className="sa-savestate stale clickable"
        onClick={onReload}
        title="Your library looks out of date — reload to sync before saving. Your changes are kept locally."
      >
        {s.icon} <span className="sa-btn-text">{s.label}</span>
      </button>
    );
  }

  if ((state === "pending" || state === "offline") && onSave) {
    return (
      <button
        className={`sa-savestate ${state} clickable`}
        onClick={onSave}
        title={state === "offline" ? "Retry — save now" : "Save now"}
      >
        {s.icon} <span className="sa-btn-text">{s.label}</span>
      </button>
    );
  }

  return (
    <div className={`sa-savestate ${state}`} title={s.label}>
      {s.icon} <span className="sa-btn-text">{s.label}</span>
    </div>
  );
}

export function Header({
  library, activeSong, playing, dirty, saving, savedFlash,
  fileInputRef,
  onSwitch, onNew, onDelete, onExportLibrary, onExportSong, onImport,
  onSave, onReset, onShare, shareFlash,
  setField, updateSong,
  wpMode, isMobile, saveState, loginUrl, onReload,
}) {
  // WP mode on a phone drops the Share/Export/Import row: autosave makes it
  // redundant and the row costs a full line of scarce vertical space. It stays
  // on desktop and everywhere in standalone mode.
  const showFileActions = !(wpMode && isMobile);

  // On phones the song-meta fields (BPM/time/key/count-in — set-and-forget)
  // collapse to a one-line summary, freeing vertical space for the parts and
  // the live controls (switcher, transport, length). Remembered across visits.
  const META_KEY = "troche:metaOpen";
  const [metaOpen, setMetaOpen] = useState(() => {
    try { return window.localStorage.getItem(META_KEY) === "1"; } catch { return false; }
  });
  const toggleMeta = () =>
    setMetaOpen((o) => {
      const next = !o;
      try { window.localStorage.setItem(META_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  // Glanceable summary for the collapsed state. Key/count-in shown only when set.
  const metaSummary = [
    `${activeSong.bpm} BPM`,
    sigKey(activeSong.timeSigTop, activeSong.timeSigBottom),
    activeSong.musicalKey || null,
    activeSong.countIn ? `count-in ${activeSong.countInBars || 1}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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

  const metaFields = (
    <>
      <MetaField label="Song">
        <input
          className="sa-input name"
          value={activeSong.name}
          disabled={playing}
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
          disabled={playing}
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
    </>
  );

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
          {/* Reset clears the local browser buffer only — meaningless in WP
              mode, where the server is the source of truth — so hide it there. */}
          {altHeld && !wpMode && (
            <button
              className="sa-btn ghost danger"
              onClick={onReset}
              title="Clear all saved songs from this browser"
            >
              <Trash2 size={15} /> <span className="sa-btn-text">Reset</span>
            </button>
          )}
          {showFileActions && (
            <>
              <button
                className="sa-btn ghost"
                onClick={() => fileInputRef.current?.click()}
                title="Import a .troche.json file"
              >
                <Upload size={15} /> <span className="sa-btn-text">Import</span>
              </button>
              <button
                className="sa-btn ghost"
                onClick={onExportSong}
                title="Download this song as JSON"
              >
                <Download size={15} /> <span className="sa-btn-text">Export</span>
              </button>
              <button
                className="sa-btn ghost"
                onClick={onShare}
                title="Copy a link that imports this library"
              >
                {shareFlash ? <Check size={15} /> : <Share2 size={15} />}
                <span className="sa-btn-text">{shareFlash ? "Link copied" : "Share"}</span>
              </button>
            </>
          )}
          {wpMode ? (
            <StatusPill state={saveState} loginUrl={loginUrl} onSave={onSave} onReload={onReload} />
          ) : (
            <button
              className={`sa-btn primary ${dirty && !saving ? "" : "muted"}`}
              onClick={onSave}
              disabled={!dirty || saving}
              title={dirty ? "Save library" : "Library saved"}
            >
              {saving ? (
                <Loader2 size={15} className="sa-spin" />
              ) : savedFlash ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}
              <span className="sa-btn-text">
                {saving ? "Saving…" : savedFlash ? "Saved" : dirty ? "Save" : "Saved"}
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onImport}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {isMobile ? (
        <>
          <button
            className={`sa-meta-summary ${metaOpen ? "open" : ""}`}
            onClick={toggleMeta}
            aria-expanded={metaOpen}
            title={metaOpen ? "Hide song settings" : "Edit song settings"}
          >
            {metaOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="sa-meta-summary-text">
              {metaOpen ? "Song meta" : metaSummary}
            </span>
          </button>
          {metaOpen && <div className="sa-metarow">{metaFields}</div>}
        </>
      ) : (
        <div className="sa-metarow">{metaFields}</div>
      )}
    </header>
  );
}
