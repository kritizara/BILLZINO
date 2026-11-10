(function(run){var t0=Date.now();function ready(){var l=document.querySelectorAll('link[id^="css-"]');for(var i=0;i<l.length;i++){if(!l[i].sheet)return false}return true}(function go(){if(ready()||Date.now()-t0>4000)run();else setTimeout(go,16)})()})(function(){
const BZ = window.bzI18n||{t:(k,f)=>f,doc:(c)=>c,code:(c)=>c,fill:(t)=>t,locale:'en-US',commaDecimal:false,lang:'en'};
// ---------- Toast (shared by the builder's Save button and the dashboard) ----------
window.billzinoToast = function (message, tone) {
  let host = document.getElementById('billzinoToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'billzinoToastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (tone === 'error' ? ' is-error' : '');
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 300);
  }, 3200);
};

// ---------- Theme toggle ----------
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const meta = document.querySelector('meta[name="theme-color"]');
  const COLORS = { dark: '#0b0d0f', light: '#f7f8f6' };
  let stored = null;
  try { stored = localStorage.getItem('billzino-theme'); } catch (e) {}
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

  function sync() {
    const t = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (meta) meta.setAttribute('content', COLORS[t]);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(t === 'dark'));
      toggle.setAttribute('title', t === 'dark' ? 'Light mode' : 'Dark mode');
    }
  }
  sync();

  toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.classList.add('theme-anim');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('billzino-theme', next); } catch (e) {}
    sync();
    clearTimeout(window.__themeAnim);
    window.__themeAnim = setTimeout(() => root.classList.remove('theme-anim'), 450);
  });
})();

// ---------- Mobile nav burger ----------
(function () {
  const header = document.getElementById('siteHeader');
  const burger = document.getElementById('navBurger');
  const nav = document.getElementById('mainNav');
  if (!header || !burger || !nav) return;

  function closeMenu() {
    header.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('click', (e) => {
    if (header.classList.contains('nav-open') && !header.contains(e.target)) closeMenu();
  });
})();

// ---------- Auth pages — password show/hide ----------
(function () {
  const toggles = document.querySelectorAll('.auth-eye-toggle');
  if (!toggles.length) return;

  const eyeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOffIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

  toggles.forEach((btn) => {
    btn.innerHTML = eyeIcon;
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? eyeOffIcon : eyeIcon;
    });
  });
})();

// ---------- Reveal-on-scroll animation ----------
(function () {
  const items = document.querySelectorAll('.reveal');
  items.forEach((el) => {
    el.style.setProperty('--reveal-delay', el.dataset.reveal || 0);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
})();

// ---------- Trusted-by logo carousel ----------
(function () {
  const track = document.getElementById('trustedTrack');
  const prevBtn = document.getElementById('trustedPrev');
  const nextBtn = document.getElementById('trustedNext');
  const panel = document.getElementById('trustedPanel');
  if (!track || !prevBtn || !nextBtn || !panel) return;

  const speed = 32; // px per second, auto-scroll
  let setWidth = track.scrollWidth / 2; // logos are duplicated once for a seamless loop
  let pos = 0;
  let paused = false;
  let resumeTimer = null;
  let lastTime = null;
  let running = false;

  const recalc = () => { setWidth = track.scrollWidth / 2; };
  window.addEventListener('resize', recalc);

  function step(time) {
    if (!running) { lastTime = null; return; }
    if (lastTime === null) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (!paused) {
      pos -= speed * dt;
      if (pos <= -setWidth) pos += setWidth;
      if (pos > 0) pos -= setWidth;
    }
    track.style.transform = `translateX(${pos}px)`;
    requestAnimationFrame(step);
  }

  // Only animate while the carousel is actually on screen. The loop is purely
  // decorative, so running it for a section far below the fold just burns CPU
  // and blocks the main thread (Lighthouse TBT) for no visible benefit.
  function start() {
    if (running) return;
    running = true;
    lastTime = null;
    requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    lastTime = null;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !document.hidden) start();
      else stop();
    }, { threshold: 0 }).observe(panel);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (panel.getBoundingClientRect().bottom > 0 && panel.getBoundingClientRect().top < window.innerHeight) start();
    });
  } else {
    start();
  }

  panel.addEventListener('mouseenter', () => { paused = true; });
  panel.addEventListener('mouseleave', () => { paused = false; });

  function nudge(direction) {
    paused = true;
    clearTimeout(resumeTimer);
    track.style.transition = 'transform .45s ' + 'cubic-bezier(.16,1,.3,1)';
    pos += direction * 220;
    if (pos <= -setWidth) pos += setWidth;
    if (pos > 0) pos -= setWidth;
    track.style.transform = `translateX(${pos}px)`;
    setTimeout(() => { track.style.transition = ''; }, 460);
    resumeTimer = setTimeout(() => { paused = false; }, 2200);
  }

  prevBtn.addEventListener('click', () => nudge(1));
  nextBtn.addEventListener('click', () => nudge(-1));
})();

