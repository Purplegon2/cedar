import { FS } from "../os/fs.js";

export const read = {
  name: "read",
  help: "read [file]  - print file contents",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : null;
    if (!path) { term.printLine("read: missing file"); return; }
    const c = FS.readFile(path);
    if (c === null) { term.printLine(`read: no such file: ${path}`); return; }
    term.printLine(c);
  }
};
