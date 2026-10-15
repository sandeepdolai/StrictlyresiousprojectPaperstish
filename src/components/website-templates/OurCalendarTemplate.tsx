"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, KeyboardEvent, PointerEvent } from "react";
import type { TemplatePublicationValues } from "@/lib/publications";
import { isValidCalendarHeartDate, type CalendarHeartDate } from "@/lib/calendarHeartValue";
import styles from "./OurCalendarTemplate.module.css";

const PHOTO_MASKS = ["data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22264%22%20height%3D%22254%22%20viewBox%3D%220%200%20264%20254%22%20preserveAspectRatio%3D%22none%22%3E%3Cpath%20d%3D%22M187%2011L184%2011L183%2010L178%2010L177%209L172%209L171%208L155%208L148%204L146%204L142%202L137%202L136%203L133%203L132%204L127%205L121%208L115%208L114%209L108%209L107%2010L102%2010L98%2012L92%2018L89%2018L88%2019L84%2019L80%2021L73%2028L71%2028L67%2030L61%2036L55%2039L40%2054L39%2057L28%2068L26%2073L21%2078L18%2084L16%2093L12%2098L11%20100L11%20102L10%20103L10%20106L9%20107L9%20112L8%20113L8%20124L7%20125L7%20132L6%20133L6%20139L5%20140L5%20142L3%20146L3%20149L2%20150L2%20158L3%20159L3%20164L4%20165L4%20167L6%20171L6%20174L7%20175L7%20181L8%20182L8%20186L9%20187L9%20190L10%20191L11%20196L13%20198L14%20201L16%20203L19%20210L22%20213L25%20214L32%20222L37%20224L45%20232L47%20233L50%20233L51%20234L54%20234L58%20236L61%20239L65%20241L72%20242L73%20243L75%20243L79%20245L92%20245L93%20246L95%20246L98%20249L100%20250L103%20250L104%20251L111%20251L112%20250L115%20250L116%20249L118%20249L124%20246L142%20246L143%20245L148%20245L149%20244L153%20244L154%20243L156%20243L157%20242L161%20242L162%20241L169%20241L171%20240L176%20235L178%20234L180%20234L181%20233L185%20233L186%20232L188%20232L190%20231L195%20226L197%20225L200%20225L204%20223L207%20220L208%20220L214%20215L221%20212L226%20207L228%20206L230%20206L234%20204L242%20195L244%20191L251%20184L252%20182L252%20179L253%20178L253%20175L254%20174L254%20171L258%20167L259%20165L259%20163L260%20162L260%20158L261%20157L261%20129L260%20128L260%20119L259%20118L259%20115L258%20114L258%20112L254%20108L254%20106L253%20105L253%20100L252%2099L252%2096L251%2095L251%2092L250%2091L250%2089L249%2087L244%2082L244%2078L243%2077L243%2071L242%2070L242%2066L241%2064L234%2057L232%2051L224%2044L222%2039L220%2037L219%2037L212%2029L210%2028L208%2028L203%2023L203%2022L201%2020L199%2019L197%2019L191%2013Z%22%20fill%3D%22%2339A96B%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2CHelvetica%2Csans-serif%22%20font-size%3D%2229%22%20font-weight%3D%22700%22%20fill%3D%22%23FFFFFF%22%3EPhoto%20%231%3C%2Ftext%3E%3C%2Fsvg%3E","data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22246%22%20height%3D%22232%22%20viewBox%3D%220%200%20246%20232%22%20preserveAspectRatio%3D%22none%22%3E%3Cpath%20d%3D%22M167%205L163%205L162%204L155%204L154%203L138%203L137%202L116%202L115%203L111%203L110%204L103%204L102%205L99%205L95%207L90%2012L87%2012L86%2013L83%2013L82%2014L77%2014L73%2017L72%2017L67%2022L63%2024L61%2024L59%2025L57%2027L57%2028L52%2033L49%2033L47%2035L47%2037L41%2043L39%2043L37%2045L36%2048L28%2056L26%2061L20%2067L17%2073L16%2080L11%2085L11%2086L9%2088L9%2092L8%2093L8%20100L7%20101L7%20110L6%20111L6%20116L2%20120L2%20161L6%20165L6%20167L7%20168L7%20172L8%20173L8%20177L10%20181L16%20187L21%20197L25%20201L28%20202L31%20205L34%20206L38%20210L40%20211L42%20211L49%20218L51%20218L55%20220L58%20220L59%20221L64%20221L69%20226L71%20227L73%20227L74%20228L79%20228L80%20229L131%20229L132%20228L136%20228L139%20226L141%20226L145%20224L148%20221L154%20221L155%20220L160%20220L161%20219L164%20219L165%20218L167%20218L171%20215L172%20215L176%20211L178%20211L179%20210L182%20210L186%20208L188%20206L189%20206L194%20201L198%20199L200%20199L202%20198L208%20192L211%20191L214%20188L214%20187L223%20179L224%20176L228%20172L231%20171L233%20169L234%20167L234%20157L241%20150L242%20148L242%20140L243%20139L243%20115L242%20114L242%20109L241%20108L241%20105L239%20101L235%2097L235%2095L234%2094L234%2088L233%2087L233%2081L232%2080L232%2077L231%2076L231%2074L225%2068L221%2056L214%2050L214%2047L213%2046L213%2044L206%2037L205%2034L201%2030L201%2029L194%2022L191%2021L185%2015L183%2014L180%2014L179%2013L177%2013L171%207Z%22%20fill%3D%22%2339A96B%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2CHelvetica%2Csans-serif%22%20font-size%3D%2227%22%20font-weight%3D%22700%22%20fill%3D%22%23FFFFFF%22%3EPhoto%20%232%3C%2Ftext%3E%3C%2Fsvg%3E","data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22262%22%20height%3D%22252%22%20viewBox%3D%220%200%20262%20252%22%20preserveAspectRatio%3D%22none%22%3E%3Cpath%20d%3D%22M158%202L153%202L152%203L144%203L143%202L133%202L132%203L128%203L127%204L124%204L123%205L121%205L117%207L114%207L113%208L111%208L107%2010L102%2010L101%2011L99%2011L97%2012L93%2016L91%2017L89%2017L88%2018L85%2018L84%2019L79%2020L73%2027L71%2028L68%2028L67%2029L65%2029L59%2036L57%2036L55%2037L53%2039L53%2041L49%2045L44%2047L36%2055L34%2059L26%2067L24%2073L19%2078L18%2080L18%2082L15%2088L15%2091L14%2092L14%2094L12%2096L12%2097L9%20101L9%20103L8%20104L8%20107L7%20108L7%20114L6%20115L6%20123L5%20124L5%20133L4%20134L4%20141L3%20142L3%20146L2%20147L2%20154L3%20155L3%20160L4%20161L4%20171L5%20172L5%20179L6%20180L6%20184L7%20185L8%20190L10%20194L14%20198L15%20200L15%20202L17%20206L29%20218L29%20219L31%20221L32%20221L36%20224L38%20224L40%20225L48%20233L51%20233L55%20235L58%20235L60%20236L63%20239L69%20242L72%20242L73%20243L78%20243L79%20244L88%20244L89%20245L96%20245L98%20247L100%20247L101%20248L105%20248L106%20249L111%20249L112%20248L121%20248L122%20247L130%20247L132%20245L135%20245L136%20244L139%20244L140%20243L143%20243L144%20242L154%20242L155%20241L160%20241L163%20239L165%20239L171%20235L175%20235L176%20234L181%20234L182%20233L184%20233L186%20232L193%20225L195%20224L198%20224L199%20223L201%20223L203%20221L204%20221L209%20216L211%20216L214%20214L216%20214L218%20213L223%20208L225%20208L230%20203L231%20203L233%20201L233%20200L240%20193L241%20191L241%20189L248%20182L250%20178L251%20173L252%20172L252%20169L256%20165L258%20161L258%20158L259%20157L259%20124L258%20123L258%20119L257%20118L257%20116L255%20112L252%20109L252%20106L251%20105L251%2099L250%2098L250%2095L249%2094L248%2089L242%2083L242%2079L241%2078L241%2075L240%2074L240%2071L239%2070L239%2068L233%2062L233%2060L229%2052L229%2050L222%2043L222%2041L213%2033L212%2030L209%2027L207%2027L202%2022L202%2021L200%2019L198%2018L196%2018L195%2017L193%2017L189%2013L183%2010L180%2010L179%209L176%209L175%208L172%208L171%207L167%207L163%205L161%203L159%203Z%22%20fill%3D%22%2339A96B%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2CHelvetica%2Csans-serif%22%20font-size%3D%2229%22%20font-weight%3D%22700%22%20fill%3D%22%23FFFFFF%22%3EPhoto%20%233%3C%2Ftext%3E%3C%2Fsvg%3E","data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22248%22%20height%3D%22229%22%20viewBox%3D%220%200%20248%20229%22%20preserveAspectRatio%3D%22none%22%3E%3Cpath%20d%3D%22M102%202L95%209L93%2010L83%2010L79%2012L73%2018L71%2019L68%2019L64%2022L63%2022L55%2030L52%2031L45%2039L43%2039L39%2043L39%2045L35%2049L32%2050L30%2052L30%2054L28%2058L22%2064L20%2068L20%2070L19%2071L19%2075L18%2077L14%2081L12%2085L12%2087L11%2088L11%2093L10%2094L10%20101L9%20102L9%20107L8%20108L8%20112L3%20121L3%20125L2%20126L2%20154L5%20158L5%20159L8%20162L9%20164L9%20166L10%20167L10%20171L11%20172L11%20175L13%20179L17%20183L21%20192L24%20195L27%20196L34%20204L42%20208L48%20214L50%20215L53%20215L54%20216L57%20216L58%20217L61%20217L69%20223L71%20223L72%20224L75%20224L76%20225L81%20225L82%20226L86%20226L87%20225L96%20225L97%20224L100%20224L101%20223L106%20223L107%20224L112%20224L113%20225L119%20225L120%20226L125%20226L126%20225L142%20225L143%20224L145%20224L146%20223L148%20223L152%20221L155%20218L157%20217L159%20217L160%20216L166%20216L167%20215L172%20214L174%20212L175%20212L180%20207L183%20207L184%20206L186%20206L190%20204L192%20202L193%20202L198%20197L201%20197L202%20196L204%20196L211%20188L213%20188L215%20187L217%20185L217%20184L226%20176L227%20173L234%20166L234%20164L236%20160L236%20157L239%20153L239%20152L242%20149L242%20147L244%20143L244%20136L245%20135L245%20117L244%20116L244%20110L243%20109L243%20106L242%20105L241%20100L237%2096L237%2094L236%2093L236%2086L235%2085L235%2080L232%2074L232%2072L227%2067L227%2064L226%2063L226%2059L225%2058L224%2053L216%2045L216%2042L215%2040L208%2033L208%2032L194%2019L191%2018L185%2011L183%2010L179%2010L176%208L174%208L169%203L167%202Z%22%20fill%3D%22%2339A96B%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2CHelvetica%2Csans-serif%22%20font-size%3D%2227%22%20font-weight%3D%22700%22%20fill%3D%22%23FFFFFF%22%3EPhoto%20%234%3C%2Ftext%3E%3C%2Fsvg%3E","data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221320%22%20height%3D%22880%22%20viewBox%3D%220%200%201320%20880%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%221320%22%20height%3D%22880%22%20fill%3D%22%2339A96B%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2CHelvetica%2Csans-serif%22%20font-size%3D%2278%22%20font-weight%3D%22700%22%20fill%3D%22%23FFFFFF%22%3EPhoto%20%235%3C%2Ftext%3E%3C%2Fsvg%3E"] as const;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const CAKE_IMAGE = BASE_PATH + "/website-templates/our-calendar-cake.png";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THURS", "FRI", "SAT"];

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
  onHeartChange?: (date: CalendarHeartDate) => void;
  onExit?: () => void;
}

