# Tests

Repeatable checks for the WordPress plugin and the client logic. They live here,
outside `wp-plugin/`, so they never ship in the plugin zip and never affect
plugin checks.

Requires **Node 20+** (same as the build). Run from the repo root.

| Command | What it covers |
| --- | --- |
| `npm run test:unit` | `normalizeLibrary` — duplicate/missing id repair and macOS-style name de-duping. Pure Node, no WordPress. |
| `npm run test:plugin` | The plugin source in a fresh WordPress: post type, REST CRUD, the login-to-read and cap-to-edit gates, revisions, trash-on-delete. |
| `npm run test:zip` | Builds `troche.zip` and installs it into a fresh WordPress the same way a wp-admin upload would, then verifies it unpacked, activated, and runs. |
| `npm test` | All of the above. |

The `test:plugin` and `test:zip` runs use
[WordPress Playground](https://developer.wordpress.org/playground/) (real
WordPress on SQLite, no Docker); the first run downloads WordPress. Each runs in
a fresh, throwaway site.
