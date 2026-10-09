// Procedural "record" textures for the 3D archive.
// Every document is illustrative: generic forms, no real names, facilities or records.
// Amber (#FFB547) marks the gaps and contradictions; the shader lights those up inside the beam.

export const TILE_W = 512;
export const TILE_H = 662;
export const COLS = 4;
export const ROWS = 3;
export const ATLAS = 2048;

const PAPER = '#ECE7DC';
const PAPER_2 = '#E3DDD0';
const INK = '#23262B';
const INK_SOFT = '#5B5F66';
const RULE = '#BDB8AD';
const AMBER = '#FFB547';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const SANS = '"Schibsted Grotesk", system-ui, sans-serif';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paper(ctx, w, h, seed) {
  const r = rng(seed);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // fibre noise
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // edge wear
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(60,50,30,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // punched holes
  ctx.fillStyle = '#B9B3A6';
  [h * 0.18, h * 0.5, h * 0.82].forEach((y) => {
    ctx.beginPath();
    ctx.arc(22, y, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function header(ctx, title, sub, form) {
  ctx.fillStyle = INK;
  ctx.font = `700 25px ${SANS}`;
  ctx.fillText(title, 52, 64);
  ctx.font = `500 13px ${MONO}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(sub, 52, 88);
  if (form) {
    ctx.textAlign = 'right';
    ctx.fillText(form, TILE_W - 34, 64);
    ctx.textAlign = 'left';
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(52, 104);
  ctx.lineTo(TILE_W - 34, 104);
  ctx.stroke();
}

function field(ctx, label, value, y, opts = {}) {
  ctx.font = `500 13px ${MONO}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(label.toUpperCase(), 52, y);
  if (opts.mark) mark(ctx, 52 + (opts.markX || 150) - 6, y - 17, opts.markW || 240, 24);
  ctx.font = `${opts.weight || 500} 16px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(value, 52 + (opts.markX || 150), y);
  rule(ctx, y + 12);
}

function rule(ctx, y, x0 = 52, x1 = TILE_W - 34) {
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}

// highlighter swipe: uneven edges so it reads as a marker, not a box
function mark(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = AMBER;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - 2, y + h - 2);
  ctx.lineTo(x + 2, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function scrawl(ctx, x, y, text, size = 19) {
  ctx.save();
  ctx.font = `italic 500 ${size}px ${SANS}`;
  ctx.fillStyle = '#2F3540';
  ctx.translate(x, y);
  ctx.rotate(-0.03);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function stamp(ctx, text, x, y, rot = -0.12) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 3;
  ctx.font = `700 22px ${MONO}`;
  const w = ctx.measureText(text).width + 26;
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(-w / 2, -22, w, 36);
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 4);
  ctx.restore();
}

function redact(ctx, x, y, w) {
  ctx.fillStyle = '#16181C';
  ctx.fillRect(x, y - 14, w, 18);
}

function table(ctx, cols, rows, y0, opts = {}) {
  const x0 = 52;
  const x1 = TILE_W - 34;
  const rowH = opts.rowH || 38;
  ctx.font = `500 12px ${MONO}`;
  ctx.fillStyle = INK_SOFT;
  let x = x0;
  cols.forEach((c) => { ctx.fillText(c.label.toUpperCase(), x, y0); x += c.w; });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x1, y0 + 10); ctx.stroke();
  rows.forEach((row, i) => {
    const y = y0 + 10 + rowH * (i + 1) - 12;
    if (row.mark) mark(ctx, x0 - 6, y - 19, x1 - x0 + 10, 27);
    let cx = x0;
    row.cells.forEach((cell, j) => {
      const hand = cols[j].hand;
      if (hand) scrawl(ctx, cx, y, cell, 18);
      else {
        ctx.font = `500 16px ${MONO}`;
        ctx.fillStyle = INK;
        ctx.fillText(cell, cx, y);
      }
      cx += cols[j].w;
    });
    rule(ctx, y + 12);
  });
  return y0 + 10 + rowH * rows.length;
}

const DOCS = [
  // 0 care log with a contradiction
  (ctx) => {
    header(ctx, 'Resident Care Log', 'Repositioning every 2 hours', 'FORM CL-12');
    field(ctx, 'Resident', 'R-0417   Rm 112B', 140);
    const end = table(ctx,
      [{ label: 'Time', w: 110 }, { label: 'Position', w: 170 }, { label: 'Initials', w: 120, hand: true }],
      [
        { cells: ['20:00', 'Left side', 'A.B.'] },
        { cells: ['22:00', 'Right side', 'A.B.'] },
        { cells: ['00:00', 'Back', 'A.B.'] },
        { cells: ['02:00', 'Right side', 'A.B.'], mark: true },
        { cells: ['04:00', '', ''] },
        { cells: ['06:00', '', ''] },
      ], 190);
    ctx.font = `500 13px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('NOTE', 52, end + 46);
    mark(ctx, 46, end + 58, 410, 27);
    ctx.font = `500 15px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText('Resident sent to hospital 01:40', 52, end + 78);
    stamp(ctx, 'LATE ENTRY', 360, 600);
  },
  // 1 staffing
  (ctx) => {
    header(ctx, 'Night Shift Staffing', 'Assignment sheet', 'FORM ST-3');
    field(ctx, 'Unit', 'East wing', 140);
    field(ctx, 'Residents', '46', 190);
    field(ctx, 'Scheduled', '3 CNA   1 LVN', 240);
    field(ctx, 'On duty', '1 CNA   1 LVN', 290, { mark: true, markW: 220 });
    field(ctx, 'Call-outs', '2  (not replaced)', 340, { mark: true, markW: 270 });
    table(ctx,
      [{ label: 'Hall', w: 150 }, { label: 'Assigned', w: 260, hand: true }],
      [
        { cells: ['100', 'M. R.'] },
        { cells: ['200', 'M. R.'] },
        { cells: ['300', 'M. R.'] },
      ], 410);
    scrawl(ctx, 260, 620, 'covered all halls', 20);
  },
  // 2 MAR
  (ctx) => {
    header(ctx, 'Medication Administration', 'Record, days 1 to 14', 'MAR');
    field(ctx, 'Order', 'Scheduled 08:00 and 20:00', 140);
    const x0 = 52, y0 = 190, cw = 30, ch = 34;
    ctx.font = `500 12px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    for (let d = 0; d < 14; d++) ctx.fillText(String(d + 1).padStart(2, '0'), x0 + d * cw, y0);
    ['08', '20'].forEach((t, r) => {
      for (let d = 0; d < 14; d++) {
        const x = x0 + d * cw, y = y0 + 14 + r * ch;
        ctx.strokeStyle = RULE;
        ctx.strokeRect(x, y, cw - 3, ch - 4);
        const blank = (r === 1 && (d === 6 || d === 7 || d === 8)) || (r === 0 && d === 7);
        if (blank) mark(ctx, x + 1, y + 1, cw - 5, ch - 6);
        else scrawl(ctx, x + 4, y + 22, 'AB', 13);
      }
    });
    ctx.font = `500 13px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('KEY', 52, 330);
    mark(ctx, 46, 342, 330, 27);
    ctx.font = `500 15px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText('Blank = dose not documented', 52, 362);
    for (let i = 0; i < 6; i++) rule(ctx, 420 + i * 38);
  },
  // 3 call lights
  (ctx) => {
    header(ctx, 'Call Light Report', 'Response times, night shift', 'SYS EXPORT');
    table(ctx,
      [{ label: 'Room', w: 90 }, { label: 'On', w: 100 }, { label: 'Answered', w: 130 }, { label: 'Wait', w: 100 }],
      [
        { cells: ['104', '23:41', '23:46', '5 min'] },
        { cells: ['109', '00:20', '00:24', '4 min'] },
        { cells: ['112', '01:12', '01:53', '41 min'], mark: true },
        { cells: ['117', '02:05', '02:11', '6 min'] },
        { cells: ['112', '03:30', '04:02', '32 min'], mark: true },
        { cells: ['121', '04:44', '04:49', '5 min'] },
        { cells: ['104', '05:15', '05:19', '4 min'] },
      ], 140);
    ctx.font = `500 12px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('PAGE 3 OF 11', 52, 630);
  },
  // 4 incident report
  (ctx) => {
    header(ctx, 'Incident Report', 'Internal, not part of chart', 'IR-2219');
    field(ctx, 'Type', 'Fall, unwitnessed', 140);
    field(ctx, 'Found', '05:50 on floor', 190);
    field(ctx, 'Physician told', '-', 240, { mark: true, markW: 200 });
    field(ctx, 'Family told', '-', 290, { mark: true, markW: 200 });
    ctx.font = `500 13px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('DESCRIPTION', 52, 350);
    scrawl(ctx, 52, 392, 'Res. found next to bed. Assisted back', 18);
    scrawl(ctx, 52, 424, 'to bed. No distress noted.', 18);
    redact(ctx, 52, 470, 300);
    redact(ctx, 52, 500, 220);
    stamp(ctx, 'CONFIDENTIAL', 300, 590, -0.08);
  },
  // 5 weight record
  (ctx) => {
    header(ctx, 'Weight Record', 'Monthly', 'FORM W-1');
    table(ctx,
      [{ label: 'Month', w: 170 }, { label: 'Weight', w: 150 }, { label: 'By', w: 100, hand: true }],
      [
        { cells: ['Month 1', '132 lb', 'J.T.'] },
        { cells: ['Month 2', '127 lb', 'J.T.'] },
        { cells: ['Month 3', '121 lb', 'J.T.'] },
        { cells: ['Month 4', '118 lb', 'J.T.'], mark: true },
      ], 140);
    field(ctx, 'Change', '-14 lb in 90 days', 380, { mark: true, markW: 250 });
    field(ctx, 'Dietitian', 'Not ordered', 430, { mark: true, markW: 190 });
    for (let i = 0; i < 4; i++) rule(ctx, 490 + i * 38);
  },
  // 6 state inspection
  (ctx) => {
    header(ctx, 'Statement of Deficiencies', 'State survey, annual', 'CMS-2567');
    field(ctx, 'Provider', '', 140);
    redact(ctx, 202, 140, 230);
    field(ctx, 'Scope', 'Pattern', 190);
    ctx.font = `500 13px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('FINDING', 52, 250);
    mark(ctx, 46, 262, 420, 27);
    mark(ctx, 46, 292, 380, 27);
    ctx.font = `500 15px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText('Failed to provide care and', 52, 282);
    ctx.fillText('services to prevent injury', 52, 312);
    for (let i = 0; i < 7; i++) rule(ctx, 360 + i * 36);
    ctx.font = `500 12px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('CONTINUED ON PAGE 6', 52, 630);
  },
  // 7 skin assessment
  (ctx) => {
    header(ctx, 'Skin Assessment', 'Weekly check', 'FORM SK-4');
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 2;
    // simple front/back outline (two capsules)
    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      ctx.stroke();
    };
    [[150, 300], [330, 300]].forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy - 120, 26, 0, Math.PI * 2); ctx.stroke();
      rr(cx - 42, cy - 88, 84, 150, 30);
      rr(cx - 34, cy + 64, 30, 110, 14);
      rr(cx + 4, cy + 64, 30, 110, 14);
    });
    field(ctx, 'Last check', '6 days ago', 540, { mark: true, markW: 190 });
    field(ctx, 'Next due', 'Not scheduled', 590);
  },
  // 8 fluids
  (ctx) => {
    header(ctx, 'Fluid Intake', '24 hour total', 'FORM I-O');
    field(ctx, 'Care plan', '1,500 mL per day', 140);
    table(ctx,
      [{ label: 'Shift', w: 150 }, { label: 'Intake', w: 150 }, { label: 'By', w: 100, hand: true }],
      [
        { cells: ['Day', '240 mL', 'K.L.'] },
        { cells: ['Evening', '100 mL', 'K.L.'] },
        { cells: ['Night', '0 mL', '-'] },
      ], 200);
    field(ctx, 'Total', '340 mL', 390, { mark: true, markW: 150, weight: 700 });
    for (let i = 0; i < 5; i++) rule(ctx, 450 + i * 36);
  },
  // 9 nurse notes, contradiction
  (ctx) => {
    header(ctx, "Nurse's Notes", 'Progress notes', 'PN');
    ctx.font = `500 13px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ['03:00', '05:55', '07:10'].forEach((t, i) => ctx.fillText(t, 52, 160 + i * 130));
    mark(ctx, 140, 140, 300, 27);
    scrawl(ctx, 146, 160, 'Resting comfortably.', 19);
    scrawl(ctx, 146, 192, 'No concerns.', 19);
    scrawl(ctx, 146, 290, 'Called to room 112.', 19);
    redact(ctx, 146, 326, 240);
    scrawl(ctx, 146, 420, 'Family called, left', 19);
    scrawl(ctx, 146, 452, 'message.', 19);
    stamp(ctx, 'LATE ENTRY', 330, 590, 0.1);
  },
  // 10 care plan
  (ctx) => {
    header(ctx, 'Care Plan', 'Interventions', 'CP-7');
    const items = [
      ['Turn and reposition every 2 hours', true],
      ['Pressure-relieving mattress', false],
      ['Assist with all meals', true],
      ['Encourage fluids each round', false],
      ['Fall precautions, bed alarm on', true],
    ];
    items.forEach(([t, m], i) => {
      const y = 160 + i * 64;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(52, y - 18, 22, 22);
      if (m) mark(ctx, 88, y - 21, 360, 28);
      ctx.font = `500 15px ${MONO}`;
      ctx.fillStyle = INK;
      ctx.fillText(t, 94, y);
    });
    for (let i = 0; i < 3; i++) rule(ctx, 520 + i * 36);
  },
  // 11 exhibit cover
  (ctx) => {
    ctx.fillStyle = PAPER_2;
    ctx.fillRect(0, 0, TILE_W, TILE_H);
    ctx.fillStyle = INK;
    ctx.font = `800 64px ${SANS}`;
    ctx.fillText('EXHIBIT', 60, 250);
    mark(ctx, 54, 282, 150, 92);
    ctx.font = `800 92px ${SANS}`;
    ctx.fillText('14', 66, 360);
    ctx.font = `500 15px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('PRODUCED BY DEFENDANT', 62, 440);
    ctx.fillText('DEF 004172 - 004198', 62, 470);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, TILE_W - 72, TILE_H - 72);
  },
];

export async function buildAtlas(scale = 1) {
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load(`500 16px "IBM Plex Mono"`),
        document.fonts.load(`700 25px "Schibsted Grotesk"`),
        document.fonts.load(`italic 500 19px "Schibsted Grotesk"`),
      ]);
    } catch (e) { /* draw with fallbacks */ }
  }
  const size = Math.round(ATLAS * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#16181C';
  ctx.fillRect(0, 0, size, size);
  const tile = document.createElement('canvas');
  tile.width = TILE_W;
  tile.height = TILE_H;
  const t = tile.getContext('2d', { willReadFrequently: true });
  DOCS.forEach((draw, i) => {
    t.save();
    t.clearRect(0, 0, TILE_W, TILE_H);
    if (i !== 11) paper(t, TILE_W, TILE_H, 1000 + i * 77);
    draw(t);
    t.restore();
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.drawImage(tile, col * TILE_W * scale, row * TILE_H * scale, TILE_W * scale, TILE_H * scale);
  });
  return canvas;
}

export const DOC_COUNT = DOCS.length;
