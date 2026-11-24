// World news of Tuesday 24 November 2026, drawn as one front page.
//
// A deterministic, self-contained program: it draws the whole image from
// the news baked into this file, with no network and no input files.
// It writes entry.png (1024 x 1024, PNG) into MAKEFUN_OUTPUT_DIR,
// or /output when that variable is not set.
//
// News researched on 24 November 2026 from the day's reporting:
//  - Russian strikes on the Kyiv region kill at least 14; a Russian cargo
//    ship burns in the Gulf of Finland after a drone strike.
//  - Nvidia reinstates Jensen Huang as chief executive after Donald Trump
//    intervened, days after Huang stepped down.
//  - A factory fire in Banten, Indonesia kills 24; rescuers search for
//    the missing.
//  - US Representative Jimmy Gomez resigns after a House ethics panel
//    finds sexual misconduct.
//  - The World Chess Championship opens in Geneva: champion D Gukesh
//    defends his title against Javokhir Sindarov.
//  - India and Nepal launch the Saryu-Kamala Express train, linking
//    Ayodhya and Janakpur.
//  - Thousands march in Lisbon against the rising cost of living.
//  - Also today: US states sue Musk firms over sexual images made by
//    Grok; Trump vows a 10% cap on credit-card interest; allies warn
//    Russia may put a nuclear weapon in space.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------- canvas

const W = 1024;
const H = 1024;

const PAPER = 0xf7f2e7;
const WHITE = 0xffffff;
const INK = 0x191919;
const NAVY = 0x16264c;
const RED = 0xb3271e;
const GOLD = 0xc79a2e;
const BLUE = 0x1f4e9c;
const TEAL = 0x0f6b5c;
const GREEN = 0x2e6b34;
const ORANGE = 0xd96c1e;
const GREY = 0x6e6a61;
const LIGHT = 0xe8e0ce;
const SKY = 0x2c4a7a;

const buf = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  buf[i * 3] = (PAPER >> 16) & 0xff;
  buf[i * 3 + 1] = (PAPER >> 8) & 0xff;
  buf[i * 3 + 2] = PAPER & 0xff;
}

function px(x: number, y: number, c: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  buf[o] = (c >> 16) & 0xff;
  buf[o + 1] = (c >> 8) & 0xff;
  buf[o + 2] = c & 0xff;
}

function rect(x: number, y: number, w: number, h: number, c: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
  }
}

function hline(x0: number, x1: number, y: number, c: number): void {
  for (let x = x0; x <= x1; x++) px(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: number): void {
  for (let y = y0; y <= y1; y++) px(x, y, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: number): void {
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let x = cx - half; x <= cx + half; x++) px(x, y, c);
  }
}

function halfDisc(cx: number, cy: number, r: number, c: number): void {
  for (let y = cy - r; y <= cy; y++) {
    const dy = y - cy;
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let x = cx - half; x <= cx + half; x++) px(x, y, c);
  }
}

// ------------------------------------------------------------------- font

