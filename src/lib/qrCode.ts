/**
 * Small client-safe QR encoder (byte mode, error-correction level M).
 * Supports QR versions 1–10, which is ample for Paper Stish publication URLs.
 */
export type QrMatrix = boolean[][];

type BlockGroup = [count: number, dataCodewords: number];
type VersionInfo = { ec: number; groups: BlockGroup[] };

const ECC: Record<number, VersionInfo> = {
  1: { ec: 10, groups: [[1, 16]] },
  2: { ec: 16, groups: [[1, 28]] },
  3: { ec: 26, groups: [[1, 44]] },
  4: { ec: 18, groups: [[2, 32]] },
  5: { ec: 24, groups: [[2, 43]] },
  6: { ec: 16, groups: [[4, 27]] },
  7: { ec: 18, groups: [[4, 31]] },
  8: { ec: 22, groups: [[2, 38], [2, 39]] },
  9: { ec: 22, groups: [[3, 36], [2, 37]] },
  10: { ec: 26, groups: [[4, 43], [1, 44]] },
};

const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

const EXP: number[] = [];
const LOG: number[] = [];
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function gmul(a: number, b: number): number {
  return a && b ? EXP[LOG[a] + LOG[b]] : 0;
}

function rsGenerator(length: number): number[] {
  let generator = [1];
  for (let i = 0; i < length; i += 1) {
    const next = new Array<number>(generator.length + 1).fill(0);
    for (let j = 0; j < generator.length; j += 1) {
      next[j] ^= generator[j];
      next[j + 1] ^= gmul(generator[j], EXP[i]);
    }
    generator = next;
  }
  return generator;
}

function rsErrorCorrection(data: number[], length: number): number[] {
  const generator = rsGenerator(length);
  const result = new Array<number>(length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    for (let k = 0; k < length; k += 1) result[k] ^= gmul(generator[k + 1], factor);
  }
  return result;
}

function penalty(grid: boolean[][]): number {
  const size = grid.length;
  let score = 0;

  for (let pass = 0; pass < 2; pass += 1) {
    for (let a = 0; a < size; a += 1) {
      let run = 1;
      let last: boolean | null = null;
      for (let b = 0; b < size; b += 1) {
        const value = pass ? grid[b][a] : grid[a][b];
        if (b > 0 && value === last) {
          run += 1;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else {
          run = 1;
        }
        last = value;
      }
    }
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const cell = grid[y][x];
      if (cell === grid[y][x + 1] && cell === grid[y + 1][x] && cell === grid[y + 1][x + 1]) score += 3;
    }
  }

  const patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let pass = 0; pass < 2; pass += 1) {
    for (let a = 0; a < size; a += 1) {
      for (let b = 0; b <= size - 11; b += 1) {
        let matchA = true;
        let matchB = true;
        for (let k = 0; k < 11; k += 1) {
          const value = (pass ? grid[b + k][a] : grid[a][b + k]) ? 1 : 0;
          if (value !== patternA[k]) matchA = false;
          if (value !== patternB[k]) matchB = false;
        }
        if (matchA) score += 40;
        if (matchB) score += 40;
      }
    }
  }

  let dark = 0;
  for (const row of grid) for (const cell of row) if (cell) dark += 1;
  const total = size * size;
  const balancePenalty = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  return score + Math.max(0, balancePenalty) * 10;
}

