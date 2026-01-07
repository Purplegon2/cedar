export const help = {
  name: "help",
  help: "help           - list commands",
  run: ({ registry, term }) => {
    const names = Array.from(registry.keys()).sort();
    term.printLine("Commands:");
    for (const n of names) {
      const cmd = registry.get(n);
      const line = cmd?.help ? `  ${cmd.help}` : `  ${n}`;
      term.printLine(line);
    }
  }
};
