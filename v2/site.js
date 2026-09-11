/* ============================================================
   i-ops.dev v2 — interactions. No dependencies, no build step.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav ---------------------------------------------------- */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScrollNav = function () {
      nav.classList.toggle("scrolled", window.scrollY > 24);
    };
    onScrollNav();
    window.addEventListener("scroll", onScrollNav, { passive: true });
  }

  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        document.body.classList.remove("menu-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- reveal on scroll --------------------------------------- */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- the check widget ----------------------------------------
     Three tabs. It advances on its own until the reader touches it, then it
     stops for good: a thing that keeps moving under someone reading it is
     worse than a thing that never moved.
     ------------------------------------------------------------------ */
  var check = document.getElementById("check");
  if (check) {
    var tabs = [].slice.call(check.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    });
    var timer = null;
    var taken = false;

    function show(index) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        if (panels[i]) panels[i].hidden = !on;
      });
    }

    function current() {
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute("aria-selected") === "true") return i;
      }
      return 0;
    }

    function stop() {
      taken = true;
      if (timer) { window.clearInterval(timer); timer = null; }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { stop(); show(i); });
      tab.addEventListener("keydown", function (e) {
        var next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (next === null) return;
        e.preventDefault();
        stop();
        var target = (next + tabs.length) % tabs.length;
        show(target);
        tabs[target].focus();
      });
    });

    if (!reduce) {
      var start = function () {
        if (taken || timer) return;
        timer = window.setInterval(function () {
          if (taken) return;
          show((current() + 1) % tabs.length);
        }, 3600);
      };
      // Only run while it is on screen. A widget cycling in a closed tab is
      // burning battery to show nobody anything.
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else if (timer) { window.clearInterval(timer); timer = null; }
          });
        }, { threshold: 0.25 }).observe(check);
      } else {
        start();
      }
    }
  }
})();

/* ============================================================
   The block field — [data-field] on any element becomes a canvas of blocks.

   Grey blocks at rest, breathing on a slow ambient wave. A pointer pushes a
   ripple through them and pulls colour toward red as it passes. There is no
   pointer on a phone, so an attractor drifts on its own until a finger takes
   over, which means the thing is alive on the surface most of the traffic uses
   rather than only on the one it was designed on.

   Canvas rather than several hundred divs: this sits next to a form somebody is
   typing into, and dropping frames under a text field is worse than no motion.
   ============================================================ */
