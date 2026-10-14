"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./OurCalendarTemplate.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TEMPLATE_URL = `${BASE_PATH}/website-templates/our-calendar-source.html`;
const EMPTY_DOCUMENT = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;background:#fdf5e1;overflow:auto}</style></head><body></body></html>';

export const OUR_CALENDAR_DEFAULT_NOTES = Array.from({ length: 4 }, () =>
  "add a subheading add a\nsubheading add a subheading\nadd a subheading add a\nsubheading add a subheading\nadd a subheading add a\nsubheading add a subheading\nadd a subheading add a\nsubheading",
);

interface Props {
  values?: TemplatePublicationValues;
  editing?: boolean;
  onNotesChange?: (index: number, value: string) => void;
  onPhotoClick?: (index: number) => void;
  onExit?: () => void;
}

function resolveNotes(values?: TemplatePublicationValues) {
  return OUR_CALENDAR_DEFAULT_NOTES.map((fallback, index) => {
    const value = values?.calendarNotes?.[index];
    return typeof value === "string" && value.trim() ? value : fallback;
  });
}

function photos(values?: TemplatePublicationValues) {
  return Array.from({ length: 5 }, (_, index) => {
    const value = values?.images?.[index];
    return typeof value === "string" ? value : "";
  });
}

function bridgeScript() {
  return `
(function () {
  var editing = false;
  var notes = Array.from(document.querySelectorAll(".left .txt[contenteditable]"));
  var slots = Array.from(document.querySelectorAll("[data-slot]"));
  var ids = ["b1", "b2", "b3", "b4", "hero"];
  var lastNotes = "";
  var bridgeStyle = document.createElement("style");
  bridgeStyle.textContent = ".txt.paper-stish-text{white-space:pre-wrap;max-width:65%;overflow-wrap:anywhere;min-width:0}.paper-stish-readonly #tipcard,.paper-stish-readonly #tipbtn,.paper-stish-readonly .photo-btn{display:none!important}.txt.paper-stish-editable{cursor:text}";
  document.head.appendChild(bridgeStyle);
  notes.forEach(function (el) { el.classList.add("paper-stish-text"); });

  function readNotes() {
    return notes.map(function (el) {
      return (el.innerText || el.textContent || "").replace(/\\r/g, "").replace(/\\n$/, "");
    });
  }
  function writeText(el, value) {
    el.replaceChildren();
    String(value).split("\\n").forEach(function (line, index) {
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
      im.onload = function () { resolve(im); };
      im.onerror = reject;
      im.src = src;
    });
  }
  function showPhoto(el, dataUrl) {
    if (!dataUrl) {
      if (el.dataset.orig) el.src = el.dataset.orig;
      return Promise.resolve();
    }
    if (el.dataset.slot === "hero") {
      el.src = dataUrl;
      return Promise.resolve();
    }
    return Promise.all([loadImage(dataUrl), loadImage(el.dataset.orig || el.src)]).then(function (items) {
      var image = items[0], mask = items[1];
      var width = mask.naturalWidth * 2, height = mask.naturalHeight * 2;
      var canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      var scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      var dw = image.naturalWidth * scale, dh = image.naturalHeight * scale;
      ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0, width, height);
      el.src = canvas.toDataURL("image/png");
    }).catch(function () { el.src = dataUrl; });
  }
  function updatePhotos(next) {
    var list = Array.isArray(next) ? next : [];
    ids.forEach(function (id, index) {
      var el = document.querySelector('[data-slot="' + id + '"]');
      if (el) showPhoto(el, typeof list[index] === "string" ? list[index] : "");
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
    });
    var photoButton = document.getElementById("heroBtn");
    var tipButton = document.getElementById("tipbtn");
    var tipCard = document.getElementById("tipcard");
    if (photoButton) photoButton.style.display = editing ? "" : "none";
    if (tipButton) tipButton.style.display = editing ? "" : "none";
    if (!editing && tipCard) tipCard.hidden = true;
  }
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data || typeof event.data !== "object") return;
    var data = event.data;
    if (data.type === "paper-stish:init") {
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
  // Intercept photo editing at capture phase so the editor's parent owns uploads.
  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    var slot = target.closest("[data-slot]");
    var heroButton = target.closest("#heroBtn");
    if (slot || heroButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!editing) return;
      var key = slot ? slot.getAttribute("data-slot") : "hero";
      var index = ids.indexOf(key);
      window.parent.postMessage({ type: "paper-stish:choose-photo", index: index }, "*");
    }
  }, true);
  notes.forEach(function (el, index) {
    el.addEventListener("input", function () {
      if (!editing) return;
      var current = readNotes();
      var snapshot = JSON.stringify(current);
      if (snapshot === lastNotes) return;
      lastNotes = snapshot;
      window.parent.postMessage({ type: "paper-stish:change", calendarNotes: current, index: index }, "*");
    });
  });
  setEditing(false);
  window.parent.postMessage({ type: "paper-stish:template-ready", calendarNotes: readNotes() }, "*");
})();
`;
}

