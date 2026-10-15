"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ClipboardEvent, DragEvent, KeyboardEvent } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./BirthdayTodayTemplate.module.css";

const SLOT_CLASSES = ["slotA", "slotB", "slotC", "slotD"] as const;

interface Props {
  values?: TemplatePublicationValues;
  editing?: boolean;
  onBirthdayNameChange?: (value: string) => void;
  onPhotoClick?: (index: number) => void;
  onPhotoFile?: (index: number, file: File) => void;
  onPhotoRemove?: (index: number) => void;
  onExit?: () => void;
}

/**
 * Native React version of the uploaded "who's birthday is it today?" HTML.
 * Keeps the source composition and responsive portrait/landscape geometry,
 * while the shared WebsiteEditor owns the name/photo data and publishing.
 */
export function BirthdayTodayTemplate({
  values,
  editing = false,
  onBirthdayNameChange,
  onPhotoClick,
  onPhotoFile,
  onPhotoRemove,
  onExit,
}: Props) {
  const nameRef = useRef<HTMLDivElement>(null);
  const birthdayName = typeof values?.birthdayName === "string" ? values.birthdayName : "";
  const images = useMemo(
    () => Array.from({ length: 4 }, (_, index) =>
      typeof values?.images?.[index] === "string" ? values.images[index] as string : ""),
    [values?.images],
  );

  const fitName = useCallback(() => {
    const element = nameRef.current;
    if (!element) return;
    let factor = 1;
    element.style.setProperty("--nf", "1");
    while (element.scrollWidth > element.clientWidth + 1 && factor > 0.4) {
      factor = Math.max(0.4, factor - 0.05);
      element.style.setProperty("--nf", factor.toFixed(2));
    }
  }, []);

  useEffect(() => {
    const element = nameRef.current;
    if (!element) return;
    if (document.activeElement !== element && element.textContent !== birthdayName) {
      element.textContent = birthdayName;
    }
    fitName();
  }, [birthdayName, editing, fitName]);

  useEffect(() => {
    const element = nameRef.current;
    if (!element) return;
    const measure = () => fitName();
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer) observer.observe(element);
    if (document.fonts?.ready) void document.fonts.ready.then(measure);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [fitName]);

  const handleNameInput = (element: HTMLDivElement) => {
    const next = (element.textContent || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 40);
    if (element.textContent !== next) element.textContent = next;
    fitName();
    onBirthdayNameChange?.(next);
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const handleNamePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\s+/g, " ").slice(0, 40);
    event.currentTarget.textContent = pasted;
    fitName();
    onBirthdayNameChange?.(pasted);
  };

  const dropPhoto = (index: number, event: DragEvent<HTMLButtonElement>) => {
    if (!editing) return;
    event.preventDefault();
    event.currentTarget.classList.remove(styles.over);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onPhotoFile?.(index, file);
  };

  return (
    <main className={styles.stage}>
      <div className={styles.story}>
        <div className={styles.head}>
          <div className={styles.search} role="search" aria-label="who’s birthday is it today?">
            <svg className={styles.google} viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span className={styles.searchText}>who’s birthday is it today?</span>
            <svg className={styles.microphone} viewBox="0 0 24 36" aria-hidden="true">
              <rect x="7" y="1" width="10" height="19" rx="5" fill="#4285F4" />
              <path d="M3 15v1.5a9 9 0 0 0 18 0V15" fill="none" stroke="#FBBC05" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M3 15v1.5a9 9 0 0 0 4.2 7.6" fill="none" stroke="#EA4335" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M21 15v1.5a9 9 0 0 1-4.2 7.6" fill="none" stroke="#34A853" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M12 27v7M8 34h8" fill="none" stroke="#EA4335" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>

          <div className={styles.sub}>
            <svg className={styles.scribble} viewBox="0 0 140 88" aria-hidden="true">
              <path d="M9 16C-1 27 5 43 22 43c15 0 22-11 14-20-7-8-19 0-14 12 6 14 30 18 50 11" />
              <path d="M96 46C77 33 80 12 95 12c7 0 9 7 9 7s2-7 11-7c14 0 17 22-4 34" />
              <path d="M91 47c13 6 28 9 43 9M125 50l10 6-11 5" />
            </svg>
            <div
              ref={nameRef}
              className={styles.name}
              contentEditable={editing}
              suppressContentEditableWarning
              role="textbox"
              aria-label="Birthday person’s name"
              aria-readonly={!editing}
              aria-multiline="false"
              data-ph="type a name"
              spellCheck={false}
              onInput={(event) => { if (editing) handleNameInput(event.currentTarget); }}
              onKeyDown={handleNameKeyDown}
              onPaste={handleNamePaste}
              onBlur={fitName}
            />
          </div>
        </div>

        <div className={styles.photos}>
          {images.map((image, index) => (
            <div key={SLOT_CLASSES[index]} className={styles.slot + " " + styles[SLOT_CLASSES[index]]}>
              <button
                type="button"
                className={styles.photo}
                aria-label={(image ? "Change photo " : "Add photo ") + (index + 1)}
                disabled={!editing}
                onClick={() => { if (editing) onPhotoClick?.(index); }}
                onDragOver={(event) => { if (editing) { event.preventDefault(); event.currentTarget.classList.add(styles.over); } }}
                onDragLeave={(event) => event.currentTarget.classList.remove(styles.over)}
                onDrop={(event) => dropPhoto(index, event)}
              >
                {image ? <img src={image} alt={"Birthday memory " + (index + 1)} draggable={false} /> : null}
                {!image && (
                  <span className={styles.hint}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    add photo
                  </span>
                )}
              </button>
              {editing && image && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={"Remove photo " + (index + 1)}
                  onClick={() => onPhotoRemove?.(index)}
                >×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing && onExit && (
        <button type="button" className={styles.backButton} onClick={onExit} aria-label="Back to website templates">
          <span aria-hidden="true">←</span>
          <span>Templates</span>
        </button>
      )}
    </main>
  );
}
