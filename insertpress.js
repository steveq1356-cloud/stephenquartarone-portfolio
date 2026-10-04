/* InsertPress machine animation (portfolio "Working On" section).
   Ported from the InsertPress product page: an isometric drawing of the machine picking
   brass inserts from the tray and pressing them into four printed parts, with a live
   position readout (DRO). Runs only while on screen; shows a still frame for reduced motion. */
(function () {
  var canvas = document.getElementById("ip-canvas");
  if (!canvas || !canvas.getContext) return;

const $ = (s, r = document) => r.querySelector(s);
const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const C30 = Math.cos(Math.PI / 6), S30 = 0.5, RXK = Math.SQRT2 * C30, RYK = Math.SQRT2 * S30;
const W = 290, D = 250, H = 220, PL = 18;
const BED = { x0: 40, x1: 250, y0: 30, y1: 230, z: 8 };
const TRAY = { x0: 48, y0: 150, x1: 108, y1: 219, z: 18 };
const RAILZ = 165, RX0 = 12, RX1 = 278, SAFE = 66, INS_L = 7, ENGAGE = 1.5, STICK = 4, SPEED = 1.15;
const SIZES = { m3: { name: 'M3', R: 4.2, r: 1.7, hole: 3.3 }, m25: { name: 'M2.5', R: 3.8, r: 1.4, hole: 3.0 }, m5: { name: 'M5', R: 5.2, r: 2.4, hole: 4.2 } };
const POCKETS = [];
['m3', 'm3', 'm3', 'm3', 'm25', 'm5'].forEach((size, r) => { for (let c = 0; c < 5; c++) POCKETS.push({ x: 56 + c * 11, y: 158 + r * 10.5, size }); });
const PARTS = [
  { base: [55, 45, 8, 125, 92, 14], wall: [55, 45, 14, 125, 53, 52], holes: [[72, 76], [90, 76], [108, 76]], hz: 14, size: 'm3' },
  { base: [150, 45, 8, 232, 108, 22], holes: [[170, 62], [212, 62], [170, 92], [212, 92]], hz: 22, size: 'm3' },
  { base: [118, 132, 8, 186, 216, 13], boss: 7.5, holes: [[131, 145], [173, 145], [131, 203], [173, 203]], hz: 22, size: 'm3' },
  { base: [196, 128, 8, 246, 216, 12], boss: 5.6, holes: [[207, 140], [235, 140], [207, 204], [235, 204]], hz: 19, size: 'm25' },
];
const HOLES = [];
PARTS.forEach((p) => { p.hs = p.holes.map(([x, y]) => { const h = { x, y, z: p.hz, size: p.size }; HOLES.push(h); return h; }); p.hs.sort((a, b) => (a.x + a.y) - (b.x + b.y)); });
const ORDER = (() => { const left = HOLES.slice(), out = []; let cx = 78, cy = 184; while (left.length) { let bi = 0, bd = Infinity; left.forEach((h, i) => { const d = Math.hypot(h.x - cx, h.y - cy); if (d < bd) { bd = d; bi = i; } }); const h = left.splice(bi, 1)[0]; out.push(h); cx = h.x; cy = h.y; } return out; })();
ORDER.forEach((h, i) => { h.i = i; });
const PARK = { x: 62, y: 44, z: SAFE };
const SEGS = []; let TOTAL = 0;
(() => {
  let pos = { ...PARK }; const used = new Set();
  const add = (to, dur, ph, ex = {}) => { SEGS.push(Object.assign({ a: { ...pos }, b: { ...to }, dur, ph, t0: TOTAL }, ex)); TOTAL += dur; pos = { ...to }; };
  const travel = (x, y, ph, ex) => add({ x, y, z: SAFE }, clamp(Math.hypot(x - pos.x, y - pos.y) / 240, 0.4, 1.05), ph, ex);
  add({ ...PARK }, 0.6, 'idle');
  ORDER.forEach((h, i) => {
    const pi = POCKETS.findIndex((p, k) => !used.has(k) && p.size === h.size); used.add(pi); const p = POCKETS[pi];
    const pickZ = TRAY.z + STICK - ENGAGE;
    travel(p.x, p.y, 'totray', { h: i });
    add({ x: p.x, y: p.y, z: pickZ }, 0.4, 'pick', { h: i, pocket: pi });
    add({ x: p.x, y: p.y, z: pickZ }, 0.5, 'thread', { h: i, spin: 1, take: pi, pocket: pi });
    add({ x: p.x, y: p.y, z: SAFE }, 0.36, 'lift', { h: i });
    travel(h.x, h.y, 'tohole', { h: i });
    add({ x: h.x, y: h.y, z: h.z + 1 + INS_L - ENGAGE }, 0.42, 'approach', { h: i });
    add({ x: h.x, y: h.y, z: h.z - ENGAGE }, 0.85, 'press', { h: i, hot: 1 });
    add({ x: h.x, y: h.y, z: h.z - ENGAGE }, 0.45, 'dwell', { h: i, hot: 1 });
    add({ x: h.x, y: h.y, z: h.z - ENGAGE }, 0.45, 'unthread', { h: i, spin: -1, set: i });
    add({ x: h.x, y: h.y, z: SAFE }, 0.4, 'rise', { h: i });
  });
  travel(PARK.x, PARK.y, 'park');
  add({ ...PARK }, 3.2, 'done');
  add({ ...PARK }, 1.0, 'reset');
})();
function stateAt(tt) {
  const t = ((tt % TOTAL) + TOTAL) % TOTAL;
  const st = { set: new Set(), taken: new Set(), carry: false, x: PARK.x, y: PARK.y, z: SAFE, ph: 'idle', h: -1, spin: 0, hot: 0, fade: 0, u: 0 };
  for (const s of SEGS) {
    if (t >= s.t0 + s.dur) { if (s.take != null) { st.taken.add(s.take); st.carry = true; } if (s.set != null) { st.set.add(s.set); st.carry = false; } continue; }
    const u = (t - s.t0) / s.dur, e = ease(u);
    st.x = lerp(s.a.x, s.b.x, e); st.y = lerp(s.a.y, s.b.y, e); st.z = lerp(s.a.z, s.b.z, e);
    st.ph = s.ph; st.h = s.h != null ? s.h : -1; st.spin = s.spin || 0; st.hot = s.hot || 0; st.u = u; st.pocket = s.pocket;
    if (s.ph === 'reset') { st.fade = Math.sin(u * Math.PI); if (u > 0.5) { st.set.clear(); st.taken.clear(); } }
    break;
  }
  return st;
}
function timeOf(ph, h, frac) { const s = SEGS.find((q) => q.ph === ph && q.h === h); return s ? s.t0 + s.dur * frac : 0; }

const COL = {
  part: ['#e9ecec', '#c5cbcd', '#a3abaf'], bed: ['#8d989d', '#6e797e', '#5b656a'], fence: ['#4c5a61', '#3d494f', '#333e43'],
  tray: ['#3f4b51', '#333d42', '#2a3337'], rail: ['#bdc6ca', '#909b9f', '#788388'], beam: ['#5b6971', '#4b585f', '#3f4b51'],
  carr: ['#3a474d', '#2f3a40', '#273035'], plate: ['#4a5960', '#3c484e', '#323d42'], plinth: ['#232c31', '#1b2327', '#161d20'],
};
class MachineView {
  constructor(canvas, o = {}) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.o = o; this.t = o.t || 0; this.running = false; this.visible = true;
    this.bg = document.createElement('canvas'); this.fg = document.createElement('canvas');
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cw = r.width; this.ch = r.height; this.dpr = dpr;
    for (const c of [this.cv, this.bg, this.fg]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    const minX = -D * C30, maxX = W * C30, minY = -H - 8, maxY = (W + D) * S30 + PL + 4;
    const k = Math.min(this.cw / ((maxX - minX) * 1.05), this.ch / ((maxY - minY) * 1.04));
    this.k = k; this.ox = this.cw / 2 - ((minX + maxX) / 2) * k; this.oy = this.ch / 2 - ((minY + maxY) / 2) * k;
    this.cache(); this.render();
  }
  P(x, y, z) { return [this.ox + (x - y) * C30 * this.k, this.oy + ((x + y) * S30 - z) * this.k]; }
  on(ctx, fn) { const g0 = this.g; this.g = ctx; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, this.cw, this.ch); fn(); this.g = g0; }
  poly(pts, fill, edge) { const g = this.g; g.beginPath(); pts.forEach((p, i) => { const [sx, sy] = this.P(p[0], p[1], p[2]); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (edge) { g.strokeStyle = edge; g.lineWidth = 0.8; g.stroke(); } }
  line(a, b, color, w) { const g = this.g; const [x1, y1] = this.P(...a), [x2, y2] = this.P(...b); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = color; g.lineWidth = w; g.stroke(); }
  box(x0, y0, z0, x1, y1, z1, c, edge) { const e = edge ? 'rgba(8,12,14,.38)' : null; this.poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c[2], e); this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c[1], e); this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c[0], e); }
  ell(x, y, z, r) { const [cx, cy] = this.P(x, y, z); return [cx, cy, r * RXK * this.k, r * RYK * this.k]; }
  oval(x, y, z, r, fill) { const [cx, cy, rx, ry] = this.ell(x, y, z, r); const g = this.g; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  cyl(x, y, z0, z1, r, top, sl, sr, noTop) {
    if (z1 <= z0) return; const g = this.g; const [cx, cb, rx, ry] = this.ell(x, y, z0, r); const ct = this.P(x, y, z1)[1];
    const gr = g.createLinearGradient(cx - rx, 0, cx + rx, 0); gr.addColorStop(0, sl); gr.addColorStop(0.35, sl); gr.addColorStop(1, sr);
    g.beginPath(); g.moveTo(cx - rx, ct); g.lineTo(cx - rx, cb); g.ellipse(cx, cb, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, ct); g.ellipse(cx, ct, rx, ry, 0, 0, Math.PI, false); g.closePath(); g.fillStyle = gr; g.fill();
    if (!noTop) { g.beginPath(); g.ellipse(cx, ct, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = top; g.fill(); }
  }
  hole(x, y, z, r) { const g = this.g; const [cx, cy, rx, ry] = this.ell(x, y, z, r); const gr = g.createLinearGradient(0, cy - ry, 0, cy + ry); gr.addColorStop(0, '#59666c'); gr.addColorStop(0.5, '#273136'); gr.addColorStop(1, '#10161a'); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); }
  flush(x, y, z, sz) {
    this.oval(x, y, z, sz.R + 0.9, 'rgba(110,118,122,.32)');
    const g = this.g; const [cx, cy, rx, ry] = this.ell(x, y, z, sz.R); const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    gr.addColorStop(0, '#f2d283'); gr.addColorStop(0.55, '#c9983c'); gr.addColorStop(1, '#86601d'); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    this.oval(x, y, z, sz.r, '#2c2513');
  }
  insert(x, y, zb, zt, sz, top) { this.cyl(x, y, zb, zt, sz.R, '#ecc974', '#d8aa4c', '#7f581a', !top); if (top) this.oval(x, y, zt, sz.r, '#3a2f15'); }
  spring(x, y, z0, z1) { const g = this.g; const [ax, ay] = this.P(x, y, z0), by = this.P(x, y, z1)[1]; const n = 6, w = 2.4 * this.k; g.beginPath(); g.moveTo(ax, ay); for (let i = 1; i < n; i++) g.lineTo(ax + (i % 2 ? w : -w), ay + ((by - ay) * i) / n); g.lineTo(ax, by); g.strokeStyle = '#c3ccd0'; g.lineWidth = Math.max(1, this.k); g.stroke(); }
  cache() {
    this.on(this.bg.getContext('2d'), () => {
      this.box(0, 0, -PL, W, D, 0, COL.plinth);
      this.poly([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]], '#263136');
      this.poly([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]], '#2d393f');
      // exhaust fan on the back wall
      const fan = (r) => { const pts = []; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; pts.push([230 + r * Math.cos(a), 0, 168 + r * Math.sin(a)]); } return pts; };
      this.poly(fan(19), '#1f282c', '#46545b'); this.poly(fan(13), null, '#3c494f'); this.poly(fan(7), null, '#3c494f');
      this.line([211, 0, 168], [249, 0, 168], '#3c494f', 1); this.line([230, 0, 149], [230, 0, 187], '#3c494f', 1);
      [[0, 0, 0, 0, 0, H], [0, 0, H, W, 0, H], [0, 0, H, 0, D, H]].forEach((q) => this.line(q.slice(0, 3), q.slice(3), '#46555c', 2));
      this.box(BED.x0, BED.y0, 0, BED.x1, BED.y1, BED.z, COL.bed, true);
      for (let x = BED.x0 + 10; x < BED.x1; x += 10) this.line([x, BED.y0, BED.z], [x, BED.y1, BED.z], (x - BED.x0) % 50 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.14)', 0.7);
      for (let y = BED.y0 + 10; y < BED.y1; y += 10) this.line([BED.x0, y, BED.z], [BED.x1, y, BED.z], (y - BED.y0) % 50 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.14)', 0.7);
      this.box(BED.x0, BED.y0, BED.z, BED.x1, BED.y0 + 5, BED.z + 6, COL.fence, true);
      this.box(BED.x0, BED.y0 + 5, BED.z, BED.x0 + 5, BED.y1, BED.z + 6, COL.fence, true);
    });
    this.on(this.fg.getContext('2d'), () => {
      const g = this.g;
      this.poly([[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]], 'rgba(170,205,215,.045)');
      this.poly([[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]], 'rgba(170,205,215,.06)');
      this.poly([[0, 0, H], [W, 0, H], [W, D, H], [0, D, H]], 'rgba(170,205,215,.035)');
      this.poly([[40, D, 0], [110, D, 0], [40, D, 120], [0, D, 150], [0, D, 80]], 'rgba(255,255,255,.035)');
      this.poly([[150, D, 0], [175, D, 0], [70, D, H], [45, D, H]], 'rgba(255,255,255,.03)');
      // door
      this.poly([[24, D, 12], [264, D, 12], [264, D, 206], [24, D, 206]], null, 'rgba(150,170,178,.35)');
      // frame
      const fr = '#5f6e75', fw = Math.max(1.5, 2.2 * this.k);
      [[W, 0, 0, W, 0, H], [W, D, 0, W, D, H], [0, D, 0, 0, D, H], [W, 0, H, W, D, H], [W, D, H, 0, D, H], [W, 0, 0, W, D, 0], [W, D, 0, 0, D, 0]].forEach((q) => this.line(q.slice(0, 3), q.slice(3), fr, fw));
      // nameplate on the plinth
      const [ex, ey] = this.P(22, D, -4);
      g.save(); g.translate(ex, ey); g.transform(C30 * this.k, S30 * this.k, 0, this.k, 0, 0);
      g.fillStyle = '#c09036'; g.fillRect(0, 0, 66, 10); g.fillStyle = '#231a08'; g.font = '700 7.6px "Barlow Condensed", Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('INSERTPRESS', 4.5, 5.4);
      g.restore();
    });
  }
  part(p, st) {
    const [x0, y0, z0, x1, y1, z1] = p.base; this.box(x0, y0, z0, x1, y1, z1, COL.part, true);
    if (p.wall) this.box(...p.wall, COL.part, true);
    p.hs.forEach((h) => { if (p.boss) this.cyl(h.x, h.y, z1, h.z, p.boss, COL.part[0], '#d3d8da', '#9da5a9'); this.mark(h, st); });
  }
  mark(h, st) {
    const sz = SIZES[h.size]; const now = st.h === h.i && (st.ph === 'dwell' || st.ph === 'unthread');
    if (st.set.has(h.i) || now) this.flush(h.x, h.y, h.z, sz); else this.hole(h.x, h.y, h.z, sz.hole);
  }
  tray(st) {
    this.box(TRAY.x0, TRAY.y0, BED.z, TRAY.x1, TRAY.y1, TRAY.z, COL.tray, true);
    POCKETS.forEach((p) => this.hole(p.x, p.y, TRAY.z, SIZES[p.size].R + 0.5));
    POCKETS.forEach((p, k) => { if (!st.taken.has(k)) this.insert(p.x, p.y, TRAY.z, TRAY.z + STICK, SIZES[p.size], true); });
  }
  head(st, time) {
    const hx = st.x, hy = st.y, gy = hy - 26, tz = st.z, g = this.g;
    this.box(hx - 16, gy + 7, RAILZ - 8, hx + 16, gy + 12, RAILZ + 22, COL.carr, true);
    this.box(hx - 12, gy + 12, tz + 92, hx + 12, gy + 16, tz + 152, COL.plate, true);
    let tipClip = -1e9;
    const hole = st.h >= 0 ? ORDER[st.h] : null;
    if (st.carry) {
      const top = tz + ENGAGE, bot = top - INS_L, sz = SIZES[hole ? hole.size : 'm3'];
      const over = ['approach', 'press', 'dwell', 'unthread'].includes(st.ph);
      const clip = over ? hole.z : -1e9;
      if (top > clip + 0.05) this.insert(hx, hy, Math.max(bot, clip), top, sz, true);
      tipClip = top;
    } else if (st.ph === 'pick' || st.ph === 'thread') tipClip = TRAY.z + STICK;
    const tb = Math.max(tz, tipClip);
    this.cyl(hx, hy, tb, tz + 14, 2.6, '#ecc974', '#d8aa4c', '#7f581a');
    this.cyl(hx, hy, tz + 14, tz + 28, 5, '#a3adb1', '#8b959a', '#465055');
    this.cyl(hx, hy, tz + 28, tz + 72, 9.5, '#343f45', '#3b464c', '#14191c');
    this.cyl(hx, hy, tz + 31, tz + 35, 9.65, '#000', '#d8aa4c', '#7f581a', true);
    this.box(hx - 11, hy - 9, tz + 72, hx + 11, hy + 9, tz + 80, COL.carr, true);
    this.spring(hx - 6, hy, tz + 80, tz + 88); this.spring(hx + 6, hy, tz + 80, tz + 88);
    this.box(hx - 11, gy + 16, tz + 88, hx + 11, hy + 9, tz + 93, COL.plate, true);
    // heat glow at the tip
    const [gx, gyy] = this.P(hx, hy, tb); const a = st.hot ? 0.5 + 0.15 * Math.sin(time * 14) : 0.14; const rr = (st.hot ? 20 : 11) * this.k;
    const gr = g.createRadialGradient(gx, gyy, 0, gx, gyy, rr); gr.addColorStop(0, `rgba(240,110,60,${a})`); gr.addColorStop(1, 'rgba(240,110,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(gx, gyy, rr, 0, Math.PI * 2); g.fill();
    if (st.spin) { const [cx, cy, rx, ry] = this.ell(hx, hy, tz + 21, 8.5); g.save(); g.setLineDash([3.5 * this.k, 3 * this.k]); g.lineDashOffset = -st.spin * time * 40 * this.k; g.strokeStyle = '#e2b85e'; g.lineWidth = Math.max(1.2, 1.4 * this.k); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
  }
  callouts(st) {
    const g = this.g, k = this.k, fs = clamp(10.5 * Math.sqrt(k), 9.5, 12);
    g.font = `500 ${fs}px "JetBrains Mono", ui-monospace, monospace`; g.textBaseline = 'middle';
    const list = [
      { p: [st.x, st.y, st.z + 4], t: 'Heated tip, closed-loop', dx: 70, dy: 34 },
      { p: [st.x + 6, st.y, st.z + 84], t: 'Spring-floated head', dx: 64, dy: -36 },
      { p: [70, 182, TRAY.z + 4], t: 'Insert tray, 30 pockets', dx: -40, dy: 84 },
      { p: [BED.x1, BED.y1 - 30, BED.z], t: 'Fixture plate, 200 × 200 mm', dx: 24, dy: 70 },
      { p: [230, 0, 168], t: 'Filtered exhaust fan', dx: 40, dy: -42 },
    ];
    list.forEach((c) => {
      const [ax, ay] = this.P(...c.p); const bx = ax + c.dx * k, by = ay + c.dy * k;
      const tw = g.measureText(c.t).width, pad = 6, right = c.dx > 0;
      let lx = right ? bx : bx - tw - pad * 2; lx = clamp(lx, 4, this.cw - tw - pad * 2 - 4);
      const ly = clamp(by, 12, this.ch - 12);
      g.strokeStyle = 'rgba(226,184,94,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(right ? lx : lx + tw + pad * 2, ly); g.stroke();
      g.fillStyle = '#e2b85e'; g.beginPath(); g.arc(ax, ay, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(14,19,22,.86)'; g.beginPath(); g.roundRect ? g.roundRect(lx, ly - fs * 0.9, tw + pad * 2, fs * 1.8, 4) : g.rect(lx, ly - fs * 0.9, tw + pad * 2, fs * 1.8); g.fill();
      g.fillStyle = '#e9ecea'; g.fillText(c.t, lx + pad, ly + 0.5);
    });
  }
  render() {
    if (!this.cw) return;
    const st = stateAt(this.t), g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.cw, this.ch);
    g.globalAlpha = 1 - st.fade * 0.85;
    g.drawImage(this.bg, 0, 0, this.cw, this.ch);
    this.part(PARTS[0], st); this.tray(st); this.part(PARTS[1], st); this.part(PARTS[2], st); this.part(PARTS[3], st);
    const gy = st.y - 26;
    this.box(RX0 - 5, 8, RAILZ - 10, RX0 + 5, D - 8, RAILZ, COL.rail, true);
    this.box(RX0 - 5, gy - 7, RAILZ, RX1 + 5, gy + 7, RAILZ + 14, COL.beam, true);
    this.head(st, this.t);
    this.box(RX1 - 5, 8, RAILZ - 10, RX1 + 5, D - 8, RAILZ, COL.rail, true);
    this.box(RX1 - 9, gy - 7, RAILZ, RX1 + 5, gy + 7, RAILZ + 14, COL.beam, true);
    g.drawImage(this.fg, 0, 0, this.cw, this.ch);
    g.globalAlpha = 1;
    if (this.o.callouts) this.callouts(st);
    if (this.o.onFrame) this.o.onFrame(st, this.t);
  }
  play() {
    if (this.running || REDUCE) return; this.running = true; let last = performance.now();
    const step = (now) => { if (!this.running) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; if (this.visible && !document.hidden) { this.t += dt * SPEED; this.render(); } this.raf = requestAnimationFrame(step); };
    this.raf = requestAnimationFrame(step);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  watch() { this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; }, { threshold: 0.02 }); this.io.observe(this.cv); return this; }
  destroy() { this.stop(); this.ro.disconnect(); if (this.io) this.io.disconnect(); }
}


