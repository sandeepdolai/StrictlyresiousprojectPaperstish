"use client";

import { useEffect, useRef } from "react";

const WIDTH = 800;
const HEIGHT = 800;
const BG = "#060208";

type RGB = number[];
type DrawItem = {
  x: number;
  y: number;
  text: string;
  font: string;
  fill: string;
};
type PhraseItem = {
  x: number;
  y: number;
  text: string;
  size: number;
  edge: boolean;
  rad?: number;
  color?: RGB;
  sortKey?: number;
  shadow?: DrawItem;
  halo?: DrawItem;
  main?: DrawItem;
  f?: number;
  dx?: number;
};

const PHRASES = [
  "I love you", "Seni seviyorum", "Te amo", "Je t'aime",
  "Ich liebe dich", "Ti amo", "Eu te amo", "Я тебя люблю",
  "사랑해", "愛してる", "我爱你", "मैं तुमसे प्यार करता हूँ",
  "Σ' αγαπώ", "Ik hou van jou", "Jag älskar dig", "Kocham cię",
  "ฉันรักเธอ", "Anh yêu em", "Aku cinta kamu", "Я тебе кохаю",
];

/** CPython-compatible MT19937 so Random(11), shuffle, choice and uniform
 * follow the same seeded random sequence as the supplied browser version. */
class PythonRandom {
  private mt = new Uint32Array(624);
  private index = 624;

  constructor(seed: number) {
    this.initByArray([seed >>> 0]);
  }

  private initGenRand(seed: number) {
    this.mt[0] = seed >>> 0;
    for (let i = 1; i < 624; i += 1) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.index = 624;
  }

  private initByArray(key: number[]) {
    this.initGenRand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(624, key.length); k > 0; k -= 1) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      const v = (this.mt[i] ^ Math.imul(prev, 1664525)) >>> 0;
      this.mt[i] = (v + key[j] + j) >>> 0;
      i += 1;
      j += 1;
      if (i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = 623; k > 0; k -= 1) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      const v = (this.mt[i] ^ Math.imul(prev, 1566083941)) >>> 0;
      this.mt[i] = (v - i) >>> 0;
      i += 1;
      if (i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
    this.index = 624;
  }

