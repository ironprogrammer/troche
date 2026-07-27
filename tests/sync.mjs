// Unit tests for the WP sync/reconcile path in src/storage.js — the logic that
// decides, when the same library is open on two machines, what can be adopted
// silently and what has to be handed to the user.
//
// Runs against a fake in-process WordPress: a Map of song posts behind the same
// four REST routes the plugin serves. No browser, no WordPress.
//   node tests/sync.mjs     # or: npm run test:sync

let pass = 0;
let fail = 0;
const check = (label, cond) => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + ": " + label);
};

// ---- fake server ----

// Mirrors class-store.php: songs live keyed by post id, tokens are derived from
// stored content (so an identical re-save doesn't move one), and wpId/wpToken
// are stripped on the way in and decorated on the way out.
function makeServer(initial = {}) {
  const posts = new Map(Object.entries(initial).map(([k, v]) => [Number(k), v]));
  let nextId = 200;
  const token = (song) => "t:" + JSON.stringify(song);
  const strip = ({ wpId, wpToken, ...rest }) => rest;

  const server = {
    posts,
    calls: [],
    // Direct mutation, standing in for "the other laptop saved".
    edit(wpId, patch) {
      posts.set(wpId, { ...posts.get(wpId), ...patch });
    },
    add(song) {
      const id = ++nextId;
      posts.set(id, song);
      return id;
    },
    trash(wpId) {
      posts.delete(wpId);
    },
    decorate(wpId) {
      const song = posts.get(wpId);
      return { ...song, wpId, wpToken: token(song) };
    },
  };

  globalThis.fetch = async (url, opts = {}) => {
    const route = String(url).replace("http://test/troche/v1", "");
    const method = opts.method || "GET";
    server.calls.push(method + " " + route);
    const body = opts.body ? JSON.parse(opts.body) : null;
    const ok = (status, data) => ({ ok: true, status, json: async () => data });

    if (route === "/library") {
      return ok(200, {
        format: "troche",
        version: 1,
        songs: [...posts.keys()].sort((a, b) => a - b).map((id) => server.decorate(id)),
      });
    }
    if (route === "/library/state") {
      const tokens = {};
      for (const [id, song] of posts) tokens[String(id)] = token(song);
      return ok(200, { tokens });
    }
    if (route === "/songs" && method === "POST") {
      return ok(201, server.decorate(server.add(strip(body))));
    }
    const match = route.match(/^\/songs\/(\d+)$/);
    if (match) {
      const wpId = Number(match[1]);
      if (!posts.has(wpId)) return { ok: false, status: 404, json: async () => ({}) };
      if (method === "DELETE") {
        posts.delete(wpId);
        return ok(200, { deleted: true, wpId });
      }
      posts.set(wpId, strip(body));
      return ok(200, server.decorate(wpId));
    }
    throw new Error("unexpected request: " + method + " " + route);
  };

  return server;
}

// storage.js reads window.trocheWP and computes wpMode at import time, and keeps
// its snapshot maps in module scope — so each scenario gets a fresh instance.
let instance = 0;
async function freshStorage() {
  globalThis.window = { trocheWP: { restUrl: "http://test/troche/v1", nonce: "n", canEdit: true } };
  return import("../src/storage.js?case=" + ++instance);
}

const song = (id, name, bpm = 120) => ({ id, name, bpm, parts: [] });
const names = (lib) => lib.songs.map((s) => s.name);

