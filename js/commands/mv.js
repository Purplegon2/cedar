import { FS } from "../os/fs.js";

export const mv = {
  name: "mv",
  help: "mv [src] [dst]  - move/rename",
  run: ({ args, term }) => {
    if (args.length < 2) { term.printLine("mv: missing args"); return; }
    const src = FS.resolvePath(args[0], term.cwd, term.user);
    const dst = FS.resolvePath(args[1], term.cwd, term.user);
    try { FS.move(src, dst); term.printLine(`moved ${src} -> ${dst}`); } catch (e) { term.printLine(`mv: ${e.message}`); }
  }
};
