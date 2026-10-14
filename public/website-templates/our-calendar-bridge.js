/* Paper Stish integration bridge for the original Our Calendar HTML. */
(function () {
  "use strict";

  var editing = false;
  var notes = Array.prototype.slice.call(
    document.querySelectorAll(".left .txt[contenteditable]")
  );
  var photoIds = ["b1", "b2", "b3", "b4", "hero"];
  var lastNotes = "";
  var initialized = false;
  var readyAttempts = 0;
  var readyTimer = null;
  var style = document.createElement("style");

  style.textContent =
    ".txt.paper-stish-text{white-space:pre-wrap;max-width:65%;overflow-wrap:anywhere;min-width:0}" +
    ".paper-stish-readonly #tipcard,.paper-stish-readonly #tipbtn,.paper-stish-readonly .photo-btn{display:none!important}" +
    ".txt.paper-stish-editable{cursor:text}";
  document.head.appendChild(style);

  photoIds.forEach(function (id) {
    var el = document.querySelector('[data-slot="' + id + '"]');
    if (el && !el.dataset.paperStishOriginalSrc) {
      el.dataset.paperStishOriginalSrc = el.getAttribute("src") || "";
    }
  });
  notes.forEach(function (el) {
    el.classList.add("paper-stish-text");
  });

  function readNotes() {
    return notes.map(function (el) {
      return (el.innerText || el.textContent || "")
        .replace(/\r/g, "")
        .replace(/\n$/, "");
    });
  }

  function writeText(el, value) {
    el.replaceChildren();
    String(value).split("\n").forEach(function (line, index) {
      if (index) el.appendChild(document.createElement("br"));
      el.appendChild(document.createTextNode(line));
    });
  }

  function updateText(next) {
    if (!Array.isArray(next)) return;
    notes.forEach(function (el, index) {
      if (typeof next[index] === "string") writeText(el, next[index]);
      el.contentEditable = editing ? "true" : "false";
      el.classList.toggle("paper-stish-editable", editing);
    });
    lastNotes = JSON.stringify(readNotes());
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      if (/^https?:/i.test(src)) im.crossOrigin = "anonymous";
      im.onload = function () { resolve(im); };
      im.onerror = reject;
      im.src = src;
    });
  }

  function restorePhoto(el) {
    var original = el.dataset.paperStishOriginalSrc;
    if (original) el.src = original;
  }

  function showPhoto(el, src) {
    if (!src) {
      restorePhoto(el);
      return;
    }
    if (el.dataset.slot === "hero") {
      el.src = src;
      return;
    }
    var original = el.dataset.paperStishOriginalSrc;
    if (!original) {
      el.src = src;
      return;
    }
    Promise.all([loadImage(src), loadImage(original)]).then(function (items) {
      var photo = items[0];
      var mask = items[1];
      var canvas = document.createElement("canvas");
      canvas.width = mask.naturalWidth * 2;
      canvas.height = mask.naturalHeight * 2;
      var ctx = canvas.getContext("2d");
      if (!ctx || !photo.naturalWidth || !photo.naturalHeight) return;
      var scale = Math.max(canvas.width / photo.naturalWidth, canvas.height / photo.naturalHeight);
      var w = photo.naturalWidth * scale;
      var h = photo.naturalHeight * scale;
      ctx.drawImage(photo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
      el.src = canvas.toDataURL("image/png");
    }).catch(function () {
      el.src = src;
    });
  }

  function updatePhotos(next) {
    var images = Array.isArray(next) ? next : [];
    photoIds.forEach(function (id, index) {
      var el = document.querySelector('[data-slot="' + id + '"]');
      if (el) showPhoto(el, typeof images[index] === "string" ? images[index] : "");
    });
  }

  function setEditing(value) {
    editing = value === true;
    document.documentElement.classList.toggle("paper-stish-readonly", !editing);
    notes.forEach(function (el) {
      el.contentEditable = editing ? "true" : "false";
      el.classList.toggle("paper-stish-editable", editing);
    });
    document.querySelectorAll("[data-slot]").forEach(function (el) {
      el.style.cursor = editing ? "pointer" : "default";
      el.setAttribute("aria-label", editing ? "Tap to change photo" : "");
      el.setAttribute("tabindex", editing ? "0" : "-1");
    });
    var photoButton = document.getElementById("heroBtn");
    var tipButton = document.getElementById("tipbtn");
    var tipCard = document.getElementById("tipcard");
    if (photoButton) photoButton.style.display = editing ? "" : "none";
    if (tipButton) tipButton.style.display = editing ? "" : "none";
    if (!editing && tipCard) tipCard.hidden = true;
  }

  function announceReady() {
    if (initialized || readyAttempts >= 20) {
      if (readyTimer) clearInterval(readyTimer);
      return;
    }
    readyAttempts += 1;
    window.parent.postMessage({
      type: "paper-stish:template-ready",
      calendarNotes: readNotes()
    }, "*");
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data || typeof event.data !== "object") return;
    var data = event.data;

    if (data.type === "paper-stish:init") {
      initialized = true;
      if (readyTimer) clearInterval(readyTimer);
      setEditing(data.editing);
      updateText(Array.isArray(data.calendarNotes) ? data.calendarNotes : readNotes());
      updatePhotos(data.images);
    } else if (data.type === "paper-stish:update-text") {
      updateText(data.calendarNotes);
    } else if (data.type === "paper-stish:update-photos") {
      updatePhotos(data.images);
    } else if (data.type === "paper-stish:set-editing") {
      setEditing(data.editing);
    }
  });

  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    var reset = target.closest("#resetphotos");
    if (reset) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (editing) window.parent.postMessage({ type: "paper-stish:reset-photos" }, "*");
      return;
    }

    var slot = target.closest("[data-slot]");
    var heroButton = target.closest("#heroBtn");
    if (slot || heroButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!editing) return;
      var key = slot ? slot.getAttribute("data-slot") : "hero";
      window.parent.postMessage({
        type: "paper-stish:choose-photo",
        index: photoIds.indexOf(key)
      }, "*");
    }
  }, true);

  document.addEventListener("dragover", function (event) {
    if (!editing) return;
    var target = event.target instanceof Element ? event.target : null;
    if (target && target.closest("[data-slot]")) event.preventDefault();
  }, true);

  document.addEventListener("drop", function (event) {
    if (!editing) return;
    var target = event.target instanceof Element ? event.target : null;
    var slot = target && target.closest("[data-slot]");
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!slot || !file || !/^image\//.test(file.type)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    slot.classList.remove("over");
    window.parent.postMessage({
      type: "paper-stish:drop-photo",
      index: photoIds.indexOf(slot.getAttribute("data-slot")),
      file: file
    }, "*");
  }, true);

  notes.forEach(function (el, index) {
    el.addEventListener("input", function () {
      if (!editing) return;
      var next = readNotes();
      var snapshot = JSON.stringify(next);
      if (snapshot === lastNotes) return;
      lastNotes = snapshot;
      window.parent.postMessage({
        type: "paper-stish:change",
        calendarNotes: next,
        index: index
      }, "*");
    });
  });

  setEditing(false);
  announceReady();
  readyTimer = setInterval(announceReady, 300);
  window.addEventListener("pagehide", function () {
    if (readyTimer) clearInterval(readyTimer);
  });
})();
