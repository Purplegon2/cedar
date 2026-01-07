import { FS } from "../os/fs.js";

export const jump = {
  name: "jump",
  help: "jump [path|@bookmark]  - like cd but supports @bookmarks",
  run: ({ args, term }) => {
    const dest = args[0];
    if (!dest) { term.printLine("jump: missing destination"); return; }
    const p = FS.resolvePath(dest, term.cwd, term.user);
    const node = FS.getNode(p);
    if (!node || node.type !== "dir") { term.printLine(`jump: no such directory: ${dest}`); return; }
    term._lastCwd = term.cwd || "/";
    term.cwd = p;
    term.printLine(`jumped to ${p}`);
  }
};
