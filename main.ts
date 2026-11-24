// news-image-20261124 entry (Node 22, standard library only).
// Draws one image summing up the world news of Tuesday 24 November 2026:
// a newspaper front page with six stories, rendered with a software
// rasterizer and a hand-built 5x7 bitmap font, then encoded as PNG.
// No network, no randomness, no environment reads except MAKEFUN_OUTPUT_DIR.
// Runs twice, writes the same bytes both times.
//
// Stories (all first reported 24 November 2026, cross-checked across
// SCMP, Japan Times and Spyglass's 24 Nov briefing):
//  1. Ukraine sinks Russian warship Merkury off Benghazi, Libya (7 sea drones)
//  2. US Democrats win biggest House majority since 1992 (258+ seats)
//  3. Nvidia reinstates Jensen Huang as CEO after Trump intervention
//  4. Russian strikes kill at least 15 in the Kyiv region
//  5. NATO vows space defence as Russia may launch a nuclear-armed satellite
//  6. Iran strikes Gulf sites and sues for $290bn as US tightens sanctions

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------- font ----
// A 5x7 bitmap font, drawn by hand for this image. Each glyph is 7 rows of
// 5 pixels ('#' on, '.' off). All copy in this image is set in capitals,
// so only capitals, digits and the punctuation used are defined.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '....#', '....#', '....#', '....#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '.#...'],
  ':': ['.....', '.....', '.##..', '.##..', '.....', '.##..', '.##..'],
  ';': ['.....', '.....', '.##..', '.##..', '.....', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '\u2019': ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '...#.', '..#..', '..#..', '.#...'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '&': ['.##..', '#..#.', '#..#.', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '\u2014': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '\u2022': ['.....', '.....', '.###.', '.###.', '.###.', '.....', '.....'],
};

// ------------------------------------------------------------ rasterizer ----
// A plain RGBA pixel buffer with flat vector drawing primitives.
const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 4);

type RGB = [number, number, number];

function px(x: number, y: number, c: RGB): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const o = (iy * W + ix) * 4;
  buf[o] = c[0];
  buf[o + 1] = c[1];
  buf[o + 2] = c[2];
  buf[o + 3] = 255;
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 4;
      buf[o] = c[0];
      buf[o + 1] = c[1];
      buf[o + 2] = c[2];
      buf[o + 3] = 255;
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    px(x0, y0, c);
    return;
  }
  const r = Math.floor(w / 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    for (let a = -r; a <= r; a++) {
      for (let b = -r; b <= r; b++) px(cx + a, cy + b, c);
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) px(x, y, c);
    }
  }
}

// Filled polygon by scanline fill. pts is a flat [x0,y0,x1,y1,...] list.
function poly(pts: number[], c: RGB): void {
  let minY = H;
  let maxY = 0;
  for (let i = 1; i < pts.length; i += 2) {
    minY = Math.min(minY, Math.floor(pts[i]));
    maxY = Math.max(maxY, Math.ceil(pts[i]));
  }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const x0 = pts[i];
      const y0 = pts[i + 1];
      const x1 = pts[(i + 2) % pts.length];
      const y1 = pts[(i + 3) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k]));
      const xb = Math.min(W - 1, Math.floor(xs[k + 1]));
      for (let x = xa; x <= xb; x++) px(x, y, c);
    }
  }
}

// Starburst (explosion / sparkle) made of triangles around a centre.
function star(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: RGB): void {
  const pts: number[] = [];
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  poly(pts, c);
}

// ------------------------------------------------------------------ text ----
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch];
  if (g === undefined) throw new Error('missing glyph for ' + JSON.stringify(ch));
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '#') {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    drawChar(ch, cx, y, scale, c);
    cx += 6 * scale;
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - textWidth(s, scale) / 2, y, scale, c);
}

// Wrap text into lines no wider than maxW (pixels). Words never split.
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur === '' ? w : cur + ' ' + w;
    if (textWidth(trial, scale) <= maxW || cur === '') {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function drawPara(s: string, x: number, y: number, scale: number, maxW: number, c: RGB, gap: number): number {
  const lines = wrap(s, scale, maxW);
  let yy = y;
  for (const ln of lines) {
    drawText(ln, x, yy, scale, c);
    yy += 7 * scale + gap;
  }
  return yy;
}

// ------------------------------------------------------------- PNG encode ---
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 4, (y + 1) * W * 4), y * (1 + W * 4) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- palette ---
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [20, 20, 20];
const RED: RGB = [166, 25, 46];
const BLUE: RGB = [29, 78, 137];
const DARKBLUE: RGB = [18, 54, 92];
const SKY: RGB = [191, 217, 232];
const GOLD: RGB = [200, 147, 10];
const GREEN: RGB = [30, 122, 52];
const ORANGE: RGB = [232, 106, 28];
const YELLOW: RGB = [240, 196, 40];
const WHITE: RGB = [250, 250, 246];
const SHIP: RGB = [22, 32, 48];
const GREY: RGB = [120, 118, 110];

