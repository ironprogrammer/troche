# Tests

Repeatable checks for the WordPress plugin and the client logic. They live here,
outside `wp-plugin/`, so they never ship in the plugin zip and never affect
plugin checks.

Requires **Node 20+** (same as the build). Run from the repo root.

| Command | What it covers |
| --- | --- |
| `npm run test:unit` | `normalizeLibrary` — duplicate/missing id repair and macOS-style name de-duping — and `mergeFlags`, which decides what an unresolved sync notice does when the next sync lands. Pure Node, no WordPress. |
| `npm run test:sync` | The WP reconcile path in `storage.js` — what a second open tab adopts silently vs. flags, that flagged songs are held back from saving, and that a write onto a song that moved since is refused rather than landing. Runs against a fake in-process WordPress. |
| `npm run test:plugin` | The plugin source in a fresh WordPress: post type, REST CRUD, the login-to-read and cap-to-edit gates, version tokens and conditional writes, revisions, trash-on-delete. |
| `npm run test:zip` | Builds `troche.zip` and installs it into a fresh WordPress the same way a wp-admin upload would, then verifies it unpacked, activated, and runs. |
| `npm test` | All of the above. |

The `test:plugin` and `test:zip` runs use
[WordPress Playground](https://developer.wordpress.org/playground/) (real
WordPress on SQLite, no Docker); the first run downloads WordPress. Each runs in
a fresh, throwaway site.
