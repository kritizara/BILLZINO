/* BillZino — interactive page tools. No network, no storage: everything stays in the browser tab. */
(function () {
  'use strict';
  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var locale = { fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }[lang] || 'en-US';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function money(v, cur) {
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency: cur || 'EUR', maximumFractionDigits: 2 }).format(v); }
    catch (e) { return v.toFixed(2) + ' ' + (cur || 'EUR'); }
  }
  function num(v) { var n = parseFloat(String(v).replace(/[\s  ]/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function fillTpl(t, v) { return String(t || '').replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ''; }); }

  /* ---------- push values into the live builder on the page ---------- */
  function fillBuilder(o) {
    var table = document.getElementById('invoiceTable');
    var add = document.getElementById('invoiceAddLine');
    if (!table || !add) return false;
    var rows = function () { return $$('.invoice-table-row[data-row]', table); };
    if (o.rows) {
      while (rows().length < o.rows.length) add.click();
      while (rows().length > o.rows.length) { var last = rows().pop(); var rm = last.querySelector('.invoice-line-remove'); if (rm) rm.click(); else break; }
      rows().forEach(function (r, i) {
        var d = o.rows[i]; if (!d) return;
        r.children[0].textContent = d[0];
        r.querySelector('.is-qty').textContent = String(d[1]);
        r.querySelector('.is-rate').textContent = Number(d[2]).toFixed(2);
      });
    }
    var box = document.getElementById('invoiceAddTax');
    var pct = document.getElementById('invoiceTaxPct');
    if (box && o.tax != null) {
      var want = o.tax > 0;
      if (box.checked !== want) { box.checked = want; box.dispatchEvent(new Event('change')); }
      if (want && pct) { pct.value = String(o.tax); pct.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    if (o.doc) {
      var btn = $('.invoice-doctype-btn[data-type="' + o.doc + '"]');
      var title = document.getElementById('invoiceDocTitle');
      if (btn) btn.click();
      else if (title) {
        $$('.invoice-doctype-btn').forEach(function (b) { b.classList.remove('is-active'); });
        title.textContent = (window.bzI18n && window.bzI18n.doc(o.doc)) || o.doc;
        title.dataset.type = o.doc;
      }
    }
    var notes = document.getElementById('invoiceNotes');
    if (notes && o.notes != null) notes.textContent = o.notes;
    var first = table.querySelector('.editable');
    if (first) first.dispatchEvent(new Event('input', { bubbles: true }));
    var b = document.getElementById('builder');
    if (b) {
      b.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      var win = $('.builder-window', b);
      if (win) { win.classList.remove('bz-flash'); void win.offsetWidth; win.classList.add('bz-flash'); }
    }
    return true;
  }

  /* ---------- deposit calculator ---------- */
  function initDeposit(root) {
    var cur = root.dataset.cur || 'EUR';
    var total = $('[data-k="total"]', root), pct = $('[data-k="pct"]', root), segBtns = $$('[data-vat]', root), chips = $$('[data-pct]', root);
    var vat = parseFloat(root.dataset.vat || '20');
    var o = function (k) { return $('[data-o="' + k + '"]', root); };
    var T = function () { return Math.max(0, num(total.value)); };
    var calc = function () {
      var t = T(), p = Math.min(95, Math.max(1, num(pct.value))), v = vat;
      var dHT = Math.round(t * p) / 100, dTVA = Math.round(dHT * v) / 100, dTTC = dHT + dTVA;
      var bHT = Math.round((t - dHT) * 100) / 100, bTVA = Math.round(bHT * v) / 100, bTTC = bHT + bTVA;
      return { t: t, p: p, v: v, dHT: dHT, dTVA: dTVA, dTTC: dTTC, bHT: bHT, bTVA: bTVA, bTTC: bTTC };
    };
    var render = function () {
      var c = calc();
      pct.style.setProperty('--p', ((c.p - Number(pct.min)) / (Number(pct.max) - Number(pct.min)) * 100) + '%');
      o('pct').textContent = c.p.toString().replace('.', ',') + ' %';
      $('.b1', root).style.flexBasis = c.p + '%';
      $('.b1', root).style.width = c.p + '%';
      $('.b1', root).textContent = c.p >= 14 ? fillTpl(root.dataset.barDep, { p: Math.round(c.p) }) : '';
      $('.b2', root).textContent = (100 - c.p) >= 14 ? fillTpl(root.dataset.barBal, { p: Math.round(100 - c.p) }) : '';
      ['dHT', 'dTVA', 'dTTC', 'bHT', 'bTVA', 'bTTC'].forEach(function (k) { var e = o(k); if (e) e.textContent = money(c[k], cur); });
      $$('.bz-seg [data-pct]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.pct) === c.p)); });
      segBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.vat) === vat)); });
    };
    total.addEventListener('input', render);
    pct.addEventListener('input', render);
    chips.forEach(function (b) { b.addEventListener('click', function () { pct.value = b.dataset.pct; render(); }); });
    segBtns.forEach(function (b) { b.addEventListener('click', function () { vat = Number(b.dataset.vat); render(); }); });
    $$('[data-act]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var c = calc(), v = { p: Math.round(c.p), total: money(c.t, cur), bal: money(c.bTTC, cur), dep: money(c.dTTC, cur) };
        if (btn.dataset.act === 'dep') {
          fillBuilder({ doc: 'Deposit Invoice', rows: [[fillTpl(root.dataset.lDep, v), 1, c.dHT]], tax: c.v, notes: fillTpl(root.dataset.nDep, v) });
        } else {
          fillBuilder({ doc: 'Invoice', rows: [[root.dataset.lMain, 1, c.t], [fillTpl(root.dataset.lPaid, v), 1, -c.dHT]], tax: c.v, notes: fillTpl(root.dataset.nBal, v) });
        }
      });
    });
    render();
  }

  /* ---------- scenario advisor ---------- */
  function initAdvisor(root) {
    var opts = $$('.bz-opt', root), panels = $$('.bz-panel', root);
    root.classList.add('is-js');
    var pick = function (id) {
      opts.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.k === id)); });
      panels.forEach(function (p) { p.hidden = p.dataset.p !== id; });
    };
    opts.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.k); }); });
    $$('[data-fill]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        try { fillBuilder(JSON.parse(btn.dataset.fill)); } catch (e) {}
      });
    });
    pick(opts[0] && opts[0].dataset.k);
  }

  /* ---------- small-business limit check (DE) ---------- */
  function initLimits(root) {
    var prev = $('[data-k="prev"]', root), curr = $('[data-k="curr"]', root);
    var gp = $('[data-g="prev"]', root), gc = $('[data-g="curr"]', root);
    var LP = Number(root.dataset.limPrev), LC = Number(root.dataset.limCurr);
    var msg = JSON.parse(root.dataset.msg || '{}');
    var verdict = $('.bz-verdict', root), vt = $('.bz-verdict strong', root), vp = $('.bz-verdict p', root);
    var n = function (el) { return Math.max(0, num(String(el.value).replace(/\./g, ''))); };
    var gauge = function (g, val, lim) {
      var w = Math.min(100, (val / (lim * 2)) * 100);
      $('.bz-gauge-fill', g).style.width = w + '%';
      g.dataset.s = val > lim ? 'bad' : (val > lim * 0.85 ? 'warn' : 'ok');
      $('[data-v]', g).textContent = money(val, 'EUR');
    };
    var render = function () {
      var a = n(prev), b = n(curr), key;
      gauge(gp, a, LP); gauge(gc, b, LC);
      if (!prev.value && !curr.value) key = 'empty';
      else if (a > LP) key = 'prevOver';
      else if (b > LC) key = 'currOver';
      else if (a > LP * 0.85 || b > LC * 0.85) key = 'near';
      else key = 'ok';
      var s = { empty: '', ok: 'ok', near: 'warn', prevOver: 'bad', currOver: 'bad' }[key];
      verdict.dataset.s = s;
      vt.textContent = msg[key][0]; vp.textContent = msg[key][1];
    };
    [prev, curr].forEach(function (i) { i.addEventListener('input', render); });
    $$('[data-act]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        fillBuilder({ doc: 'Invoice', tax: 0, notes: root.dataset.note });
      });
    });
    render();
  }

  /* ---------- checklist ---------- */
  function initChecklist(root) {
    var boxes = $$('input[type=checkbox]', root), bar = $('.bz-meter-bar i', root), out = $('.bz-meter output', root), done = $('.bz-check-done', root);
    var render = function () {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      bar.style.width = (n / boxes.length * 100) + '%';
      out.textContent = n + '/' + boxes.length;
      if (done) done.textContent = n === boxes.length ? (root.dataset.done || '') : '';
    };
    boxes.forEach(function (b) { b.addEventListener('change', render); });
    render();
  }

  function boot() {
    $$('[data-tool="deposit"]').forEach(initDeposit);
    $$('[data-tool="advisor"]').forEach(initAdvisor);
    $$('[data-tool="limits"]').forEach(initLimits);
    $$('.bz-checklist').forEach(initChecklist);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