// ---------- "Who it's for" audience showcase carousel ----------
(function () {
  const media = document.getElementById('audienceMedia');
  const slides = document.querySelectorAll('#audienceMedia .audience-slide');
  const dots = document.querySelectorAll('#audienceDots .audience-dot');
  if (!media || !slides.length || !dots.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timer = null;

  function goTo(i) {
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('is-active');
    current = (i + slides.length) % slides.length;
    slides[current].classList.add('is-active');
    dots[current].classList.add('is-active');
  }

  function startAuto() {
    if (reduceMotion) return;
    timer = setInterval(() => goTo(current + 1), 4500);
  }
  function stopAuto() { clearInterval(timer); }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(Number(dot.dataset.i));
      stopAuto();
      startAuto();
    });
  });

  media.addEventListener('mouseenter', stopAuto);
  media.addEventListener('mouseleave', startAuto);

  startAuto();
})();

// ---------- Dashboard mockup: scale fixed-resolution canvases to fit ----------
// The dashboard/phone UIs are authored at a fixed pixel resolution so their
// layout can never reflow or overflow; we just scale the whole canvas as a
// single unit to match whatever size the screen actually renders at.
(function () {
  const pairs = [
    { containers: '.laptop-screen', canvases: '.dash-canvas', prop: '--s' },
    { containers: '.phone-screen', canvases: '.phone-canvas', prop: '--ps' },
  ];

  // Every measurement is taken in one read pass and every style is written in
  // one write pass. Doing read → write → read → write here would force a full
  // reflow of the page for each mockup, which is very expensive on a phone.
  const jobs = [];

  pairs.forEach(({ containers, canvases, prop }) => {
    const containerEls = document.querySelectorAll(containers);
    const canvasEls = document.querySelectorAll(canvases);

    containerEls.forEach((containerEl, i) => {
      const canvasEl = canvasEls[i];
      if (!canvasEl) return;
      jobs.push(() => {
        // Read the canvas's own authored width (unaffected by its scale
        // transform) so this keeps working if a media query changes it.
        const baseWidth = parseFloat(getComputedStyle(canvasEl).width) || 1;
        const width = containerEl.clientWidth;
        return () => canvasEl.style.setProperty(prop, width / baseWidth);
      });
    });
  });

  // The invoice builder's canvas has dynamic content height (adding a line
  // item, revealing tax/discount rows) — recompute both the scale AND the
  // container height whenever its width changes or its content changes.
  const builderBody = document.querySelector('.builder-body');
  const builderCanvas = document.querySelector('.builder-canvas');
  if (builderBody && builderCanvas) {
    jobs.push(() => {
      const baseWidth = parseFloat(getComputedStyle(builderCanvas).width) || 1;
      const width = builderBody.clientWidth;
      const height = builderCanvas.scrollHeight;
      return () => {
        builderCanvas.style.setProperty('--bs', width / baseWidth);
        builderBody.style.height = height * (width / baseWidth) + 'px';
      };
    });
  }

  function applyAll() {
    const writes = jobs.map((job) => job());
    writes.forEach((write) => write());
  }

  applyAll();

  if (!jobs.length) return;
  const observed = document.querySelectorAll('.laptop-screen, .phone-screen, .builder-body');
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(applyAll);
    observed.forEach((el) => ro.observe(el));
  }
  if (builderBody && builderCanvas && 'MutationObserver' in window) {
    // Coalesce the builder's many mutations into one measurement per frame.
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; applyAll(); });
    };
    new MutationObserver(schedule).observe(builderCanvas, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
})();