// A 5x7 bitmap font. Each glyph is 7 rows of 5 cells, joined with "|".
// "#" is ink, "." is empty. Only the characters the page uses are here.
const FONT: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".####|#....|#....|#....|#....|#....|.####",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".####|#....|#....|#.###|#...#|#...#|.###.",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: ".###.|..#..|..#..|..#..|..#..|..#..|.###.",
  J: "..###|...#.|...#.|...#.|...#.|#...#|.###.",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",
  X: "#...#|.#.#.|..#..|..#..|..#..|.#.#.|#...#",
  Y: "#...#|.#.#.|..#..|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  a: ".....|.....|.####|....#|.####|#...#|.###.",
  b: "#....|#....|####.|#...#|#...#|#...#|####.",
  c: ".....|.....|.####|#....|#....|#....|.####",
  d: "....#|....#|.####|#...#|#...#|#...#|.####",
  e: ".....|.....|.###.|#...#|#####|#....|.###.",
  f: "..##.|.#...|.#...|####.|.#...|.#...|.#...",
  g: ".....|.....|.####|#...#|#...#|.####|....#",
  h: "#....|#....|####.|#...#|#...#|#...#|#...#",
  i: ".....|..#..|.....|..#..|..#..|..#..|.###.",
  j: ".....|...#.|.....|...#.|...#.|#...#|.###.",
  k: "#....|#....|#..#.|#.#..|##...|#.#..|#..#.",
  l: "..#..|..#..|..#..|..#..|..#..|..#..|.###.",
  m: ".....|.....|##.#.|#.#.#|#.#.#|#.#.#|#.#.#",
  n: ".....|.....|####.|#...#|#...#|#...#|#...#",
  o: ".....|.....|.###.|#...#|#...#|#...#|.###.",
  p: ".....|.....|####.|#...#|#...#|####.|#....",
  q: ".....|.....|.####|#...#|#...#|.####|....#",
  r: ".....|.....|#.##.|##...|#....|#....|#....",
  s: ".....|.....|.####|#....|.###.|....#|####.",
  t: ".#...|.#...|####.|.#...|.#...|.#...|..##.",
  u: ".....|.....|#...#|#...#|#...#|#..##|.##.#",
  v: ".....|.....|#...#|#...#|#...#|.#.#.|..#..",
  w: ".....|.....|#...#|#.#.#|#.#.#|#.#.#|.###.",
  x: ".....|.....|#...#|.#.#.|..#..|.#.#.|#...#",
  y: ".....|.....|#...#|#...#|#...#|.####|....#",
  z: ".....|.....|#####|...#.|..#..|.#...|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": "####.|....#|...#.|..##.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": ".###.|#....|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|...#.|..#..|..#..|..#..",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|....#|.###.",
  " ": ".....|.....|.....|.....|.....|.....|.....",
  ".": ".....|.....|.....|.....|.....|.##..|.##..",
  ",": ".....|.....|.....|.....|.....|..#..|.#...",
  ":": ".....|..#..|.....|.....|.....|..#..|.....",
  ";": ".....|..#..|.....|.....|.....|..#..|.#...",
  "'": "..#..|..#..|.#...|.....|.....|.....|.....",
  "-": ".....|.....|.....|#####|.....|.....|.....",
  "(": "...#.|..#..|.#...|.#...|.#...|..#..|...#.",
  ")": ".#...|..#..|...#.|...#.|...#.|..#..|.#...",
  "/": "....#|...#.|...#.|..#..|.#...|.#...|#....",
  "%": "##..#|##.#.|...#.|..#..|.#...|#.##.|#..##",
  "!": "..#..|..#..|..#..|..#..|..#..|.....|..#..",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
  '"': ".#.#.|.#.#.|.#.#.|.....|.....|.....|.....",
  "=": ".....|.....|#####|.....|#####|.....|.....",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "[": ".###.|.#...|.#...|.#...|.#...|.#...|.###.",
  "]": ".###.|...#.|...#.|...#.|...#.|...#.|.###.",
};

const GLYPHS = new Map<string, boolean[][]>();
for (const [ch, rows] of Object.entries(FONT)) {
  const grid = rows.split("|").map((r) => {
    if (r.length !== 5) throw new Error(`bad font row for ${ch}: ${r}`);
    return [...r].map((c) => c === "#");
  });
  if (grid.length !== 7) throw new Error(`bad font glyph for ${ch}`);
  GLYPHS.set(ch, grid);
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: number): void {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS.get(ch) ?? GLYPHS.get(" ")!;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col]) rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(s: string, y: number, scale: number, c: number): void {
  drawText(s, Math.floor((W - textWidth(s, scale)) / 2), y, scale, c);
}

// Greedy word wrap into lines of at most maxChars characters.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawBlock(lines: string[], x: number, y: number, scale: number, c: number, lh: number): void {
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, scale, c));
}

