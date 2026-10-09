// Pass 2: York Law Firm pages on a phone (the desktop UA gets a Cloudflare challenge).
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'out';
await fs.mkdir(path.join(OUT, 'assets'), { recursive: true });
const mobile = {
  ...devices['iPhone 13'],
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
};
const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext(mobile);
const page = await ctx.newPage();
const report = [];

async function settle() {
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function go(url) {
  const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle();
  return r ? r.status() : null;
}

// 1. elder abuse page: the "16 and 64" line, highlighted
try {
  const status = await go('https://www.yorklawfirm.com/elder-abuse/');
  const found = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (/16 and 64/.test(node.textContent)) {
        const el = node.parentElement;
        el.scrollIntoView({ block: 'center' });
        el.style.outline = '3px solid #FF5A2F';
        el.style.outlineOffset = '4px';
        return el.innerText;
      }
    }
    return null;
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'york-dependent-adult-mobile.png') });
  report.push({ name: 'dependent-adult', status, found });
} catch (e) { report.push({ name: 'dependent-adult', error: String(e) }); }

// 2. contact page
try {
  const status = await go('https://www.yorklawfirm.com/contact/');
  await page.screenshot({ path: path.join(OUT, 'york-contact-mobile-top.png') });
  const data = await page.evaluate(() => ({
    forms: [...document.forms].map((f) => ({ action: f.action, fields: [...f.elements].map((e) => (e.name || e.id || e.type)).filter(Boolean) })),
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src),
    text: document.body.innerText.slice(0, 2500),
  }));
  report.push({ name: 'contact', status, data });
} catch (e) { report.push({ name: 'contact', error: String(e) }); }

// 3. homepage sections + every image on the key pages, downloaded through the same session
const seen = new Map();
for (const u of [
  'https://www.yorklawfirm.com/',
  'https://www.yorklawfirm.com/about-york-law/',
  'https://www.yorklawfirm.com/attorney/york-wendy-c/',
  'https://www.yorklawfirm.com/attorney/jay-daniel-p/',
  'https://www.yorklawfirm.com/attorney/farris-paige/',
]) {
  try {
    const status = await go(u);
    const imgs = await page.evaluate(() => [...document.querySelectorAll('img, source')].map((i) => ({
      src: i.currentSrc || i.src || i.srcset || i.getAttribute('data-src') || i.getAttribute('data-lazy-src') || '',
      alt: i.alt || '',
      w: i.naturalWidth || 0,
      h: i.naturalHeight || 0,
    })));
    imgs.forEach((im) => {
      const src = (im.src || '').split(' ')[0];
      if (src && !src.startsWith('data:') && !seen.has(src)) seen.set(src, { ...im, src, page: u });
    });
    report.push({ name: 'page', url: u, status, count: imgs.length });
    if (u.endsWith('.com/')) {
      // team block and practice cards on the homepage
      for (const [label, re] of [['team', /Wendy C\. York/], ['practice', /We Represent Clients/i], ['fees', /Financial Burden/i]]) {
        const ok = await page.evaluate((src) => {
          const rx = new RegExp(src.source, src.flags);
          const els = [...document.querySelectorAll('h2,h3,h4,p,div,span')];
          const el = els.find((e) => e.children.length < 4 && rx.test(e.textContent || ''));
          if (!el) return false;
          el.scrollIntoView({ block: 'start' });
          window.scrollBy(0, -80);
          return true;
        }, { source: re.source, flags: re.flags });
        await page.waitForTimeout(700);
        if (ok) await page.screenshot({ path: path.join(OUT, `york-home-${label}-mobile.png`) });
      }
    }
  } catch (e) { report.push({ name: 'page', url: u, error: String(e) }); }
}

const saved = [];
let n = 0;
for (const im of seen.values()) {
  try {
    const r = await page.request.get(im.src, { timeout: 30000, headers: { Referer: 'https://www.yorklawfirm.com/' } });
    if (!r.ok()) { saved.push({ src: im.src, status: r.status() }); continue; }
    const type = r.headers()['content-type'] || '';
    const buf = await r.body();
    if (buf.length < 3000 || !/image/.test(type)) continue;
    const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : type.includes('svg') ? '.svg' : '.jpg';
    const file = `york-${String(++n).padStart(2, '0')}${ext}`;
    await fs.writeFile(path.join(OUT, 'assets', file), buf);
    saved.push({ file, src: im.src, alt: im.alt, page: im.page, bytes: buf.length });
  } catch (e) { saved.push({ src: im.src, error: String(e).slice(0, 120) }); }
}
report.push({ name: 'assets', saved });

await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log('done', saved.length);
