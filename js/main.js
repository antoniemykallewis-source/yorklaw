// York Law Firm concept: page behaviour, scroll choreography and the 3D stage.
const html = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
const desktopMQ = window.matchMedia('(min-width: 900px)');
const mobile = coarse || !desktopMQ.matches;
const hasGsap = !!(window.gsap && window.ScrollTrigger);

html.classList.add(!reduced && hasGsap ? 'motion' : 'static-scroll');

// ---------------------------------------------------------------- concept notice
const top = document.querySelector('[data-top]');
try { if (window.sessionStorage.getItem('yl-concept-hidden') === '1') top.classList.add('bar-hidden'); } catch (e) { /* storage blocked */ }
document.querySelector('[data-concept-close]')?.addEventListener('click', () => {
  top.classList.add('bar-hidden');
  try { window.sessionStorage.setItem('yl-concept-hidden', '1'); } catch (e) { /* ignore */ }
});

// ---------------------------------------------------------------- nav state
const stage = document.querySelector('[data-stage]');
new IntersectionObserver(([entry]) => {
  top.classList.toggle('is-solid', !entry.isIntersecting);
}, { rootMargin: '-72px 0px 0px 0px' }).observe(stage);

// ---------------------------------------------------------------- mobile menu
const menu = document.querySelector('[data-menu]');
const menuOpen = document.querySelector('[data-menu-open]');
const menuClose = document.querySelector('[data-menu-close]');
function setMenu(open) {
  menu.hidden = !open;
  menuOpen.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) menu.querySelector('a')?.focus();
  else menuOpen.focus();
}
menuOpen?.addEventListener('click', () => setMenu(true));
menuClose?.addEventListener('click', () => setMenu(false));
menu?.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

// ---------------------------------------------------------------- reveal on enter
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

// ---------------------------------------------------------------- reviews
(() => {
  const root = document.querySelector('[data-voices]');
  if (!root) return;
  const voices = [...root.querySelectorAll('.voice')];
  const idx = root.querySelector('[data-voice-index]');
  let i = 0;
  let timer = 0;
  let touched = false;
  const show = (n) => {
    i = (n + voices.length) % voices.length;
    voices.forEach((v, j) => {
      v.classList.toggle('is-active', j === i);
      v.setAttribute('aria-hidden', j === i ? 'false' : 'true');
    });
    idx.textContent = String(i + 1);
  };
  const stopAuto = () => { window.clearInterval(timer); timer = 0; };
  const startAuto = () => { if (!reduced && !touched && !timer) timer = window.setInterval(() => show(i + 1), 8000); };
  root.querySelector('[data-voice-prev]').addEventListener('click', () => { touched = true; stopAuto(); show(i - 1); });
  root.querySelector('[data-voice-next]').addEventListener('click', () => { touched = true; stopAuto(); show(i + 1); });
  root.addEventListener('pointerenter', stopAuto);
  root.addEventListener('pointerleave', startAuto);
  root.addEventListener('focusin', stopAuto);
  new IntersectionObserver(([en]) => (en.isIntersecting ? startAuto() : stopAuto())).observe(root);
  show(0);
})();

// ---------------------------------------------------------------- form (concept: never sends)
(() => {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const setErr = (id, msg) => {
    const input = form.querySelector('#' + id);
    const err = form.querySelector('#' + id + '-err');
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    const v = (n) => (form.elements[n].value || '').trim();
    const errors = [];
    setErr('f-name', ''); setErr('f-phone', ''); setErr('f-email', ''); setErr('f-story', ''); setErr('f-ack', '');
    if (!v('name')) { setErr('f-name', 'Please add your name.'); errors.push('f-name'); }
    const phone = v('phone');
    const email = v('email');
    if (!phone && !email) { setErr('f-phone', 'Add a phone number or an email so we can reach you.'); errors.push('f-phone'); }
    if (phone && phone.replace(/\D/g, '').length < 10) { setErr('f-phone', 'That phone number looks short.'); errors.push('f-phone'); }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('f-email', 'That email address looks incomplete.'); errors.push('f-email'); }
    if (v('story').length < 10) { setErr('f-story', 'A sentence or two about what happened helps us call you back prepared.'); errors.push('f-story'); }
    if (!form.elements.ack.checked) { setErr('f-ack', 'Please confirm before sending.'); errors.push('f-ack'); }
    if (errors.length) { form.querySelector('#' + errors[0])?.focus(); return; }
    status.innerHTML = '<strong>Concept preview.</strong> This form is not connected, so nothing was sent. For a real case review, call <a href="tel:+19166432200">916-643-2200</a>.';
  });
})();