// Arc as a polygon (angles in degrees, 0 = east, going clockwise in screen
// space where y grows downwards).
function arcPoly(cx: number, cy: number, r: number, a0: number, a1: number): number[] {
  const pts: number[] = [cx, cy];
  for (let a = a0; a <= a1; a += 6) {
    const t = (a * Math.PI) / 180;
    pts.push(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
  }
  return pts;
}

function ellipseOutline(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  let px0 = cx + rx;
  let py0 = cy;
  for (let a = 6; a <= 360; a += 6) {
    const t = (a * Math.PI) / 180;
    const x = cx + Math.cos(t) * rx;
    const y = cy + Math.sin(t) * ry;
    line(px0, py0, x, y, c, 2);
    px0 = x;
    py0 = y;
  }
}

// ------------------------------------------------------------ illustrations ---
// Lead art: the sea-drone strike off Benghazi. Flat shapes only, no faces.
function drawSeaScene(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  rect(x, y + 150, w, h - 150, BLUE);
  disc(x + 262, y + 44, 26, YELLOW); // sun
  // drones with wakes
  for (const [dx, dy] of [[52, 96], [104, 70], [158, 92]] as const) {
    line(x + dx - 26, y + dy + 8, x + dx - 6, y + dy + 2, WHITE, 2);
    disc(x + dx, y + dy, 6, SHIP);
    disc(x + dx, y + dy, 2, WHITE);
  }
  // ship
  poly(
    [x + 28, y + 196, x + 292, y + 196, x + 264, y + 240, x + 58, y + 240],
    SHIP,
  );
  rect(x + 62, y + 168, 170, 28, SHIP);
  rect(x + 200, y + 142, 52, 26, WHITE);
  rect(x + 118, y + 128, 26, 40, RED);
  line(x + 238, y + 142, x + 238, y + 104, SHIP, 3);
  // explosion at the stern
  star(x + 282, y + 172, 30, 13, 8, ORANGE);
  star(x + 282, y + 172, 17, 7, 8, YELLOW);
  // waves (kept clear of the OFF BENGHAZI caption at bottom left)
  for (const wy of [258, 272, 284] as const) {
    for (const wx of [180, 245] as const) {
      line(x + wx, y + wy, x + wx + 34, y + wy, WHITE, 2);
    }
  }
  drawText('OFF BENGHAZI', x + 14, y + h - 24, 2, WHITE);
}

// US Capitol dome, simplified.
function drawDome(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  rect(x, y + h - 12, w, 12, GREEN);
  poly(arcPoly(x + w / 2, y + 62, 46, 180, 360), DARKBLUE);
  rect(x + w / 2 - 50, y + 62, 100, 10, DARKBLUE);
  for (const cx of [x + 32, x + 58, x + 84, x + 110] as const) {
    rect(cx, y + 72, 8, 18, WHITE);
  }
  line(x + w / 2, y + 16, x + w / 2, y + 2, INK, 2);
  rect(x + w / 2, y + 2, 14, 9, RED);
}

// Microchip with a rising arrow.
function drawChip(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, DARKBLUE);
  for (let i = 0; i < 4; i++) {
    rect(x + 22 + i * 20, y + 12, 10, 8, GOLD);
    rect(x + 22 + i * 20, y + h - 20, 10, 8, GOLD);
    rect(x + 12, y + 22 + i * 16, 8, 8, GOLD);
    rect(x + w - 20, y + 22 + i * 16, 8, 8, GOLD);
  }
  rect(x + 34, y + 26, 56, 48, GOLD);
  rect(x + 48, y + 40, 28, 20, DARKBLUE);
  // rising arrow on the right: shaft + triangular head
  rect(x + 112, y + 48, 12, 32, GREEN);
  poly([x + 102, y + 52, x + 134, y + 52, x + 118, y + 28], GREEN);
}

// City skyline under attack.
function drawSkyline(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, DARKBLUE);
  const hs = [26, 40, 30, 44, 34];
  for (let i = 0; i < 5; i++) {
    rect(x + 4 + i * 13, y + h - hs[i], 11, hs[i], SHIP);
  }
  star(x + 48, y + 12, 12, 5, 8, ORANGE);
  star(x + 48, y + 12, 6, 3, 8, YELLOW);
  disc(x + 14, y + 10, 3, GREY);
  disc(x + 62, y + 18, 3, GREY);
}

// Satellite on an orbit ring.
function drawSatellite(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, DARKBLUE);
  for (const [sx, sy] of [[8, 8], [58, 6], [20, 42], [64, 40]] as const) {
    disc(x + sx, y + sy, 2, WHITE);
  }
  ellipseOutline(x + w / 2, y + h / 2, 32, 16, WHITE);
  rect(x + 22, y + 20, 16, 12, GOLD);
  rect(x + 6, y + 23, 14, 6, BLUE);
  rect(x + 40, y + 23, 14, 6, BLUE);
  line(x + 30, y + 20, x + 26, y + 12, WHITE, 2);
}

