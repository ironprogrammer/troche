# Plan: WordPress storage for Troche song forms

**Status:** planned, not started (July 2026). Intentionally uncommitted.

## Goal

Let bandmates save/load song forms through a WP site the band already runs
instead of passing `*.troche.json` files around. Songs stay off the public web (band IP).
The existing Troche UI is the product and is kept as-is — WP provides storage
and auth, nothing more. Scope is exactly what's in this doc.

## Architecture

One codebase, one build, two homes:

- **Standalone (GitHub Pages)** — unchanged. localStorage-only, never talks
  to WP, no band data on the public instance.
- **WP plugin** — serves the same built app from the WP site, adding
  server-side persistence and login gating.

Persistence sits behind a small adapter. The localStorage adapter is always
active (working copy / offline buffer). The WP adapter activates when the
plugin's HTML shell prints a `window.trocheWP` config global (REST URL, nonce,
user caps) before the bundle loads; no global → app behaves exactly as today.

Vite builds with `base: './'` so the same `dist/` serves from the GH Pages
subpath and the plugin directory.

**Repo:** monorepo — plugin PHP in a `wp-plugin/` dir here, consuming the same
`dist/`.

## Stage 1: plugin core — `song` CPT + REST

- Non-public CPT: `public => false`, `exclude_from_search => true`,
  `publicly_queryable => false`.
- One post per song; the JSON envelope (`{ format: "troche", version: 1, ... }`)
  stored in `post_content`, so WP revisions give save history for free,
  restorable from wp-admin.
- Cap revisions per song (`wp_revisions_to_keep`, ~50).
- REST: read endpoint returns the whole library in the envelope format; write
  endpoint saves per-song. Post IDs are opaque save handles; songs get no
  slugs or URLs.
- Read requires `is_user_logged_in()`; write requires
  `current_user_can('troche_edit')`.
- Song deletion goes to WP trash (30-day undo), never hard delete.

## Stage 2: the app route

- Plugin registers a rewrite rule for a slug configured on Settings → Troche
  (text field, default `troche`); flush on activation and slug change.
- On that route: logged-out visitors get `auth_redirect()` (bounce to
  wp-login, return after sign-in); logged-in users get a minimal
  self-contained HTML shell — `window.trocheWP` config plus the `dist/`
  script/style tags. The theme is never involved: no wrapper, no theme
  CSS/JS bleed, renders identically to GH Pages.
- Cookie auth + nonces; no CORS.

## Permissions

- Band members are plain Subscribers granted a custom `troche_edit`
  capability.
- **Settings → Troche** holds the two admin controls: the route slug and a
  user checklist toggling `troche_edit` per user.
- Activation adds `troche_edit` to the Administrator role so the installer
  always has access. No user-specific grants ship in code (plugin is open
  source).
- Session expiry: on 401/403 during save, keep changes in localStorage and
  show "session expired — log in again." Never fail silently.

## App changes (WP mode)

- **Autosave replaces the Save button:** ~10s debounce, fires only when dirty,
  flush on `visibilitychange`/`pagehide`. Status indicator: "Saved ✓ /
  Saving… / Offline — changes kept locally."
- **Conflicts: last write wins**; revisions are the safety net. Dirty-only
  saving means idle open tabs never clobber.
- **Share/Export/Import stay functionally untouched** in both modes (one
  codebase; they're client-side and cost nothing). Export/Import double as the
  seeding path: each bandmate exports their existing localStorage library and
  imports into WP on first login. No migration code needed.
- **WP mode on mobile viewports: don't render the Share/Export/Import button
  row** — it costs a full row of scarce mobile space, and with autosave those
  buttons aren't needed on a phone. Conditional render (not CSS hide); they
  remain available on desktop and everywhere in standalone mode.

## Release & install

GH Actions on tag: `vite build`, assemble `troche-wp.zip` (plugin PHP +
`dist/`), attach to the GitHub release. Install/update = upload the zip in
wp-admin.

**Open-source ready is an acceptance criterion:** nothing site-specific or
personal in code, defaults, or docs — any WP site can install the zip as-is.

## README deliverables

- **Standalone dev/test:** existing `npm install` / `npm run dev` section
  stands; note that without `window.trocheWP` the app runs localStorage-only,
  so today's workflow is unchanged.
- **Plugin local testing:** `npx @wp-now/wp-now start` from `wp-plugin/`
  (auto-detects plugin mode, WP + SQLite, no Docker, auto-admin login). Test
  loop: `npm run build`, start wp-now, activate the plugin, visit `/troche`,
  create a Subscriber test user, grant `troche_edit` on Settings → Troche,
  verify both gates (login-to-view, cap-to-edit). `wp-env` is the Docker-based
  alternative for closer-to-prod testing.
- **Release/install:** how the release zip is produced and installed.

## Watch-item

If demo audio ever moves into the WP media library, files sit at guessable
public URLs regardless of post status — fine while per-part sample links stay
on Dropbox/Drive; needs a protected-uploads plan first.