(function () {
  "use strict";

  var host = document.querySelector("[data-field]");
  if (!host || !window.requestAnimationFrame) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var RED = [255, 45, 32];
  var cols = 0, rows = 0, pitch = 0, size = 0, offX = 0, offY = 0;
  var w = 0, h = 0, dpr = 1;
  var px = -1e5, py = -1e5;          // pointer, in canvas space
  var touched = false;               // has a real pointer ever arrived
  var lastMove = 0;
  var raf = null, running = false;

  function measure() {
    var rect = host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    pitch = w < 420 ? 13 : 17;
    size = pitch - 5;
    cols = Math.max(1, Math.floor(w / pitch));
    rows = Math.max(1, Math.floor(h / pitch));
    offX = (w - cols * pitch) / 2 + (pitch - size) / 2;
    offY = (h - rows * pitch) / 2 + (pitch - size) / 2;
    return true;
  }

  function draw(now) {
    var t = now / 1000;

    // Before anyone points at it, and on every phone, an attractor wanders so
    // the field is never a static grey rectangle.
    var ax, ay;
    if (touched && now - lastMove < 2600) {
      ax = px; ay = py;
    } else {
      ax = w * (0.5 + 0.36 * Math.sin(t * 0.42));
      ay = h * (0.5 + 0.34 * Math.cos(t * 0.31));
    }

    // Tied to the diagonal rather than the long edge, so a short wide banner on a
    // phone gets a moving highlight rather than a red wash over half of it.
    var radius = Math.sqrt(w * w + h * h) * 0.30;
    ctx.clearRect(0, 0, w, h);

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = offX + c * pitch;
        var y = offY + r * pitch;
        var cx = x + size / 2;
        var cy = y + size / 2;

        // Ambient breathing, deliberately shallow so it reads as texture.
        var amb = 0.5 + 0.5 * Math.sin(c * 0.32 + t * 0.75) * Math.cos(r * 0.29 - t * 0.55);

        var dx = cx - ax, dy = cy - ay;
        var d = Math.sqrt(dx * dx + dy * dy);
        var near = Math.max(0, 1 - d / radius);
        var pull = near * near;                       // falloff
        // The squiggle: a wave travelling outward from the pointer.
        var wave = Math.sin(d * 0.09 - t * 3.4) * pull;

        var v = amb * 0.34 + pull * 0.5 + wave * 0.3;
        if (v < 0) v = 0; else if (v > 1) v = 1;

        var grey = Math.round(26 + v * 210);
        // Squared again so red collects at the crests near the pointer instead of
        // tinting everything within reach of it. Occasional red, not a red panel.
        var heat = pull * pull * 1.7 + wave * 0.5;
        if (heat < 0) heat = 0; else if (heat > 1) heat = 1;
        var rr = Math.round(grey + (RED[0] - grey) * heat);
        var gg = Math.round(grey + (RED[1] - grey) * heat);
        var bb = Math.round(grey + (RED[2] - grey) * heat);

        ctx.fillStyle = "rgb(" + rr + "," + gg + "," + bb + ")";
        roundRect(ctx, x, y, size, size, Math.min(3, size / 3));
        ctx.fill();
      }
    }
    raf = window.requestAnimationFrame(draw);
  }

  function roundRect(c, x, y, wd, ht, r) {
    c.beginPath();
    if (c.roundRect) { c.roundRect(x, y, wd, ht, r); return; }
    c.moveTo(x + r, y);
    c.arcTo(x + wd, y, x + wd, y + ht, r);
    c.arcTo(x + wd, y + ht, x, y + ht, r);
    c.arcTo(x, y + ht, x, y, r);
    c.arcTo(x, y, x + wd, y, r);
    c.closePath();
  }

  function still() {
    // Reduced motion, or offscreen: one honest frame, no loop.
    if (!measure()) return;
    draw(0);
    if (raf) { window.cancelAnimationFrame(raf); raf = null; }
  }

  function start() {
    if (running || reduce) return;
    running = true;
    raf = window.requestAnimationFrame(draw);
  }
  function stop() {
    running = false;
    if (raf) { window.cancelAnimationFrame(raf); raf = null; }
  }

  function point(e) {
    var rect = host.getBoundingClientRect();
    var src = e.touches && e.touches[0] ? e.touches[0] : e;
    px = src.clientX - rect.left;
    py = src.clientY - rect.top;
    touched = true;
    lastMove = performance.now();
  }

  host.addEventListener("pointermove", point, { passive: true });
  host.addEventListener("touchmove", point, { passive: true });
  host.addEventListener("pointerleave", function () { touched = false; }, { passive: true });

  window.addEventListener("resize", function () {
    if (!measure()) return;
    if (reduce || !running) still();
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (!reduce) start();
  });

  if (!measure()) return;
  if (reduce) { still(); return; }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.isIntersecting ? start() : stop(); });
    }, { threshold: 0.05 }).observe(host);
  } else {
    start();
  }
})();

/* ============================================================
   Platform notice — [data-platform-notice] fills in when the visitor is not on
   a Mac. The build is a signed macOS .dmg, so handing an iPhone a download
   button is handing it a file it cannot open and no explanation.

   iPadOS 13 and later report themselves as "Macintosh", so the user agent alone
   says iPad is a Mac. Touch points are what separate them: no Mac reports more
   than one.
   ============================================================ */
(function () {
  "use strict";
  var slots = [].slice.call(document.querySelectorAll("[data-platform-notice]"));
  if (!slots.length) return;

  var ua = navigator.userAgent || "";
  var touch = navigator.maxTouchPoints || 0;
  var isIOS = /iPhone|iPod/i.test(ua) || /iPad/i.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  var isAndroid = /Android/i.test(ua);
  var isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS;
  var isWindows = /Windows NT/.test(ua);

  var message = "";
  if (isIOS) {
    message = "You are on an iPhone or iPad. This build is a macOS app, so open this page on your Mac to download it.";
  } else if (isAndroid) {
    message = "You are on an Android device. This build is a macOS app, so open this page on a Mac to download it.";
  } else if (isWindows) {
    message = "You are on Windows. There is no Windows build yet. This download is a macOS app.";
  } else if (!isMac) {
    message = "This build is a macOS app. If you are not on a Mac, open this page on one to download it.";
  }

  slots.forEach(function (slot) {
    if (!message) { slot.hidden = true; return; }
    slot.textContent = message;
    slot.hidden = false;
  });
})();
