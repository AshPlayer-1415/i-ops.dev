/* Mount a thinking-orb on a canvas, for a site with no build step and no framework.
 *
 * The published package is a React component; this drives the same engine directly, so the
 * animation is the library's and only the mounting is ours. `MODE_DRAWS[mode](ctx, size, t, dark,
 * opts)` paints one frame, which is the whole binding.
 *
 * Three things the React component does for you that have to be done by hand here:
 *   - device-pixel ratio, or the dots are soft on a retina screen;
 *   - `prefers-reduced-motion`, which gets one painted frame and no loop, never an empty canvas;
 *   - stopping. A 404 page left open would otherwise hold a rAF loop forever, so it pauses when the
 *     tab is hidden and `stop()` releases it entirely.
 */
import { MODE_DRAWS, resolvePreset } from "/vendor/thinking-orbs/engine.es.js";

export function mountOrb(host, state, size, options) {
  const opts = options || {};
  const dark = opts.dark !== false;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  host.appendChild(canvas);

  const resolved = resolvePreset(state, size);
  const draw = MODE_DRAWS[resolved.mode];
  const paint = (t) => {
    ctx.clearRect(0, 0, size, size);
    draw(ctx, size, t, dark, resolved.opts);
  };

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let running = false;

  function loop(now) {
    paint((now / 1000) * resolved.speed);
    frame = requestAnimationFrame(loop);
  }
  function start() {
    if (running || still.matches || document.hidden) return;
    running = true;
    frame = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function visibility() {
    document.hidden ? pause() : start();
  }

  paint(0); // a frame is on screen before the first rAF, and is all a reduced-motion user gets
  start();
  document.addEventListener("visibilitychange", visibility);
  still.addEventListener("change", () => (still.matches ? pause() : start()));

  return {
    canvas,
    stop() {
      pause();
      document.removeEventListener("visibilitychange", visibility);
      canvas.remove();
    },
  };
}

/* Cycle a host through several states: a different one on each load, and a change for anyone who
 * stays. One fixed orb reads as decoration; four that rotate read as a system doing something.
 *
 * The start state is random so two people hitting the same 404 do not see the same picture, and it
 * then advances on a timer so a single visitor sees more than one. A reduced-motion user gets one
 * state, painted once, and no cycling — the rotation is motion too, not just the animation inside it.
 */
export function cycleOrb(host, states, size, options) {
  const opts = options || {};
  const every = opts.every || 18000;
  const fade = opts.fade === undefined ? 600 : opts.fade;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  let index = Math.floor(Math.random() * states.length);
  let current = null;
  let timer = 0;
  let stopped = false;
  // Every deferred call is tracked. Without this, `stop()` could run between a swap starting and
  // its deferred mount landing, and the orb that arrived afterwards was orphaned in the DOM with a
  // live rAF loop behind it — two canvases survived a stop in testing, which on a page someone
  // navigates away from is a leak that keeps painting.
  const pending = new Set();

  function later(fn, ms) {
    const id = setTimeout(() => {
      pending.delete(id);
      if (!stopped) fn();
    }, ms);
    pending.add(id);
    return id;
  }

  let first = true;

  function show(state) {
    if (stopped) return;
    current = mountOrb(host, state, size, opts);
    host.setAttribute("data-orb-state", state);
    // The first orb is simply visible. Fading it in meant starting at opacity 0 and relying on a
    // rAF callback to raise it — and a browser throttles rAF in a background tab, so a 404 opened
    // in one showed an empty square that never resolved. Only a swap fades, and a swap only
    // happens on a timer, which means the page is already being looked at.
    if (fade && !first) {
      current.canvas.style.transition = `opacity ${fade}ms ease`;
      current.canvas.style.opacity = "0";
      later(() => current && (current.canvas.style.opacity = "1"), 20);
    }
    first = false;
  }

  function next() {
    if (stopped) return;
    const previous = current;
    current = null;
    index = (index + 1) % states.length;
    if (previous && fade) {
      previous.canvas.style.opacity = "0";
      later(() => previous.stop(), fade);
      later(() => show(states[index]), fade);
    } else {
      if (previous) previous.stop();
      show(states[index]);
    }
  }

  show(states[index]);
  if (!still.matches) timer = setInterval(next, every);

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = 0;
      pending.forEach(clearTimeout);
      pending.clear();
      if (current) current.stop();
      current = null;
      // belt and braces: anything a race left behind goes too
      host.querySelectorAll("canvas").forEach((c) => c.remove());
    },
    get state() {
      return states[index];
    },
  };
}
