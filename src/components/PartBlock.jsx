import React, { useEffect, useRef, useState } from "react";
import { GripVertical, Link2, Settings2, Trash2, Copy, X } from "lucide-react";
import { PALETTE, TIME_SIGS } from "../constants.js";
import { partSig, sigKey } from "../utils.js";
import { NumberInput } from "./NumberInput.jsx";

export const PartBlock = React.forwardRef(function PartBlock(
  { part, index, song, active, progress, playing, autoFocusName, onAutoFocused, onUpdate, onRemove, onDuplicate, onMove },
  ref
) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const blockRef = useRef(null);
  const nameRef = useRef(null);

  const eff = partSig(part, song);
  const hasOverride = part.sigTop != null && part.sigBottom != null;
  const differs = eff.top !== song.timeSigTop || eff.bottom !== song.timeSigBottom;

  const setRefs = (el) => {
    blockRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
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
        <div
          className={`sa-grip ${playing ? "disabled" : ""}`}
          title={playing ? "Stop playback to reorder" : "Drag to reorder"}
          onPointerDown={playing ? undefined : onGripPointerDown}
        >
          <GripVertical size={18} />
        </div>

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
          <input
            ref={nameRef}
            className="sa-partname"
            value={part.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onFocus={(e) => {
              // Defer past the mousedown→mouseup that would otherwise place a
              // caret and undo the selection.
              const t = e.target;
              requestAnimationFrame(() => { try { t.select(); } catch {} });
            }}
          />
          <div className="sa-block-sub">
            {differs && (
              <span className="sa-sigbadge" title="Part time signature">
                {eff.top}/{eff.bottom}
              </span>
            )}
            <input
              className="sa-cue"
              placeholder="cue / note…"
              value={part.cue || ""}
              onChange={(e) => onUpdate({ cue: e.target.value })}
            />
            {part.sample && (
              <a className="sa-samplelink" href={part.sample} target="_blank" rel="noreferrer">
                <Link2 size={12} /> sample
              </a>
            )}
          </div>
        </div>

        <div className="sa-block-tools">
          <button
            className={`sa-config ${editing ? "open" : ""}`}
            onClick={() => setEditing((v) => !v)}
            title="Part settings"
          >
            <span className="sa-swatch" style={{ background: part.color }} />
            <Settings2 size={15} />
          </button>
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
