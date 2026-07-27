import { TriangleAlert, ArrowDownToLine } from "lucide-react";

// Sits under the header in WP mode and reports what came in from another
// machine.
//
// Two very different messages share the strip. The pulled-songs line is
// informational and disappears on its own — those songs were adopted with no
// decision to make. The flags are blocking: each names a song whose saves are
// held until the user picks a side, so each carries its own two buttons rather
// than one library-wide "reload", which would throw away local edits.
export function SyncNotice({
  flags,
  pulled,
  onKeepMine,
  onUseTheirs,
  onKeepDeleted,
  onDiscardDeleted,
}) {
  if (!flags.length && !pulled) return null;

  return (
    <div className="sa-sync">
      {!!pulled && !flags.length && (
        <div className="sa-sync-row info">
          <ArrowDownToLine size={15} />
          <span className="sa-sync-text">
            Updated {pulled} song{pulled === 1 ? "" : "s"} from another device.
          </span>
        </div>
      )}

      {flags.map((flag) => (
        <div className="sa-sync-row" key={flag.wpId}>
          <TriangleAlert size={15} />
          <span className="sa-sync-text">
            <strong>{flag.name || "Untitled"}</strong>{" "}
            {flag.kind === "orphan"
              ? "was deleted on another device, but you've edited it here."
              : "was also edited on another device."}
          </span>
          {flag.kind === "orphan" ? (
            <>
              <button className="sa-btn ghost" onClick={() => onKeepDeleted(flag)}>
                Keep mine
              </button>
              <button className="sa-btn ghost" onClick={() => onDiscardDeleted(flag)}>
                Delete here too
              </button>
            </>
          ) : (
            <>
              <button className="sa-btn ghost" onClick={() => onKeepMine(flag)}>
                Keep mine
              </button>
              <button className="sa-btn ghost" onClick={() => onUseTheirs(flag)}>
                Use theirs
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