function adaptSource(source: string) {
  const script = "<script>" + bridgeScript() + "</script>";
  return source.includes("</body>")
    ? source.replace("</body>", script + "\n</body>")
    : source + script;
}

/** Runs the uploaded scrapbook/calendar HTML unchanged except for a small editor bridge. */
export function OurCalendarTemplate({
  values,
  editing = false,
  onNotesChange,
  onPhotoClick,
  onExit,
}: Props) {
  const [html, setHtml] = useState(EMPTY_DOCUMENT);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const latestValues = useRef(values);
  const latestEditing = useRef(editing);
  const lastFrameNotes = useRef<string | null>(null);

  latestValues.current = values;
  latestEditing.current = editing;

  useEffect(() => {
    let alive = true;
    fetch(TEMPLATE_URL, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load Our Calendar.");
        return response.text();
      })
      .then((source) => {
        if (alive) setHtml(adaptSource(source));
      })
      .catch(() => {
        if (alive) setHtml(EMPTY_DOCUMENT);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!frame || event.source !== frame.contentWindow || !event.data || typeof event.data !== "object") return;
      const data = event.data as { type?: unknown; calendarNotes?: unknown; index?: unknown };

      if (data.type === "paper-stish:template-ready") {
        iframeReady.current = true;
        const current = resolveNotes(latestValues.current);
        lastFrameNotes.current = JSON.stringify(current);
        frame.contentWindow?.postMessage({
          type: "paper-stish:init",
          editing: latestEditing.current,
          calendarNotes: current,
          images: photos(latestValues.current),
        }, "*");
        return;
      }

      if (data.type === "paper-stish:choose-photo" && latestEditing.current &&
          typeof data.index === "number" && data.index >= 0 && data.index < 5) {
        onPhotoClick?.(data.index);
        return;
      }

      if (data.type === "paper-stish:change" && latestEditing.current && Array.isArray(data.calendarNotes)) {
        const current = resolveNotes(latestValues.current);
        const incomingNotes = data.calendarNotes as unknown[];
        const next = OUR_CALENDAR_DEFAULT_NOTES.map((fallback, index) => {
          const value = incomingNotes[index];
          return typeof value === "string" ? value.slice(0, 300) : current[index] ?? fallback;
        });
        lastFrameNotes.current = JSON.stringify(next);
        next.forEach((value, index) => {
          if (value !== current[index]) onNotesChange?.(index, value);
        });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onNotesChange, onPhotoClick]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!iframeReady.current || !frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "paper-stish:update-photos", images: photos(values) }, "*");
  }, [values?.images]);

  useEffect(() => {
    const current = resolveNotes(values);
    const snapshot = JSON.stringify(current);
    if (!iframeReady.current || snapshot === lastFrameNotes.current) return;
    lastFrameNotes.current = snapshot;
    iframeRef.current?.contentWindow?.postMessage({ type: "paper-stish:update-text", calendarNotes: current }, "*");
  }, [values?.calendarNotes]);

  useEffect(() => {
    if (!iframeReady.current) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "paper-stish:set-editing", editing }, "*");
  }, [editing]);

  return (
    <main className={styles.screen}>
      <iframe
        ref={iframeRef}
        title="Our Calendar"
        className={styles.frame}
        srcDoc={html}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
      />
      {editing && onExit && (
        <button type="button" className={styles.backButton} onClick={onExit} aria-label="Back to website templates">
          <span aria-hidden="true">←</span>
          <span>Templates</span>
        </button>
      )}
    </main>
  );
}