// ------------------------------------------------------------------ icons

function starburst(cx: number, cy: number, r: number, c: number): void {
  disc(cx, cy, Math.floor(r * 0.45), c);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.round(Math.cos(a) * r * 0.5);
    const y1 = cy + Math.round(Math.sin(a) * r * 0.5);
    const x2 = cx + Math.round(Math.cos(a) * r);
    const y2 = cy + Math.round(Math.sin(a) * r);
    line(x1, y1, x2, y2, c);
    line(cx, cy, x2, y2, c);
  }
}

// Lead art: a night skyline under attack. All shapes stay inside (x, y, w, h).
function drawLeadArt(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  // stars (fixed positions, inside the box)
  const stars: Array<[number, number]> = [
    [30, 18], [90, 40], [150, 14], [210, 34], [280, 16], [320, 48],
    [60, 70], [180, 64], [250, 78], [310, 90], [120, 96], [40, 110],
  ];
  for (const [sx, sy] of stars) rect(x + sx, y + sy, 3, 3, WHITE);
  // explosion
  starburst(x + 250, y + 78, 46, ORANGE);
  starburst(x + 250, y + 78, 30, GOLD);
  disc(x + 250, y + 78, 13, WHITE);
  // smoke
  disc(x + 218, y + 52, 14, GREY);
  disc(x + 236, y + 40, 11, GREY);
  disc(x + 268, y + 46, 12, GREY);
  // skyline: every building ends at or before x + w
  const buildings: Array<[number, number, number]> = [
    [0, 58, 120], [58, 52, 160], [110, 60, 100], [170, 56, 150],
    [226, 58, 80], [284, 60, 140],
  ];
  for (const [bx, bw, bh] of buildings) {
    rect(x + bx, y + h - bh, bw, bh, INK);
  }
  // lit windows (fixed pattern, inside the buildings)
  const wins: Array<[number, number]> = [
    [16, 200], [70, 170], [120, 220], [176, 190], [228, 240],
    [278, 180], [320, 210], [92, 230], [200, 210], [150, 240],
  ];
  for (const [wx, wy] of wins) rect(x + wx, y + wy, 7, 9, GOLD);
}

// Chip (Nvidia)
function drawChip(cx: number, cy: number): void {
  rect(cx - 34, cy - 34, 68, 68, GREEN);
  rect(cx - 26, cy - 26, 52, 52, 0x3a7d40);
  rect(cx - 16, cy - 16, 32, 32, WHITE);
  drawText("AI", cx - 11, cy - 11, 3, GREEN);
  for (const s of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      rect(cx + i * 18 - 3, cy + s * 38 - 2, 6, 8, GOLD);
      rect(cx + s * 38 - 2, cy + i * 18 - 3, 8, 6, GOLD);
    }
  }
}

// Factory with flame (Indonesia)
function drawFactory(cx: number, cy: number): void {
  rect(cx - 52, cy - 6, 104, 46, INK);
  rect(cx - 52, cy - 26, 34, 20, INK);
  rect(cx - 18, cy - 26, 34, 20, INK);
  rect(cx + 16, cy - 26, 34, 20, INK);
  rect(cx + 34, cy - 52, 12, 46, INK);
  rect(cx + 30, cy - 58, 20, 8, INK);
  disc(cx, cy - 52, 16, ORANGE);
  disc(cx - 8, cy - 40, 12, RED);
  disc(cx + 8, cy - 40, 12, GOLD);
  disc(cx, cy - 34, 9, WHITE);
}

// Capitol dome (US Congress)
function drawCapitol(cx: number, cy: number): void {
  rect(cx - 52, cy + 18, 104, 12, NAVY);
  rect(cx - 44, cy + 2, 88, 16, NAVY);
  for (let i = -2; i <= 2; i++) rect(cx + i * 18 - 3, cy + 2, 6, 16, WHITE);
  halfDisc(cx, cy + 4, 34, NAVY);
  rect(cx - 2, cy - 22, 4, 26, NAVY);
  disc(cx, cy - 24, 4, RED);
}

