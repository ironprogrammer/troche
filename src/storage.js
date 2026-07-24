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

function songContent(song) {
  const { wpId, ...rest } = song;
  return stableStringify(rest);
}

function wpUrl(path) {
  // rest_url() yields either ".../wp-json/troche/v1" or "...?rest_route=/troche/v1";
  // appending the path extends the route correctly in both permalink modes.
  return wpConfig.restUrl + path;
}

async function wpFetch(path, method, body, keepalive) {
  const res = await fetch(wpUrl(path), {
    method,
    credentials: "same-origin",
    keepalive: !!keepalive,
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": wpConfig.nonce,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res;
}

// Thrown to unwind a save when the session/nonce is no longer valid.
class AuthError extends Error {}

async function loadFromWp() {
  const res = await wpFetch("/library", "GET");
  if (res.status === 401 || res.status === 403) throw new AuthError();
  if (!res.ok) throw new Error("load failed: " + res.status);
  const data = await res.json();
  const songs = Array.isArray(data?.songs) ? data.songs : [];

  // Rebuild the server snapshot (keyed by wpId) from what we just fetched.
  serverSnapshot = new Map();
  createdIds = new Map();
  for (const s of songs) {
    if (s && typeof s.wpId === "number") serverSnapshot.set(s.wpId, songContent(s));
  }
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
    const payload = (({ wpId: _drop, ...rest }) => rest)(song);
    // A song's handle is its wpId, or one assigned to it earlier this session.
    const wpId = song.wpId ?? createdIds.get(song.id) ?? null;

    if (wpId) {
      seenWpIds.add(wpId);
      if (serverSnapshot.get(wpId) !== content) {
        const res = await wpFetch("/songs/" + wpId, "PUT", payload, keepalive);
        if (res.status === 401 || res.status === 403) throw new AuthError();
        if (!res.ok) throw new Error("update failed: " + res.status);
        serverSnapshot.set(wpId, content);
      }
    } else {
      const res = await wpFetch("/songs", "POST", payload, keepalive);
      if (res.status === 401 || res.status === 403) throw new AuthError();
      if (!res.ok) throw new Error("create failed: " + res.status);
      const created = await res.json();
      const newId = created?.wpId;
      if (newId) {
        assignedIds[song.id] = newId;
        createdIds.set(song.id, newId);
        serverSnapshot.set(newId, content);
        seenWpIds.add(newId);
      }
    }
  }

  // Any post in the snapshot no longer present in the library was deleted → trash.
  for (const wpId of Array.from(serverSnapshot.keys())) {
    if (seenWpIds.has(wpId)) continue;
    const res = await wpFetch("/songs/" + wpId, "DELETE", undefined, keepalive);
    if (res.status === 401 || res.status === 403) throw new AuthError();
    // A 404 (already gone) is fine; only hard-fail on other errors.
    if (!res.ok && res.status !== 404) throw new Error("delete failed: " + res.status);
    serverSnapshot.delete(wpId);
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

// Persist the library.
//   Local mode:  writes the whole blob. -> { ok }
//   WP mode:     mirrors to the buffer, then diffs and saves per-song.
//                -> { ok, offline, authExpired, readOnly, assignedIds }
// Saves are serialized (see `chain`) so overlapping calls can't double-create.
let chain = Promise.resolve();

export function saveLibrary(library, opts = {}) {
  const run = () => doSave(library, opts);
  const result = chain.then(run, run);
  chain = result.catch(() => {});
  return result;
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
    // Network error or server hiccup — changes are safe in the buffer.
    return { ok: false, offline: true };
  }
}

// Clear the local buffer (standalone "Reset"). No effect on server data.
export function clearBuffer() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}
