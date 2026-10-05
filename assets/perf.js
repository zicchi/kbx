// Per-level performance monitor: FPS, main-thread busy % (CPU proxy), memory.
// Usage:
//   Perf.start({ kb, level });   // begin measuring a level
//   let summary = Perf.finish();  // stop + get summary object
// A small live HUD is shown while measuring.
class Perf {
  static active = false;
  static hud = null;

  static _round(x, d = 1) {
    let p = Math.pow(10, d);
    return Math.round(x * p) / p;
  }

  static _memMB() {
    return performance.memory
      ? performance.memory.usedJSHeapSize / 1048576
      : null;
  }

  static reset() {
    Perf.startTime = performance.now();
    Perf.lastFrame = Perf.startTime;
    Perf.frames = 0;
    Perf.jank = 0;
    Perf.frameMin = Infinity; // shortest frame (ms) -> max fps
    Perf.frameMax = 0;        // longest frame (ms)  -> min fps
    Perf.longTaskMs = 0;
    Perf.longTasks = 0;
    Perf.memSamples = [];
    Perf.memStart = Perf._memMB();
    Perf.fpsWindow = [];      // frame timestamps for rolling 1s FPS
    Perf.curFps = 0;
    // rolling helpers for live HUD
    Perf._hudLastTime = Perf.startTime;
    Perf._hudLastLongMs = 0;
    Perf._liveCpu = 0;
  }

  static start(meta = {}) {
    Perf.stop(); // clear any prior run without reporting
    Perf.meta = meta;
    Perf.active = true;
    Perf.reset();

    const jankBudget = (1000 / 60) * 1.5; // ~25ms => dropped/janky frame

    const loop = (now) => {
      if (!Perf.active) return;
      let dt = now - Perf.lastFrame;
      Perf.lastFrame = now;
      Perf.frames++;
      // Skip the first frame (load spike) and gaps >1s (tab throttled/backgrounded,
      // not a real render stall) so worst-FPS stats stay meaningful.
      if (Perf.frames > 1 && dt <= 1000) {
        if (dt < Perf.frameMin) Perf.frameMin = dt;
        if (dt > Perf.frameMax) Perf.frameMax = dt;
        if (dt > jankBudget) Perf.jank++;
      }
      Perf.fpsWindow.push(now);
      while (Perf.fpsWindow.length && now - Perf.fpsWindow[0] > 1000)
        Perf.fpsWindow.shift();
      Perf.curFps = Perf.fpsWindow.length;
      Perf._raf = requestAnimationFrame(loop);
    };
    Perf._raf = requestAnimationFrame(loop);

    // Long Tasks -> main-thread busy time (CPU proxy)
    if (window.PerformanceObserver) {
      try {
        Perf._lto = new PerformanceObserver((list) => {
          for (let e of list.getEntries()) {
            Perf.longTasks++;
            Perf.longTaskMs += e.duration;
          }
        });
        Perf._lto.observe({ entryTypes: ["longtask"] });
      } catch (err) {
        Perf._lto = null;
      }
    }

    // Memory sampling + HUD refresh
    Perf._interval = setInterval(() => {
      let m = Perf._memMB();
      if (m != null) Perf.memSamples.push(m);
      Perf._updateLiveCpu();
      Perf.updateHud();
    }, 500);

    // HUD disabled — metrics are recorded to the log only.
    // Perf.showHud();
    return Perf;
  }

  static _updateLiveCpu() {
    let now = performance.now();
    let span = now - Perf._hudLastTime;
    let busy = Perf.longTaskMs - Perf._hudLastLongMs;
    Perf._liveCpu = span > 0 ? Math.min(100, (busy / span) * 100) : 0;
    Perf._hudLastTime = now;
    Perf._hudLastLongMs = Perf.longTaskMs;
  }

