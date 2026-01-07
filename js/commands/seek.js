import { FS } from "../os/fs.js";

export const seek = {
  name: "seek",
  help: "seek [text] [path]  - search file contents for text",
  run: ({ args, term }) => {
    const text = args[0];
    const path = args[1] ? FS.resolvePath(args[1], term.cwd, term.user) : term.cwd;
    if (!text) { term.printLine("seek: missing text"); return; }
    const out = FS.seek(text, path);
    for (const p of out) term.printLine(p);
  }
};
