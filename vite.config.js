import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so the same dist/ serves from both homes: the GitHub Pages
  // subpath (/troche/) and the WordPress plugin's dist/ directory.
  base: "./",
});