interface MonthView {
  year: number;
  month: number;
}
interface Point {
  x: number;
  y: number;
}
interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startPoint: Point;
  scaleX: number;
  scaleY: number;
}
interface CalendarLayout {
  days: number;
  start: number;
  rows: number;
  width: number;
  height: number;
  scale: number;
  rowHeight: number;
  headerHeight: number;
}

function resolveNotes(values?: TemplatePublicationValues) {
  return OUR_CALENDAR_DEFAULT_NOTES.map((fallback, index) => {
    const value = values?.calendarNotes?.[index];
    return typeof value === "string" ? value : fallback;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = src;
  });
}

function maskedPhoto(photo: HTMLImageElement, mask: HTMLImageElement): string {
  const width = Math.max(1, mask.naturalWidth * 2);
  const height = Math.max(1, mask.naturalHeight * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
  const drawWidth = photo.naturalWidth * scale;
  const drawHeight = photo.naturalHeight * scale;
  context.drawImage(photo, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function getCalendarLayout(view: MonthView, width: number, height: number): CalendarLayout {
  const days = new Date(view.year, view.month + 1, 0).getDate();
  const start = new Date(view.year, view.month, 1).getDay();
  const rows = Math.ceil((start + days) / 7);
  const scale = Math.min(width / 990, height / 740);
  const rowHeight = height / (1.02 + rows);
  return {
    days,
    start,
    rows,
    width,
    height,
    scale,
    rowHeight,
    headerHeight: rowHeight * 1.02,
  };
}

function pointForDay(day: number, layout: CalendarLayout): Point {
  const index = day + layout.start - 1;
  return {
    x: ((index % 7) + 0.5) / 7 * layout.width,
    y: layout.headerHeight + (Math.floor(index / 7) + 0.5) * layout.rowHeight - 0.2 * layout.rowHeight,
  };
}

function clampPoint(point: Point, layout: CalendarLayout): Point {
  const marginX = 71 * layout.scale;
  const marginY = 57 * layout.scale;
  return {
    x: Math.max(marginX, Math.min(layout.width - 65 * layout.scale, point.x)),
    y: Math.max(marginY, Math.min(layout.height - 55 * layout.scale, point.y)),
  };
}

function nearestDay(point: Point, layout: CalendarLayout): number {
  let bestDay = 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let day = 1; day <= layout.days; day += 1) {
    const target = pointForDay(day, layout);
    const dx = target.x - point.x;
    const dy = target.y - point.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDay = day;
    }
  }
  return bestDay;
}

function Note({
  index,
  value,
  editing,
  position,
  alignRight,
  onChange,
}: {
  index: number;
  value: string;
  editing: boolean;
  position: CSSProperties;
  alignRight?: boolean;
  onChange?: (index: number, value: string) => void;
}) {
  const noteRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = noteRef.current;
    if (!element) return;
    const current = (element.innerText || element.textContent || "").replace(/\r/g, "").replace(/\n$/, "");
    if (current === value) return;
    element.replaceChildren();
    value.split("\n").forEach((line, lineIndex) => {
      if (lineIndex > 0) element.appendChild(document.createElement("br"));
      element.appendChild(document.createTextNode(line));
    });
  }, [value]);

  return (
    <p
      ref={noteRef}
      className={alignRight ? "txt r" : "txt"}
      style={position}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      onInput={(event) => {
        if (!editing) return;
        const next = (event.currentTarget.innerText || "").replace(/\r/g, "").replace(/\n$/, "");
        onChange?.(index, next.slice(0, 300));
      }}
      aria-label={"Memory note " + (index + 1)}
    />
  );
}

