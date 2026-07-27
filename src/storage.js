import { STORAGE_KEY } from "./constants.js";

// Persistence adapter.
//
// Two homes, one interface:
//  - Standalone (GitHub Pages): localStorage only. Unchanged from before.
//  - WordPress: when the plugin shell prints `window.trocheWP`, songs are
//    saved to the site (per-song REST) with localStorage kept as an offline
//    working buffer.
//
// The app calls loadLibrary()/saveLibrary(library) without caring which home
// it's in; the branch happens here.

const wpConfig = typeof window !== "undefined" ? window.trocheWP || null : null;
export const wpMode = !!(wpConfig && wpConfig.restUrl);
export const canEdit = wpMode ? !!wpConfig.canEdit : true;
export const loginUrl = wpConfig ? wpConfig.loginUrl || null : null;

// ---- localStorage (working copy / offline buffer) ----

const memStore = {};

function hasLocalStorage() {
  try {
    const k = "__troche_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const USE_LOCAL = typeof window !== "undefined" && hasLocalStorage();

function get(key) {
  if (USE_LOCAL) return window.localStorage.getItem(key);
  return memStore[key] ?? null;
}

function set(key, value) {
  if (USE_LOCAL) {
    window.localStorage.setItem(key, value);
    return;
  }
  memStore[key] = value;
}

function readBuffer() {
  try {
    const value = get(STORAGE_KEY);
    if (value) return JSON.parse(value);
  } catch {
    // no saved data, or parse failed
  }
  return null;
}

function writeBuffer(lib) {
  try {
    set(STORAGE_KEY, JSON.stringify(lib));
    return true;
  } catch (e) {
    console.error("buffer write failed", e);
    return false;
  }
}

// ---- WP sync helpers ----

// Snapshot of what the server currently holds, keyed by wpId (the durable
// server handle): wpId -> content, where `content` is a stable serialization
// used to detect edits. Keying by wpId rather than the song id means repairing
// a song's id (dedupe) can never confuse the diff into trashing its post.
// Populated on load and after each successful save so idle tabs and unchanged
// songs never issue writes.
let serverSnapshot = new Map();

// The server's own version token per song (wpId -> token), captured alongside
// serverSnapshot. The server mints these from the stored JSON; the client only
// ever compares them for equality, so there's no canonicalization to keep in
// step across the two languages. Diffing these against /library/state is how we
// notice another tab has written since we last looked.
let serverTokens = new Map();

// Songs whose writes are suppressed because reconciling them needs the user:
// edited here *and* upstream, or edited here and trashed upstream. Held by
// wpId. Everything else in the library keeps saving normally — a conflict on
// one song is no reason to stall the rest.
let heldWpIds = new Set();

// Handles assigned to songs created earlier this session, keyed by song id, so
// a re-save that fires before the app has adopted the new wpId into state can't
// create a duplicate. Reset on every load.
let createdIds = new Map();

// Deterministic serialization (sorted keys) so key-order churn in React state
// doesn't read as a change. Excludes wpId, which is a transport handle.
function stableStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stableStringify(v[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v);
}

// wpId and wpToken are transport handles, not song data — excluded so neither
// one can read as an edit.
function songContent(song) {
  const { wpId, wpToken, ...rest } = song;
  return stableStringify(rest);
}

function songPayload(song) {
  const { wpId, wpToken, ...rest } = song;
  return rest;
}

// A song's server handle: its adopted wpId, or one assigned to it earlier this
// session but not yet reflected in app state.
function handleOf(song) {
  return song.wpId ?? createdIds.get(song.id) ?? null;
}

function wpUrl(path) {
  // rest_url() yields either ".../wp-json/troche/v1" or "...?rest_route=/troche/v1";
  // appending the path extends the route correctly in both permalink modes.
  return wpConfig.restUrl + path;
}

async function wpFetch(path, method, body, keepalive, expectToken) {
  const res = await fetch(wpUrl(path), {
    method,
    credentials: "same-origin",
    keepalive: !!keepalive,
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": wpConfig.nonce,
      // Present only when we know what the server held, so the write can be
      // refused if that's no longer true. Omitted (unconditional write) when we
      // have no token to offer — an older plugin, or a response we couldn't
      // parse — which is exactly the behaviour this had before.
      ...(expectToken ? { "X-Troche-Expect-Token": expectToken } : null),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res;
}

// Read a response body without letting a parse failure unwind a write that
// already landed. A missing token just means the next probe sees a change and
// re-pulls the song, which is harmless — losing the save is not.
async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Thrown to unwind a save when the session/nonce is no longer valid.
class AuthError extends Error {}

// Thrown to abort the destructive phase of a save when the client's view of the
// library looks stale — an empty client against a non-empty server, or a diff
// that would trash the bulk of it. Recoverable: the caller surfaces a "reload"
// state and a fresh load rebuilds the snapshot.
class StaleSnapshotError extends Error {}

// Thrown when an update targets a song the server no longer has — trashed on
// another machine since our last sync. Distinct from a network failure, which
// is what it used to be reported as: a sync reclassifies the song as an orphan
// and asks whether to keep or discard it.
class MissingSongError extends Error {}

// Thrown when the server refuses an update because the song moved under us
// (409). Syncing before a save narrows that window but can't close it — the
// check and the write aren't one operation. Handled exactly like a 404: unwind,
// reconcile, and let the song be flagged if it's a genuine conflict.
class StaleTokenError extends Error {}

async function fetchLibrary() {
  const res = await wpFetch("/library", "GET");
  if (res.status === 401 || res.status === 403) throw new AuthError();
  if (!res.ok) throw new Error("load failed: " + res.status);
  const data = await res.json();
  return Array.isArray(data?.songs) ? data.songs : [];
}

// The cheap probe: version tokens only, no song content.
async function fetchState() {
  const res = await wpFetch("/library/state", "GET");
  if (res.status === 401 || res.status === 403) throw new AuthError();
  if (!res.ok) throw new Error("state failed: " + res.status);
  const data = await res.json();
  const tokens = data?.tokens;
  return tokens && typeof tokens === "object" ? tokens : {};
}

// Record "what the server holds" from a freshly fetched library. Builds new
// Maps rather than mutating, so a caller can hold the previous ones as the
// before-picture of a reconcile.
function recordServerState(songs) {
  serverSnapshot = new Map();
  serverTokens = new Map();
  for (const s of songs) {
    if (s && typeof s.wpId === "number") {
      serverSnapshot.set(s.wpId, songContent(s));
      serverTokens.set(s.wpId, s.wpToken ?? null);
    }
  }
}

// True if the token map from /library/state disagrees with what we last saw —
// a song added, removed, or rewritten by someone else.
function upstreamMoved(tokens) {
  const keys = Object.keys(tokens);
  if (keys.length !== serverTokens.size) return true;
  return keys.some((k) => serverTokens.get(Number(k)) !== tokens[k]);
}

async function loadFromWp() {
  const songs = await fetchLibrary();
  recordServerState(songs);
  // A full load replaces app state wholesale, so session-local bookkeeping goes
  // with it. (syncUpstream deliberately keeps both — it reconciles into the
  // library the user is already working in.)
  createdIds = new Map();
  heldWpIds = new Set();
  return songs;
}

// The diff-based per-song save. Creates songs without a handle, updates changed
// ones, trashes songs that vanished. "Last write wins"; revisions are the net.
// Matching is by wpId, so it survives id repairs done by normalizeLibrary().
async function doWpSave(library, keepalive) {
  const songs = library.songs || [];
  const seenWpIds = new Set();
  const assignedIds = {}; // song id -> new wpId, so the app can adopt handles

  for (const song of songs) {
    const content = songContent(song);
    const payload = songPayload(song);
    const wpId = handleOf(song);

    if (wpId) {
      seenWpIds.add(wpId);
      // Held songs are awaiting a user decision; writing one would be the
      // clobber the hold exists to prevent. Counted as seen above so the trash
      // diff below doesn't mistake the skip for a deletion.
      if (heldWpIds.has(wpId)) continue;
      if (serverSnapshot.get(wpId) !== content) {
        const res = await wpFetch(
          "/songs/" + wpId,
          "PUT",
          payload,
          keepalive,
          serverTokens.get(wpId)
        );
        if (res.status === 401 || res.status === 403) throw new AuthError();
        if (res.status === 404) throw new MissingSongError();
        if (res.status === 409) throw new StaleTokenError();
        if (!res.ok) throw new Error("update failed: " + res.status);
        serverSnapshot.set(wpId, content);
        serverTokens.set(wpId, (await readJson(res))?.wpToken ?? null);
      }
    } else {
      const res = await wpFetch("/songs", "POST", payload, keepalive);
      if (res.status === 401 || res.status === 403) throw new AuthError();
      if (!res.ok) throw new Error("create failed: " + res.status);
      const created = await readJson(res);
      const newId = created?.wpId;
      if (newId) {
        assignedIds[song.id] = newId;
        createdIds.set(song.id, newId);
        serverSnapshot.set(newId, content);
        serverTokens.set(newId, created?.wpToken ?? null);
        seenWpIds.add(newId);
      }
    }
  }

  // Tripwire before the destructive phase. A stale or reset client can present
  // a library that would trash most of the server's songs in one diff; refuse
  // to and ask the user to reload instead. Creates/updates above have already
  // landed (they're additive and safe) — only the deletes are held back.
  // Everything is trash-not-delete, but this avoids relying on the 30-day trash
  // window to notice. Trips when the client is empty against a non-empty server,
  // or when a save would trash a majority of a snapshot of at least three songs.
  const toTrash = Array.from(serverSnapshot.keys()).filter((wpId) => !seenWpIds.has(wpId));
  const emptyClientWipe = songs.length === 0 && serverSnapshot.size > 0;
  const bulkTrash = toTrash.length >= 3 && toTrash.length > serverSnapshot.size / 2;
  if (emptyClientWipe || bulkTrash) {
    throw new StaleSnapshotError();
  }

  // Any post in the snapshot no longer present in the library was deleted → trash.
  for (const wpId of toTrash) {
    const res = await wpFetch("/songs/" + wpId, "DELETE", undefined, keepalive);
    if (res.status === 401 || res.status === 403) throw new AuthError();
    // A 404 (already gone) is fine; only hard-fail on other errors.
    if (!res.ok && res.status !== 404) throw new Error("delete failed: " + res.status);
    serverSnapshot.delete(wpId);
    serverTokens.delete(wpId);
  }

  return assignedIds;
}

// ---- public API ----

// Returns the saved library, or null when there's nothing yet (caller decides
// whether to seed). In WP mode this is the server library, with localStorage as
// the offline fallback.
export async function loadLibrary() {
  if (wpMode) {
    try {
      const songs = await loadFromWp();
      const buffer = readBuffer();
      const activeId =
        buffer && songs.some((s) => s.id === buffer.activeId)
          ? buffer.activeId
          : songs[0]?.id ?? null;
      const lib = { songs, activeId };
      writeBuffer(lib); // keep the offline copy fresh
      return lib;
    } catch {
      // Offline or session gone — fall back to the last local buffer.
      return readBuffer();
    }
  }
  return readBuffer();
}

// Server round-trips run one at a time: they all read and rewrite the snapshot
// maps, so overlapping calls could double-create songs or reconcile against a
// half-updated picture.
let chain = Promise.resolve();

function serialize(fn) {
  const result = chain.then(fn, fn);
  chain = result.catch(() => {});
  return result;
}

// Persist the library.
//   Local mode:  writes the whole blob. -> { ok }
//   WP mode:     mirrors to the buffer, then diffs and saves per-song.
//                -> { ok, offline, authExpired, readOnly, assignedIds }
export function saveLibrary(library, opts = {}) {
  return serialize(() => doSave(library, opts));
}

async function doSave(library, opts) {
  if (!wpMode) {
    return { ok: writeBuffer(library) };
  }

  // Always keep the offline buffer current, even for viewers.
  writeBuffer(library);

  if (!canEdit) {
    return { ok: true, readOnly: true };
  }

  try {
    const assignedIds = await doWpSave(library, opts.keepalive);
    return { ok: true, assignedIds };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, authExpired: true };
    }
    if (e instanceof StaleSnapshotError) {
      return { ok: false, stale: true };
    }
    // Trashed elsewhere, or rewritten elsewhere between our sync and our write.
    // Either way the library moved under us: reconcile and let that classify it.
    if (e instanceof MissingSongError || e instanceof StaleTokenError) {
      return { ok: false, diverged: true };
    }
    // Network error or server hiccup — changes are safe in the buffer.
    return { ok: false, offline: true };
  }
}

// Reconcile this tab against the server, for the case where the same library is
// open on another machine.
//
// Cheap path first: one token request, and if nothing moved upstream we're done
// without transferring a single song. When something did move, the per-song
// diff means most of it still isn't a conflict — a song someone else edited
// that this tab hasn't touched can simply be adopted, and one added elsewhere
// can simply be pulled in. Only a song edited in *both* places, or edited here
// and trashed there, needs the user; those get held back from saving until
// they're resolved.
//
// Returns null when there's nothing to report (including offline — a failed
// probe just means we reconcile later; edits stay safe in the buffer).
//   -> { library, pulled, conflicts, orphans } | { authExpired: true } | null
export function syncUpstream(library) {
  if (!wpMode || !library) return Promise.resolve(null);
  return serialize(() => doSync(library));
}

async function doSync(library) {
  let prevSnapshot;
  let prevTokens;
  let serverSongs;

  try {
    if (!upstreamMoved(await fetchState())) return null;
    // Hold the before-picture: "did this tab edit that song?" has to be asked
    // against what the server held at our last sync, not what it holds now.
    prevSnapshot = serverSnapshot;
    prevTokens = serverTokens;
    serverSongs = await fetchLibrary();
    recordServerState(serverSongs);
  } catch (e) {
    if (e instanceof AuthError) return { authExpired: true };
    return null;
  }

  const untouchedHere = (song, wpId) => prevSnapshot.get(wpId) === songContent(song);

  const unclaimed = new Map(
    serverSongs.filter((s) => typeof s.wpId === "number").map((s) => [s.wpId, s])
  );
  const merged = [];
  const conflicts = [];
  const orphans = [];
  let pulled = 0;

  // Walk the local library first so this tab's song order survives the merge;
  // anything genuinely new to us lands at the end.
  for (const local of library.songs) {
    const wpId = handleOf(local);
    if (wpId == null) {
      merged.push(local); // created here, never saved — nothing to reconcile
      continue;
    }

    const server = unclaimed.get(wpId);

    if (!server) {
      // Trashed on the other machine.
      if (untouchedHere(local, wpId)) {
        pulled++; // drop it here too
        continue;
      }
      orphans.push({ wpId, id: local.id, name: local.name });
      heldWpIds.add(wpId);
      merged.push(local);
      continue;
    }

    unclaimed.delete(wpId);

    if (prevTokens.get(wpId) === server.wpToken) {
      merged.push(local); // unchanged upstream — this tab's copy stands
      continue;
    }
    if (untouchedHere(local, wpId)) {
      merged.push(server); // changed upstream only — adopt it
      pulled++;
      continue;
    }

    conflicts.push({ wpId, id: local.id, name: local.name, theirs: server });
    heldWpIds.add(wpId);
    merged.push(local);
  }

  for (const server of unclaimed.values()) {
    merged.push(server); // added on the other machine
    pulled++;
  }

  if (!pulled && !conflicts.length && !orphans.length) return null;

  const activeId = merged.some((s) => s.id === library.activeId)
    ? library.activeId
    : merged[0]?.id ?? null;

  const reconciled = { ...library, songs: merged, activeId };
  // Keep the offline copy current here too, not just on load and save: a
  // reconcile can go a long time without a save behind it (nothing local was
  // dirty), and going offline in that window shouldn't roll the tab back to a
  // library the server has already moved past.
  writeBuffer(reconciled);

  return { library: reconciled, pulled, conflicts, orphans };
}

// Resolve a conflict or orphan: release the song's save hold so the next save
// acts on whatever the app settled on. Keeping the local copy makes the next
// diff overwrite theirs; taking theirs leaves nothing to write.
export function releaseHold(wpId) {
  heldWpIds.delete(wpId);
}

// Forget a song's server handle so the next save re-creates it as a fresh post.
// For an orphan the user chose to keep: its old wpId names a trashed post that
// PUT would only 404 on, and the app has stripped wpId from the song — but the
// session-local handle would still resolve it, so that has to go too.
export function forgetHandle(songId, wpId) {
  createdIds.delete(songId);
  heldWpIds.delete(wpId);
}

// Mirror the library to the offline buffer without touching the server. For the
// changes that need no save to be correct — resolving a conflict in the
// server's favour leaves local already matching it — where waiting for the next
// save would leave the buffer holding a copy the user has discarded.
export function cacheLibrary(library) {
  if (library) writeBuffer(library);
}

// Clear the local buffer (standalone "Reset"). No effect on server data.
export function clearBuffer() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}
