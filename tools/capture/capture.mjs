// Captures reference screenshots and data for the York Law Firm pitch.
// Runs on GitHub Actions (open network). Output lands on the `captures` branch.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'out';
await fs.mkdir(path.join(OUT, 'assets'), { recursive: true });

const SAC = { latitude: 38.5816, longitude: -121.4944 };
const UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const desktop = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  userAgent: UA_DESKTOP,
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
  geolocation: SAC,
  permissions: ['geolocation'],
};
const mobile = {
  ...devices['iPhone 13'],
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
  geolocation: SAC,
  permissions: ['geolocation'],
};

const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
const report = [];

async function dismiss(page) {
  const labels = ['Accept all', 'Accept All', 'I agree', 'Accept', 'Got it', 'OK', 'Allow all cookies', 'Decline optional cookies', 'Not now', 'Close'];
  for (const l of labels) {
    try {
      const b = page.getByRole('button', { name: l, exact: true }).first();
      if (await b.isVisible({ timeout: 300 })) { await b.click({ timeout: 1000 }); await page.waitForTimeout(400); }
    } catch {}
  }
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += Math.round(window.innerHeight * 0.7)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 350));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
}

async function capture(name, url, ctxOpts, opts = {}) {
  const entry = { name, url };
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    entry.status = resp ? resp.status() : null;
    entry.finalUrl = page.url();
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
    await page.waitForTimeout(opts.wait ?? 2500);
    await dismiss(page);
    if (opts.scroll) await scrollThrough(page);
    if (opts.before) await opts.before(page);
    entry.title = await page.title();
    if (opts.shots) {
      for (const s of opts.shots) {
        await page.screenshot({ path: path.join(OUT, `${name}-${s.suffix}.png`), fullPage: !!s.full });
      }
    } else {
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !!opts.full });
    }
    if (opts.extract) entry.data = await page.evaluate(opts.extract);
    if (opts.after) entry.after = await opts.after(page, ctx);
  } catch (e) {
    entry.error = String(e).slice(0, 500);
    try { await page.screenshot({ path: path.join(OUT, `${name}-error.png`) }); } catch {}
  }
  await ctx.close();
  report.push(entry);
  console.log(JSON.stringify({ name, status: entry.status, error: entry.error }));
}

const meta = () => {
  const m = {};
  document.querySelectorAll('meta[property], meta[name]').forEach((el) => {
    const k = el.getAttribute('property') || el.getAttribute('name');
    if (/og:|description|twitter:/.test(k)) m[k] = el.getAttribute('content');
  });
  return m;
};

// ---------- York Law Firm
await capture('york-home-desktop', 'https://www.yorklawfirm.com/', desktop, {
  scroll: true,
  shots: [{ suffix: 'top' }, { suffix: 'full', full: true }],
  extract: () => {
    const imgs = [...document.images].map((i) => ({
      src: i.currentSrc || i.src || i.getAttribute('data-src') || '',
      alt: i.alt, w: i.naturalWidth, h: i.naturalHeight,
    }));
    const fonts = [...new Set([...document.querySelectorAll('h1,h2,p,a,button')].slice(0, 200).map((e) => getComputedStyle(e).fontFamily))];
    const colors = {};
    [...document.querySelectorAll('body *')].slice(0, 1500).forEach((e) => {
      const cs = getComputedStyle(e);
      [cs.color, cs.backgroundColor].forEach((c) => { if (c && c !== 'rgba(0, 0, 0, 0)') colors[c] = (colors[c] || 0) + 1; });
    });
    const scripts = [...document.scripts].map((s) => s.src).filter(Boolean);
    return {
      h1: document.querySelector('h1')?.innerText,
      imgs, fonts,
      colors: Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 20),
      scripts,
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent.slice(0, 3000)),
      canonical: document.querySelector('link[rel=canonical]')?.href,
      meta: (() => { const m = {}; document.querySelectorAll('meta').forEach((el) => { const k = el.getAttribute('name') || el.getAttribute('property'); if (k) m[k] = el.getAttribute('content'); }); return m; })(),
    };
  },
});
await capture('york-home-mobile', 'https://www.yorklawfirm.com/', mobile, {
  scroll: true,
  shots: [{ suffix: 'top' }, { suffix: 'full', full: true }],
});
await capture('york-dependent-adult', 'https://www.yorklawfirm.com/elder-abuse/', desktop, {
  before: async (page) => {
    await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (/16 and 64/.test(node.textContent)) {
          const el = node.parentElement;
          el.scrollIntoView({ block: 'center' });
          el.style.outline = '4px solid #FF5A2F';
          el.style.outlineOffset = '6px';
          window.__found = el.innerText;
          break;
        }
      }
    });
    await page.waitForTimeout(800);
  },
  extract: () => ({ found: window.__found || null }),
});
await capture('york-contact-mobile', 'https://www.yorklawfirm.com/contact/', mobile, {
  scroll: true,
  shots: [{ suffix: 'top' }, { suffix: 'full', full: true }],
  extract: () => ({
    forms: [...document.forms].map((f) => ({ action: f.action, fields: [...f.elements].map((e) => e.name || e.id).filter(Boolean) })),
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src),
  }),
});
await capture('york-blog-desktop', 'https://www.yorklawfirm.com/blog/', desktop, {});

