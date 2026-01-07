import { FS } from "../os/fs.js";

export const cat = {
  name: "cat",
  help: "cat [file...]  - print file(s) contents (alias for read)",
  run: ({ args, term }) => {
    if (args.length === 0) { term.printLine("cat: missing file"); return; }
    for (const a of args) {
      const p = FS.resolvePath(a, term.cwd, term.user);
      const c = FS.readFile(p);
      if (c === null) term.printLine(`cat: no such file: ${p}`);
      else term.printLine(c);
    }
  }
};
