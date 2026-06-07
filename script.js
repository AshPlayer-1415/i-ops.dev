/* ============================================================
   Dreelio - interactions & scroll motion
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- NAV: floating pill on scroll ---------- */
  var nav = document.getElementById("nav");
  function onScrollNav() {
    if (window.scrollY > 40) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");
  burger.addEventListener("click", function () {
    document.body.classList.toggle("menu-open");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") document.body.classList.remove("menu-open");
  });

  /* ---------- Scroll reveal (scroll-position based; IO unreliable here) ---------- */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if (reduce) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revealCheck = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = reveals.length - 1; i >= 0; i--) {
        var el = reveals[i];
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          el.classList.add("in");
          reveals.splice(i, 1);
        }
      }
      if (!reveals.length) window.removeEventListener("scroll", revealCheck);
    };
    window.addEventListener("scroll", revealCheck, { passive: true });
    window.addEventListener("resize", revealCheck, { passive: true });
    window.addEventListener("load", revealCheck);
    requestAnimationFrame(function () { requestAnimationFrame(revealCheck); });
    revealCheck();
    [120, 400, 900].forEach(function (t) { setTimeout(revealCheck, t); });
  }

  var statB = document.querySelectorAll(".dash-stats .stat-b b");
  if (statB.length && !reduce) {
    var counted = false;
    var statEl = document.querySelector(".dash-stats");
    var checkStats = function () {
      if (counted) return;
      var r = statEl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.85 && r.bottom > 0) {
        counted = true;
        countUp(statB[0], 455, "", 1100);
        countUp(statB[1], 55, "", 1100);
        countUp(statB[2], 400, "", 1100);
        countUp(statB[3], 600, "hrs", 1100);
        window.removeEventListener("scroll", checkStats);
      }
    };
    window.addEventListener("scroll", checkStats, { passive: true });
    setTimeout(checkStats, 80);
  }

  /* ---------- Clouds: layer kept for parallax-able overlays (none by default) ---------- */
  var cloudWrap = document.getElementById("clouds");
  var clouds = [];

  /* ---------- Container scroll animation ---------- */
  var heroScrollWrap = document.getElementById("heroContainerScroll");
  var heroDash = document.getElementById("heroDash");
  var heroScrollScreen = document.querySelector(".container-scroll-screen");
  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }
  function lerp(a, b, p) {
    return a + (b - a) * p;
  }
  function fitHeroDash() {
    if (!heroDash || !heroScrollScreen) return;
    var baseWidth = 1120;
    var screenWidth = heroScrollScreen.clientWidth;
    var screenHeight = heroScrollScreen.clientHeight;
    if (screenWidth > 0 && screenWidth < baseWidth) {
      var scale = screenWidth / baseWidth;
      heroDash.style.width = baseWidth + "px";
      heroDash.style.height = (screenHeight / scale) + "px";
      heroDash.style.transform = "scale(" + scale.toFixed(4) + ")";
    } else {
      heroDash.style.width = "";
      heroDash.style.height = "";
      heroDash.style.transform = "";
    }
  }
  function heroScroll() {
    var y = window.scrollY;
    if (heroScrollWrap) {
      var travel = Math.max(heroScrollWrap.offsetHeight - window.innerHeight, 1);
      var p = clamp((y - heroScrollWrap.offsetTop) / travel, 0, 1);
      var isMobile = window.innerWidth <= 768;
      var scale = isMobile ? lerp(0.7, 0.9, p) : lerp(1.05, 1, p);
      var rotate = lerp(20, 0, p);
      var translate = lerp(0, -100, p);
      heroScrollWrap.style.setProperty("--scroll-rotate", rotate.toFixed(2) + "deg");
      heroScrollWrap.style.setProperty("--scroll-scale", scale.toFixed(3));
      heroScrollWrap.style.setProperty("--scroll-title-y", translate.toFixed(1) + "px");
    }
    if (!reduce) {
      clouds.forEach(function (c) {
        c.el.style.transform = "translateY(" + (y * c.s).toFixed(1) + "px)";
      });
    }
  }
  if (reduce && heroScrollWrap) {
    heroScrollWrap.style.setProperty("--scroll-rotate", "0deg");
    heroScrollWrap.style.setProperty("--scroll-scale", "1");
    heroScrollWrap.style.setProperty("--scroll-title-y", "0px");
  }
  if (!reduce) {
    var ticking = false;
    var requestHeroScroll = function () {
      if (!ticking) {
        requestAnimationFrame(function () { heroScroll(); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", requestHeroScroll, { passive: true });
    window.addEventListener("resize", requestHeroScroll, { passive: true });
    heroScroll();
  }
  window.addEventListener("resize", fitHeroDash, { passive: true });
  window.addEventListener("load", fitHeroDash);
  requestAnimationFrame(fitHeroDash);

  /* ---------- Hero dashboard chart bars ---------- */
  var chart = document.getElementById("dashChart");
  if (chart) {
    var heights = [42, 88, 60, 56, 50, 86, 38, 30, 62, 80];
    heights.forEach(function (h) {
      var b = document.createElement("div");
      b.className = "bar";
      b.style.height = h + "%";
      chart.appendChild(b);
    });
  }

  /* ---------- Logo marquee ---------- */
  var logoNames = [
    "Sales & CS Ops", "Finance Ops", "HR & People Ops", "IT & Infra",
    "Legal & Compliance", "Knowledge Management", "Project Ops", "Internal Comms",
    "Data & Reporting", "Vendor & Procurement", "Facilities & Admin", "Culture & Engagement"
  ];
  var logoTrack = document.querySelector("#logoMarquee .marquee-track");
  if (logoTrack) {
    var html = "";
    for (var rep = 0; rep < 2; rep++) {
      logoNames.forEach(function (n) {
        html += '<span class="logo-item"><span class="dot"></span>' + n + "</span>";
      });
    }
    logoTrack.innerHTML = html;
  }

  /* ---------- Integration logos ---------- */
  var intColors = ["#f06a6a", "#4a154b", "#5865f2", "#00ac47", "#625df5", "#36c5f0", "#7b68ee", "#1a73e8", "#ffc107", "#e01563"];
  var intGrid = document.getElementById("intLogos");
  if (intGrid) {
    var ih = "";
    for (var i = 0; i < 10; i++) {
      var c = intColors[i % intColors.length];
      ih += '<div class="il"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="' + c + '" opacity="0.9"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg></div>';
    }
    intGrid.innerHTML = ih;
  }

  /* ---------- Pricing toggle (only if present) ---------- */
  var toggle = document.getElementById("priceToggle");
  var knob = document.getElementById("priceKnob");
  function setKnob(btn) {
    if (!knob || !btn) return;
    knob.style.width = btn.offsetWidth + "px";
    knob.style.transform = "translateX(" + (btn.offsetLeft - 5) + "px)";
  }
  if (toggle) {
    var btns = toggle.querySelectorAll("button");
    setKnob(toggle.querySelector(".active"));
    window.addEventListener("resize", function () {
      setKnob(toggle.querySelector(".active"));
    });
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        setKnob(b);
        var cycle = b.getAttribute("data-cycle");
        document.querySelectorAll(".price-num").forEach(function (el) {
          el.textContent = el.getAttribute("data-" + cycle);
        });
      });
    });
  }

  /* ---------- Pricing list checkmarks ---------- */
  var checkLight = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#e7eaef"/><path d="M8 12.5l2.6 2.6L16 9.5" stroke="#16171c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var checkDark = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.16)"/><path d="M8 12.5l2.6 2.6L16 9.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.querySelectorAll("[data-li]").forEach(function (li) { li.insertAdjacentHTML("afterbegin", checkLight); });
  document.querySelectorAll("[data-li-d]").forEach(function (li) { li.insertAdjacentHTML("afterbegin", checkDark); });

  /* ---------- Product preview modal ---------- */
  var previewTrigger = document.querySelector(".product-preview-trigger");
  var previewModal = document.querySelector(".product-preview-modal");
  var previewClose = document.querySelector(".product-preview-close");
  var previewBackdrop = document.querySelector(".product-preview-backdrop");
  var savedScrollY = 0;
  var lastPreviewFocus = null;
  var closeTimer = null;

  function lockPreviewScroll() {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("preview-open");
    document.body.style.position = "fixed";
    document.body.style.top = "-" + savedScrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockPreviewScroll() {
    document.body.classList.remove("preview-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }

  function openPreviewModal() {
    if (!previewModal || !previewTrigger) return;
    if (closeTimer) window.clearTimeout(closeTimer);
    lastPreviewFocus = document.activeElement;
    previewModal.hidden = false;
    lockPreviewScroll();
    requestAnimationFrame(function () {
      previewModal.classList.add("is-open");
      if (previewClose) previewClose.focus({ preventScroll: true });
    });
  }

  function closePreviewModal() {
    if (!previewModal || previewModal.hidden) return;
    previewModal.classList.remove("is-open");
    unlockPreviewScroll();
    closeTimer = window.setTimeout(function () {
      previewModal.hidden = true;
      if (lastPreviewFocus && typeof lastPreviewFocus.focus === "function") {
        lastPreviewFocus.focus({ preventScroll: true });
      } else if (previewTrigger) {
        previewTrigger.focus({ preventScroll: true });
      }
    }, reduce ? 0 : 220);
  }

  if (previewTrigger && previewModal) {
    previewTrigger.addEventListener("click", openPreviewModal);
    if (previewClose) previewClose.addEventListener("click", closePreviewModal);
    if (previewBackdrop) previewBackdrop.addEventListener("click", closePreviewModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !previewModal.hidden) closePreviewModal();
    });
  }

  /* ---------- Count-up (stat deltas already static; animate stat numbers) ---------- */
  function countUp(el, target, suffix, dur) {
    var start = 0, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased) + (suffix || "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
})();
