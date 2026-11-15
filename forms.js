/* ============================================================
   i-ops.dev v2 — form submission, one implementation.

   The live site has this logic inlined in join-waitlist.html. There are two
   forms now, so it lives in one place: a second copy is a second place for the
   payload shape to drift away from what the endpoint actually reads.

   CHANGED 2026-11-15: this used to POST to a Google Apps Script with
   `mode: "no-cors"`, and the paragraph that stood here said the quiet part out
   loud — the browser could not read the response, so a server-side rejection
   was INVISIBLE, and "a form that says 'sent' over a row that never arrived is
   the worst failure this file can have". That is no longer a hazard being
   mitigated by shape-checking the URL. It is fixed: the endpoint is our own
   Cloudflare Worker, it answers with CORS headers and a real status, and the
   code below READS that status. A request is reported as sent when, and only
   when, the server said it stored one — and it hands back a request_id that
   exists in the database.

   Rows land in D1 `access_requests` (cloudflare/migrations/0002). The older
   KV path expired every request after 120 days, which is data loss by design
   in the one table that records who asked.
   ============================================================ */
(function () {
  "use strict";

  var ENDPOINT = "https://api.i-ops.dev/v1/access-request";

  function endpointIsConfigured() {
    // Kept, and still worth keeping: it is the guard that stops a half-edited endpoint from
    // quietly swallowing a real lead. It just checks a different shape now.
    return ENDPOINT && ENDPOINT.indexOf("https://api.i-ops.dev/") === 0;
  }

  function text(formData, key) {
    return String(formData.get(key) || "").trim();
  }

  function wire(form) {
    var submitButton = form.querySelector('[type="submit"]');
    var statusElement = document.getElementById(form.getAttribute("data-status"));
    if (!submitButton || !statusElement) return;

    var defaultButtonText = submitButton.textContent;
    var busyText = form.getAttribute("data-busy") || "Sending…";
    var successText = form.getAttribute("data-success") ||
      "Your request was sent. We’ll review it and contact you by email.";
    var submissionType = form.getAttribute("data-type") || "waitlist";
    var inProgress = false;

    function showStatus(message, state) {
      statusElement.textContent = message;
      statusElement.hidden = false;
      statusElement.classList.remove("is-loading", "is-success", "is-error");
      if (state) statusElement.classList.add("is-" + state);
    }

    // The orb is a progressive enhancement: imported only when a form is actually submitted, so the
    // engine is not downloaded by anyone who merely reads the page, and every step is guarded so a
    // failure to load leaves the form behaving exactly as it did before.
    var orbHost = null;
    var orbHandle = null;

    function showOrb() {
      if (orbHost) return;
      orbHost = document.createElement("span");
      orbHost.className = "submit-orb";
      submitButton.insertAdjacentElement("afterend", orbHost);
      import("/vendor/thinking-orbs/orb.js?v=5e4f6fb1d2")
        .then(function (m) {
          if (!orbHost) return; // the request finished before the module arrived
          orbHandle = m.mountOrb(orbHost, "connecting", 20);
        })
        .catch(function () {});
    }

    function hideOrb() {
      if (orbHandle) orbHandle.stop();
      if (orbHost) orbHost.remove();
      orbHandle = null;
      orbHost = null;
    }

    function setSubmitting(submitting) {
      inProgress = submitting;
      submitButton.disabled = submitting;
      submitButton.setAttribute("aria-busy", submitting ? "true" : "false");
      submitButton.textContent = submitting ? busyText : defaultButtonText;
      submitting ? showOrb() : hideOrb();
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (inProgress) return;
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var payload = {
        name: text(data, "name"),
        workEmail: text(data, "workEmail").toLowerCase(),
        linkedinProfile: text(data, "linkedinProfile"),
        role: text(data, "role"),
        company: text(data, "company"),
        location: text(data, "location"),
        expectedFeatures: text(data, "expectedFeatures"),
        requirements: text(data, "requirements"),
        website: text(data, "website"),
        submissionType: submissionType
      };

      if (!payload.name) {
        showStatus("Please enter your name.", "error");
        var nameField = form.querySelector('[name="name"]');
        if (nameField) nameField.focus();
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.workEmail)) {
        showStatus("Please enter a valid work email.", "error");
        var emailField = form.querySelector('[name="workEmail"]');
        if (emailField) emailField.focus();
        return;
      }

      if (payload.linkedinProfile) {
        var ok = false;
        try {
          var url = new URL(payload.linkedinProfile);
          ok = url.protocol === "http:" || url.protocol === "https:";
        } catch (error) { ok = false; }
        if (!ok) {
          showStatus("Please enter a valid LinkedIn profile URL.", "error");
          var linkedinField = form.querySelector('[name="linkedinProfile"]');
          if (linkedinField) linkedinField.focus();
          return;
        }
      }

      if (!endpointIsConfigured()) {
        showStatus("This form is temporarily unavailable. Please email hello@i-ops.dev instead.", "error");
        return;
      }

      setSubmitting(true);
      showStatus(busyText, "loading");

      try {
        var response = await fetch(ENDPOINT, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // The whole point of the move. A non-2xx, or a body that does not say ok, is now
        // something this page can SEE — so it tells the person instead of thanking them.
        var result = null;
        try { result = await response.json(); } catch (parseError) { result = null; }
        if (!response.ok || !result || result.ok !== true) {
          throw new Error((result && result.error) || ("http " + response.status));
        }

        form.reset();
        showStatus(successText, "success");
      } catch (error) {
        showStatus(
          "We couldn’t send that. Please try again, or email hello@i-ops.dev and we will pick it up.",
          "error"
        );
      } finally {
        setSubmitting(false);
      }
    });
  }

  [].slice.call(document.querySelectorAll("form[data-sheet-form]")).forEach(wire);
})();
