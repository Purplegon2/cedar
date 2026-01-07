export const where = {
  name: "where",
  help: "where  - show current directory",
  run: ({ term }) => {
    term.printLine(term.cwd || "/");
  }
};
