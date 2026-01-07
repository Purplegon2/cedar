export const clear = {
  name: "clear",
  help: "clear          - clear the screen",
  run: ({ term }) => term.clearScreen(),
};