const PH = { idle: 'Ready', totray: 'Moving to tray', pick: 'Lowering onto insert', thread: 'Threading on', lift: 'Lifting, insert held', tohole: 'Moving to hole', approach: 'Approaching hole', press: 'Pressing hole', dwell: 'Holding at depth', unthread: 'Unthreading', rise: 'Lifting clear', park: 'Parking', done: 'Plate complete', reset: 'Next plate loaded' };
const dro = { x: $("#dro-x"), y: $("#dro-y"), z: $("#dro-z"), t: $("#dro-t"), s: $("#dro-s"), n: $("#dro-n"), dot: $("#dro-dot") };
let droLast = -1;
function updateDro(st, t) {
  if (!dro.x) return;
  if (Math.abs(t - droLast) < 0.06 && droLast >= 0) return; droLast = t;
  dro.x.textContent = fmt(st.x - BED.x0, 2); dro.y.textContent = fmt(st.y - BED.y0, 2); dro.z.textContent = fmt(st.z - BED.z, 2);
  dro.t.textContent = (235 + (st.hot ? Math.round(Math.sin(t * 7) * 1.4) : 0)) + " °C";
  const h = st.h >= 0 ? ORDER[st.h] : null; let s = PH[st.ph] || "";
  if (h && ["tohole", "approach", "press"].includes(st.ph)) s += " " + (st.h + 1) + " · " + SIZES[h.size].name;
  if (h && (st.ph === "pick" || st.ph === "thread")) s += " · " + SIZES[h.size].name;
  if (st.ph === "done") s += " · " + ORDER.length + " of " + ORDER.length + " set";
  dro.s.textContent = s; dro.n.textContent = st.set.size + " / " + ORDER.length;
  dro.dot.classList.toggle("hot", !!st.hot);
}

  var view = new MachineView(canvas, { t: REDUCE ? timeOf("press", 9, 0.7) : 0, onFrame: updateDro }).watch();
  view.play();
})();