  private next32(): number {
    if (this.index >= 624) {
      for (let i = 0; i < 624; i += 1) {
        const y =
          (this.mt[i] & 0x80000000) |
          (this.mt[(i + 1) % 624] & 0x7fffffff);
        this.mt[i] =
          (this.mt[(i + 397) % 624] ^
            (y >>> 1) ^
            ((y & 1) ? 0x9908b0df : 0)) >>> 0;
      }
      this.index = 0;
    }
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  random(): number {
    const a = this.next32() >>> 5;
    const b = this.next32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  private getrandbits(k: number): number {
    if (k <= 0) return 0;
    return this.next32() >>> (32 - k);
  }

  private randbelow(n: number): number {
    const k = Math.floor(Math.log2(n)) + 1;
    let value: number;
    do {
      value = this.getrandbits(k);
    } while (value >= n);
    return value;
  }

  choice<T>(array: T[]): T {
    return array[this.randbelow(array.length)];
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }

  shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = this.randbelow(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

function heart(a: number, scale: number, offsetY: number): [number, number] {
  const x = 16 * Math.pow(Math.sin(a), 3);
  const y =
    13 * Math.cos(a) -
    5 * Math.cos(2 * a) -
    2 * Math.cos(3 * a) -
    Math.cos(4 * a);
  return [x * scale, y * scale + offsetY];
}

function colorHex(color: RGB): string {
  return (
    "#" +
    color
      .map((value) =>
        Math.floor(Math.max(0, Math.min(1, value)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return a.map((value, index) => value + (b[index] - value) * amount);
}

function dim(color: RGB, amount: number): RGB {
  return color.map((value) => value * amount);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function* phraseCycle(rng: PythonRandom): Generator<string> {
  while (true) {
    const order = PHRASES.slice();
    rng.shuffle(order);
    yield* order;
  }
}

/** Build the same fixed phrase layout inside the analytic heart silhouette. */
function buildLayout(
  ctx: CanvasRenderingContext2D,
  rng: PythonRandom,
): PhraseItem[] {
  const scale = 21;
  const offsetY = 20;
  const gap = 7;
  const sizes = [9, 10, 11, 12];
  const fontPx = (size: number) => (size * 4) / 3;
  const fontString = (size: number) => `bold ${fontPx(size)}px Arial, sans-serif`;
  const fontFor = (size: number) => {
    ctx.font = fontString(size);
    return ctx.font;
  };
  const fontMeasure = (text: string, size: number) => {
    fontFor(size);
    return ctx.measureText(text).width;
  };
  const lineSpace = (size: number) => {
    fontFor(size);
    const metrics = ctx.measureText("Mg");
    if (
      Number.isFinite(metrics.fontBoundingBoxAscent) &&
      Number.isFinite(metrics.fontBoundingBoxDescent)
    ) {
      return metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    }
    return fontPx(size) * 1.2;
  };

  const polygon = Array.from({ length: 720 }, (_, i) =>
    heart((2 * Math.PI * i) / 720, scale, offsetY),
  );
  const edges = polygon.map((point, i) => [
    point,
    polygon[(i + 1) % polygon.length],
  ] as const);
  const yMax = Math.max(...polygon.map((point) => point[1]));
  const yMin = Math.min(...polygon.map((point) => point[1]));
  const centerY = (yMax + yMin) / 2;

  function spans(y: number): [number, number][] {
    const xs: number[] = [];
    for (const [[x1, y1], [x2, y2]] of edges) {
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    xs.sort((a, b) => a - b);
    const out: [number, number][] = [];
    for (let i = 0; i < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
    return out;
  }

  function intersect(a: [number, number][], b: [number, number][]) {
    const out: [number, number][] = [];
    for (const leftSpan of a) {
      for (const rightSpan of b) {
        const lo = Math.max(leftSpan[0], rightSpan[0]);
        const hi = Math.min(leftSpan[1], rightSpan[1]);
        if (hi - lo > 14) out.push([lo, hi]);
      }
    }
    return out;
  }

  const cycle = phraseCycle(rng);
  const rowHeight = Math.round(Math.max(...sizes.map(lineSpace))) + 4;
  const half = rowHeight / 2;
  const placed: PhraseItem[] = [];
  let y = yMax - half;
  while (y > yMin + half) {
    const rows = intersect(spans(y + half), spans(y - half));
    for (const [rawLo, rawHi] of rows) {
      const lo = rawLo + 4;
      const hi = rawHi - 4;
      let cursor = lo + rng.uniform(0, 8);
      const line: { x: number; text: string; size: number; width: number }[] = [];
      while (true) {
        let fit: { text: string; size: number; width: number } | null = null;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const text = cycle.next().value;
          if (text === undefined) continue;
          const size = rng.choice(sizes);
          const width = fontMeasure(text, size);
          if (cursor + width <= hi) {
            fit = { text, size, width };
            break;
          }
        }
        if (!fit) break;
        line.push({
          x: cursor + fit.width / 2,
          text: fit.text,
          size: fit.size,
          width: fit.width,
        });
        cursor += fit.width + gap;
      }
      if (!line.length) continue;
      if (line.length > 1) {
        const left = hi - (line[line.length - 1].x + line[line.length - 1].width / 2);
        line.forEach((item, i) => {
          item.x += (left * i) / (line.length - 1);
        });
      } else {
        line[0].x = (lo + hi) / 2;
      }
      line.forEach((item, i) => {
        placed.push({
          x: item.x,
          y,
          text: item.text,
          size: item.size,
          edge: i === 0 || i === line.length - 1,
        });
      });
    }
    y -= rowHeight;
  }

  const wine = [0.58, 0, 0.09];
  const crimson = [0.9, 0.05, 0.14];
  const blood = [0.98, 0.1, 0.16];
  for (const item of placed) {
    item.rad = Math.min(
      1,
      Math.hypot(item.x / (16 * scale), (item.y - centerY) / (14.5 * scale)),
    );
    let base = mix(wine, crimson, 0.25 + 0.75 * item.rad);
    base = mix(
      base,
      blood,
      rng.uniform(0, 0.35) + (item.edge ? 0.3 : 0),
    );
    item.color = base.map((value) => Math.min(1, value));
  }

  const outer = placed.filter((item) => item.edge);
  const inner = placed.filter((item) => !item.edge);
  const angle = (item: PhraseItem) =>
    ((Math.atan2(item.x, item.y - centerY) % (2 * Math.PI)) + 2 * Math.PI) %
    (2 * Math.PI);
  outer.sort((a, b) => angle(a) - angle(b));
  for (const item of inner) item.sortKey = -(item.rad ?? 0) + rng.uniform(0, 0.08);
  inner.sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0));
  return outer.concat(inner);
}

/** The supplied 800×800 canvas animation, rendered as a reusable website theme. */
export function LoveHeartTemplate({
  title = "Love Heart",
  editing = false,
  onExit,
}: {
  title?: string;
  editing?: boolean;
  onExit?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    // Capture the narrowed context in a non-null constant for nested callbacks.
    const context: CanvasRenderingContext2D = ctx;

    let disposed = false;
    const timers = new Set<number>();
    const schedule = (callback: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!disposed) callback();
      }, delay);
      timers.add(id);
    };

    const DURATION = 10;
    const TICK = 16;
    const ANIM = 42;
    const LIFT = 34;
    const FLASH = [1, 0.78, 0.78];
    const rng = new PythonRandom(11);

    context.fillStyle = BG;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.textAlign = "center";
    context.textBaseline = "middle";

    const fontPx = (size: number) => (size * 4) / 3;
    const fontString = (size: number) => `bold ${fontPx(size)}px Arial, sans-serif`;
    const order = buildLayout(context, rng);
    const bgColor = [1, 3, 5].map((i) => parseInt(BG.slice(i, i + 2), 16) / 255);
    const mainIds: { item: DrawItem; color: RGB }[] = [];
    const active: PhraseItem[] = [];
    const drawItems: DrawItem[] = [];
    let itemIndex = 0;
    const rate = order.length / ((DURATION * 1000) / TICK);
    let accumulator = 0;
    let spawning = true;

    function spawn(item: PhraseItem) {
      const x = item.x;
      const y = -item.y;
      const size = item.size;
      const color = item.color ?? [0.9, 0.05, 0.14];
      const shadow: DrawItem = {
        x: x + 2,
        y: y + 3,
        text: item.text,
        font: fontString(size),
        fill: BG,
      };
      const halo: DrawItem = {
        x,
        y,
        text: item.text,
        font: fontString(size + 1),
        fill: BG,
      };
      const main: DrawItem = {
        x,
        y: y - LIFT,
        text: item.text,
        font: fontString(size),
        fill: BG,
      };
      drawItems.push(shadow, halo, main);
      item.shadow = shadow;
      item.halo = halo;
      item.main = main;
      item.f = 0;
      item.dx = rng.uniform(-10, 10);
      mainIds.push({ item: main, color });
      active.push(item);
    }

    function animate(item: PhraseItem): boolean {
      if (!item.shadow || !item.halo || !item.main) return false;
      item.f = (item.f ?? 0) + 1;
      const u = clamp(item.f / ANIM);
      const easeOut = 1 - Math.pow(1 - u, 3);
      const color = item.color ?? [0.9, 0.05, 0.14];
      const x = item.x;
      const y = -item.y;
      const hover = (1 - easeOut) * LIFT;
      const px = x + (item.dx ?? 0) * (1 - easeOut);
      const py = y - hover;

      item.shadow.fill = colorHex(mix(bgColor, dim(color, 0.3), easeOut));
      item.halo.fill = colorHex(mix(bgColor, dim(color, 0.2), easeOut * easeOut));
      item.halo.x = px;
      item.halo.y = py;
      const flash = 0.75 * Math.sin(Math.PI * clamp((u - 0.55) / 0.45));
      const finalColor = mix(
        mix(bgColor, color, Math.pow(easeOut, 1.5)),
        FLASH,
        flash,
      );
      item.main.fill = colorHex(finalColor);
      item.main.x = px;
      item.main.y = py;
      if (u >= 1) {
        item.halo.x = x;
        item.halo.y = y;
        item.main.x = x;
        item.main.y = y;
        item.main.fill = colorHex(color);
        return false;
      }
      return true;
    }

    function render() {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = BG;
      context.fillRect(0, 0, WIDTH, HEIGHT);
      context.save();
      context.translate(WIDTH / 2, HEIGHT / 2);
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const item of drawItems) {
        context.font = item.font;
        context.fillStyle = item.fill;
        context.fillText(item.text, item.x, item.y);
      }
      context.restore();
    }

    function shimmer() {
      if (!mainIds.length) return;
      const selected = rng.choice(mainIds);
      selected.item.fill = colorHex(mix(selected.color, FLASH, 0.6));
      render();
      schedule(() => {
        selected.item.fill = colorHex(selected.color);
        render();
      }, 260);
      schedule(shimmer, 140);
    }

    function step() {
      if (spawning) {
        accumulator += rate;
        while (accumulator >= 1 && itemIndex < order.length) {
          accumulator -= 1;
          spawn(order[itemIndex++]);
        }
        if (itemIndex >= order.length) spawning = false;
      }
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (!animate(active[i])) active.splice(i, 1);
      }
      render();
      if (!spawning && active.length === 0) {
        shimmer();
        return;
      }
      schedule(step, TICK);
    }

    // Match the original 200ms delayed start, 10s staggered reveal, 42-frame
    // ease-out float and perpetual 140ms shimmer cadence.
    schedule(step, 200);

    return () => {
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
  }, []);

  return (
    <main
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: BG,
        colorScheme: "dark",
      }}
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-label="An animated heart made from I love you phrases in 20 languages"
        style={{
          display: "block",
          width: "min(100vmin, 800px)",
          height: "min(100vmin, 800px)",
          background: BG,
        }}
      />
      {editing && onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to website templates"
          style={{
            position: "fixed",
            zIndex: 5,
            top: "max(16px, env(safe-area-inset-top))",
            left: "max(16px, env(safe-area-inset-left))",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(6,2,8,.82)",
            color: "rgba(255,255,255,.78)",
            font: "600 11px/1 Arial, sans-serif",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          ← Templates
        </button>
      )}
    </main>
  );
}
