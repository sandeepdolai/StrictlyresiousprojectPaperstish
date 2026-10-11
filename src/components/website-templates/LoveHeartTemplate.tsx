"use client";

import { useEffect, useState } from "react";
import styles from "./LoveHeartTemplate.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ANIMATION_URL = `${BASE_PATH}/website-templates/love-heart.html.gz.b64`;
const EMPTY_DOCUMENT =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;background:#060208;overflow:hidden}</style></head><body></body></html>';

interface Props {
  /** Show the editor-only exit control; the published website has no controls. */
  editing?: boolean;
  onExit?: () => void;
}

/**
 * Reuses the uploaded browser-native animation as-is inside a sandboxed srcDoc.
 * The source page has no external dependencies, and its script cannot access
 * the parent Paper Stish page or its storage.
 */
export function LoveHeartTemplate({ editing = false, onExit }: Props) {
  const [html, setHtml] = useState<string>(EMPTY_DOCUMENT);

  useEffect(() => {
    let alive = true;

    fetch(ANIMATION_URL, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the Love Heart animation.");
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
        // Keep the template's dark canvas surface if the static page cannot load.
        if (alive) setHtml(EMPTY_DOCUMENT);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className={styles.screen}>
      <iframe
        title="Love Heart — animated website"
        className={styles.frame}
        srcDoc={html}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
      />
      {editing && onExit && (
        <button
          type="button"
          className={styles.backButton}
          onClick={onExit}
          aria-label="Back to website templates"
        >
          <span aria-hidden="true">←</span>
          <span>Templates</span>
        </button>
      )}
    </main>
  );
}
