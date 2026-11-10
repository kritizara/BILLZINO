(function(run){var t0=Date.now();function ready(){var l=document.querySelectorAll('link[id^="css-"]');for(var i=0;i<l.length;i++){if(!l[i].sheet)return false}return true}(function go(){if(ready()||Date.now()-t0>4000)run();else setTimeout(go,16)})()})(function(){
// SEO pages + "Invoice basics": reading progress, table-of-contents scroll-spy,
// and the interactive annotated invoice (hover / auto-cycle a checklist item
// to light up the matching part of a sample invoice).
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reading progress bar (article pages) ----
  const article = document.querySelector('.seo-prose');
  if (article) {
    const bar = document.createElement('div');
    bar.className = 'seo-progress';
    document.body.appendChild(bar);
    let tick = false;
    const update = () => {
      tick = false;
      const r = article.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.3) / Math.max(1, total)));
      bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ---- table of contents scroll-spy ----
  const toc = Array.from(document.querySelectorAll('.seo-toc a'));
  const secs = toc.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (toc.length && secs.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          toc.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-25% 0px -60% 0px' });
    secs.forEach((s) => io.observe(s));
  }

  // ---- annotated invoice (diagram with leader lines; swipe carousel on mobile) ----
  const basics = document.getElementById('guide');
  const dia = basics && basics.querySelector('.an-diagram');
  if (dia) {
    const cards = Array.from(dia.querySelectorAll('.an-card')).sort((a, b) => Number(a.style.getPropertyValue('--i')) - Number(b.style.getPropertyValue('--i')));
    const parts = Array.from(dia.querySelectorAll('[data-z]'));
    const dots = Array.from(dia.querySelectorAll('.an-dots button'));
    const scroller = dia.querySelector('.an-cards');
    const svg = dia.querySelector('.an-lines');
    const paper = dia.querySelector('.an-paper');
    const mq = window.matchMedia('(max-width: 999px)');
    const NS = 'http://www.w3.org/2000/svg';
    let cur = 0, hover = false, visible = false, timer, lock = false, pauseUntil = 0, sTimer;
    let lines = [], dts = [];
    const mk = (n, c) => { const e = document.createElementNS(NS, n); e.setAttribute('class', c); svg.appendChild(e); return e; };
    const mark = () => {
      lines.forEach((l, k) => l.classList.toggle('is-on', k === cur));
      dts.forEach((d, k) => d.classList.toggle('is-on', Math.floor(k / 2) === cur));
    };
    const build = () => {
      svg.innerHTML = ''; lines = []; dts = [];
      if (mq.matches) return;
      const d = dia.getBoundingClientRect(), pr = paper.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + d.width + ' ' + d.height);
      cards.forEach((c, i) => {
        const left = c.dataset.side === 'l', cr = c.getBoundingClientRect();
        const z = parts.find((p) => Number(p.dataset.z) === i + 1 && !p.hasAttribute('data-sub')).getBoundingClientRect();
        const sx = (left ? cr.right : cr.left) - d.left, sy = cr.top + cr.height / 2 - d.top;
        const ex = (left ? pr.left : pr.right) - d.left, ey = z.top + z.height / 2 - d.top;
        const k = Math.abs(ex - sx) * 0.55, dir = left ? 1 : -1;
        const path = mk('path', 'an-line');
        path.setAttribute('d', 'M' + sx + ' ' + sy + ' C' + (sx + dir * k) + ' ' + sy + ' ' + (ex - dir * k) + ' ' + ey + ' ' + ex + ' ' + ey);
        lines.push(path);
        [[sx, sy], [ex, ey]].forEach((pt) => { const o = mk('circle', 'an-dot'); o.setAttribute('cx', pt[0]); o.setAttribute('cy', pt[1]); o.setAttribute('r', 3.5); dts.push(o); });
      });
      mark();
    };
    const goCard = (i) => {
      if (!mq.matches || !scroller) return;
      lock = true; clearTimeout(goCard.t);
      const c = cards[i];
      scroller.scrollTo({ left: c.offsetLeft - (scroller.clientWidth - c.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      goCard.t = setTimeout(() => { lock = false; }, 700);
    };
    const set = (i, scrollCard) => {
      cur = i;
      cards.forEach((r, k) => r.classList.toggle('is-on', k === i));
      dots.forEach((r, k) => r.classList.toggle('is-on', k === i));
      parts.forEach((p) => p.classList.toggle('is-on', Number(p.dataset.z) === i + 1));
      const tn = document.getElementById('anTipN'), tt = document.getElementById('anTipT');
      if (tn && tt) { tn.textContent = i + 1; tt.textContent = cards[i].querySelector('h3').textContent; }
      mark();
      if (scrollCard) goCard(i);
    };
    const pause = (ms) => { pauseUntil = Date.now() + ms; };
    const next = () => { if (!hover && visible && !reduce && Date.now() > pauseUntil) set((cur + 1) % cards.length, true); };
    cards.forEach((c, i) => {
      c.addEventListener('mouseenter', () => { if (!mq.matches) { hover = true; set(i); } });
      c.addEventListener('focusin', () => { if (!mq.matches) { hover = true; set(i); } });
      c.addEventListener('mouseleave', () => { hover = false; });
      c.addEventListener('focusout', () => { hover = false; });
      c.addEventListener('click', (e) => { if (e.target.closest('a')) return; set(i, true); pause(8000); });
    });
    parts.forEach((p) => {
      p.addEventListener('mouseenter', () => { if (!mq.matches) { hover = true; set(Number(p.dataset.z) - 1); } });
      p.addEventListener('mouseleave', () => { hover = false; });
      p.addEventListener('click', () => { set(Number(p.dataset.z) - 1, true); pause(8000); });
    });
    dots.forEach((d, i) => d.addEventListener('click', () => { set(i, true); pause(8000); }));
    if (scroller) {
      ['touchstart', 'pointerdown', 'wheel'].forEach((ev) => scroller.addEventListener(ev, () => pause(8000), { passive: true }));
      scroller.addEventListener('scroll', () => {
        if (!mq.matches || lock) return;
        clearTimeout(sTimer);
        sTimer = setTimeout(() => {
          const mid = scroller.scrollLeft + scroller.clientWidth / 2;
          let best = 0, bd = 1e9;
          cards.forEach((c, k) => { const dd = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (dd < bd) { bd = dd; best = k; } });
          if (best !== cur) set(best);
        }, 80);
      }, { passive: true });
    }
    set(0);
    build();
    if ('ResizeObserver' in window) new ResizeObserver(build).observe(dia);
    window.addEventListener('resize', build);
    window.addEventListener('load', build);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        visible = en[0].isIntersecting;
        clearInterval(timer);
        if (visible) { build(); timer = setInterval(next, mq.matches ? 3400 : 2600); }
      }, { threshold: 0.3 }).observe(dia);
    }
  }
})();

// copy buttons on email-template cards
document.querySelectorAll('[data-copy]').forEach((b) => {
  b.addEventListener('click', async () => {
    const card = b.closest('.mail-card');
    const subj = card.querySelector('.mail-subj span')?.innerText.trim() || '';
    const body = Array.from(card.querySelectorAll('.mail-body p')).map((p) => p.innerText.trim()).join('\n\n');
    const text = (subj ? 'Subject: ' + subj + '\n\n' : '') + body;
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (_) {} t.remove();
    }
    const old = b.textContent; b.textContent = 'Copied ✓'; b.classList.add('is-done');
    setTimeout(() => { b.textContent = old; b.classList.remove('is-done'); }, 1600);
  });
});

});
