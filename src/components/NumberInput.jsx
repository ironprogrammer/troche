import { useEffect, useState } from "react";

// Number input that lets you type freely, then clamps on blur / Enter.
// (The earlier on-every-keystroke clamp turned "8" → 20 before you could type "80".)
export function NumberInput({ value, min, max, onCommit, className, disabled, ...rest }) {
  const [draft, setDraft] = useState(String(value));

  // Stay in sync when value changes from outside (song switch, etc.) and we're not actively editing.
  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      {...rest}
      type="number"
      className={className}
      disabled={disabled}
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        else if (e.key === "Escape") {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
      onFocus={(e) => {
        // Defer past the mousedown→mouseup that would otherwise place a caret
        // and undo the selection.
        const t = e.target;
        requestAnimationFrame(() => { try { t.select(); } catch {} });
      }}
    />
  );
}
