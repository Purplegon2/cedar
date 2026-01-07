import { CEDAR_VERSION, CEDAR_BUILD, CEDAR_KERNEL } from "./version.js";

/* ---------- small utilities ---------- */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Deterministic PRNG (so a boot can feel “real” but still repeatable if you set seed)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function randInt(rng, lo, hi) {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

/* ---------- simulated boot clock ---------- */
// Keeps “wall time” stable-ish but advances with the simulated boot (not real time).
class BootClock {
  constructor(rng, { baseDate = new Date(), style = "wall" } = {}) {
    this.rng = rng;
    this.style = style; // "wall" -> [HH:MM:SS], "uptime" -> [  0.123]
    this.baseMs = baseDate.getTime();

    // Start slightly “after power on” for realism
    this.uptimeMs = randInt(rng, 15, 120);
    this.wallMs = this.baseMs - randInt(rng, 0, 2500);
  }

  // Advance simulated time by dtMs (this is NOT the sleep time necessarily)
  tick(dtMs) {
    const dt = Math.max(0, dtMs | 0);
    this.uptimeMs += dt;
    this.wallMs += dt;
  }

  stamp() {
    if (this.style === "uptime") {
      const s = this.uptimeMs / 1000;
      return `[${s.toFixed(3).padStart(8, " ")}]`;
    }

    // wall clock
    const d = new Date(this.wallMs);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}]`;
  }
}

/* ---------- boot engine ---------- */
function makeProfile(opts = {}) {
  // speedFactor: lower = faster boot
  const speedFactor =
    typeof opts.speedFactor === "number"
      ? clamp(opts.speedFactor, 0.25, 3.0)
      : opts.isReboot
      ? 0.65
      : 1.0;

  return {
    seed:
      opts.seed ??
      // stable-ish by day + build, but different boots can pass seed explicitly
      (Date.now() >>> 0) ^
        (String(CEDAR_BUILD).split("").reduce((a, c) => a + c.charCodeAt(0), 0) >>> 0),
    style: opts.logStyle ?? "wall", // "wall" or "uptime"
    speedFactor,
    // realism knobs
    allowWarnings: opts.allowWarnings ?? true,
    burstiness: clamp(opts.burstiness ?? 0.7, 0, 1), // higher = more “scroll then pause”
    maxExtraJitterMs: clamp(opts.maxExtraJitterMs ?? 420, 0, 2000),
  };
}

// A “step” describes what to print and how it behaves.
function step(msg, cfg = {}) {
  return {
    msg,
    // how much simulated time passes in logs
    dtMs: cfg.dtMs ?? 30,
    // how long we visually wait before printing next line
    waitMs: cfg.waitMs ?? 30,
    // additional random jitter (visual + dt)
    jitterMs: cfg.jitterMs ?? 0,
    // chance to print this step (for optional lines)
    chance: cfg.chance ?? 1,
    // if true, print multiple lines quickly then pause later
    burst: cfg.burst ?? false,
  };
}

async function runBoot(term, steps, profile) {
  const rng = mulberry32(profile.seed);
  const clock = new BootClock(rng, { style: profile.style });

  let pendingPause = 0;

  for (const s of steps) {
    if (rng() > s.chance) continue;

    const jitter = s.jitterMs
      ? randInt(rng, -s.jitterMs, s.jitterMs)
      : randInt(rng, 0, Math.floor(profile.maxExtraJitterMs * 0.15));

    const baseWait = Math.max(0, (s.waitMs + jitter) * profile.speedFactor);
    const baseDt = Math.max(0, (s.dtMs + Math.floor(jitter * 0.35)));

    // “burst then pause” behavior
    const doBurst = s.burst && rng() < profile.burstiness;
    const wait = doBurst ? randInt(rng, 0, 12) : baseWait;

    // Occasionally create a longer pause after a burst cluster
    if (doBurst) {
      pendingPause += randInt(rng, 18, 70);
    } else if (pendingPause > 0 && rng() < 0.35) {
      // spend accumulated pause sometimes
      const spend = Math.min(pendingPause, randInt(rng, 80, 220));
      pendingPause -= spend;
      await sleep(spend * profile.speedFactor);
      clock.tick(spend);
    }

    // Apply wait and advance simulated time accordingly
    if (wait > 0) {
      await sleep(wait);
      clock.tick(wait);
    }

    clock.tick(baseDt);
    term.printLine(`${clock.stamp()} ${s.msg}`);
  }

  // spend any remaining pause at the end of logs, lightly
  if (pendingPause > 0) {
    const spend = Math.min(pendingPause, 240);
    await sleep(spend * profile.speedFactor);
  }
}

function buildSteps(profile, { isReboot }) {
  const rng = mulberry32(profile.seed ^ 0x9e3779b9);

  // Some dynamic-ish values
  const cores = randInt(rng, 2, 12);
  const devCount = randInt(rng, 2, 7);
  const hz = [100, 250, 300, 1000][randInt(rng, 0, 3)];
  const preempt = rng() < 0.75 ? "on" : "off";

  const ip = `10.0.0.${randInt(rng, 20, 220)}`;
  const gw = "10.0.0.1";

  const warn1 = step("usb: device descriptor read/64, error -71", {
    chance: profile.allowWarnings ? 0.08 : 0,
    dtMs: 8,
    waitMs: 18,
    jitterMs: 40,
    burst: true,
  });

  const warn2 = step("vfs: cleanly unmounted old root", {
    chance: isReboot ? 0.6 : 0.0,
    dtMs: 10,
    waitMs: 22,
    jitterMs: 40,
    burst: true,
  });

  // Kernel-ish phase (fast scroll)
  const kernelPhase = [
    step("init: cedar-init starting", { dtMs: 20, waitMs: 25, jitterMs: 30, burst: true }),
    step("mem: ok", { dtMs: 12, waitMs: 20, jitterMs: 40, burst: true }),
    step(`cpu: cores detected: ${cores}`, { dtMs: 12, waitMs: 18, jitterMs: 40, burst: true }),
    step(`sched: tick=${hz}hz preempt=${preempt}`, { dtMs: 10, waitMs: 18, jitterMs: 40, burst: true }),
    step("vfs: mounting / (ramfs)", { dtMs: 14, waitMs: 22, jitterMs: 60, burst: true }),
    step("vfs: mounting /proc", { dtMs: 8, waitMs: 16, jitterMs: 40, burst: true }),
    step("vfs: mounting /dev (devfs)", { dtMs: 10, waitMs: 18, jitterMs: 50, burst: true }),
    step("vfs: mounting /tmp (tmpfs)", { dtMs: 10, waitMs: 18, jitterMs: 50, burst: true }),
    step("dev: enumerating devices", { dtMs: 18, waitMs: 28, jitterMs: 80, burst: true }),
    warn1,
    step("dev: bus=pci scan start", { dtMs: 18, waitMs: 26, jitterMs: 80, burst: true }),
    step(`dev: bus=pci scan done (${devCount} devices)`, { dtMs: 35, waitMs: 55, jitterMs: 90 }),
    step("dev: rng: seeded", { dtMs: 10, waitMs: 18, jitterMs: 50, burst: true }),
    step("clock: rtc sync ok", { dtMs: 10, waitMs: 18, jitterMs: 50, burst: true }),
    step("fsck: / clean", { dtMs: 12, waitMs: 22, jitterMs: 60, burst: true }),
    warn2,
  ];

  // Security/services (some slower waits)
  const svcPhase = [
    step("sec: policies loaded", { dtMs: 18, waitMs: 30, jitterMs: 70 }),
    step("sec: enforcing=on", { dtMs: 10, waitMs: 22, jitterMs: 50, burst: true }),
    step("sec: sandbox: enabled", { dtMs: 10, waitMs: 22, jitterMs: 50, burst: true }),
    step("tty: cedar-tty0 attached", { dtMs: 12, waitMs: 24, jitterMs: 60, burst: true }),
    step("tty: keymap=us", { dtMs: 8, waitMs: 18, jitterMs: 40, burst: true }),
    step("log: ringbuffer=256k", { dtMs: 8, waitMs: 18, jitterMs: 40, burst: true }),

    step("svc: starting cedar-udevd", { dtMs: 22, waitMs: 40, jitterMs: 90 }),
    step("svc: cedar-udevd: ready", { dtMs: 12, waitMs: 22, jitterMs: 60, burst: true }),
    step("svc: starting cedar-clockd", { dtMs: 18, waitMs: 35, jitterMs: 90 }),
    step("svc: cedar-clockd: ready", { dtMs: 12, waitMs: 22, jitterMs: 60, burst: true }),
    step("svc: starting cedar-logd", { dtMs: 18, waitMs: 35, jitterMs: 90 }),
    step("svc: cedar-logd: ready", { dtMs: 12, waitMs: 22, jitterMs: 60, burst: true }),
    step("power: governor=balanced", { dtMs: 10, waitMs: 20, jitterMs: 50, burst: true }),
  ];

  // Network phase (noticeable pauses)
  const netPhase = [
    step("net: bringing up interface lo", { dtMs: 10, waitMs: 18, jitterMs: 50, burst: true }),
    step("net: lo up", { dtMs: 8, waitMs: 16, jitterMs: 40, burst: true }),
    step("svc: starting cedar-netd", { dtMs: 18, waitMs: 40, jitterMs: 120 }),
    step("svc: cedar-netd: ready", { dtMs: 12, waitMs: 22, jitterMs: 70, burst: true }),
    step("net: dhcp: requesting lease", { dtMs: 45, waitMs: 140, jitterMs: 220 }),
    step(`net: dhcp: lease acquired ${ip}/24`, { dtMs: 18, waitMs: 35, jitterMs: 90 }),
    step(`net: dns: configured ${gw}`, { dtMs: 12, waitMs: 22, jitterMs: 70, burst: true }),
    step(`net: route: default via ${gw}`, { dtMs: 12, waitMs: 22, jitterMs: 70, burst: true }),
  ];

  // UI phase (slower “finishing touches”)
  const uiPhase = [
    step("ui: starting terminal session", { dtMs: 20, waitMs: 55, jitterMs: 140 }),
    step("ui: loading profile...", { dtMs: 25, waitMs: 85, jitterMs: 220 }),
    step("ui: applying theme...", { dtMs: 25, waitMs: 85, jitterMs: 220 }),
    step("ui: preparing prompt...", { dtMs: 20, waitMs: 70, jitterMs: 180 }),
    step("ui: terminal ready", { dtMs: 10, waitMs: 30, jitterMs: 90 }),
  ];

  return [...kernelPhase, ...svcPhase, ...netPhase, ...uiPhase];
}

/* ---------- public API ---------- */
export async function bootSequence(term, opts = {}) {
  const { isReboot = false } = opts;

  term.resetHard();
  term.setBootMode(true);

  const profile = makeProfile({ ...opts, isReboot });

  const banner = [
    "Cedar",
    `version ${CEDAR_VERSION} (${CEDAR_BUILD})`,
    `kernel  ${CEDAR_KERNEL}`,
    "",
  ];
  for (const line of banner) term.printLine(line);

  if (isReboot) {
    term.printLine("[reboot] syncing state...");
    await sleep(180 * profile.speedFactor);
    term.printLine("[reboot] restarting services...");
    await sleep(200 * profile.speedFactor);
    term.printLine("");
  } else {
    term.printLine("[boot] power on self-test...");
    // Short “POST” pause that feels less arbitrary
    await sleep(randInt(mulberry32(profile.seed ^ 12345), 320, 780) * profile.speedFactor);
    term.printLine("");
  }

  const steps = buildSteps(profile, { isReboot });
  await runBoot(term, steps, profile);

  term.printLine("");
  term.printLine(`Cedar ${CEDAR_VERSION} (${CEDAR_BUILD})`);
  term.printLine("");
  term.printLine(`..:^~~!!~~^:..                  `);
  term.printLine("");
  term.printLine("Type `help` to list commands.");
  term.printLine("Ctrl+L: clear | Ctrl+Alt+R: reboot");
  term.printLine("");

  term.setBootMode(false);
}
