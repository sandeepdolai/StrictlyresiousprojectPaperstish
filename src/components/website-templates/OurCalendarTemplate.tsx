"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./OurCalendarTemplate.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TEMPLATE_URL = `${BASE_PATH}/website-templates/our-calendar-source.html`;
const BRIDGE_URL = `${BASE_PATH}/website-templates/our-calendar-bridge.js`;

export const OUR_CALENDAR_DEFAULT_NOTES = Array.from({ length: 4 }, () =>
  "add a subheading add a\nsubheading add a subheading\nadd a subheading add a\nsubheading add a subheading\nadd a subheading add a\nsubheading add a subheading\nadd a subheading add a\nsubheading",
);

interface Props {
  values?: TemplatePublicationValues;
  editing?: boolean;
  onNotesChange?: (index: number, value: string) => void;
  onPhotoClick?: (index: number) => void;
  onPhotoFile?: (index: number, file: File) => void;
  onPhotosReset?: () => void;
  onExit?: () => void;
}

function resolveNotes(values?: TemplatePublicationValues) {
  return OUR_CALENDAR_DEFAULT_NOTES.map((fallback, index) => {
    const value = values?.calendarNotes?.[index];
    return typeof value === "string" ? value : fallback;
  });
}

function photos(values?: TemplatePublicationValues) {
  return Array.from({ length: 5 }, (_, index) => {
    const value = values?.images?.[index];
    return typeof value === "string" ? value : "";
  });
}

/**
 * Fetch the user's original HTML and attach the external editor bridge only
 * to the iframe document at runtime. The saved HTML in public/ is never edited
 * to wire editor messaging, and errors are shown instead of a blank canvas.
 */
export function OurCalendarTemplate({
  values,
  editing = false,
  onNotesChange,
  onPhotoClick,
  onPhotoFile,
  onPhotosReset,
  onExit,
}: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const latestValues = useRef(values);
  const initialEditing = useRef(editing);
  const latestEditing = useRef(editing);
  const lastFrameNotes = useRef<string | null>(null);

  latestValues.current = values;
  latestEditing.current = editing;

  useEffect(() => {
    let active = true;

    async function loadTemplate() {
      try {
        const response = await fetch(TEMPLATE_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`Template request failed (HTTP ${response.status}).`);

        const source = await response.text();
        if (!source.includes("</body>")) throw new Error("The original calendar HTML is incomplete.");

        const initialEditMode = initialEditing.current;
        const htmlTag = initialEditMode
          ? '<html lang="en">'
          : '<html lang="en" class="paper-stish-readonly">';
        if (!source.includes('<html lang="en">') || !source.includes("</head>")) {
          throw new Error("The original calendar HTML has an unexpected document structure.");
        }

        let documentHtml = source.replace('<html lang="en">', htmlTag);
        const readonlyGuard = '<style id="paper-stish-readonly-guard">.paper-stish-readonly #tipbtn,.paper-stish-readonly #tipcard,.paper-stish-readonly .photo-btn{display:none!important}</style>\n</head>';
        documentHtml = documentHtml.replace("</head>", readonlyGuard);
        if (!initialEditMode) {
          documentHtml = documentHtml.replace(/contenteditable="true"/g, 'contenteditable="false"');
        }

        const bridge = '<script src="' + BRIDGE_URL + '" data-initial-editing="' + (initialEditMode ? "true" : "false") + '"></script>\n</body>';
        documentHtml = documentHtml.replace("</body>", bridge);
        if (active) {
          setHtml(documentHtml);
          setLoadError(null);
        }
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load Our Calendar.");
      }
    }

    void loadTemplate();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!frame || event.source !== frame.contentWindow || !event.data || typeof event.data !== "object") return;
      const data = event.data as {
        type?: unknown;
        calendarNotes?: unknown;
        index?: unknown;
        file?: unknown;
      };

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

      if (data.type === "paper-stish:drop-photo" && latestEditing.current &&
          typeof data.index === "number" && data.index >= 0 && data.index < 5 &&
          typeof File !== "undefined" && data.file instanceof File) {
        onPhotoFile?.(data.index, data.file);
        return;
      }

      if (data.type === "paper-stish:reset-photos" && latestEditing.current) {
        onPhotosReset?.();
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
  }, [onNotesChange, onPhotoClick, onPhotoFile, onPhotosReset]);

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
      {html !== null ? (
        <iframe
          ref={iframeRef}
          title="Our Calendar"
          className={styles.frame}
          srcDoc={html}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          role={loadError ? "alert" : "status"}
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "100dvh",
            padding: "24px",
            textAlign: "center",
            color: loadError ? "#9b1c31" : "#463d2d",
            background: "#fdf5e1",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {loadError ?? "Loading Our Calendar…"}
        </div>
      )}
      {editing && onExit && (
        <button type="button" className={styles.backButton} onClick={onExit} aria-label="Back to website templates">
          <span aria-hidden="true">←</span>
          <span>Templates</span>
        </button>
      )}
    </main>
  );
}
