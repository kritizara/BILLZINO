(function () {
  const session = window.billzinoAuth?.requireSession();
  if (!session) return; // requireSession() already redirected to login.html

  const data = window.billzinoData;
  const userId = session.userId;

  const appShell = document.getElementById('appShell');
  const pageTitle = document.getElementById('appPageTitle');
  const bottomNav = document.getElementById('appMobileBottomNav');

  document.getElementById('appUserAvatar').textContent = initials(session.name);
  document.getElementById('appUserName').textContent = session.name;
  document.getElementById('settingsName').textContent = session.name;
  document.getElementById('settingsEmail').textContent = session.email;
  appShell.hidden = false;
  bottomNav.hidden = false;

  // ---------- Animation helpers ----------
  // Staggers a fade/scale-in across a freshly-rendered list of cards/rows.
  function staggerize(container, selector) {
    container.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('stagger-in');
      el.style.animationDelay = `${Math.min(i * 45, 400)}ms`;
    });
  }

  // Counts a formatted number/money string up from 0 → its final value,
  // keeping whatever prefix/suffix (currency symbol, %, etc.) surrounds it.
  function animateNumber(el, finalText, duration = 700) {
    const match = finalText.match(/-?[\d,]+\.?\d*/);
    if (!match) { el.textContent = finalText; return; }
    const numStr = match[0];
    const finalNum = parseFloat(numStr.replace(/,/g, '')) || 0;
    const prefix = finalText.slice(0, match.index);
    const suffix = finalText.slice(match.index + numStr.length);
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (finalNum * eased).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animateStatValues(container) {
    container.querySelectorAll('.stat-value').forEach((el) => animateNumber(el, el.textContent));
  }

  // A ring chart built from two stroke-dashoffset-animated circles — reused
  // for the big Reports "Payments summary" donut and the small per-client
  // ones. Rendered at offset=full (invisible) then animated to its real
  // value one frame later so the ring actually draws in.
  function donutSvg(pct, size, strokeWidth) {
    const r = (size - strokeWidth) / 2;
    const c = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (pct / 100) * circumference;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--dash-bad)" stroke-width="${strokeWidth}"></circle>
        <circle class="donut-arc" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--dash-good)" stroke-width="${strokeWidth}"
          stroke-linecap="round" stroke-dasharray="${circumference} ${circumference}" stroke-dashoffset="${circumference}"
          data-final-offset="${offset}"
          style="transition:stroke-dashoffset 1s cubic-bezier(.16,1,.3,1);"></circle>
      </svg>`;
  }

  function animateDonuts(container) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.querySelectorAll('.donut-arc').forEach((el) => {
          el.style.strokeDashoffset = el.dataset.finalOffset;
        });
      });
    });
  }

  function initials(name) {
    return (name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  function formatMoney(value, currency, currencyAfter) {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currencyAfter ? `${sign}${abs} ${currency}` : `${sign}${currency}${abs}`;
  }

  function statusOf(invoice) {
    return data.invoiceStatus(invoice);
  }

  function statusLabel(status) {
    return status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending';
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ---------- View switching ----------
  const views = document.querySelectorAll('.app-view');
  const navItems = document.querySelectorAll('.app-nav-item, .app-mobile-bottom-nav button');

  function switchView(name) {
    views.forEach((v) => v.classList.toggle('is-active', v.dataset.view === name));
    navItems.forEach((n) => n.classList.toggle('is-active', n.dataset.view === name));
    const titles = { overview: 'Overview', invoices: 'Invoices', clients: 'Clients', settings: 'Settings' };
    pageTitle.textContent = titles[name] || 'Overview';
    if (name === 'clients') {
      document.getElementById('clientDetailWrap').hidden = true;
      document.getElementById('clientsListWrap').hidden = false;
    }
  }

  navItems.forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  document.querySelectorAll('[data-view-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(a.dataset.viewLink);
    });
  });

  document.getElementById('appLogoutBtn').addEventListener('click', doLogout);
  document.getElementById('settingsLogoutBtn').addEventListener('click', doLogout);
  function doLogout() {
    window.billzinoAuth.logout();
    window.location.href = 'index.html';
  }

  document.getElementById('settingsSeedBtn').addEventListener('click', () => {
    window.billzinoDebug.seed(userId);
    renderAll();
    window.billzinoToast('Added 10 sample invoices ✓');
  });
  document.getElementById('settingsClearBtn').addEventListener('click', () => {
    if (!confirm('Remove all invoices and clients in this browser? This can\'t be undone.')) return;
    window.billzinoDebug.clear();
    renderAll();
    window.billzinoToast('Cleared — starting fresh');
  });

  // ---------- Status pill + menu ----------
  // Delegated so it works for pills rendered anywhere (overview, invoices, client detail)
  document.addEventListener('click', (e) => {
    const openMenu = document.querySelector('.status-menu-list');
    const trigger = e.target.closest('.status-pill');
    if (openMenu && (!trigger || !trigger.closest('.status-menu')?.contains(openMenu))) {
      openMenu.remove();
    }
    if (!trigger) return;

    const invoiceId = trigger.dataset.id;
    const invoice = data.getInvoices(userId).find((i) => i.id === invoiceId);
    if (!invoice) return;

    const wrap = trigger.closest('.status-menu');
    if (wrap.querySelector('.status-menu-list')) return; // already open, let outside-click close it above

    const menu = document.createElement('div');
    menu.className = 'status-menu-list';
    menu.innerHTML = invoice.paid
      ? `<button type="button" data-action="unpaid">Mark as unpaid</button>`
      : `<button type="button" data-action="paid">Mark as paid</button>`;
    wrap.appendChild(menu);

    menu.querySelector('button').addEventListener('click', (ev) => {
      ev.stopPropagation();
      data.setInvoicePaid(invoiceId, ev.target.dataset.action === 'paid');
      menu.remove();
      renderAll();
      window.billzinoToast(ev.target.dataset.action === 'paid' ? 'Marked as paid ✓' : 'Marked as unpaid');
    });
  });

  function statusPillHtml(invoice) {
    const status = statusOf(invoice);
    return `<span class="status-menu">
      <button type="button" class="status-pill is-${status}" data-id="${invoice.id}">${statusLabel(status)}</button>
    </span>`;
  }

  function shortDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Compact Issued → Due → Paid track: tiny dots, hairline connectors, short
  // dates inline. Green once it happened, red for an overdue due-date, a
  // hollow dot while it simply hasn't happened yet.
  function timelineTrackHtml(invoice) {
    const paid = invoice.paid;
    const overdue = statusOf(invoice) === 'overdue';
    const steps = [
      { label: 'Issued', date: invoice.issueDate, state: 'done' },
      { label: 'Due', date: invoice.dueDate, state: paid ? 'done' : overdue ? 'bad' : 'pending' },
      { label: 'Paid', date: paid ? (invoice.paidAt || '').slice(0, 10) : null, state: paid ? 'done' : 'pending' },
    ];
    return (
      '<div class="timeline-track">' +
      steps
        .map(
          (step, i) =>
            `<div class="timeline-step is-${step.state}" title="${step.label}"><span class="timeline-dot"></span><span class="timeline-date">${shortDate(step.date)}</span></div>` +
            (i < steps.length - 1 ? `<span class="timeline-line ${step.state === 'done' ? 'is-done' : ''}"></span>` : '')
        )
        .join('') +
      '</div>'
    );
  }

  function timelineRowHtml(inv) {
    return `
      <div class="activity-row" data-open-id="${inv.id}">
        <div class="activity-client">
          <span class="activity-avatar">${initials(inv.clientName)}</span>
          <div style="min-width:0;">
            <div class="activity-name">${escapeHtml(inv.clientName)}</div>
            <div class="activity-sub">${escapeHtml(inv.invoiceNumber || '')} · ${formatMoney(inv.total, inv.currency, inv.currencyAfter)}</div>
          </div>
        </div>
        ${timelineTrackHtml(inv)}
        <div class="activity-end">${statusPillHtml(inv)}</div>
      </div>`;
  }

  const STAT_ICONS = {
    total: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h6M9 13h6M9 17h6"/></svg>',
    paid: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
    pending: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    overdue: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  };

  // Reusable N-month bars chart, rendered into any container id.
  function renderMonthlyBars(containerId, invoices, months) {
    const bars = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      bars.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }), total: 0 });
    }
    invoices.forEach((inv) => {
      if (!inv.issueDate) return;
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = bars.find((mo) => mo.key === key);
      if (m) m.total += inv.total;
    });
    const max = Math.max(1, ...bars.map((m) => m.total));
    const container = document.getElementById(containerId);
    container.innerHTML = bars
      .map(
        (m) => `
        <div class="chart-bar-col">
          <div class="chart-bar" style="height:0%" data-final-height="${Math.max(4, (m.total / max) * 100)}%"></div>
          <span class="chart-bar-label">${m.label}</span>
        </div>`
      )
      .join('');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.querySelectorAll('.chart-bar').forEach((el) => {
          el.style.height = el.dataset.finalHeight;
        });
      });
    });
  }

  // ---------- Overview ----------
  function renderOverview(invoices) {
    const byCurrency = {};
    invoices.forEach((inv) => {
      const key = inv.currency || '$';
      byCurrency[key] = byCurrency[key] || [];
      byCurrency[key].push(inv);
    });
    const currencies = Object.keys(byCurrency).length ? Object.keys(byCurrency) : ['$'];

    const grid = document.getElementById('statsGrid');
    grid.innerHTML = currencies
      .map((cur) => {
        const rows = byCurrency[cur] || [];
        const total = rows.reduce((s, i) => s + i.total, 0);
        const paid = rows.filter((i) => statusOf(i) === 'paid').reduce((s, i) => s + i.total, 0);
        const pending = rows.filter((i) => statusOf(i) === 'pending').reduce((s, i) => s + i.total, 0);
        const overdue = rows.filter((i) => statusOf(i) === 'overdue').reduce((s, i) => s + i.total, 0);
        const after = rows[0]?.currencyAfter;
        const fmt = (v) => formatMoney(v, cur, after);
        return `
          <div class="stat-card"><div class="stat-card-icon">${STAT_ICONS.total}</div><span class="stat-label">Total invoiced${currencies.length > 1 ? ' (' + cur + ')' : ''}</span><strong class="stat-value">${fmt(total)}</strong></div>
          <div class="stat-card is-good"><div class="stat-card-icon">${STAT_ICONS.paid}</div><span class="stat-label">Paid</span><strong class="stat-value">${fmt(paid)}</strong></div>
          <div class="stat-card is-warn"><div class="stat-card-icon">${STAT_ICONS.pending}</div><span class="stat-label">Pending</span><strong class="stat-value">${fmt(pending)}</strong></div>
          <div class="stat-card is-bad"><div class="stat-card-icon">${STAT_ICONS.overdue}</div><span class="stat-label">Overdue</span><strong class="stat-value">${fmt(overdue)}</strong></div>
        `;
      })
      .join('');
    staggerize(grid, '.stat-card');
    animateStatValues(grid);

    renderMonthlyBars('chartBars', invoices, 6);

    const recent = [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    document.getElementById('recentInvoicesList').innerHTML = recent.length
      ? recent.map((inv) => timelineRowHtml(inv)).join('')
      : emptyStateHtml('No invoices yet', "Save your first invoice from the builder and it'll show up here.");
    staggerize(document.getElementById('recentInvoicesList'), '.activity-row');
  }

  // ---------- Invoices ----------
  function invoiceRowHtml(inv) {
    const sentBadge = inv.sent
      ? '<span class="sent-badge" title="Sent by email"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></span>'
      : '';
    const remindBtn = !inv.paid
      ? `<button type="button" class="remind-btn" data-id="${inv.id}" title="Send payment reminder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>`
      : '';
    const pdfBtn = `<button type="button" class="remind-btn view-pdf-btn" data-id="${inv.id}" title="Download PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h6"/></svg>
      </button>`;
    return `
      <div class="data-row" data-open-id="${inv.id}" style="cursor:pointer;">
        <div class="data-row-name">${sentBadge}${escapeHtml(inv.clientName)}<div class="data-row-sub">${escapeHtml(inv.invoiceNumber || '')}</div></div>
        <div class="data-row-sub data-row-hide-sm">${escapeHtml(inv.clientCompany || '')}</div>
        <div class="mono">${formatMoney(inv.total, inv.currency, inv.currencyAfter)}</div>
        <div class="data-row-hide-sm">${inv.dueDate || '—'}</div>
        <div>${statusPillHtml(inv)}</div>
        <div class="data-row-actions">${pdfBtn}${remindBtn}</div>
      </div>`;
  }

  // ---------- Invoice preview modal ----------
  const modalOverlay = document.getElementById('invoiceModalOverlay');
  let modalInvoiceId = null;

  function openInvoicePreview(invoice) {
    modalInvoiceId = invoice.id;
    const status = statusOf(invoice);
    document.getElementById('modalTitle').textContent = `${invoice.docType || 'Invoice'} ${invoice.invoiceNumber || ''}`.trim();
    document.getElementById('modalSub').textContent = `${invoice.clientName}${invoice.clientCompany ? ' · ' + invoice.clientCompany.split('\n')[0] : ''}`;
    document.getElementById('modalAmount').textContent = formatMoney(invoice.total, invoice.currency, invoice.currencyAfter);
    document.getElementById('modalTimeline').innerHTML = timelineTrackHtml(invoice);
    document.getElementById('modalLineItems').innerHTML = (invoice.lineItems || [])
      .map(
        (item) => `<div class="modal-line-item"><span>${escapeHtml(item.name)} × ${item.qty}</span><span class="mono">${formatMoney(item.amount, invoice.currency, invoice.currencyAfter)}</span></div>`
      )
      .join('');
    const statusBtn = document.getElementById('modalStatusBtn');
    statusBtn.textContent = invoice.paid ? 'Mark as unpaid' : 'Mark as paid';
    statusBtn.className = invoice.paid ? 'btn btn-outline' : 'btn btn-primary';
    modalOverlay.hidden = false;
  }

  function closeModal() {
    modalOverlay.hidden = true;
    modalInvoiceId = null;
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.getElementById('modalStatusBtn').addEventListener('click', () => {
    if (!modalInvoiceId) return;
    const invoice = data.getInvoices(userId).find((i) => i.id === modalInvoiceId);
    if (!invoice) return;
    data.setInvoicePaid(invoice.id, !invoice.paid);
    renderAll();
    window.billzinoToast(invoice.paid ? 'Marked as unpaid' : 'Marked as paid ✓');
    closeModal();
  });

  document.getElementById('modalDownloadBtn').addEventListener('click', async (e) => {
    if (!modalInvoiceId) return;
    const invoice = data.getInvoices(userId).find((i) => i.id === modalInvoiceId);
    if (!invoice) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await window.billzinoPdf.loadJsPdf();
      const pdf = await window.billzinoPdf.renderInvoicePdfFromData(invoice);
      const who = (invoice.clientName || 'BillZino').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      pdf.save(`${(invoice.docType || 'Invoice').replace(/\s+/g, '-')}-${who}.pdf`);
    } catch {
      window.billzinoToast('Could not open the PDF — try again', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.view-pdf-btn, .remind-btn, .status-menu')) return;
    const row = e.target.closest('[data-open-id]');
    if (!row) return;
    const invoice = data.getInvoices(userId).find((i) => i.id === row.dataset.openId);
    if (invoice) openInvoicePreview(invoice);
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.view-pdf-btn');
    if (!btn) return;
    const invoice = data.getInvoices(userId).find((i) => i.id === btn.dataset.id);
    if (!invoice) return;
    btn.disabled = true;
    try {
      await window.billzinoPdf.loadJsPdf();
      const pdf = await window.billzinoPdf.renderInvoicePdfFromData(invoice);
      // A direct download (same mechanism as the builder's own "Download
      // PDF" button) instead of opening a new tab — window.open() from an
      // async handler gets silently blocked as a popup by some browsers/
      // extensions even in response to a real click, while a download
      // triggered via an anchor's `download` attribute (what jsPDF's
      // .save() does internally) has no such restriction.
      const who = (invoice.clientName || 'BillZino').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      pdf.save(`${(invoice.docType || 'Invoice').replace(/\s+/g, '-')}-${who}.pdf`);
    } catch {
      window.billzinoToast('Could not open the PDF — try again', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  function openReminderEmail(invoice) {
    const amount = invoice.currencyAfter
      ? `${invoice.total.toFixed(2)} ${invoice.currency}`
      : `${invoice.currency}${invoice.total.toFixed(2)}`;
    const overdue = statusOf(invoice) === 'overdue';
    const subject = `${overdue ? 'Overdue: ' : 'Reminder: '}${invoice.docType} ${invoice.invoiceNumber || ''} — ${amount}`.trim();
    const body =
      `Hi ${invoice.clientName},\n\n` +
      `Just a friendly reminder that ${invoice.docType.toLowerCase()} ${invoice.invoiceNumber || ''} for ${amount} ` +
      (overdue ? `was due ${invoice.dueDate} and is now overdue.\n\n` : `is due ${invoice.dueDate || 'soon'}.\n\n`) +
      `Let us know if you have any questions.\n\nThanks!`;
    window.location.href = `mailto:${encodeURIComponent(invoice.clientEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.remind-btn');
    if (!btn) return;
    const invoice = data.getInvoices(userId).find((i) => i.id === btn.dataset.id);
    if (!invoice) return;
    openReminderEmail(invoice);
    window.billzinoToast('Opening your email app with a reminder…');
  });

  let invoiceFilter = { status: 'all', search: '' };

  function renderInvoicesList(allInvoices) {
    let rows = allInvoices;
    if (invoiceFilter.status !== 'all') {
      rows = rows.filter((i) => statusOf(i) === invoiceFilter.status);
    }
    if (invoiceFilter.search) {
      const q = invoiceFilter.search.toLowerCase();
      rows = rows.filter(
        (i) =>
          i.clientName.toLowerCase().includes(q) ||
          (i.invoiceNumber || '').toLowerCase().includes(q) ||
          (i.clientCompany || '').toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    document.getElementById('invoicesList').innerHTML = rows.length
      ? rows.map((inv) => invoiceRowHtml(inv)).join('')
      : emptyStateHtml('No invoices match', 'Try a different search or status filter.');
    staggerize(document.getElementById('invoicesList'), '.data-row');
  }

  document.getElementById('invoiceSearch').addEventListener('input', (e) => {
    invoiceFilter.search = e.target.value;
    renderInvoicesList(data.getInvoices(userId));
  });
  document.getElementById('statusTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.status-tab');
    if (!btn) return;
    document.querySelectorAll('.status-tab').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    invoiceFilter.status = btn.dataset.status;
    renderInvoicesList(data.getInvoices(userId));
  });

  // ---------- Clients ----------
  function renderClients(invoices) {
    const clients = data.getClients(userId);
    const grid = document.getElementById('clientsGrid');
    if (!clients.length) {
      grid.innerHTML = emptyStateHtml('No clients yet', 'Save an invoice from the builder to create your first client.');
      return;
    }
    const withStats = clients.map((c) => {
      const rows = invoices.filter((i) => i.clientId === c.id);
      const total = rows.reduce((s, i) => s + i.total, 0);
      const outstanding = rows.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);
      const overdueCount = rows.filter((i) => statusOf(i) === 'overdue').length;
      const paidPct = total ? Math.round(((total - outstanding) / total) * 100) : 0;
      return { c, rows, total, outstanding, overdueCount, paidPct };
    });
    // Clients that owe you the most money first — the ones worth checking on.
    withStats.sort((a, b) => b.outstanding - a.outstanding);

    grid.innerHTML = withStats
      .map(({ c, rows, total, outstanding, overdueCount, paidPct }) => {
        const cur = rows[0]?.currency || '$';
        const after = rows[0]?.currencyAfter;
        return `
          <button type="button" class="client-card${overdueCount ? ' has-overdue' : ''}" data-client-id="${c.id}">
            ${overdueCount ? `<span class="client-card-badge">${overdueCount} overdue</span>` : ''}
            <div class="client-card-info">
              <div class="client-card-top">
                <span class="client-avatar">${initials(c.name)}</span>
                <div style="min-width:0;">
                  <div class="client-card-name">${escapeHtml(c.name)}</div>
                  <div class="client-card-company">${escapeHtml((c.company || '').split('\n')[0])} · ${rows.length} invoice${rows.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div class="client-card-stats">
                <div class="is-outstanding"><span>Outstanding</span><strong>${formatMoney(outstanding, cur, after)}</strong></div>
                <div><span>Invoiced</span><strong>${formatMoney(total, cur, after)}</strong></div>
              </div>
            </div>
            <div class="client-card-donut" title="${paidPct}% paid">
              ${donutSvg(paidPct, 64, 7)}
              <div class="client-card-donut-label">${paidPct}%</div>
            </div>
          </button>`;
      })
      .join('');

    staggerize(grid, '.client-card');
    animateDonuts(grid);
    grid.querySelectorAll('.client-card-stats strong').forEach((el) => animateNumber(el, el.textContent));

    grid.querySelectorAll('.client-card').forEach((card) => {
      card.addEventListener('click', () => openClientDetail(card.dataset.clientId));
    });
  }

  function openClientDetail(clientId) {
    const client = data.getClients(userId).find((c) => c.id === clientId);
    if (!client) return;
    document.getElementById('clientsListWrap').hidden = true;
    const wrap = document.getElementById('clientDetailWrap');
    wrap.hidden = false;
    document.getElementById('clientDetailName').textContent = client.name;
    const rows = data.getClientInvoices(userId, clientId);
    document.getElementById('clientDetailInvoices').innerHTML = rows.length
      ? rows.map((inv) => invoiceRowHtml(inv)).join('')
      : emptyStateHtml('No invoices for this client', '');
  }

  document.getElementById('clientDetailBack').addEventListener('click', () => {
    document.getElementById('clientDetailWrap').hidden = true;
    document.getElementById('clientsListWrap').hidden = false;
  });

  function emptyStateHtml(title, sub) {
    return `
      <div class="empty-state">
        <svg class="empty-state-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h6"/></svg>
        <h3>${title}</h3>
        ${sub ? `<p>${sub}</p>` : ''}
      </div>`;
  }

  function renderDonut(paidCount, unpaidCount) {
    const total = paidCount + unpaidCount;
    const paidPct = total ? Math.round((paidCount / total) * 100) : 0;
    const unpaidPct = 100 - paidPct;
    const wrap = document.getElementById('donutWrap');
    wrap.innerHTML = total
      ? `${donutSvg(paidPct, 150, 16)}<div class="donut-center"><strong>${paidPct}%</strong><span>Paid</span></div>`
      : `<svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="67" fill="none" stroke="var(--dash-border)" stroke-width="16"></circle></svg>
        <div class="donut-center"><strong>—</strong><span>No invoices</span></div>`;
    animateDonuts(wrap);
    document.getElementById('donutLegend').innerHTML = `
      <div class="donut-legend-item"><span class="donut-legend-dot" style="background:var(--dash-good)"></span>Paid <strong>${paidPct}%</strong></div>
      <div class="donut-legend-item"><span class="donut-legend-dot" style="background:var(--dash-bad)"></span>Unpaid <strong>${unpaidPct}%</strong></div>
    `;
  }

  // ---------- Reports ----------
  function renderReports(invoices) {
    const cur = invoices[0]?.currency || '$';
    const after = invoices[0]?.currencyAfter;
    const fmt = (v) => formatMoney(v, cur, after);
    const now = new Date();

    const paidInvoices = invoices.filter((i) => i.paid && i.paidAt && i.issueDate);
    const avgDays = paidInvoices.length
      ? Math.round(
          paidInvoices.reduce((s, i) => s + (new Date(i.paidAt) - new Date(i.issueDate)) / 86400000, 0) /
            paidInvoices.length
        )
      : null;

    const unpaid = invoices.filter((i) => !i.paid);
    const outstanding = unpaid.reduce((s, i) => s + i.total, 0);
    const overdueCount = unpaid.filter((i) => statusOf(i) === 'overdue').length;

    document.getElementById('reportsStatsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-card-icon">${STAT_ICONS.total}</div><span class="stat-label">Total outstanding</span><strong class="stat-value">${fmt(outstanding)}</strong></div>
      <div class="stat-card is-bad"><div class="stat-card-icon">${STAT_ICONS.overdue}</div><span class="stat-label">Overdue invoices</span><strong class="stat-value">${overdueCount}</strong></div>
      <div class="stat-card is-good"><div class="stat-card-icon">${STAT_ICONS.paid}</div><span class="stat-label">Avg. days to get paid</span><strong class="stat-value">${avgDays === null ? '—' : avgDays}</strong></div>
      <div class="stat-card"><div class="stat-card-icon">${STAT_ICONS.pending}</div><span class="stat-label">Invoices sent</span><strong class="stat-value">${invoices.filter((i) => i.sent).length}</strong></div>
    `;

    staggerize(document.getElementById('reportsStatsGrid'), '.stat-card');
    animateStatValues(document.getElementById('reportsStatsGrid'));
    renderMonthlyBars('reportsChartBars', invoices, 6);
    renderDonut(invoices.filter((i) => i.paid).length, invoices.filter((i) => !i.paid).length);

    const buckets = [
      { label: '1–30 days overdue', min: 1, max: 30, amount: 0, count: 0 },
      { label: '31–60 days overdue', min: 31, max: 60, amount: 0, count: 0 },
      { label: '60+ days overdue', min: 61, max: Infinity, amount: 0, count: 0 },
    ];
    unpaid.forEach((inv) => {
      if (!inv.dueDate) return;
      const days = Math.floor((now - new Date(inv.dueDate)) / 86400000);
      if (days < 1) return;
      const bucket = buckets.find((b) => days >= b.min && days <= b.max);
      if (bucket) {
        bucket.amount += inv.total;
        bucket.count += 1;
      }
    });
    document.getElementById('agingList').innerHTML = buckets.some((b) => b.count)
      ? buckets
          .map(
            (b) => `
        <div class="data-row" style="grid-template-columns:2fr 1fr .8fr">
          <div class="data-row-name">${b.label}</div>
          <div class="mono">${fmt(b.amount)}</div>
          <div class="data-row-sub">${b.count} invoice${b.count === 1 ? '' : 's'}</div>
        </div>`
          )
          .join('')
      : emptyStateHtml('Nothing overdue', "You're all caught up.");

    const clients = data.getClients(userId)
      .map((c) => {
        const rows = invoices.filter((i) => i.clientId === c.id);
        const clientOutstanding = rows.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);
        return { client: c, outstanding: clientOutstanding };
      })
      .filter((c) => c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    document.getElementById('topClientsList').innerHTML = clients.length
      ? clients
          .map(
            (c) => `
        <div class="data-row" style="grid-template-columns:2fr 1fr">
          <div class="data-row-name">${escapeHtml(c.client.name)}</div>
          <div class="mono">${fmt(c.outstanding)}</div>
        </div>`
          )
          .join('')
      : emptyStateHtml('No outstanding balances', 'Every client is paid up.');
  }

  function renderAll() {
    const invoices = data.getInvoices(userId);
    renderOverview(invoices);
    renderInvoicesList(invoices);
    renderClients(invoices);
    renderReports(invoices);
  }

  switchView('overview');
  renderAll();
})();
