"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./ForeverAndEverTemplate.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TEMPLATE_URL = `${BASE_PATH}/website-templates/forever-and-ever.html.gz.b64`;
const EMPTY_DOCUMENT = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;background:#e9edf5;overflow:hidden}</style></head><body></body></html>';
const BLANK_PARAGRAPHS = ["", "", "", ""];

interface Props {
  values?: TemplatePublicationValues;
  editing?: boolean;
  onTextChange?: (field: "heading", value: string) => void;
  onParagraphChange?: (index: number, value: string) => void;
  onPhotoClick?: (index: number) => void;
  onExit?: () => void;
}

function textState(values?: TemplatePublicationValues) {
  return JSON.stringify({
    heading: values?.heading ?? "",
    letterParagraphs: values?.letterParagraphs ?? BLANK_PARAGRAPHS,
  });
}

/**
 * Renders the exact uploaded HTML file inside an isolated iframe. The HTML's
 * original CSS, fixed coordinates, SVG decorations, spiral art, and responsive
 * scaler remain intact. Only its demo text/photos are blanked in the bundled
 * source; this bridge connects its editable regions to Paper Stish publishing.
 */
export function ForeverAndEverTemplate({
  values,
  editing = false,
  onTextChange,
  onParagraphChange,
  onPhotoClick,
  onExit,
}: Props) {
  const [html, setHtml] = useState(EMPTY_DOCUMENT);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const latestValues = useRef(values);
  const latestEditing = useRef(editing);
  const lastFrameText = useRef<string | null>(null);

  // These refs must reflect render-time state before any iframe message arrives.
  latestValues.current = values;
  latestEditing.current = editing;

  useEffect(() => {
    let alive = true;
    fetch(TEMPLATE_URL, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the original love-letter template.");
        const encoded = (await response.text()).trim();
        const binary = window.atob(encoded);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Response(stream).text();
      })
      .then((source) => {
        if (alive) setHtml(source);
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
      const data = event.data as {
        type?: unknown;
        heading?: unknown;
        letterParagraphs?: unknown;
        index?: unknown;
      };

      if (data.type === "paper-stish:template-ready") {
        iframeReady.current = true;
        const current = latestValues.current;
        lastFrameText.current = textState(current);
        frame.contentWindow?.postMessage({
          type: "paper-stish:init",
          editing: latestEditing.current,
          heading: current?.heading ?? "",
          letterParagraphs: current?.letterParagraphs ?? BLANK_PARAGRAPHS,
          images: current?.images ?? [],
        }, "*");
        return;
      }

      if (data.type === "paper-stish:choose-photo" && latestEditing.current &&
          typeof data.index === "number" && data.index >= 0 && data.index < 3) {
        onPhotoClick?.(data.index);
        return;
      }

      if (data.type === "paper-stish:change" && latestEditing.current) {
        const heading = typeof data.heading === "string" ? data.heading.slice(0, 200) : "";
        const paragraphs = Array.isArray(data.letterParagraphs)
          ? data.letterParagraphs.slice(0, 4).map((value) => typeof value === "string" ? value.slice(0, 1200) : "")
          : BLANK_PARAGRAPHS;
        const nextSnapshot = JSON.stringify({ heading, letterParagraphs: paragraphs });
        lastFrameText.current = nextSnapshot;

        const current = latestValues.current;
        if (heading !== (current?.heading ?? "")) onTextChange?.("heading", heading);
        paragraphs.forEach((value, index) => {
          if (value !== (current?.letterParagraphs?.[index] ?? "")) onParagraphChange?.(index, value);
        });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onTextChange, onParagraphChange, onPhotoClick]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!iframeReady.current || !frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "paper-stish:update-photos", images: values?.images ?? [] }, "*");
  }, [values?.images]);

  useEffect(() => {
    const snapshot = textState(values);
    if (!iframeReady.current || snapshot === lastFrameText.current) return;
    lastFrameText.current = snapshot;
    iframeRef.current?.contentWindow?.postMessage({
      type: "paper-stish:update-text",
      heading: values?.heading ?? "",
      letterParagraphs: values?.letterParagraphs ?? BLANK_PARAGRAPHS,
    }, "*");
  }, [values?.heading, values?.letterParagraphs]);

  useEffect(() => {
    if (!iframeReady.current) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "paper-stish:set-editing", editing }, "*");
  }, [editing]);

  return (
    <main className={styles.screen}>
      <iframe
        ref={iframeRef}
        title="I love you forever and ever, my baby!"
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
