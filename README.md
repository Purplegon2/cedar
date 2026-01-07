<<<<<<< HEAD
# Cedar (static terminal OS simulation)

A single-page, fully static HTML/CSS/JS project that simulates a minimal OS boot sequence and drops into a terminal.

Current features
- Fake boot logs on "power on" (page load) and on simulated reboot (Ctrl+Alt+R).
- ASCII-rendered terminal display engine (screen buffer -> `<pre>`).
- Modular command registry.
- Implemented command: `echo`

Planned / placeholder
- `curl` (requires CORS-friendly targets or a proxy; iPadOS Safari limitations apply)

Run
- Open `index.html` directly (no server required).

Controls
- Type commands at the prompt and press Enter.
- Ctrl+L clears the screen.
- Ctrl+Alt+R simulates a reboot (boot logs then terminal).

Notes
- This is a simulation; it does not access the real device file system.
- Networking from static pages is limited by CORS. A future `curl` command can be implemented using `fetch()` and will only work on endpoints that allow cross-origin requests.
=======
# cedar
cedar official frfr
>>>>>>> 2232e7d454f175a3f1f8254eeb6fa15eba99bd7c