  static summary() {
    let now = performance.now();
    let durMs = now - Perf.startTime;
    let durSec = durMs / 1000;
    let mem = Perf.memSamples.length
      ? {
          startMB: Perf._round(Perf.memStart),
          avgMB: Perf._round(
            Perf.memSamples.reduce((a, b) => a + b, 0) / Perf.memSamples.length
          ),
          peakMB: Perf._round(Math.max(...Perf.memSamples)),
          endMB: Perf._round(Perf._memMB()),
        }
      : null;
    return {
      durationSec: Perf._round(durSec),
      fpsAvg: Perf._round(durSec > 0 ? Perf.frames / durSec : 0),
      fpsMin: Perf.frameMax > 0 ? Perf._round(1000 / Perf.frameMax) : null,
      fpsMax: Perf.frameMin < Infinity ? Perf._round(1000 / Perf.frameMin) : null,
      frames: Perf.frames,
      jankFrames: Perf.jank,
      jankPct: Perf._round(Perf.frames ? (Perf.jank / Perf.frames) * 100 : 0),
      cpuBusyPct: Perf._round(durMs ? (Perf.longTaskMs / durMs) * 100 : 0),
      longTasks: Perf.longTasks,
      longTaskMs: Perf._round(Perf.longTaskMs),
      memory: mem,
    };
  }

  static stop() {
    if (Perf._raf) {
      cancelAnimationFrame(Perf._raf);
      Perf._raf = null;
    }
    if (Perf._interval) {
      clearInterval(Perf._interval);
      Perf._interval = null;
    }
    if (Perf._lto) {
      try { Perf._lto.disconnect(); } catch (e) {}
      Perf._lto = null;
    }
    Perf.active = false;
  }

  // Compute summary, then stop measuring.
  static finish() {
    if (!Perf.startTime) return null;
    let s = Perf.summary();
    Perf.stop();
    return s;
  }

  // Render a summary as an HTML table (for dialogs)
  static toHtml(s, title = "Level performance") {
    if (!s) return "No performance data.";
    let mem = s.memory
      ? `${s.memory.peakMB} MB peak &middot; ${s.memory.avgMB} MB avg`
      : "n/a (Chrome only)";
    let row = (k, v) => `<tr><td class="pe-3 text-secondary">${k}</td><td class="fw-bold">${v}</td></tr>`;
    return (
      `<div class="text-start"><b>${title}</b>` +
      `<table class="mt-2"><tbody>` +
      row("Duration", `${s.durationSec}s`) +
      row("FPS (avg)", `${s.fpsAvg} <span class="text-secondary">(min ${s.fpsMin ?? "-"}, max ${s.fpsMax ?? "-"})</span>`) +
      row("Jank frames", `${s.jankFrames} / ${s.frames} (${s.jankPct}%)`) +
      row("CPU (main-thread busy)", `${s.cpuBusyPct}% <span class="text-secondary">(${s.longTasks} long tasks, ${s.longTaskMs}ms)</span>`) +
      row("Memory", mem) +
      `</tbody></table></div>`
    );
  }

  // ---- HUD ----
  static ensureHud() {
    if (Perf.hud) return Perf.hud;
    let el = document.createElement("div");
    el.className = "perf-hud";
    el.style.cssText =
      "position:fixed;left:8px;bottom:8px;z-index:99999;" +
      "font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;" +
      "background:rgba(17,17,17,.78);color:#57ff8f;padding:6px 10px;" +
      "border-radius:6px;pointer-events:none;white-space:pre;min-width:150px;" +
      "box-shadow:0 2px 8px rgba(0,0,0,.3)";
    document.body.appendChild(el);
    Perf.hud = el;
    return el;
  }

  static showHud() {
    Perf.ensureHud().style.display = "block";
    Perf.updateHud();
  }

  static hideHud() {
    if (Perf.hud) Perf.hud.style.display = "none";
  }

  static updateHud() {
    if (!Perf.hud) return;
    let mem = Perf._memMB();
    let durS = (performance.now() - Perf.startTime) / 1000;
    let fps = Perf.curFps;
    let fpsColor = fps >= 50 ? "#57ff8f" : fps >= 30 ? "#ffd43b" : "#ff6b6b";
    let cpu = Perf._liveCpu;
    Perf.hud.innerHTML =
      `<span style="color:${fpsColor}">FPS  ${String(fps).padStart(3)}</span>\n` +
      `CPU  ${cpu.toFixed(0).padStart(3)}%  main-thread\n` +
      `MEM  ${mem != null ? mem.toFixed(1) + " MB" : "n/a"}\n` +
      `time ${durS.toFixed(0)}s`;
  }
}