// Chess board with a king (Geneva)
function drawChess(cx: number, cy: number): void {
  const s = 17;
  rect(cx - 35, cy - 35, 70, 70, INK);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if ((r + c) % 2 === 1) rect(cx - 34 + c * s, cy - 34 + r * s, s, s, WHITE);
    }
  }
  // white king standing on the board
  disc(cx, cy - 8, 12, WHITE);
  rect(cx - 12, cy + 2, 24, 8, WHITE);
  rect(cx - 3, cy - 26, 6, 12, WHITE);
  rect(cx - 9, cy - 22, 18, 5, WHITE);
}

// Train front (India-Nepal)
function drawTrain(cx: number, cy: number): void {
  rect(cx - 44, cy - 40, 88, 72, RED);
  rect(cx - 44, cy - 40, 88, 12, 0xd96c1e);
  rect(cx - 34, cy - 20, 28, 20, WHITE);
  rect(cx + 6, cy - 20, 28, 20, WHITE);
  disc(cx - 26, cy + 16, 7, GOLD);
  disc(cx + 26, cy + 16, 7, GOLD);
  rect(cx - 52, cy + 32, 104, 5, INK);
  line(cx - 40, cy + 37, cx - 52, cy + 58, INK);
  line(cx + 40, cy + 37, cx + 52, cy + 58, INK);
  for (let i = 0; i < 3; i++) hline(cx - 48 + i * 4, cx + 48 - i * 4, cy + 44 + i * 7, INK);
}

// Crowd with placards (Lisbon)
function drawCrowd(cx: number, cy: number): void {
  for (const [ox, col] of [[-44, NAVY], [-22, RED], [0, TEAL], [22, BLUE], [44, GREEN]] as Array<[number, number]>) {
    disc(cx + ox, cy - 8, 11, col);
    rect(cx + ox - 12, cy + 6, 24, 30, col);
  }
  // left placard with ruled lines
  rect(cx - 58, cy - 52, 34, 24, WHITE);
  rect(cx - 58, cy - 52, 34, 24, INK);
  rect(cx - 54, cy - 48, 26, 16, WHITE);
  hline(cx - 51, cx - 31, cy - 44, INK);
  hline(cx - 51, cx - 31, cy - 39, INK);
  hline(cx - 51, cx - 31, cy - 34, INK);
  vline(cx - 41, cy - 28, cy - 6, INK);
  // right placard with ruled lines
  rect(cx + 26, cy - 56, 34, 24, WHITE);
  rect(cx + 26, cy - 56, 34, 24, INK);
  rect(cx + 30, cy - 52, 26, 16, WHITE);
  hline(cx + 33, cx + 53, cy - 48, INK);
  hline(cx + 33, cx + 53, cy - 43, INK);
  hline(cx + 33, cx + 53, cy - 38, INK);
  vline(cx + 43, cy - 32, cy - 6, INK);
}

// ------------------------------------------------------------------ page

// Masthead
rect(0, 0, W, 96, NAVY);
drawTextCentered("THE WORLD IN ONE DAY", 14, 5, WHITE);
drawTextCentered("TUESDAY 24 NOVEMBER 2026", 62, 3, GOLD);

