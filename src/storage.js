import { STORAGE_KEY } from "./constants.js";

// Static-host storage: localStorage when available, in-memory fallback otherwise.
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

// Returns the saved library, or null when there's nothing in storage yet
// (so the caller can decide whether to seed a default or use shared payload).
export async function loadLibrary() {
  try {
    const value = get(STORAGE_KEY);
    if (value) return JSON.parse(value);
  } catch {
    // no saved data, or parse failed
  }
  return null;
}

export async function saveLibrary(lib) {
  try {
    set(STORAGE_KEY, JSON.stringify(lib));
    return true;
  } catch (e) {
    console.error("save failed", e);
    return false;
  }
}
