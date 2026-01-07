export const echo = {
  name: "echo",
  help: "echo [text...]  - print text to the terminal",
  run: ({ args, term }) => {
    term.printLine(args.join(" "));
  }
};
