// Library sharing via URL hash.
//   #data=<base64url(JSON.stringify({format,version,songs}))>
// The hash is consumed at load time and stripped from the URL so the link
// isn't accidentally re-shared with stale data baked in.

const PREFIX = "data=";

function toBase64Url(s) {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s) {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return decodeURIComponent(escape(atob(b64)));
}

export function buildShareUrl(songs) {
  const payload = JSON.stringify({ format: "troche", version: 1, songs });
  const enc = toBase64Url(payload);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${PREFIX}${enc}`;
}

// Reads the share hash if present, strips it from the URL, returns the parsed
// payload or null.
export function consumeSharedFromUrl() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const m = hash.replace(/^#/, "");
  if (!m.startsWith(PREFIX)) return null;
  const clean = () => {
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      // best-effort
    }
  };
  try {
    const json = fromBase64Url(m.slice(PREFIX.length));
    const parsed = JSON.parse(json);
    clean();
    return parsed;
  } catch {
    clean();
    return null;
  }
}
