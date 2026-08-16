import React, { useEffect, useRef, useState } from "react";
import { GripVertical, Link2, Settings2, Trash2, Copy, X } from "lucide-react";
import { PALETTE, TIME_SIGS, CHORD_HELPERS, CUE_LANES } from "../constants.js";
import { partSig, sigKey } from "../utils.js";
import { NumberInput } from "./NumberInput.jsx";

export const PartBlock = React.forwardRef(function PartBlock(
  { part, index, song, active, progress, playing, lanes, autoFocusName, onAutoFocused, onUpdate, onRemove, onDuplicate, onMove },
  ref
) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [chordsFocused, setChordsFocused] = useState(false);
  const blockRef = useRef(null);
  const nameRef = useRef(null);
  const chordsRef = useRef(null);

  const eff = partSig(part, song);
  const hasOverride = part.sigTop != null && part.sigBottom != null;
  const differs = eff.top !== song.timeSigTop || eff.bottom !== song.timeSigBottom;

  const setRefs = (el) => {
    blockRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  // Playback collapses the editors: the settings in there can't be changed
  // mid-song anyway, and the expanded panel just pushes the parts you're
  // actually reading off the screen. The chord helper row goes with them —
  // it's only useful while you're in the field it types into.
  useEffect(() => {
    if (playing) {
      setEditing(false);
      setChordsFocused(false);
    }
  }, [playing]);

  // Insert a symbol at the caret and hand focus straight back, so tapping a
  // helper never breaks the flow of typing a progression.
  const insertChord = (ch) => {
    const el = chordsRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + ch + el.value.slice(end);
    onUpdate({ chords: next });
    requestAnimationFrame(() => {
      try {
        el.focus();
        el.setSelectionRange(start + ch.length, start + ch.length);
      } catch {}
    });
  };

  useEffect(() => {
    if (autoFocusName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
      onAutoFocused?.();
    }
  }, [autoFocusName, onAutoFocused]);

  // ----- pointer-based drag (works for mouse + touch) -----
  // Started from the grip. We track the pointer, lift the block visually, and
  // reorder when the pointer crosses a sibling block's vertical midpoint.
  const dragState = useRef(null);

  const onGripPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    const blockEl = blockRef.current;
    if (!blockEl) return;
    e.preventDefault();
    dragState.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      curIndex: index,
    };
    try { e.target.setPointerCapture(e.pointerId); } catch {}
    setDragging(true);
    window.addEventListener("pointermove", onGripPointerMove);
    window.addEventListener("pointerup", onGripPointerUp);
    window.addEventListener("pointercancel", onGripPointerUp);
  };

  const onGripPointerMove = (e) => {
    const st = dragState.current;
    if (!st || !blockRef.current) return;
    blockRef.current.style.transform = `translateY(${e.clientY - st.startY}px)`;

    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const overEl = els.find(
      (el) => el.classList?.contains("sa-block") && el !== blockRef.current
    );
    if (overEl && overEl.dataset.index != null) {
      const overIndex = Number(overEl.dataset.index);
      const r = overEl.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const goingDown = overIndex > st.curIndex;
      if ((goingDown && e.clientY > mid) || (!goingDown && e.clientY < mid)) {
        onMove(st.curIndex, overIndex);
        st.curIndex = overIndex;
        // re-baseline so the block stays under the pointer instead of snapping away
        st.startY = e.clientY;
        blockRef.current.style.transform = "translateY(0px)";
      }
    }
  };

  const onGripPointerUp = () => {
    dragState.current = null;
    setDragging(false);
    if (blockRef.current) blockRef.current.style.transform = "";
    window.removeEventListener("pointermove", onGripPointerMove);
    window.removeEventListener("pointerup", onGripPointerUp);
    window.removeEventListener("pointercancel", onGripPointerUp);
  };

  return (
    <div
      ref={setRefs}
      data-index={index}
      className={`sa-block ${active ? "active" : ""} ${dragging ? "dragging" : ""}`}
      style={{ "--clr": part.color }}
    >
      <div
        className="sa-block-fill"
        style={{ width: playing ? `${progress * 100}%` : "0%" }}
      />

      <div className="sa-block-inner">
        <NumberInput
          className="sa-measures"
          min={1}
          max={64}
          value={part.measures}
          disabled={playing}
          onCommit={(v) => onUpdate({ measures: v })}
          title="Measures"
        />

        <div className="sa-block-main">
          <div className="sa-namerow">
            <input
              ref={nameRef}
              className="sa-partname"
              value={part.name}
              disabled={playing}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onFocus={(e) => {
                // Defer past the mousedown→mouseup that would otherwise place a
                // caret and undo the selection.
                const t = e.target;
                requestAnimationFrame(() => { try { t.select(); } catch {} });
              }}
            />
            {differs && (
              <span className="sa-sigbadge" title="Part time signature">
                {eff.top}/{eff.bottom}
              </span>
            )}
            {part.sample && (
              <a className="sa-samplelink" href={part.sample} target="_blank" rel="noreferrer">
                <Link2 size={12} /> sample
              </a>
            )}
          </div>

          {/* Chords, lyric cue, and performance direction — the three layers a
              paper chart already keeps apart. Each is hidden globally by its
              header toggle, and an empty one collapses during playback so a
              sparse part stays compact on stage. */}
          <div className="sa-lanes">
            {CUE_LANES.map(({ key, label, icon: Icon, placeholder }) => {
              if (!lanes[key]) return null;
              const value = part[key] || "";
              if (playing && !value) return null;
              const isChords = key === "chords";
              return (
                <React.Fragment key={key}>
                  <div className="sa-lane">
                    <span className="sa-lane-mark" aria-hidden="true"><Icon size={12} /></span>
                    <input
                      ref={isChords ? chordsRef : undefined}
                      className={`sa-laneinput ${key}`}
                      placeholder={placeholder}
                      aria-label={label}
                      value={value}
                      disabled={playing}
                      onChange={(e) => onUpdate({ [key]: e.target.value })}
                      onFocus={isChords ? () => setChordsFocused(true) : undefined}
                      onBlur={isChords ? () => setChordsFocused(false) : undefined}
                    />
                  </div>
                  {isChords && chordsFocused && (
                    <div className="sa-chordhelp">
                      {CHORD_HELPERS.map(({ ch, tip, cls }) => (
                        <button
                          key={ch}
                          className={`sa-chordbtn ${cls}`}
                          title={tip}
                          aria-label={`Insert ${tip.toLowerCase()}`}
                          // mousedown, not click: the button must not steal
                          // focus from the input it's typing into, and blur
                          // would close this row before click ever fired.
                          onMouseDown={(e) => { e.preventDefault(); insertChord(ch); }}
                        >
                          <span className="g">{ch}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="sa-block-tools">
          <button
            className={`sa-config ${editing ? "open" : ""}`}
            onClick={() => setEditing((v) => !v)}
            disabled={playing}
            title={playing ? "Stop playback to edit part settings" : "Part settings"}
          >
            <span className="sa-swatch" style={{ background: part.color }} />
            <Settings2 size={15} />
          </button>
        </div>

        <div
          className={`sa-grip ${playing ? "disabled" : ""}`}
          title={playing ? "Stop playback to reorder" : "Drag to reorder"}
          onPointerDown={playing ? undefined : onGripPointerDown}
        >
          <GripVertical size={18} />
        </div>
      </div>

      {editing && (
        <div className="sa-editor">
          <div className="sa-editor-row">
            <span className="sa-editor-label">Color</span>
            <div className="sa-palette">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`sa-palettebtn ${c === part.color ? "on" : ""}`}
                  style={{ background: c }}
                  onClick={() => onUpdate({ color: c })}
                />
              ))}
            </div>
          </div>
          <div className="sa-editor-row">
            <span className="sa-editor-label">Time</span>
            <select
              className="sa-input sig editor-sig"
              value={hasOverride ? sigKey(part.sigTop, part.sigBottom) : "default"}
              disabled={playing}
              onChange={(e) => {
                if (e.target.value === "default") {
                  onUpdate({ sigTop: null, sigBottom: null });
                } else {
                  const [t, b] = e.target.value.split("/").map(Number);
                  onUpdate({ sigTop: t, sigBottom: b });
                }
              }}
            >
              <option value="default">
                {song.timeSigTop}/{song.timeSigBottom} (default)
              </option>
              {TIME_SIGS
                .filter(([t, b]) => !(t === song.timeSigTop && b === song.timeSigBottom))
                .map(([t, b]) => (
                  <option key={sigKey(t, b)} value={sigKey(t, b)}>{t}/{b}</option>
                ))}
            </select>
          </div>
          <div className="sa-editor-row">
            <span className="sa-editor-label">Sample</span>
            <input
              className="sa-input sample"
              placeholder="https://… link to mp3 / wav"
              value={part.sample}
              disabled={playing}
              onChange={(e) => onUpdate({ sample: e.target.value })}
            />
          </div>
          <div className="sa-editor-foot">
            <div className="sa-editor-foot-left">
              <button className="sa-editor-del" onClick={onRemove} disabled={playing}>
                <Trash2 size={13} /> Remove
              </button>
              <button
                className="sa-editor-dup"
                onClick={() => { onDuplicate(); setEditing(false); }}
                disabled={playing}
              >
                <Copy size={13} /> Duplicate
              </button>
            </div>
            <button className="sa-editor-close" onClick={() => setEditing(false)}>
              <X size={13} /> done
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