// ---------------------------------------------------------------- guide card artwork (drawn from the record atlas)
(() => {
  const target = document.querySelector('[data-guide-doc]');
  if (!target) return;
  const io = new IntersectionObserver(async ([en]) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    try {
      const { buildAtlas, TILE_W, TILE_H, COLS } = await import('./atlas.js');
      const scale = 0.5;
      const atlas = await buildAtlas(scale);
      const ctx = target.getContext('2d');
      const W = target.width;
      const H = target.height;
      ctx.fillStyle = '#181C22';
      ctx.fillRect(0, 0, W, H);
      const tile = (i) => [(i % COLS) * TILE_W * scale, Math.floor(i / COLS) * TILE_H * scale, TILE_W * scale, TILE_H * scale];
      const place = (i, x, y, w, rot) => {
        const [sx, sy, sw, sh] = tile(i);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 30;
        ctx.drawImage(atlas, sx, sy, sw, sh, -w / 2, -(w * sh / sw) / 2, w, w * sh / sw);
        ctx.restore();
      };
      place(10, W * 0.30, H * 0.52, 300, -0.12);
      place(0, W * 0.58, H * 0.46, 330, 0.05);
      place(7, W * 0.84, H * 0.58, 280, 0.16);
      const g = ctx.createRadialGradient(W * 0.55, H * 0.38, 20, W * 0.55, H * 0.45, W * 0.62);
      g.addColorStop(0, 'rgba(255,181,71,0.10)');
      g.addColorStop(0.5, 'rgba(11,13,16,0.25)');
      g.addColorStop(1, 'rgba(11,13,16,0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } catch (e) { /* card keeps its flat background */ }
  }, { rootMargin: '600px 0px' });
  io.observe(target);
})();

// ---------------------------------------------------------------- 3D stage + scroll choreography
let record = null;
let heroP = 0;
let recP = 0;
const pushJourney = () => { if (record) record.setJourney(heroP * 0.18 + recP * 0.82); };

function setupScroll() {
  if (reduced || !hasGsap) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  // smooth wheel scrolling on desktop pointers only
  let lenis = null;
  if (!coarse && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70, duration: 1.4 });
      else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (id !== '#top') el.setAttribute('tabindex', '-1');
      window.setTimeout(() => el.focus({ preventScroll: true }), 900);
    });
  });

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    onUpdate: (self) => { heroP = self.progress; pushJourney(); },
  });

  const steps = [...document.querySelectorAll('.record-step')];
  let active = 0;
  const setStep = (n) => {
    if (n === active) return;
    active = n;
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === n);
      s.classList.toggle('is-past', i < n);
    });
  };
  ScrollTrigger.create({
    trigger: '.record',
    start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * 3.2),
    pin: true,
    anticipatePin: 1,
    onUpdate: (self) => {
      recP = self.progress;
      setStep(Math.min(steps.length - 1, Math.floor(recP * steps.length * 0.999)));
      pushJourney();
    },
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    // horizontal pan through results: pin at top, scrub the track
    const pin = document.querySelector('[data-results-pin]');
    const track = document.querySelector('[data-results-track]');
    const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    // sticky stack: each card pins at the top, the next one slides over it
    const cards = gsap.utils.toArray('.stack-card');
    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;
      ScrollTrigger.create({
        trigger: card,
        start: 'top top',
        endTrigger: cards[cards.length - 1],
        end: 'top top',
        pin: true,
        pinSpacing: false,
      });
      const st = { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true };
      gsap.to(card, { scale: 0.94, ease: 'none', scrollTrigger: st });
      gsap.to(card.querySelector('.card-shade'), { opacity: 0.6, ease: 'none', scrollTrigger: { ...st } });
    });
  });

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.__lenis = lenis;
}

async function setup3D() {
  const canvas = document.querySelector('[data-stage-canvas]');
  const supported = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  })();
  if (!supported) { html.classList.add('no-webgl', 'has-still'); return; }
  try {
    const { createRecord } = await import('./record.js');
    record = await createRecord(canvas, { mobile, reduced });
    window.__record = record;
    html.classList.add('has-webgl');
    pushJourney();

    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      if (e.pointerType === 'touch') record.touched(nx, ny);
      else record.pointer(nx, ny);
    }, { passive: true });

    let visible = true;
    const run = () => {
      if (reduced) { record.renderOnce(); return; }
      if (visible && !document.hidden) record.start(); else record.stop();
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      html.classList.toggle('stage-off', !visible);
      run();
    }).observe(stage);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('resize', () => { record.resize(); if (reduced) record.renderOnce(); });
    run();
  } catch (err) {
    console.warn('3D stage unavailable, using still fallback.', err);
    html.classList.add('no-webgl', 'has-still');
  }
}

setupScroll();
const ready = () => html.classList.add('is-ready');
if (document.fonts) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(ready);
else ready();
setup3D();