/** Returns the QR modules or null when the input exceeds version 10 capacity. */
export function qrCodeMatrix(text: string): QrMatrix | null {
  const data = Array.from(new TextEncoder().encode(text));
  let version = 1;
  let info: VersionInfo;
  let dataCapacity = 0;

  for (; version <= 10; version += 1) {
    info = ECC[version];
    dataCapacity = info.groups.reduce((sum, group) => sum + group[0] * group[1], 0);
    const countBits = version < 10 ? 8 : 16;
    if (4 + countBits + 8 * data.length <= dataCapacity * 8) break;
  }
  if (version > 10) return null;
  info = ECC[version];

  const bits: number[] = [];
  const put = (value: number, length: number) => {
    for (let bit = length - 1; bit >= 0; bit -= 1) bits.push((value >>> bit) & 1);
  };
  put(4, 4);
  put(data.length, version < 10 ? 8 : 16);
  for (const byte of data) put(byte, 8);
  put(0, Math.min(4, dataCapacity * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let padByte = 0xec; bits.length < dataCapacity * 8; padByte ^= 0xec ^ 0x11) put(padByte, 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    codewords.push(value);
  }

  const blocks: number[][] = [];
  let position = 0;
  for (const [count, length] of info.groups) {
    for (let i = 0; i < count; i += 1) {
      blocks.push(codewords.slice(position, position + length));
      position += length;
    }
  }

  const errors = blocks.map((block) => rsErrorCorrection(block, info.ec));
  const finalCodewords: number[] = [];
  const longestBlock = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < longestBlock; i += 1) {
    for (const block of blocks) if (i < block.length) finalCodewords.push(block[i]);
  }
  for (let i = 0; i < info.ec; i += 1) for (const block of errors) finalCodewords.push(block[i]);

  const finalBits: number[] = [];
  for (const byte of finalCodewords) for (let bit = 7; bit >= 0; bit -= 1) finalBits.push((byte >>> bit) & 1);

  const size = 17 + 4 * version;
  const grid = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, value: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    grid[y][x] = value;
    reserved[y][x] = true;
  };

  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  for (const [centerX, centerY] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
    }
  }

  const align = ALIGN[version];
  for (let i = 0; i < align.length; i += 1) {
    for (let j = 0; j < align.length; j += 1) {
      if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunction(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const writeFormat = (set: (x: number, y: number, value: boolean) => void, mask: number) => {
    let remainder = mask;
    for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const formatBits = ((mask << 10) | remainder) ^ 0x5412;
    const bit = (index: number) => ((formatBits >>> index) & 1) !== 0;
    for (let k = 0; k <= 5; k += 1) set(8, k, bit(k));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let k = 9; k < 15; k += 1) set(14 - k, 8, bit(k));
    for (let k = 0; k < 8; k += 1) set(size - 1 - k, 8, bit(k));
    for (let k = 8; k < 15; k += 1) set(8, size - 15 + k, bit(k));
    set(8, size - 8, true);
  };

  writeFormat(setFunction, 0);
  if (version >= 7) {
    let remainder = version;
    for (let k = 0; k < 12; k += 1) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const versionBits = (version << 12) | remainder;
    for (let k = 0; k < 18; k += 1) {
      const x = size - 11 + (k % 3);
      const y = Math.floor(k / 3);
      setFunction(x, y, ((versionBits >>> k) & 1) !== 0);
      setFunction(y, x, ((versionBits >>> k) & 1) !== 0);
    }
  }

  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let side = 0; side < 2; side += 1) {
        const x = right - side;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!reserved[y][x] && bitIndex < finalBits.length) {
          grid[y][x] = finalBits[bitIndex] === 1;
          bitIndex += 1;
        }
      }
    }
  }

  const masks: Array<(x: number, y: number) => boolean> = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
  ];

  let bestGrid: boolean[][] | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < masks.length; mask += 1) {
    const candidate = grid.map((row) => row.slice());
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!reserved[y][x] && masks[mask](x, y)) candidate[y][x] = !candidate[y][x];
      }
    }
    writeFormat((x, y, value) => { candidate[y][x] = value; }, mask);
    const score = penalty(candidate);
    if (score < bestPenalty) {
      bestPenalty = score;
      bestGrid = candidate;
    }
  }
  return bestGrid;
}

/** SVG path with a four-module quiet zone around the QR code. */
export function qrCodeSvgPath(matrix: QrMatrix): string {
  const path: string[] = [];
  const quiet = 4;
  for (let y = 0; y < matrix.length; y += 1) {
    let x = 0;
    while (x < matrix.length) {
      if (!matrix[y][x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < matrix.length && matrix[y][x]) x += 1;
      path.push(`M${start + quiet} ${y + quiet}h${x - start}v1h-${x - start}z`);
    }
  }
  return path.join("");
}