// York asset pull (their own photos and logo, for the redesign concept)
await capture('york-assets', 'https://www.yorklawfirm.com/about-york-law/', desktop, {
  scroll: true,
  after: async (page, ctx) => {
    const urls = new Set();
    for (const u of ['https://www.yorklawfirm.com/', 'https://www.yorklawfirm.com/about-york-law/', 'https://www.yorklawfirm.com/attorney/york-wendy-c/', 'https://www.yorklawfirm.com/attorney/jay-daniel-p/', 'https://www.yorklawfirm.com/attorney/farris-paige/']) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
        await scrollThrough(page);
        const srcs = await page.evaluate(() => [...document.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src || i.getAttribute('data-src') || '', alt: i.alt || '', w: i.naturalWidth, h: i.naturalHeight })));
        srcs.forEach((s) => { if (s.src && !s.src.startsWith('data:')) urls.add(JSON.stringify(s)); });
      } catch {}
    }
    const saved = [];
    let i = 0;
    for (const raw of urls) {
      const s = JSON.parse(raw);
      if (!/\.(jpe?g|png|webp|svg)(\?|$)/i.test(s.src)) continue;
      try {
        const r = await ctx.request.get(s.src, { timeout: 30000 });
        if (!r.ok()) continue;
        const buf = await r.body();
        if (buf.length < 2500) continue;
        const ext = (s.src.match(/\.(jpe?g|png|webp|svg)/i) || ['.jpg'])[0];
        const file = `york-${String(++i).padStart(2, '0')}${ext}`;
        await fs.writeFile(path.join(OUT, 'assets', file), buf);
        saved.push({ file, ...s, bytes: buf.length });
      } catch {}
    }
    return saved;
  },
});