// Oil derrick with a flame.
function drawDerrick(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  poly([x + 14, y + h - 4, x + 56, y + h - 4, x + 38, y + 6], SHIP);
  line(x + 20, y + h - 12, x + 50, y + h - 12, SKY, 3);
  line(x + 24, y + h - 24, x + 46, y + h - 24, SKY, 3);
  star(x + 38, y + 8, 9, 4, 8, ORANGE);
  rect(x + 4, y + h - 8, w - 8, 8, INK);
}

// ------------------------------------------------------------------ layout ---
function rule(x: number, y: number, w: number, t: number, c: RGB): void {
  rect(x, y, w, t, c);
}

function draw(): void {
  rect(0, 0, W, H, PAPER);
  rect(0, 0, W, 10, RED);

  // Masthead.
  drawTextCentered('THE WORLD TODAY', 512, 34, 8, INK);
  drawTextCentered('TUESDAY, 24 NOVEMBER 2026', 512, 106, 4, RED);
  drawTextCentered('ONE DAY \u2022 SIX STORIES FROM AROUND THE WORLD', 512, 140, 3, INK);
  rule(28, 168, 968, 3, INK);

  // Lead story: Ukraine sinks a Russian warship off Libya.
  drawSeaScene(28, 184, 320, 294);
  drawText('UKRAINE \u2022 WAR AT SEA', 380, 192, 3, RED);
  drawText('UKRAINE SINKS', 380, 224, 5, INK);
  drawText('RUSSIAN WARSHIP', 380, 267, 5, INK);
  drawText('OFF LIBYA', 380, 310, 5, INK);
  drawPara(
    'SEVEN SEA DRONES HIT TWO RUSSIAN SHIPS OFF BENGHAZI. KYIV SAYS THE WARSHIP MERKURY SANK. A CARGO SHIP AND A KA-27 HELICOPTER WERE HIT.',
    380,
    364,
    3,
    616,
    INK,
    4,
  );
  rule(28, 504, 968, 3, INK);

  // Row 2, column A: Democrats take the House.
  drawDome(28, 520, 150, 100);
  drawText('DEMOCRATS WIN', 196, 520, 4, INK);
  drawText('BIGGEST HOUSE', 196, 556, 4, INK);
  drawText('MAJORITY', 196, 592, 4, INK);
  drawText('SINCE 1992', 196, 628, 4, INK);
  drawPara(
    'AT LEAST 258 SEATS HAND THE PARTY POWER TO BLOCK TRUMP\u2019S AGENDA.',
    28,
    664,
    3,
    468,
    INK,
    3,
  );

  // Row 2, column B: Nvidia brings back Huang.
  drawChip(528, 520, 150, 100);
  drawText('NVIDIA BRINGS', 696, 520, 4, INK);
  drawText('BACK HUANG', 696, 556, 4, INK);
  drawText('AS CEO', 696, 592, 4, INK);
  drawPara(
    'REINSTATED 11 DAYS AFTER HE QUIT. TRUMP PRESSED THE BOARD. SHARES JUMPED AS MUCH AS 37%.',
    528,
    636,
    3,
    468,
    INK,
    3,
  );
  rule(28, 760, 968, 3, INK);

  // Row 3: three brief stories.
  drawSkyline(28, 774, 70, 52);
  drawText('RUSSIAN STRIKES', 28, 834, 3, INK);
  drawText('KILL AT LEAST 15', 28, 859, 3, INK);
  drawText('IN KYIV REGION', 28, 884, 3, INK);
  drawPara('A BOY, 7, WAS PULLED ALIVE FROM RUBBLE IN DYMER.', 28, 912, 2, 314, INK, 3);

  drawSatellite(355, 774, 70, 52);
  drawText('NATO VOWS', 355, 834, 3, INK);
  drawText('SPACE DEFENCE', 355, 859, 3, INK);
  drawPara(
    'ALLIES SAY RUSSIA MAY LAUNCH A NUCLEAR-ARMED SATELLITE NEXT MONTH.',
    355,
    912,
    2,
    314,
    INK,
    3,
  );

  drawDerrick(682, 774, 70, 52);
  drawText('IRAN STRIKES', 682, 834, 3, INK);
  drawText('GULF SITES, SUES', 682, 859, 3, INK);
  drawText('FOR $290BN', 682, 884, 3, INK);
  drawPara(
    'TEHRAN HITS US BASES AS WASHINGTON TIGHTENS SANCTIONS.',
    682,
    912,
    2,
    314,
    INK,
    3,
  );
  rule(28, 960, 968, 2, INK);

  // Footer briefs.
  drawTextCentered(
    'ALSO: MEXICO CAPTURES \u2019EL CHAPO ISIDRO\u2019 \u2022 RUSSIAN JETS ENTER S. KOREA AIR ZONE',
    512,
    972,
    2,
    INK,
  );
  drawTextCentered(
    'SPAIN\u2019S RIGHT SET TO OUST SANCHEZ \u2022 DRAWN FROM THE DAY\u2019S REPORTING',
    512,
    992,
    2,
    INK,
  );
  rect(0, 1014, W, 10, RED);
}

// -------------------------------------------------------------------- main ---
function main(): void {
  draw();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
