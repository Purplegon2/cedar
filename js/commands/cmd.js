import { FS } from "../os/fs.js";

export const cmd = {
  name: "cmd",
  help: "cmd run <file>  - execute a script file, running each non-empty line as a command",
  run: async ({ args, term, registry }) => {
    if (!args || args.length < 2 || args[0] !== "run") {
      term.printLine("usage: cmd run <file>");
      return;
    }
    const fileArg = args[1];
    const path = FS.resolvePath(fileArg, term.cwd, term.user);
    const src = FS.readFile(path);
    if (src === null) { term.printLine(`cmd: no such file: ${path}`); return; }

    const lines = src.split(/\r?\n/);
    for (let raw of lines) {
      raw = raw.trim();
      if (!raw) continue;
      // support comment markers
      if (raw.startsWith('#') || raw.startsWith('//') || raw.startsWith(';')) continue;

      try {
        // simulate entering the line (place in input buffer for visibility)
        if (typeof term._renderInputLine === 'function') {
          term.input = raw;
          term.cursor = raw.length;
          term._renderInputLine();
        }
        // run the command; _runCommand returns a Promise
        if (typeof term._runCommand === 'function') await term._runCommand(raw);
        else term.printLine(`cmd: terminal runner not available`);
      } catch (e) {
        term.printLine(`cmd: error running line: ${e && e.message ? e.message : String(e)}`);
      }
    }
  }
};
