/* ============================================================
   i-ops.dev v2 — Google Sheets submission, one implementation.

   The live site has this logic inlined in join-waitlist.html. There are two
   forms now, so it lives in one place: a second copy is a second place for the
   payload shape to drift away from what the Apps Script actually reads.

   The payload keys below are NOT free to rename. They are the column names the
   existing Apps Script expects, and `mode: "no-cors"` means the browser cannot
   read the response, so a server-side rejection is INVISIBLE from here. A form
   that says "sent" over a row that never arrived is the worst failure this file
   can have, which is why the endpoint is validated by shape before anything is
   sent and the form refuses rather than pretending.
   ============================================================ */
(function () {
  "use strict";

  var ENDPOINT =
    "https://script.google.com/macros/s/AKfycbw7XgSmH1OQxBDuXb0hwkNxurBc_TQHYX87nQ1uMVbNeiFFXWx-v6C7y6B1tZFm8PRcdw/exec";

  function endpointIsConfigured() {
    return ENDPOINT &&
      ENDPOINT.indexOf("https://script.google.com/macros/s/") === 0 &&
      ENDPOINT.slice(-5) === "/exec";
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

    function setSubmitting(submitting) {
      inProgress = submitting;
      submitButton.disabled = submitting;
      submitButton.setAttribute("aria-busy", submitting ? "true" : "false");
      submitButton.textContent = submitting ? busyText : defaultButtonText;
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
        await fetch(ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          cache: "no-store",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        form.reset();
        showStatus(successText, "success");
      } catch (error) {
        showStatus("We couldn’t send that. Please check your connection and try again.", "error");
      } finally {
        setSubmitting(false);
      }
    });
  }

  [].slice.call(document.querySelectorAll("form[data-sheet-form]")).forEach(wire);
})();
