"use client";

import type { TemplatePublicationValues } from "@/lib/publications";
import styles from "./ForeverAndEverTemplate.module.css";

type EditableField = "heading";

interface Props {
  values?: TemplatePublicationValues;
  title?: string;
  editing?: boolean;
  onTextChange?: (field: EditableField, value: string) => void;
  onParagraphChange?: (index: number, value: string) => void;
  onPhotoClick?: (index: number) => void;
  onExit?: () => void;
}

const EMPTY_PARAGRAPHS = ["", "", "", ""];
const EMPTY_PHOTOS = ["", "", ""];

function PuppyDecoration() {
  return (
    <svg className={styles.puppy} viewBox="0 0 170 150" aria-hidden="true">
      <g stroke="#3b4fa8" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 98 C8 92 4 130 30 128 C34 128 38 124 38 120" fill="#fff" />
        <path d="M140 98 C162 92 166 130 140 128 C136 128 132 124 132 120" fill="#fff" />
        <path d="M34 112 C28 70 52 52 85 52 C118 52 142 70 136 112 C134 128 112 138 85 138 C58 138 36 128 34 112Z" fill="#fff" />
        <path d="M60 66 C64 58 74 55 85 55 C96 55 106 58 110 66" fill="none" />
      </g>
      <path d="M63 96 q7 -8 14 0 M93 96 q7 -8 14 0" fill="none" stroke="#3b4fa8" strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="52" cy="108" rx="9" ry="6" fill="#f6b9c9" opacity=".8" />
      <ellipse cx="118" cy="108" rx="9" ry="6" fill="#f6b9c9" opacity=".8" />
      <path d="M78 108 q7 14 14 0z" fill="#f48aa5" stroke="#3b4fa8" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M82 6 L88 20 L103 21 L92 31 L96 46 L82 38 L68 46 L72 31 L61 21 L76 20Z" fill="#ffe27a" stroke="#7a62c9" strokeWidth="3" strokeLinejoin="round" transform="translate(4,-2)" />
      <path d="M26 30 L31 40 L42 41 L34 48 L37 59 L26 53 L15 59 L18 48 L10 41 L21 40Z" fill="#f4a9d0" stroke="#7a62c9" strokeWidth="2.6" strokeLinejoin="round" transform="translate(2,4)" />
      <path d="M142 24 L147 34 L158 35 L150 42 L153 53 L142 47 L131 53 L134 42 L126 35 L137 34Z" fill="#8fd3f2" stroke="#7a62c9" strokeWidth="2.6" strokeLinejoin="round" transform="translate(-2,8)" />
    </svg>
  );
}

export function ForeverAndEverTemplate({
  values = {},
  title,
  editing = false,
  onTextChange,
  onParagraphChange,
  onPhotoClick,
  onExit,
}: Props) {
  const heading = editing ? (values.heading ?? "") : values.heading?.trim() ?? "";
  const paragraphs = values.letterParagraphs ?? EMPTY_PARAGRAPHS;
  const photos = [...(values.images ?? []), ...EMPTY_PHOTOS].slice(0, 3);

  return (
    <main className={styles.viewport}>
      <article className={styles.page} aria-label="Notebook love letter">
        <div className={styles.binding} aria-hidden="true" />
        <div className={styles.topGrid}>
          <section className={styles.letter} aria-label="Love letter">
            {EMPTY_PARAGRAPHS.map((_, index) => editing ? (
              <textarea
                key={index}
                className={`${styles.paragraphArea} ${styles["paragraph" + (index + 1)]}`}
                value={paragraphs[index] ?? ""}
                maxLength={1200}
                rows={4}
                aria-label={`Letter paragraph ${index + 1}`}
                placeholder={`Write letter paragraph ${index + 1}…`}
                onChange={(event) => onParagraphChange?.(index, event.currentTarget.value)}
              />
            ) : (
              paragraphs[index]?.trim()
                ? <p key={index} className={styles.paragraph}>{paragraphs[index]}</p>
                : null
            ))}
          </section>

          <section className={styles.strip} aria-label="Three personal photos">
            {EMPTY_PHOTOS.map((_, index) => {
              const photo = photos[index];
              return (
                <figure className={styles.photoFigure} key={index}>
                  {editing ? (
                    <button
                      type="button"
                      className={styles.photoSlot}
                      onClick={() => onPhotoClick?.(index)}
                      aria-label={"Choose photo " + (index + 1)}
                    >
                      {photo ? <img src={photo} alt="" /> : (
                        <span className={styles.photoPlaceholder}>
                          <span className={styles.plus} aria-hidden="true">+</span>
                          <span>Add photo {index + 1}</span>
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className={styles.photoSlot} aria-label={photo ? "Personal photo " + (index + 1) : undefined}>
                      {photo ? <img src={photo} alt="" /> : null}
                    </div>
                  )}
                </figure>
              );
            })}
            <span className={styles.spark} style={{left:"-18px",top:"-16px"}} aria-hidden="true">✦</span>
            <span className={styles.sparkSmall} style={{left:"26px",top:"-14px"}} aria-hidden="true">✦</span>
            <span className={styles.sparkSide} style={{right:"-17px",top:"82%"}} aria-hidden="true">✦</span>
          </section>
        </div>

        <section className={styles.banner} aria-label="Letter heading">
          <PuppyDecoration />
          {editing ? (
            <textarea
              className={styles.headingInput}
              value={heading}
              maxLength={200}
              rows={2}
              aria-label="Letter heading"
              placeholder="Add your heading…"
              onChange={(event) => onTextChange?.("heading", event.currentTarget.value)}
            />
          ) : heading ? (
            <h1 className={styles.heading}>{heading}</h1>
          ) : null}
          <span className={styles.corner} aria-hidden="true" />
          <span className={styles.swoosh} aria-hidden="true" />
          <span className={styles.bannerSpark} aria-hidden="true">✦</span>
        </section>

        <footer className={styles.footer}>
          <span>MADE WITH A LITTLE EXTRA LOVE</span>
          <span>{title?.trim() || "YOUR WORDS, YOUR MEMORIES"} · paper stish</span>
        </footer>
      </article>

      {editing && onExit && (
        <button type="button" className={styles.backButton} onClick={onExit} aria-label="Back to website templates">
          <span aria-hidden="true">←</span>
          <span>Templates</span>
        </button>
      )}
    </main>
  );
}