// Lead story
const LX = 8;
const LY = 104;
const LW = 1008;
const LH = 272;
rect(LX, LY, LW, LH, INK);
rect(LX + 2, LY + 2, LW - 4, LH - 4, WHITE);
drawLeadArt(LX + 8, LY + 8, 344, LH - 16);
const TX = LX + 368;
drawText("UKRAINE - THE LEAD STORY", TX, LY + 16, 2, RED);
drawBlock(wrap("KYIV REGION STRIKES KILL AT LEAST 14", 26), TX, LY + 44, 4, INK, 36);
hline(TX, TX + 620, LY + 128, RED);
hline(TX, TX + 620, LY + 130, RED);
drawBlock(
  wrap("Russian drones and missiles struck the Kyiv region, killing at least 14 people and hitting homes.", 52),
  TX, LY + 146, 2, INK, 18,
);
drawBlock(
  wrap("A Russian cargo ship burns in the Gulf of Finland after a drone strike.", 52),
  TX, LY + 206, 2, INK, 18,
);

// Gold divider
rect(8, 388, 1008, 4, GOLD);

// Story panels, 2 columns x 3 rows
type Panel = {
  kicker: string;
  color: number;
  headline: string;
  body: string;
  icon: (cx: number, cy: number) => void;
};

const PANELS: Panel[] = [
  {
    kicker: "BUSINESS",
    color: GREEN,
    headline: "HUANG BACK AS NVIDIA CHIEF",
    body: "Nvidia brings back Jensen Huang as chief executive after Donald Trump intervened.",
    icon: drawChip,
  },
  {
    kicker: "ASIA",
    color: ORANGE,
    headline: "FACTORY FIRE KILLS 24 IN INDONESIA",
    body: "Fire at a candy factory in Banten kills 24; rescuers search for missing workers.",
    icon: drawFactory,
  },
  {
    kicker: "UNITED STATES",
    color: BLUE,
    headline: "CONGRESSMAN QUITS IN ETHICS ROW",
    body: "Jimmy Gomez resigns from the US House after an ethics panel finds sexual misconduct.",
    icon: drawCapitol,
  },
  {
    kicker: "SPORT",
    color: TEAL,
    headline: "CHESS CROWN ON THE LINE IN GENEVA",
    body: "World champion D Gukesh defends his title against Javokhir Sindarov in Geneva.",
    icon: drawChess,
  },
  {
    kicker: "ASIA",
    color: RED,
    headline: "INDIA-NEPAL TRAIN ROLLS OUT",
    body: "Modi and Nepal's PM launch the Saryu-Kamala Express, linking Ayodhya and Janakpur.",
    icon: drawTrain,
  },
  {
    kicker: "EUROPE",
    color: NAVY,
    headline: "LISBON MARCHES OVER LIVING COSTS",
    body: "Thousands march in Portugal's capital against the rising cost of living.",
    icon: drawCrowd,
  },
];

const PW = 496;
const PH = 172;
const PX = [8, 520];
const PY = [400, 580, 760];

PANELS.forEach((p, i) => {
  const x = PX[i % 2];
  const y = PY[Math.floor(i / 2)];
  rect(x, y, PW, PH, GREY);
  rect(x + 1, y + 1, PW - 2, PH - 2, WHITE);
  rect(x, y, PW, 6, p.color);
  p.icon(x + 72, y + 96);
  const tx = x + 148;
  drawText(p.kicker, tx, y + 18, 2, p.color);
  drawBlock(wrap(p.headline, 18), tx, y + 44, 3, INK, 26);
  drawBlock(wrap(p.body, 27), tx, y + 102, 2, INK, 17);
});

// Footer: also today
rect(8, 944, 1008, 72, NAVY);
drawText("ALSO TODAY:  States sue Musk firms over sexual images made by Grok", 24, 958, 2, WHITE);
drawText("Trump vows a 10% credit-card cap - Allies warn of a Russian nuclear space weapon", 24, 984, 2, GOLD);

// -------------------------------------------------------------------- png

function crc32(data: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t?: Int32Array }).t = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
fs.mkdirSync(outDir, { recursive: true });
const png = encodePng();
fs.writeFileSync(path.join(outDir, "entry.png"), png);
console.log(`wrote ${path.join(outDir, "entry.png")} (${png.length} bytes, ${W}x${H})`);
