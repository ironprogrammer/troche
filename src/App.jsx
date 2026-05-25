import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Plus, RotateCcw } from "lucide-react";
import { PALETTE, STORAGE_KEY } from "./constants.js";
import { uid } from "./utils.js";
import { defaultLibrary, defaultSong } from "./defaults.js";
import { loadLibrary, saveLibrary } from "./storage.js";
import { buildShareUrl, consumeSharedFromUrl } from "./share.js";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine.js";
import { Header } from "./components/Header.jsx";
import { Transport } from "./components/Transport.jsx";
import { PartBlock } from "./components/PartBlock.jsx";
import { styles, css } from "./styles.js";

export default function App() {
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);

  const partRefs = useRef({});
  const fileInputRef = useRef(null);

  // undo stash for a removed part
  const [undo, setUndo] = useState(null); // { part, index, songId }
  const undoTimer = useRef(null);

  // undo stash for a removed song
  const [songUndo, setSongUndo] = useState(null); // { song, index, placeholderId? }
  const songUndoTimer = useRef(null);

  // id of a freshly-added part whose name should auto-focus
  const [focusPartId, setFocusPartId] = useState(null);

  // brief confirmation that a share link was copied
  const [shareFlash, setShareFlash] = useState(false);

  useEffect(() => {
    // Consume the shared payload (if any) before loading from storage. The
    // hash is stripped regardless of parse success so the URL is clean.
    const shared = consumeSharedFromUrl();
    loadLibrary().then((stored) => {
      const incoming = Array.isArray(shared?.songs) ? shared.songs : null;
      const hasIncoming = !!(incoming && incoming.length);

      // Three states: storage hit, shared link, or both.
      //  - storage only             → use it
      //  - shared only (no storage) → use the shared payload outright (don't seed Rickroll)
      //  - storage + shared         → merge shared into existing library
      //  - neither                  → seed the default library (Rickroll)
      let next;
      let importedDirty = false;
      if (hasIncoming) {
        const normalized = incoming.map((s) => ({
          ...defaultSong(s.name),
          ...s,
          id: uid(),
          parts: (s.parts || []).map((p) => ({ ...p, id: uid() })),
        }));
        if (stored) {
          next = {
            songs: [...stored.songs, ...normalized],
            activeId: normalized[0].id,
          };
          importedDirty = true; // user has existing data — flag for save
        } else {
          // First-time visitor coming in via a share link: skip the demo,
          // give them just the shared songs.
          next = { songs: normalized, activeId: normalized[0].id };
        }
      } else {
        next = stored || defaultLibrary();
      }

      setLibrary(next);
      if (importedDirty) setDirty(true);
      setLoading(false);
    });
  }, []);

  const activeSong = library?.songs.find((s) => s.id === library.activeId) || null;

  const {
    playing, togglePlay, stop,
    metronome, setMetronome,
    segments, totalBeats, secPerBeat,
    countInActive, masterTop,
    inCountIn, activePartId, partProgress,
    ciBeat, curMeasure, curBeat,
  } = usePlaybackEngine(activeSong);

  // ---- mutation helpers ----
  const updateSong = useCallback((mutator) => {
    setLibrary((lib) => {
      const songs = lib.songs.map((s) => {
        if (s.id !== lib.activeId) return s;
        const next = mutator({ ...s });
        // Once the user touches the seeded demo it stops being "the demo" —
        // clearing the flag so it can be shared like any other song.
        if (next.demo) delete next.demo;
        return next;
      });
      return { ...lib, songs };
    });
    setDirty(true);
  }, []);

  const setField = (field, value) =>
    updateSong((s) => ({ ...s, [field]: value }));

  // ---- part operations ----
  const addPart = () => {
    const id = uid();
    updateSong((s) => ({
      ...s,
      parts: [
        ...s.parts,
        {
          id,
          name: "New Part",
          measures: 4,
          color: PALETTE[s.parts.length % PALETTE.length],
          sample: "",
          cue: "",
        },
      ],
    }));
    setFocusPartId(id);
  };

  const removePart = (pid) => {
    if (!activeSong) return;
    const index = activeSong.parts.findIndex((p) => p.id === pid);
    const part = activeSong.parts[index];
    if (!part) return;
    updateSong((s) => ({ ...s, parts: s.parts.filter((p) => p.id !== pid) }));
    setUndo({ part, index, songId: activeSong.id });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const restorePart = () => {
    if (!undo) return;
    setLibrary((lib) => {
      const songs = lib.songs.map((s) => {
        if (s.id !== undo.songId) return s;
        const parts = [...s.parts];
        parts.splice(Math.min(undo.index, parts.length), 0, undo.part);
        return { ...s, parts };
      });
      return { ...lib, songs };
    });
    setDirty(true);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const duplicatePart = (pid) => {
    const id = uid();
    updateSong((s) => {
      const index = s.parts.findIndex((p) => p.id === pid);
      if (index < 0) return s;
      const src = s.parts[index];
      const copy = { ...src, id };
      const parts = [...s.parts];
      parts.splice(index + 1, 0, copy);
      return { ...s, parts };
    });
    setFocusPartId(id);
  };

  const updatePart = (pid, patch) =>
    updateSong((s) => ({
      ...s,
      parts: s.parts.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
    }));

  const movePart = (from, to) =>
    updateSong((s) => {
      const parts = [...s.parts];
      const [moved] = parts.splice(from, 1);
      parts.splice(to, 0, moved);
      return { ...s, parts };
    });

  // ---- song library operations ----
  const switchSong = (id) => {
    stop();
    setLibrary((lib) => ({ ...lib, activeId: id }));
  };

  const newSong = () => {
    stop();
    const s = defaultSong("New Song");
    setLibrary((lib) => ({ songs: [...lib.songs, s], activeId: s.id }));
    setDirty(true);
  };

  const deleteSong = (id) => {
    if (!library) return;
    const index = library.songs.findIndex((s) => s.id === id);
    const song = library.songs[index];
    if (!song) return;

    const remaining = library.songs.filter((s) => s.id !== id);
    let placeholderId = null;
    let safe = remaining;
    if (!remaining.length) {
      // Don't let the library go empty — drop in a placeholder. We remember
      // its id so the undo can remove the placeholder cleanly on restore.
      const placeholder = defaultSong("New Song");
      placeholderId = placeholder.id;
      safe = [placeholder];
    }
    const activeId = id === library.activeId ? safe[0].id : library.activeId;
    setLibrary({ songs: safe, activeId });

    setSongUndo({ song, index, placeholderId });
    if (songUndoTimer.current) clearTimeout(songUndoTimer.current);
    songUndoTimer.current = setTimeout(() => setSongUndo(null), 6000);
    setDirty(true);
  };

  const restoreSong = () => {
    if (!songUndo) return;
    setLibrary((lib) => {
      let songs = lib.songs;
      if (songUndo.placeholderId) {
        songs = songs.filter((s) => s.id !== songUndo.placeholderId);
      }
      songs = [...songs];
      songs.splice(Math.min(songUndo.index, songs.length), 0, songUndo.song);
      return { songs, activeId: songUndo.song.id };
    });
    setDirty(true);
    setSongUndo(null);
    if (songUndoTimer.current) clearTimeout(songUndoTimer.current);
  };

  const handleSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    const ok = await saveLibrary(library);
    setSaving(false);
    if (ok) {
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    }
  };

  const handleShare = async () => {
    if (!library) return;
    // Exclude the seeded demo from share links so it doesn't propagate to
    // recipients. Once the user has edited it, the demo flag clears and it
    // shares normally.
    const shareable = library.songs.filter((s) => !s.demo);
    if (!shareable.length) {
      window.alert("Nothing to share — your library is just the demo song. Add or edit a song first.");
      return;
    }
    const url = buildShareUrl(shareable);
    // ~12KB is the largest URL most chat apps reliably preserve in copy/paste.
    if (url.length > 12000) {
      const proceed = window.confirm(
        `This share link is about ${Math.round(url.length / 1024)} KB. Some chat apps may truncate very long URLs — continue copying?`
      );
      if (!proceed) return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareFlash(true);
      setTimeout(() => setShareFlash(false), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const handleReset = () => {
    if (!window.confirm("Clear all saved songs from this browser? This cannot be undone.")) return;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    stop();
    const lib = defaultLibrary();
    setLibrary(lib);
    setDirty(false);
  };

  // ---- import / export ----
  const downloadJSON = (obj, filename) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export format is a single shape regardless of count:
  //   { format: "troche", version: 1, songs: [...] }
  // Single-song export is just N=1.
  const EXPORT_FORMAT = "troche";
  const EXPORT_VERSION = 1;

  const exportSong = () => {
    if (!activeSong) return;
    const safe = activeSong.name.replace(/[^\w\-]+/g, "_");
    downloadJSON(
      { format: EXPORT_FORMAT, version: EXPORT_VERSION, songs: [activeSong] },
      `${safe}.troche.json`
    );
  };

  const exportLibrary = () => {
    downloadJSON(
      { format: EXPORT_FORMAT, version: EXPORT_VERSION, songs: library.songs },
      "troche-library.json"
    );
  };

  const importSong = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed?.format !== "troche" || !Array.isArray(parsed.songs) || !parsed.songs.length) {
          throw new Error("not a troche export");
        }
        const normalized = parsed.songs.map((s) => ({
          ...defaultSong(s.name),
          ...s,
          id: uid(),
          parts: (s.parts || []).map((p) => ({ ...p, id: uid() })),
        }));
        setLibrary((lib) => ({
          songs: [...lib.songs, ...normalized],
          activeId: normalized[0].id,
        }));
        setDirty(true);
      } catch {
        alert("Could not parse that file — expected a troche export (*.troche.json).");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // auto-scroll active part into view
  useEffect(() => {
    if (playing && activePartId && partRefs.current[activePartId]) {
      partRefs.current[activePartId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activePartId, playing]);

  // Spacebar = play/stop. Skip when the user is typing in a text field so
  // space stays usable as a literal space.
  const togglePlayRef = useRef(togglePlay);
  useEffect(() => { togglePlayRef.current = togglePlay; });
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      // Buttons natively trigger on space — skip so we don't double-fire when a
      // button has focus.
      if (tag === "button") return;
      e.preventDefault();
      togglePlayRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || !activeSong) {
    return (
      <div style={styles.loading}>
        <Music size={28} style={{ opacity: 0.4 }} />
      </div>
    );
  }

  const totalMeasures = activeSong.parts.reduce((s, p) => s + p.measures, 0);
  const totalSeconds = totalBeats * secPerBeat;

  return (
    <div style={styles.root}>
      <style>{css}</style>

      <div style={styles.stickyTop}>
        <Header
          library={library}
          activeSong={activeSong}
          playing={playing}
          dirty={dirty}
          saving={saving}
          savedFlash={savedFlash}
          fileInputRef={fileInputRef}
          onSwitch={switchSong}
          onNew={newSong}
          onDelete={deleteSong}
          onExportLibrary={exportLibrary}
          onExportSong={exportSong}
          onImport={importSong}
          onSave={handleSave}
          onReset={handleReset}
          onShare={handleShare}
          shareFlash={shareFlash}
          setField={setField}
          updateSong={updateSong}
        />

        <Transport
          playing={playing}
          togglePlay={togglePlay}
          metronome={metronome}
          setMetronome={setMetronome}
          inCountIn={inCountIn}
          activePartId={activePartId}
          curMeasure={curMeasure}
          curBeat={curBeat}
          ciBeat={ciBeat}
          totalBeats={totalBeats}
          totalMeasures={totalMeasures}
          totalSeconds={totalSeconds}
          countInActive={countInActive}
          countInBars={activeSong.countInBars}
        />
      </div>

      <div style={styles.sheet}>
        {activeSong.parts.map((part, i) => (
          <PartBlock
            key={part.id}
            ref={(el) => (partRefs.current[part.id] = el)}
            part={part}
            index={i}
            song={activeSong}
            active={part.id === activePartId}
            progress={partProgress[part.id] || 0}
            playing={playing}
            autoFocusName={part.id === focusPartId}
            onAutoFocused={() => setFocusPartId(null)}
            onUpdate={(patch) => updatePart(part.id, patch)}
            onRemove={() => removePart(part.id)}
            onDuplicate={() => duplicatePart(part.id)}
            onMove={movePart}
          />
        ))}

        {!playing && (
          <button className="sa-add" onClick={addPart}>
            <Plus size={18} /> Add part
          </button>
        )}
      </div>

      {undo && (
        <div className="sa-toast">
          <span>Removed <b>{undo.part.name}</b></span>
          <button className="sa-toast-btn" onClick={restorePart}>
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      )}

      {songUndo && (
        <div className="sa-toast" style={{ bottom: undo ? 80 : 24 }}>
          <span>Removed song <b>{songUndo.song.name}</b></span>
          <button className="sa-toast-btn" onClick={restoreSong}>
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      )}

      <footer className="sa-footer">
        <span>made with <span className="heart" aria-hidden="true">❤</span> and lozenger</span>
      </footer>
    </div>
  );
}
