// Copy the freshly built dist/ into the plugin so the WordPress plugin can
// serve the same app. Run after `vite build` (see the build:wp npm script).
// wp-plugin/dist is generated/gitignored — it is a copy of the canonical
// root dist/, which GitHub Pages continues to publish untouched.
import { rmSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "dist");
const dest = join(root, "wp-plugin", "dist");

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log("Synced dist/ → wp-plugin/dist/");
