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
