import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Download } from "lucide-react";

export function SongSwitcher({ library, onSwitch, onNew, onDelete, onExportLibrary }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = library.songs.find((s) => s.id === library.activeId);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="sa-switcher" onClick={() => setOpen((o) => !o)}>
        <span className="title">{active?.name}</span>
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="sa-menu">
          {library.songs.map((s) => (
            <div
              key={s.id}
              className={`sa-menu-item ${s.id === library.activeId ? "on" : ""}`}
              onClick={() => { onSwitch(s.id); setOpen(false); }}
            >
              <span className="nm">{s.name}</span>
              {library.songs.length > 1 && (
                <button
                  className="sa-menu-del"
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  title="Delete song"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <div className="sa-menu-sep" />
          <div className="sa-menu-item add" onClick={() => { onNew(); setOpen(false); }}>
            <Plus size={14} /> New song
          </div>
          <div className="sa-menu-item" onClick={() => { onExportLibrary(); setOpen(false); }}>
            <Download size={14} /> Export all songs
          </div>
        </div>
      )}
    </div>
  );
}
