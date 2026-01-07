export const back = {
  name: "back",
  help: "back  - go to previous directory",
  run: ({ term }) => {
    const prev = term._lastCwd || "/";
    const cur = term.cwd || "/";
    term.cwd = prev;
    term._lastCwd = cur;
    term.printLine(term.cwd);
  }
};
