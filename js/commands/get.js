import { FS } from "../os/fs.js";

export const get = {
  name: "get",
  help: "get <url> [file]  - download a URL to a file in the current directory",
  run: async ({ args, term }) => {
    if (!args[0]) { term.printLine("get: usage: get <url> [file]"); return; }
    const url = args[0];
    let filename = args[1] || null;
    try {
      // Validate URL (only allow http/https)
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) { term.printLine("get: only http(s) URLs supported"); return; }
      if (!filename) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        filename = parts.length ? parts[parts.length - 1] : "index.html";
      }
      const path = FS.resolvePath(filename, term.cwd, term.user);

      const resp = await fetch(url);
      if (!resp.ok) { term.printLine(`get: http error ${resp.status}`); return; }

      const ctype = (resp.headers.get("content-type") || "").toLowerCase();

      // Prefer text for textual types; otherwise write a binary string (best-effort).
      if (ctype.startsWith("text/") || ctype.includes("json") || ctype.includes("xml") || ctype.includes("javascript")) {
        const txt = await resp.text();
        FS.writeFile(path, txt);
      } else {
        const ab = await resp.arrayBuffer();
        const u8 = new Uint8Array(ab);
        // Convert to binary string in chunks to avoid apply limits.
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < u8.length; i += chunk) {
          const sub = u8.subarray(i, i + chunk);
          bin += String.fromCharCode.apply(null, sub);
        }
        FS.writeFile(path, bin);
      }

      term.printLine(`downloaded ${url} -> ${path}`);
    } catch (err) {
      term.printLine(`get: ${err && err.message ? err.message : String(err)}`);
    }
  }
};