// ---------- Below-the-fold app (loaded right after the first paint) ----------
(function () {
  let started = false;
  function load() {
    if (started) return;
    started = true;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/css/font-mono.css?v=1';
    document.head.appendChild(css);
    const seo = document.createElement('script');
    seo.src = '/js/seo.js?v=8';
    seo.async = true;
    document.head.appendChild(seo);
    const s = document.createElement('script');
    s.src = '/js/app.js?v=1';
    s.async = true;
    document.head.appendChild(s);
  }
  // The builder and the demos sit far below the fold. Start setting them up
  // only when the visitor gets close, on a builder link click, or on a deep
  // link — so that work never competes with painting the first screen.
  const targets = document.querySelectorAll('#builder, #demo, #live');
  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        load();
      }
    }, { rootMargin: '200px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    const raf = window.requestAnimationFrame || ((f) => setTimeout(f, 16));
    raf(() => raf(load));
  }
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t && t.closest && t.closest('a[href*="#builder"]')) load();
  }, true);
  if (location.hash === '#builder' || /[?&]currency=/.test(location.search)) load();
})();

// ---------- Hero laptop: numbers count up and bars grow (re-plays every time it scrolls into view) ----------
(function () {
  const dash = document.querySelector('.hero .dash');
  if (!dash) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nums = Array.from(dash.querySelectorAll('.dash-stat strong, .dash-row .mono:last-child')).filter((n) => /\d/.test(n.textContent));
  const finals = nums.map((n) => n.textContent.trim());
  const parse = (s) => {
    const m = s.match(/^(\D*)([\d,]+(?:\.(\d+))?)(.*)$/);
    return m ? { pre: m[1], val: parseFloat(m[2].replace(/,/g, '')), dec: m[3] ? m[3].length : 0, post: m[4] } : null;
  };
  const parsed = finals.map(parse);
  const fmt = (p, v) => p.pre + v.toLocaleString('en-US', { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec }) + p.post;
  let raf = 0;

  function play() {
    if (reduce) return;
    cancelAnimationFrame(raf);
    dash.classList.remove('is-anim');
    void dash.offsetWidth;
    dash.classList.add('is-anim');
    const t0 = performance.now(), dur = 1700;
    (function step(now) {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 4);
      nums.forEach((n, i) => {
        const p = parsed[i];
        if (!p) return;
        const delay = Math.min(0.35, i * 0.04);
        const kk = Math.min(1, Math.max(0, (k - delay) / (1 - delay)));
        n.textContent = fmt(p, p.val * (1 - Math.pow(1 - kk, 4)));
      });
      if (k < 1) raf = requestAnimationFrame(step);
      else nums.forEach((n, i) => { n.textContent = finals[i]; });
    })(t0);
  }

  if (!reduce) nums.forEach((n, i) => { const p = parsed[i]; if (p) n.textContent = fmt(p, 0); });
  if ('IntersectionObserver' in window) {
    let was = false;
    new IntersectionObserver((en) => {
      const on = en[0].isIntersecting;
      if (on && !was) play();
      if (!on && was) nums.forEach((n, i) => { const p = parsed[i]; if (p && !reduce) n.textContent = fmt(p, 0); });
      was = on;
    }, { threshold: 0.45 }).observe(dash);
  } else play();
})();

