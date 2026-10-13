"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./LoveHeartTemplate.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ANIMATION_URL = `${BASE_PATH}/website-templates/love-heart.html.gz.b64`;
const EMPTY_DOCUMENT =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;background:#060208;overflow:hidden}</style></head><body></body></html>';
const DEFAULT_LOVE_MESSAGE = "I Love You, Your Loved One Name♡";
const FRAME_SOURCE = "paper-stish-love-heart";
const PARENT_SOURCE = "paper-stish-love-heart-parent";

interface Props {
  /** Show the editor-only exit control; the published website has no controls. */
  editing?: boolean;
  values?: TemplatePublicationValues;
  onTextChange?: (field: "loveMessage", value: string) => void;
  onPhotoClick?: (index: number) => void;
  onExit?: () => void;
}

/**
 * Reuses the uploaded browser-native animation inside a sandboxed srcDoc.
 * The parent-page bridge explicitly synchronizes the editable greeting/photo
 * into the publication snapshot; the iframe never accesses browser storage.
 */
export function LoveHeartTemplate({
  editing = false,
  values,
  onTextChange,
  onPhotoClick,
  onExit,
}: Props) {
  const [html, setHtml] = useState<string>(EMPTY_DOCUMENT);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const latestValues = useRef(values);

  useEffect(() => {
    latestValues.current = values;
  }, [values]);

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
        // The iframe is sandboxed without same-origin access. postMessage is
        // the narrow bridge for photo selection and greeting persistence.
        const bridgeScript = `<script>
          (() => {
            const editing = ${editing ? "true" : "false"};
            const frameSource = "${FRAME_SOURCE}";
            const parentSource = "${PARENT_SOURCE}";
            const slot = document.getElementById("photoSlot");
            const image = document.getElementById("uploadedPhoto");
            const placeholder = document.getElementById("photoPlaceholder");
            const message = document.getElementById("loveMessage");
            if (!slot || !image || !placeholder || !message) return;

            function showPlaceholder() {
              image.removeAttribute("src");
              image.hidden = true;
              placeholder.hidden = false;
              slot.classList.remove("has-photo");
            }

            function setPhoto(url) {
              if (typeof url !== "string" || !/^(?:data:image\\/|https?:\\/\\/)/i.test(url)) {
                showPlaceholder();
                return;
              }
              image.onload = () => {
                image.hidden = false;
                placeholder.hidden = true;
                slot.classList.add("has-photo");
              };
              image.onerror = showPlaceholder;
              image.src = url;
            }

            const photoAction = placeholder.querySelector(".photo-action");
            if (!editing) {
              message.contentEditable = "false";
              message.setAttribute("aria-readonly", "true");
              if (photoAction) photoAction.hidden = true;
            }

            // Capture-phase handler prevents the embedded preview's temporary
            // object-URL picker from swallowing the parent editor's durable upload.
            slot.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopImmediatePropagation();
              if (editing) {
                window.parent.postMessage({ source: frameSource, type: "choose-photo" }, "*");
              }
            }, true);

            if (editing) {
              message.addEventListener("input", () => {
                const value = (message.textContent || "").replace(/[\\r\\n]+/g, " ").replace(/\\s+/g, " ").slice(0, 100);
                window.parent.postMessage({ source: frameSource, type: "love-message-change", value }, "*");
              });
            }

            window.addEventListener("message", (event) => {
              if (event.source !== window.parent || !event.data || event.data.source !== parentSource) return;
              if (event.data.type !== "set-state") return;
              setPhoto(event.data.photoUrl);
              if (typeof event.data.loveMessage === "string" &&
                  (document.activeElement !== message || message.textContent !== event.data.loveMessage)) {
                message.textContent = event.data.loveMessage.slice(0, 100);
              }
              message.contentEditable = editing ? "true" : "false";
              message.setAttribute("aria-readonly", editing ? "false" : "true");
              if (photoAction) photoAction.hidden = !editing;
            });

            window.parent.postMessage({ source: frameSource, type: "ready" }, "*");
          })();
        </script>`;
        const bodyClose = source.toLowerCase().lastIndexOf("</body>");
        const bridged = bodyClose >= 0
          ? source.slice(0, bodyClose) + bridgeScript + source.slice(bodyClose)
          : source + bridgeScript;
        if (alive) setHtml(bridged);
      })
      .catch(() => {
        // Keep the template's dark canvas surface if the static page cannot load.
        if (alive) setHtml(EMPTY_DOCUMENT);
      });

    return () => {
      alive = false;
    };
  }, [editing]);

  useEffect(() => {
    const frame = iframeRef.current;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!frame || event.source !== frame.contentWindow || !event.data || typeof event.data !== "object") return;
      const data = event.data as { source?: unknown; type?: unknown; value?: unknown };
      if (data.source !== FRAME_SOURCE) return;

      if (data.type === "ready") {
        iframeReady.current = true;
        const current = latestValues.current;
        frame.contentWindow?.postMessage(
          {
            source: PARENT_SOURCE,
            type: "set-state",
            photoUrl: current?.photoUrl ?? null,
            loveMessage: current?.loveMessage ?? DEFAULT_LOVE_MESSAGE,
          },
          "*",
        );
        return;
      }

      if (data.type === "choose-photo" && editing) {
        onPhotoClick?.(0);
        return;
      }

      if (data.type === "love-message-change" && editing && typeof data.value === "string") {
        onTextChange?.("loveMessage", data.value.slice(0, 100));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editing, onPhotoClick, onTextChange]);

  // Publish-time upload replaces the local data URL with a durable Cloudinary
  // URL in the server snapshot. Updating photoUrl here immediately refreshes
  // the embedded preview without restarting the heart animation.
  useEffect(() => {
    if (!iframeReady.current) return;
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: PARENT_SOURCE,
        type: "set-state",
        photoUrl: values?.photoUrl ?? null,
        loveMessage: values?.loveMessage ?? DEFAULT_LOVE_MESSAGE,
      },
      "*",
    );
  }, [editing, html, values?.photoUrl, values?.loveMessage]);

  return (
    <main className={styles.screen}>
      <iframe
        ref={iframeRef}
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