/**
 * Native React rendering for Our Calendar. This intentionally does not use
 * an iframe, a separate document, or a postMessage bridge. It fills the
 * existing website-editor viewport and lets that viewport own mobile scroll.
 */
export function OurCalendarTemplate({
  values,
  editing = false,
  onNotesChange,
  onPhotoClick,
  onPhotoFile,
  onPhotosReset,
  onHeartChange,
  onExit,
}: Props) {
  const bookItemsRef = useRef<HTMLDivElement>(null);
  const heartSvgRef = useRef<SVGSVGElement>(null);
  const photoRefs = useRef<Array<HTMLImageElement | null>>([]);
  const dragRef = useRef<DragState | null>(null);
  const tipsInteractedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.add("paper-stish-calendar-active");
    return () => document.documentElement.classList.remove("paper-stish-calendar-active");
  }, []);

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<MonthView>(() => ({
    year: values?.calendarHeart?.year ?? today.getFullYear(),
    month: values?.calendarHeart?.month ?? today.getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState(() => values?.calendarHeart?.day ?? today.getDate());
  const [svgSize, setSvgSize] = useState({ width: 990, height: 740 });
  const [dragPosition, setDragPosition] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const markTipsSeen = () => {
    try {
      window.localStorage.setItem("tipSeen", "1");
    } catch {
      // Tips still work when browser storage is unavailable.
    }
  };

  const closeTips = () => {
    tipsInteractedRef.current = true;
    setTipsOpen(false);
    markTipsSeen();
  };

  const toggleTips = () => {
    tipsInteractedRef.current = true;
    setTipsOpen((open) => {
      if (open) markTipsSeen();
      return !open;
    });
  };

  useEffect(() => {
    if (!editing) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem("tipSeen") === "1";
    } catch {
      // Treat unavailable storage as a first visit.
    }
    if (seen) return;
    const timer = window.setTimeout(() => {
      if (!tipsInteractedRef.current) setTipsOpen(true);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [editing]);

  useEffect(() => {
    if (!tipsOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        tipsInteractedRef.current = true;
        setTipsOpen(false);
        try {
          window.localStorage.setItem("tipSeen", "1");
        } catch {
          // The panel can close even when storage is unavailable.
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tipsOpen]);

  const notes = useMemo(() => resolveNotes(values), [values?.calendarNotes]);
  const images = useMemo(
    () => Array.from({ length: 5 }, (_, index) => typeof values?.images?.[index] === "string" ? values.images[index] as string : ""),
    [values?.images],
  );
  useEffect(() => {
    const savedHeart = values?.calendarHeart;
    if (!savedHeart) return;
    setView((current) => current.year === savedHeart.year && current.month === savedHeart.month
      ? current
      : { year: savedHeart.year, month: savedHeart.month });
    setSelectedDay((current) => current === savedHeart.day ? current : savedHeart.day);
    setDragPosition(null);
  }, [values?.calendarHeart?.year, values?.calendarHeart?.month, values?.calendarHeart?.day]);
  const layout = useMemo(() => getCalendarLayout(view, svgSize.width, svgSize.height), [view, svgSize]);
  const defaultHeartPoint = clampPoint(pointForDay(Math.min(selectedDay, layout.days), layout), layout);
  const visibleHeartPoint = dragPosition ?? defaultHeartPoint;
  const heartTransform =
    "translate(" + (visibleHeartPoint.x - 495 * layout.scale) + "px," +
    (visibleHeartPoint.y - 285 * layout.scale) + "px) scale(" + layout.scale + ")";
  const calendarRows = Array.from({ length: layout.rows * 7 }, (_, index) => {
    const day = index - layout.start + 1;
    return { day, valid: day >= 1 && day <= layout.days };
  });

  useEffect(() => {
    const svg = heartSvgRef.current;
    if (!svg) return;
    const measure = () => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setSvgSize((current) =>
        Math.abs(current.width - rect.width) < 0.5 && Math.abs(current.height - rect.height) < 0.5
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const box = bookItemsRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const resize = () => {
      const width = box.clientWidth;
      const height = box.clientHeight;
      if (width && height) box.style.setProperty("--f", Math.min(1, 0.7022 * height / width).toFixed(3));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyPhotos = async () => {
      for (let index = 0; index < 5; index += 1) {
        const element = photoRefs.current[index];
        if (!element) continue;
        const source = images[index];
        const maskSource = PHOTO_MASKS[index];
        if (!source) {
          element.src = maskSource;
          continue;
        }
        if (index === 4) {
          element.src = source;
          continue;
        }
        try {
          const [photo, mask] = await Promise.all([loadImage(source), loadImage(maskSource)]);
          if (cancelled || !photoRefs.current[index]) continue;
          element.src = maskedPhoto(photo, mask);
        } catch {
          if (!cancelled) element.src = source;
        }
      }
    };
    void applyPhotos();
    return () => { cancelled = true; };
  }, [images]);


  const changeMonth = (delta: number) => {
    const nextDate = new Date(view.year, view.month + delta, 1);
    const nextDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    const nextSelectedDay = Math.min(selectedDay, nextDays);
    const nextView = { year: nextDate.getFullYear(), month: nextDate.getMonth() };
    setSelectedDay(nextSelectedDay);
    setView(nextView);
    setDragPosition(null);
    onHeartChange?.({ ...nextView, day: nextSelectedDay });
  };

  const goToToday = () => {
    const todayView = { year: today.getFullYear(), month: today.getMonth() };
    setView(todayView);
    setSelectedDay(today.getDate());
    setDragPosition(null);
    onHeartChange?.({ ...todayView, day: today.getDate() });
  };

  const handlePhotoClick = (index: number) => {
    if (editing) onPhotoClick?.(index);
  };

  const handleDrop = (index: number, event: DragEvent<HTMLImageElement>) => {
    if (!editing) return;
    event.preventDefault();
    event.currentTarget.classList.remove("over");
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onPhotoFile?.(index, file);
  };

  const beginHeartDrag = (event: PointerEvent<SVGGElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const svg = heartSvgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!svg || !rect?.width || !rect.height) return;
    const point = clampPoint(dragPosition ?? defaultHeartPoint, layout);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPoint: point,
      scaleX: layout.width / rect.width,
      scaleY: layout.height / rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragPosition(point);
    setDragging(true);
    event.preventDefault();
  };

  const moveHeartDrag = (event: PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampPoint({
      x: drag.startPoint.x + (event.clientX - drag.startX) * drag.scaleX,
      y: drag.startPoint.y + (event.clientY - drag.startY) * drag.scaleY,
    }, layout);
    setDragPosition(next);
  };

  const endHeartDrag = (event: PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampPoint({
      x: drag.startPoint.x + (event.clientX - drag.startX) * drag.scaleX,
      y: drag.startPoint.y + (event.clientY - drag.startY) * drag.scaleY,
    }, layout);
    const day = nearestDay(next, layout);
    setSelectedDay(day);
    onHeartChange?.({ year: view.year, month: view.month, day });
    dragRef.current = null;
    setDragPosition(null);
    setDragging(false);
  };

  const handleHeartKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!delta) return;
    const next = selectedDay + delta;
    if (next >= 1 && next <= layout.days) {
      setSelectedDay(next);
      onHeartChange?.({ year: view.year, month: view.month, day: next });
    }
    event.preventDefault();
  };

  const startSlotDrag = (index: number, event: DragEvent<HTMLImageElement>) => {
    if (!editing) return;
    event.preventDefault();
    event.currentTarget.classList.add("over");
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    void index;
  };

  return (
    <main className="calendarRoot">
      <div className="book" aria-label="Open book: memories page and calendar">
        <section className="page left" aria-label="Memories page">
          <div className="lbox" ref={bookItemsRef}>
            <Note index={0} value={notes[0]} editing={editing} position={{ left: "21.7%", top: "2.5%" }} onChange={onNotesChange} />
            <Note index={1} value={notes[1]} editing={editing} alignRight position={{ right: "17%", top: "14.9%" }} onChange={onNotesChange} />
            {([0, 1] as const).map((index) => {
              const slot = index === 0 ? "b1" : "b2";
              const placement: CSSProperties = index === 0
                ? { left: "4.66%", top: "13.21%", width: "17.81%", ["--r" as string]: "-4deg" }
                : { left: "79%", top: "26.74%", width: "16.6%", ["--r" as string]: "3deg" };
              return (
                <img
                  key={slot}
                  ref={(element) => { photoRefs.current[index] = element; }}
                  className="blob"
                  data-slot={slot}
                  tabIndex={editing ? 0 : -1}
                  role={editing ? "button" : undefined}
                  title={editing ? "Tap to change photo" : undefined}
                  style={placement}
                  alt={"Photo #" + (index + 1)}
                  src={PHOTO_MASKS[index]}
                  onClick={() => handlePhotoClick(index)}
                  onKeyDown={(event) => { if (editing && (event.key === "Enter" || event.key === " ")) handlePhotoClick(index); }}
                  onDragOver={(event) => startSlotDrag(index, event)}
                  onDragLeave={(event) => event.currentTarget.classList.remove("over")}
                  onDrop={(event) => handleDrop(index, event)}
                />
              );
            })}
            <img className="cake" style={{ left: "21.45%", top: "29.68%", width: "49.5%" }} alt="Illustrated birthday cake with a ribbon bow, one lit candle and a red burst behind it" src={CAKE_IMAGE} />
            <Note index={2} value={notes[2]} editing={editing} position={{ left: "21.7%", top: "63.9%" }} onChange={onNotesChange} />
            <Note index={3} value={notes[3]} editing={editing} alignRight position={{ right: "17%", top: "72.6%" }} onChange={onNotesChange} />
            {([2, 3] as const).map((index) => {
              const slot = index === 2 ? "b3" : "b4";
              const placement: CSSProperties = index === 2
                ? { left: "4.72%", top: "74.13%", width: "17.68%", ["--r" as string]: "-3deg" }
                : { left: "78.73%", top: "86.47%", width: "16.73%", ["--r" as string]: "4deg" };
              return (
                <img
                  key={slot}
                  ref={(element) => { photoRefs.current[index] = element; }}
                  className="blob"
                  data-slot={slot}
                  tabIndex={editing ? 0 : -1}
                  role={editing ? "button" : undefined}
                  title={editing ? "Tap to change photo" : undefined}
                  style={placement}
                  alt={"Photo #" + (index + 1)}
                  src={PHOTO_MASKS[index]}
                  onClick={() => handlePhotoClick(index)}
                  onKeyDown={(event) => { if (editing && (event.key === "Enter" || event.key === " ")) handlePhotoClick(index); }}
                  onDragOver={(event) => startSlotDrag(index, event)}
                  onDragLeave={(event) => event.currentTarget.classList.remove("over")}
                  onDrop={(event) => handleDrop(index, event)}
                />
              );
            })}
          </div>
        </section>

        <section className="page right" aria-label="Calendar page">
          <img
            ref={(element) => { photoRefs.current[4] = element; }}
            className="hero"
            data-slot="hero"
            tabIndex={editing ? 0 : -1}
            role={editing ? "button" : undefined}
            title={editing ? "Tap to change photo" : undefined}
            alt="Photo #5"
            src={PHOTO_MASKS[4]}
            onClick={() => handlePhotoClick(4)}
            onKeyDown={(event) => { if (editing && (event.key === "Enter" || event.key === " ")) handlePhotoClick(4); }}
            onDragOver={(event) => startSlotDrag(4, event)}
            onDragLeave={(event) => event.currentTarget.classList.remove("over")}
            onDrop={(event) => handleDrop(4, event)}
          />
          {editing && (
            <button type="button" className="photo-btn" aria-label="Change the big photo" onClick={() => handlePhotoClick(4)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Change photo
            </button>
          )}
          <div className="monthbar" role="group" aria-label="Choose month">
            <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
              <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L3 10l6 8" />
              </svg>
            </button>
            <div className="mlabel" aria-live="polite">{MONTHS[view.month] + " " + view.year}</div>
            <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
              <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2l6 8-6 8" />
              </svg>
            </button>
            <button type="button" className="today" onClick={goToToday}>Today</button>
          </div>
          <div
            key={view.year + "-" + view.month}
            className="cal"
            role="grid"
            aria-label={MONTHS[view.month] + " " + view.year}
            style={{ gridTemplateRows: "1.02fr repeat(" + layout.rows + ",1fr)" }}
          >
            {DAYS_OF_WEEK.map((day) => <div key={day} className="dow" role="columnheader">{day}</div>)}
            {calendarRows.map(({ day, valid }, index) => {
              const isToday = valid && view.year === today.getFullYear() && view.month === today.getMonth() && day === today.getDate();
              const selected = valid && day === selectedDay;
              return (
                <div
                  key={index}
                  role="gridcell"
                  data-d={valid ? day : undefined}
                  aria-current={isToday ? "date" : undefined}
                  aria-selected={selected ? true : undefined}
                  className={[isToday ? "today-cell" : "", selected ? "heart-date" : ""].filter(Boolean).join(" ") || undefined}
                  onClick={valid ? () => {
                    setSelectedDay(day);
                    setDragPosition(null);
                    onHeartChange?.({ year: view.year, month: view.month, day });
                  } : undefined}
                >
                  {valid ? day : ""}
                </div>
              );
            })}
          </div>
          <svg
            ref={heartSvgRef}
            className="heart"
            viewBox={"0 0 " + svgSize.width + " " + svgSize.height}
            preserveAspectRatio="none"
            aria-label="Move the heart marker between dates"
          >
            <g
              id="hg"
              tabIndex={0}
              role="button"
              aria-label={"Heart marker on " + MONTHS[view.month] + " " + selectedDay + ". Drag it, tap a date, or use the arrow keys to move it."}
              className={dragging ? "drag" : ""}
              style={{ transform: heartTransform }}
              onPointerDown={beginHeartDrag}
              onPointerMove={moveHeartDrag}
              onPointerUp={endHeartDrag}
              onPointerCancel={endHeartDrag}
              onKeyDown={handleHeartKeyDown}
            >
              <path pathLength="1" d="M340 432 C385 445 430 440 462 418 C500 390 520 360 548 322 C575 300 585 262 565 245 C545 228 505 240 490 272 C478 244 446 228 427 244 C405 264 428 304 462 330 C490 352 515 345 540 330" />
              <path pathLength="1" d="M572 340 C548 334 508 336 478 352" />
              <path className="hit" d="M340 432 C385 445 430 440 462 418 C500 390 520 360 548 322 C575 300 585 262 565 245 C545 228 505 240 490 272 C478 244 446 228 427 244 C405 264 428 304 462 330 C490 352 515 345 540 330" />
            </g>
          </svg>
        </section>
      </div>

      {editing && (
        <>
          {tipsOpen && (
            <aside id="calendar-tip-panel" className={styles.tipPanel} role="dialog" aria-modal="false" aria-labelledby="calendar-tip-title">
              <div className={styles.tipHeader}>
                <h2 id="calendar-tip-title">What you can do</h2>
                <button type="button" className={styles.tipClose} onClick={closeTips} aria-label="Close tips">×</button>
              </div>
              <ul className={styles.tipList}>
                <li><span className={styles.tipIcon} aria-hidden="true">♥</span><span><strong>Move the heart</strong>Drag it, tap any date, or use the arrow keys.</span></li>
                <li><span className={styles.tipIcon} aria-hidden="true">📅</span><span><strong>Change the month</strong>Use the arrows on the photo. “Today” brings you back.</span></li>
                <li><span className={styles.tipIcon} aria-hidden="true">📷</span><span><strong>Add your photos</strong>Tap any photo to replace it, or drop a picture onto it.</span></li>
                <li><span className={styles.tipIcon} aria-hidden="true">✏️</span><span><strong>Write your own words</strong>Tap any “add a subheading” text and type.</span></li>
              </ul>
              <div className={styles.tipActions}>
                <button type="button" className={styles.tipReset} onClick={() => { onPhotosReset?.(); closeTips(); }}>Reset photos</button>
                <button type="button" className={styles.tipGotIt} onClick={closeTips}>Got it</button>
              </div>
            </aside>
          )}
          <button
            type="button"
            className={styles.tipButton}
            aria-expanded={tipsOpen}
            aria-controls="calendar-tip-panel"
            onClick={toggleTips}
          >
            <span aria-hidden="true">💡</span>
            Tips
          </button>
        </>
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