// ---------- FAQ: search, category filter, accordion ----------
(function () {
  const items = Array.from(document.querySelectorAll('.faq-item'));
  const cats = Array.from(document.querySelectorAll('.faq-cat'));
  const search = document.getElementById('faqSearch');
  const searchClear = document.getElementById('faqSearchClear');
  const emptyMsg = document.getElementById('faqEmpty');
  const emptyQuery = document.getElementById('faqEmptyQuery');
  const pill = document.getElementById('faqCatPill');
  if (!items.length) return;

  let activeCat = 'all';

  function applyFilters() {
    const q = search.value.trim().toLowerCase();
    let visibleCount = 0;
    items.forEach((item) => {
      const matchesCat = activeCat === 'all' || item.dataset.cat === activeCat;
      const matchesSearch = !q || item.textContent.toLowerCase().includes(q);
      const visible = matchesCat && matchesSearch;
      item.hidden = !visible;
      if (visible) visibleCount++;
    });
    emptyMsg.hidden = visibleCount > 0;
    emptyQuery.textContent = q;
    if (searchClear) searchClear.hidden = !q;
  }

  function movePill(btn) {
    if (!pill) return;
    pill.style.transform = `translateY(${btn.offsetTop}px)`;
    pill.style.height = btn.offsetHeight + 'px';
  }

  cats.forEach((btn) => {
    btn.addEventListener('click', () => {
      cats.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCat = btn.dataset.cat;
      movePill(btn);
      applyFilters();
    });
  });

  const initialActive = cats.find((b) => b.classList.contains('is-active'));
  if (initialActive) movePill(initialActive);

  search.addEventListener('input', applyFilters);

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      search.value = '';
      applyFilters();
      search.focus();
    });
  }

  items.forEach((item) => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      items.forEach((i) => i.classList.remove('is-open'));
      if (!wasOpen) item.classList.add('is-open');
    });
  });
})();

/* ============ Back to top ============ */
(() => {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle('is-visible', window.scrollY > 640);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ============ CTA band — mouse-tracking spotlight ============ */
(() => {
  const card = document.getElementById('ctaBandInner');
  if (!card || matchMedia('(pointer:coarse)').matches) return;

  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
  });
})();

/* ============ Magnetic buttons (CTA band) ============ */
(() => {
  const buttons = document.querySelectorAll('.magnetic');
  if (!buttons.length || matchMedia('(pointer:coarse)').matches) return;

  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

/* ============ Contact form — opens a prefilled mailto ============ */
(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim() || 'Question about BillZino';
    const message = form.message.value.trim();

    const body = `${message}\n\n—\n${name} (${email})`;
    const url = `mailto:support@billzino.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  });
})();

/* ============ Auth forms — UI only, no backend wired yet ============ */
(() => {
  document.querySelectorAll('.auth-form').forEach((form) => {
    form.addEventListener('submit', (e) => e.preventDefault());
  });
})();


/* language switcher */
(function(){var sw=document.querySelectorAll('[data-lang-switch]');if(!sw.length)return;
function close(s){s.classList.remove('is-open');var b=s.querySelector('.lang-btn');b&&b.setAttribute('aria-expanded','false')}
sw.forEach(function(s){var b=s.querySelector('.lang-btn');
b.addEventListener('click',function(e){e.stopPropagation();var o=!s.classList.contains('is-open');sw.forEach(close);if(o){s.classList.add('is-open');b.setAttribute('aria-expanded','true')}});
s.addEventListener('keydown',function(e){if(e.key==='Escape'){close(s);b.focus()}});});
document.addEventListener('click',function(e){sw.forEach(function(s){if(!s.contains(e.target))close(s)})});
})();

});