// ---- 1. nothing moved upstream ----
{
  const server = makeServer({ 1: song("a", "Alpha"), 2: song("b", "Beta") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.calls.length = 0;
  const result = await storage.syncUpstream(lib);
  check("quiet server reports nothing to reconcile", result === null);
  check(
    "quiet sync costs one token request, no content",
    server.calls.length === 1 && server.calls[0] === "GET /library/state"
  );
}

// ---- 2. changed upstream, untouched here -> adopted silently ----
{
  const server = makeServer({ 1: song("a", "Alpha"), 2: song("b", "Beta") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.edit(2, { bpm: 155 });
  const result = await storage.syncUpstream(lib);
  check("upstream-only edit reconciles", result !== null && !result.conflicts.length);
  check("upstream-only edit counts as pulled", result.pulled === 1);
  check("upstream-only edit adopts the server value", result.library.songs[1].bpm === 155);
  check("upstream-only edit leaves song order alone", String(names(result.library)) === "Alpha,Beta");
}

// ---- 3. changed in both places -> conflict, local kept, writes held ----
{
  const server = makeServer({ 1: song("a", "Alpha"), 2: song("b", "Beta") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.edit(2, { bpm: 155 }); // the other laptop
  const local = { ...lib, songs: [lib.songs[0], { ...lib.songs[1], bpm: 90 }] }; // this one

  const result = await storage.syncUpstream(local);
  check("same-song edit is flagged", result.conflicts.length === 1);
  check("conflict names the song", result.conflicts[0].name === "Beta");
  check("conflict carries the other copy", result.conflicts[0].theirs.bpm === 155);
  check("conflict keeps the local copy in the library", result.library.songs[1].bpm === 90);
  check("conflict is not counted as a silent pull", result.pulled === 0);

  server.calls.length = 0;
  const saved = await storage.saveLibrary(result.library);
  check("save succeeds around a conflict", saved.ok === true);
  check("held song is not written", !server.calls.some((c) => c.startsWith("PUT")));
  check("held song is not trashed either", !server.calls.some((c) => c.startsWith("DELETE")));
  check("other laptop's copy survives", server.posts.get(2).bpm === 155);

  // Resolving to "keep mine" releases the hold; the next save overwrites.
  storage.releaseHold(result.conflicts[0].wpId);
  await storage.saveLibrary(result.library);
  check("released song is written on the next save", server.posts.get(2).bpm === 90);
}

// ---- 4. edits to other songs still save while one is conflicted ----
{
  const server = makeServer({ 1: song("a", "Alpha"), 2: song("b", "Beta") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.edit(2, { bpm: 155 });
  const local = {
    ...lib,
    songs: [{ ...lib.songs[0], bpm: 70 }, { ...lib.songs[1], bpm: 90 }],
  };

  const result = await storage.syncUpstream(local);
  await storage.saveLibrary(result.library);
  check("a conflict on one song doesn't stall the others", server.posts.get(1).bpm === 70);
}

// ---- 5. added upstream -> pulled in ----
{
  const server = makeServer({ 1: song("a", "Alpha") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.add(song("c", "Gamma"));
  const result = await storage.syncUpstream(lib);
  check("song added elsewhere is pulled in", String(names(result.library)) === "Alpha,Gamma");
  check("added song counts as pulled", result.pulled === 1);
}

// ---- 6. trashed upstream, untouched here -> dropped ----
{
  const server = makeServer({ 1: song("a", "Alpha"), 2: song("b", "Beta") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.trash(2);
  const result = await storage.syncUpstream(lib);
  check("song trashed elsewhere is dropped here", String(names(result.library)) === "Alpha");
  check("dropped song raises no flag", result.orphans.length === 0 && result.conflicts.length === 0);
}

// ---- 7. trashed upstream, edited here -> orphan, writes held ----
{
  const server = makeServer({ 1: song("a", "Alpha"), 2: song("b", "Beta") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.trash(2);
  const local = { ...lib, songs: [lib.songs[0], { ...lib.songs[1], bpm: 90 }] };

  const result = await storage.syncUpstream(local);
  check("deleted-but-edited song is flagged as an orphan", result.orphans.length === 1);
  check("orphan keeps the local copy", result.library.songs.length === 2);

  // An orphan's PUT would 404 — the hold has to stop it reaching the server.
  const saved = await storage.saveLibrary(result.library);
  check("orphan doesn't fail the save with a 404", saved.ok === true);

  // "Keep mine" drops the dead handle so the song is re-created, not PUT.
  const orphan = result.orphans[0];
  storage.forgetHandle(orphan.id, orphan.wpId);
  const kept = {
    ...result.library,
    songs: result.library.songs.map(({ wpId, wpToken, ...rest }) =>
      rest.id === orphan.id ? rest : { ...rest, wpId, wpToken }
    ),
  };
  await storage.saveLibrary(kept);
  check("kept orphan is re-created as a new song", server.posts.size === 2);
}

// ---- 8. a song created here but never saved survives a sync ----
{
  const server = makeServer({ 1: song("a", "Alpha") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  server.edit(1, { bpm: 155 });
  const local = { ...lib, songs: [...lib.songs, song("new", "Draft")] };

  const result = await storage.syncUpstream(local);
  check("unsaved local song survives a sync", String(names(result.library)) === "Alpha,Draft");
  check("unsaved local song isn't duplicated", result.library.songs.length === 2);
}

// ---- 9. a song created this session isn't duplicated by a sync ----
{
  const server = makeServer({ 1: song("a", "Alpha") });
  const storage = await freshStorage();
  const lib = await storage.loadLibrary();

  // Save a new song, but don't adopt the returned wpId into the library —
  // exactly the window where app state lags the server handle.
  const local = { ...lib, songs: [...lib.songs, song("new", "Draft")] };
  const saved = await storage.saveLibrary(local);
  check("new song is created on save", saved.ok && Object.keys(saved.assignedIds).length === 1);

  const result = await storage.syncUpstream(local);
  check(
    "sync before the handle is adopted doesn't duplicate the song",
    result === null || result.library.songs.length === 2
  );
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
