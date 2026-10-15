"use client";

import { useEffect, useRef } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./OurCalendarTemplate.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TEMPLATE_FRAME_URL = `${BASE_PATH}/api/our-calendar-frame`;

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
 * Open the original template directly in an iframe served by the lightweight
 * runtime route. The browser does not wait for a client-side fetch or React
 * loading state; the original uploaded HTML file remains unchanged.
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const latestValues = useRef(values);
  const latestEditing = useRef(editing);
  const lastFrameNotes = useRef<string | null>(null);

  latestValues.current = values;
  latestEditing.current = editing;

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

  const screenClassName = editing ? `${styles.screen} ${styles.editorScreen}` : styles.screen;

  return (
    <main className={screenClassName}>
      <iframe
        ref={iframeRef}
        title="Our Calendar"
        className={styles.frame}
        src={`${TEMPLATE_FRAME_URL}?editing=${editing ? "1" : "0"}`}
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