// ---------- Google (Sacramento search intent)
for (const [name, q] of [['google-elder', 'elder abuse lawyer sacramento'], ['google-nursing', 'nursing home abuse lawyer sacramento'], ['google-brand', 'york law firm sacramento']]) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en&gl=us`;
  await capture(`${name}-desktop`, url, desktop, { wait: 3000, shots: [{ suffix: 'top' }, { suffix: 'full', full: true }], extract: () => ({ text: document.body.innerText.slice(0, 6000) }) });
  await capture(`${name}-mobile`, url, mobile, { wait: 3000, shots: [{ suffix: 'top' }, { suffix: 'full', full: true }] });
}
await capture('google-maps', 'https://www.google.com/maps/search/elder+abuse+lawyer+sacramento?hl=en', desktop, { wait: 6000, extract: () => ({ text: document.body.innerText.slice(0, 4000) }) });

// ---------- Social
await capture('york-instagram', 'https://www.instagram.com/yorklawfirm/', mobile, { wait: 4000, extract: meta });
await capture('york-facebook', 'https://www.facebook.com/YorkLawFirm', mobile, { wait: 4000, extract: meta });
await capture('york-x', 'https://x.com/yorklawcorp', mobile, { wait: 5000, extract: meta });

// ---------- Competitors
await capture('dudensing-desktop', 'https://dudensinglaw.com/', desktop, { scroll: true, shots: [{ suffix: 'top' }] });
await capture('laird-desktop', 'https://seanlairdlaw.com/', desktop, { scroll: true, shots: [{ suffix: 'top' }] });

// ---------- Vessel Archive (deck must match the site)
await capture('va-home-desktop', 'https://vessel-archive.com/', desktop, {
  scroll: true,
  shots: [{ suffix: 'top' }, { suffix: 'full', full: true }],
  extract: () => {
    const root = getComputedStyle(document.documentElement);
    const vars = {};
    for (const p of root) if (p.startsWith('--')) vars[p] = root.getPropertyValue(p).trim();
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { sel, text: (el.innerText || '').slice(0, 80), font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing, color: cs.color, bg: cs.backgroundColor, transform: cs.textTransform };
    };
    const fonts = [];
    document.fonts.forEach((f) => fonts.push(`${f.family} ${f.weight} ${f.style} ${f.status}`));
    const colors = {};
    [...document.querySelectorAll('body *')].slice(0, 3000).forEach((e) => {
      const cs = getComputedStyle(e);
      [cs.color, cs.backgroundColor, cs.borderTopColor].forEach((c) => { if (c && c !== 'rgba(0, 0, 0, 0)') colors[c] = (colors[c] || 0) + 1; });
    });
    const shadows = {};
    [...document.querySelectorAll('body *')].slice(0, 3000).forEach((e) => { const s = getComputedStyle(e).boxShadow; if (s && s !== 'none') shadows[s] = (shadows[s] || 0) + 1; });
    const radii = {};
    [...document.querySelectorAll('body *')].slice(0, 3000).forEach((e) => { const r = getComputedStyle(e).borderRadius; if (r && r !== '0px') radii[r] = (radii[r] || 0) + 1; });
    return {
      vars: Object.keys(vars).length ? vars : null,
      fonts: [...new Set(fonts)],
      h1: pick('h1'), h2: pick('h2'), p: pick('p'), a: pick('a'), button: pick('a[href*="audit"], button'),
      headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 40).map((h) => ({ tag: h.tagName, text: h.innerText.slice(0, 90), size: getComputedStyle(h).fontSize, font: getComputedStyle(h).fontFamily })),
      colors: Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 30),
      shadows: Object.entries(shadows).sort((a, b) => b[1] - a[1]).slice(0, 12),
      radii: Object.entries(radii).sort((a, b) => b[1] - a[1]).slice(0, 12),
      sections: [...document.querySelectorAll('section, [data-framer-name]')].slice(0, 80).map((s) => s.getAttribute('data-framer-name') || s.id || s.className).filter(Boolean),
    };
  },
});
await capture('va-home-mobile', 'https://vessel-archive.com/', mobile, { scroll: true, shots: [{ suffix: 'top' }, { suffix: 'full', full: true }] });
await capture('va-work-desktop', 'https://vessel-archive.com/work', desktop, { scroll: true, shots: [{ suffix: 'top' }, { suffix: 'full', full: true }] });

// ---------- PageSpeed Insights (real Lighthouse data)
for (const strategy of ['mobile', 'desktop']) {
  const entry = { name: `psi-york-${strategy}` };
  try {
    const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://www.yorklawfirm.com/')}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;
    const r = await fetch(u);
    const j = await r.json();
    await fs.writeFile(path.join(OUT, `psi-york-${strategy}.json`), JSON.stringify(j));
    const lr = j.lighthouseResult || {};
    entry.scores = Object.fromEntries(Object.entries(lr.categories || {}).map(([k, v]) => [k, v.score]));
    const a = lr.audits || {};
    entry.metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'interactive'].map((k) => [k, a[k]?.displayValue]));
    entry.failing = Object.values(a).filter((x) => x.score !== null && x.score < 0.5 && x.scoreDisplayMode === 'binary').map((x) => x.title).slice(0, 40);
    entry.field = j.loadingExperience?.overall_category || null;
  } catch (e) { entry.error = String(e); }
  report.push(entry);
}

await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log('done');
