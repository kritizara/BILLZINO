// ---------- Theme toggle ----------
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('billzino-theme');

  if (stored) root.setAttribute('data-theme', stored);

  toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('billzino-theme', next);
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

  const recalc = () => { setWidth = track.scrollWidth / 2; };
  window.addEventListener('resize', recalc);

  function step(time) {
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
  requestAnimationFrame(step);

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

// ---------- Dashboard mockup: scale fixed-resolution canvases to fit ----------
// The dashboard/phone UIs are authored at a fixed pixel resolution so their
// layout can never reflow or overflow; we just scale the whole canvas as a
// single unit to match whatever size the screen actually renders at.
(function () {
  const pairs = [
    { containers: '.laptop-screen', canvases: '.dash-canvas', prop: '--s' },
    { containers: '.phone-screen', canvases: '.phone-canvas', prop: '--ps' },
  ];

  pairs.forEach(({ containers, canvases, prop }) => {
    const containerEls = document.querySelectorAll(containers);
    const canvasEls = document.querySelectorAll(canvases);

    containerEls.forEach((containerEl, i) => {
      const canvasEl = canvasEls[i];
      if (!canvasEl) return;

      // Read the canvas's own authored width (unaffected by its scale
      // transform) so this keeps working if a media query changes it.
      const apply = () => {
        const baseWidth = parseFloat(getComputedStyle(canvasEl).width);
        const scale = containerEl.clientWidth / baseWidth;
        canvasEl.style.setProperty(prop, scale);
      };

      apply();
      new ResizeObserver(apply).observe(containerEl);
    });
  });

  // The invoice builder's canvas has dynamic content height (adding a line
  // item, revealing tax/discount rows) — recompute both the scale AND the
  // container height whenever its width changes or its content changes.
  const builderBody = document.querySelector('.builder-body');
  const builderCanvas = document.querySelector('.builder-canvas');
  if (builderBody && builderCanvas) {
    const applyBuilder = () => {
      const baseWidth = parseFloat(getComputedStyle(builderCanvas).width);
      const scale = builderBody.clientWidth / baseWidth;
      builderCanvas.style.setProperty('--bs', scale);
      builderBody.style.height = builderCanvas.scrollHeight * scale + 'px';
    };

    applyBuilder();
    new ResizeObserver(applyBuilder).observe(builderBody);
    new MutationObserver(applyBuilder).observe(builderCanvas, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
})();

// ---------- Invoice builder: fully interactive demo ----------
(function () {
  const app = document.getElementById('invoiceApp');
  if (!app) return;

  const table = document.getElementById('invoiceTable');
  const addLineBtn = document.getElementById('invoiceAddLine');
  const builderCanvas = document.querySelector('.builder-canvas');
  const subtotalEl = document.getElementById('invoiceSubtotal');
  const dueEl = document.getElementById('invoiceDue');
  const currencyButtons = document.querySelectorAll('#invoiceCurrencyGroup .invoice-currency-btn:not(.invoice-currency-more)');
  const shippingSymbolEl = document.getElementById('invoiceShippingSymbol');

  const discount = {
    box: document.getElementById('invoiceAddDiscount'),
    row: document.getElementById('invoiceDiscountRow'),
    value: document.getElementById('invoiceDiscountValue'),
    input: document.getElementById('invoiceDiscountPct'),
    amt: document.getElementById('invoiceDiscountAmt'),
  };
  const tax = {
    box: document.getElementById('invoiceAddTax'),
    row: document.getElementById('invoiceTaxRow'),
    value: document.getElementById('invoiceTaxValue'),
    input: document.getElementById('invoiceTaxPct'),
    amt: document.getElementById('invoiceTaxAmt'),
  };
  const shipping = {
    box: document.getElementById('invoiceAddShipping'),
    row: document.getElementById('invoiceShippingRow'),
    value: document.getElementById('invoiceShippingValue'),
    input: document.getElementById('invoiceShippingAmount'),
    amt: document.getElementById('invoiceShippingAmt'),
  };

  let currencySymbol = '$';
  let currencyAfter = false;

  const parseNum = (str) => {
    const n = parseFloat(String(str).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const formatMoney = (value) => {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = value < 0 ? '-' : '';
    return currencyAfter ? `${sign}${formatted} ${currencySymbol}` : `${sign}${currencySymbol}${formatted}`;
  };

  function recalcTotals() {
    let subtotal = 0;
    table.querySelectorAll('[data-row]').forEach((row, i) => {
      const qty = parseNum(row.querySelector('.is-qty').textContent);
      const rate = parseNum(row.querySelector('.is-rate').textContent);
      const amt = qty * rate;
      row.querySelector('.amount').textContent = formatMoney(amt);
      row.classList.toggle('is-alt', i % 2 === 1);
      row.classList.toggle('is-empty-row', !row.children[0].textContent.trim());
      subtotal += amt;
    });

    let total = subtotal;

    if (discount.box.checked) {
      const amt = subtotal * (parseNum(discount.input.value) / 100);
      discount.amt.textContent = '-' + formatMoney(amt);
      total -= amt;
    }
    if (tax.box.checked) {
      const amt = total * (parseNum(tax.input.value) / 100);
      tax.amt.textContent = formatMoney(amt);
      total += amt;
    }
    if (shipping.box.checked) {
      const amt = parseNum(shipping.input.value);
      shipping.amt.textContent = formatMoney(amt);
      total += amt;
    }

    subtotalEl.textContent = formatMoney(subtotal);
    dueEl.textContent = formatMoney(total);
  }

  // line item editing (event delegation — also covers rows added later)
  table.addEventListener('input', (e) => {
    if (e.target.classList.contains('editable')) {
      recalcTotals();
    }
  });

  // remove a line item — same delegation trick, so it works on rows added later too
  table.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.invoice-line-remove');
    if (!removeBtn) return;
    removeBtn.closest('.invoice-table-row')?.remove();
    recalcTotals();
  });

  addLineBtn?.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'invoice-table-row';
    row.setAttribute('data-row', '');
    row.innerHTML = `
      <span class="editable" contenteditable="true" data-placeholder="Item name"></span>
      <span class="editable is-qty" contenteditable="true" data-placeholder="1">1</span>
      <span class="editable is-rate" contenteditable="true" data-placeholder="0.00">0.00</span>
      <span class="amount">${formatMoney(0)}</span>
      <button type="button" class="invoice-line-remove" aria-label="Remove line item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    table.appendChild(row);
    recalcTotals();
    row.querySelector('.editable').focus();
  });

  // single-line editable fields: Enter confirms instead of inserting a line break
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList?.contains('editable') && e.target.tagName !== 'P') {
      e.preventDefault();
      e.target.blur();
    }
  });

  // discount / tax / shipping toggles
  [discount, tax, shipping].forEach((group) => {
    group.box.addEventListener('change', () => {
      group.value.hidden = !group.box.checked;
      group.row.hidden = !group.box.checked;
      recalcTotals();
    });
    group.input.addEventListener('input', recalcTotals);
  });

  // document type — Invoice / Tax Invoice / Quote / Receipt
  const docTypeButtons = document.querySelectorAll('.invoice-doctype-btn');
  const docTitleEl = document.getElementById('invoiceDocTitle');
  function setDocType(type) {
    docTypeButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.type === type));
    if (docTitleEl) docTitleEl.textContent = type;
  }
  docTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setDocType(btn.dataset.type));
  });

  // turning tax on nudges "Invoice" to "Tax Invoice" automatically (and
  // back, if turned off again) — but leaves a deliberately different
  // choice like Quote or Receipt alone either way
  tax.box.addEventListener('change', () => {
    const current = docTitleEl?.textContent.trim();
    if (tax.box.checked && current === 'Invoice') setDocType('Tax Invoice');
    else if (!tax.box.checked && current === 'Tax Invoice') setDocType('Invoice');
  });

  // currency — segmented pill control (USD/EUR/GBP) + a searchable "More"
  // picker covering the rest of the world's currencies
  const currencyMoreBtn = document.getElementById('invoiceCurrencyMoreBtn');
  const currencyMoreLabel = document.getElementById('invoiceCurrencyMoreLabel');
  const currencyPicker = document.getElementById('invoiceCurrencyPicker');

  currencyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currencyButtons.forEach((b) => b.classList.remove('is-active'));
      currencyMoreBtn?.classList.remove('is-active');
      if (currencyMoreLabel) currencyMoreLabel.textContent = 'More';
      if (currencyPicker) currencyPicker.hidden = true;
      btn.classList.add('is-active');
      currencySymbol = btn.dataset.symbol;
      currencyAfter = false;
      shippingSymbolEl.textContent = currencySymbol;
      recalcTotals();
    });
  });

  const WORLD_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
    { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', after: true, flag: '🇲🇦' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', after: true, flag: '🇨🇭' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
    { code: 'AED', symbol: 'AED', name: 'UAE Dirham', after: true, flag: '🇦🇪' },
    { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', after: true, flag: '🇸🇦' },
    { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', after: true, flag: '🇶🇦' },
    { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', after: true, flag: '🇰🇼' },
    { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', after: true, flag: '🇧🇭' },
    { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', after: true, flag: '🇴🇲' },
    { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound', after: true, flag: '🇪🇬' },
    { code: 'TND', symbol: 'TND', name: 'Tunisian Dinar', after: true, flag: '🇹🇳' },
    { code: 'DZD', symbol: 'DZD', name: 'Algerian Dinar', after: true, flag: '🇩🇿' },
    { code: 'JOD', symbol: 'JOD', name: 'Jordanian Dinar', after: true, flag: '🇯🇴' },
    { code: 'LBP', symbol: 'LBP', name: 'Lebanese Pound', after: true, flag: '🇱🇧' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'PKR', symbol: 'PKR', name: 'Pakistani Rupee', after: true, flag: '🇵🇰' },
    { code: 'BDT', symbol: 'BDT', name: 'Bangladeshi Taka', after: true, flag: '🇧🇩' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
    { code: 'KES', symbol: 'KES', name: 'Kenyan Shilling', after: true, flag: '🇰🇪' },
    { code: 'GHS', symbol: 'GHS', name: 'Ghanaian Cedi', after: true, flag: '🇬🇭' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
    { code: 'ETB', symbol: 'ETB', name: 'Ethiopian Birr', after: true, flag: '🇪🇹' },
    { code: 'SEK', symbol: 'SEK', name: 'Swedish Krona', after: true, flag: '🇸🇪' },
    { code: 'NOK', symbol: 'NOK', name: 'Norwegian Krone', after: true, flag: '🇳🇴' },
    { code: 'DKK', symbol: 'DKK', name: 'Danish Krone', after: true, flag: '🇩🇰' },
    { code: 'PLN', symbol: 'PLN', name: 'Polish Złoty', after: true, flag: '🇵🇱' },
    { code: 'CZK', symbol: 'CZK', name: 'Czech Koruna', after: true, flag: '🇨🇿' },
    { code: 'HUF', symbol: 'HUF', name: 'Hungarian Forint', after: true, flag: '🇭🇺' },
    { code: 'RON', symbol: 'RON', name: 'Romanian Leu', after: true, flag: '🇷🇴' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺' },
    { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', flag: '🇮🇱' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', flag: '🇲🇽' },
    { code: 'ARS', symbol: 'ARS', name: 'Argentine Peso', after: true, flag: '🇦🇷' },
    { code: 'CLP', symbol: 'CLP', name: 'Chilean Peso', after: true, flag: '🇨🇱' },
    { code: 'COP', symbol: 'COP', name: 'Colombian Peso', after: true, flag: '🇨🇴' },
    { code: 'PEN', symbol: 'PEN', name: 'Peruvian Sol', after: true, flag: '🇵🇪' },
  ];

  if (currencyMoreBtn && currencyPicker) {
    const currencySearch = document.getElementById('invoiceCurrencySearch');
    const currencyListEl = document.getElementById('invoiceCurrencyList');

    function renderCurrencyList(filter) {
      const q = (filter || '').trim().toLowerCase();
      const matches = WORLD_CURRENCIES.filter(
        (c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
      currencyListEl.innerHTML = matches.length
        ? matches
            .map(
              (c) => `
          <button type="button" class="invoice-currency-option" data-code="${c.code}">
            <span class="cur-flag">${c.flag || ''}</span>
            <span class="cur-code">${c.code}</span>
            <span class="cur-name">${c.name}</span>
            <span class="cur-symbol">${c.symbol}</span>
          </button>`
            )
            .join('')
        : '<p class="invoice-currency-empty">No match</p>';
    }
    renderCurrencyList();

    currencyMoreBtn.addEventListener('click', () => {
      currencyPicker.hidden = !currencyPicker.hidden;
      if (!currencyPicker.hidden) {
        currencySearch.value = '';
        renderCurrencyList();
        currencySearch.focus();
      }
    });

    currencySearch.addEventListener('input', () => renderCurrencyList(currencySearch.value));

    currencyListEl.addEventListener('click', (e) => {
      const opt = e.target.closest('.invoice-currency-option');
      if (!opt) return;
      const chosen = WORLD_CURRENCIES.find((c) => c.code === opt.dataset.code);
      if (!chosen) return;

      currencyButtons.forEach((b) => b.classList.remove('is-active'));
      currencyMoreBtn.classList.add('is-active');
      currencyMoreLabel.textContent = `${chosen.flag || ''} ${chosen.code}`.trim();
      currencySymbol = chosen.symbol;
      currencyAfter = !!chosen.after;
      shippingSymbolEl.textContent = chosen.symbol;
      currencyPicker.hidden = true;
      recalcTotals();
    });

    document.addEventListener('click', (e) => {
      if (
        !currencyPicker.hidden &&
        !currencyPicker.contains(e.target) &&
        !currencyMoreBtn.contains(e.target)
      ) {
        currencyPicker.hidden = true;
      }
    });
  }

  // template color swatches — drive the live accent used across the invoice
  const swatches = document.querySelectorAll('#invoiceSwatches .invoice-swatch:not(.invoice-swatch-custom)');
  const customSwatch = document.getElementById('invoiceSwatchCustom');
  const customPicker = document.getElementById('invoiceCustomPicker');

  swatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      swatches.forEach((s) => s.classList.remove('is-active'));
      if (customSwatch) customSwatch.classList.remove('is-active');
      if (customPicker) customPicker.hidden = true;
      sw.classList.add('is-active');

      const textColor = sw.dataset.text === 'light' ? '#ffffff' : '#04160a';
      if (sw.classList.contains('is-pro')) {
        app.style.setProperty('--live-accent-bg', 'linear-gradient(135deg,#ff8a5b,#ff5b9e 45%,#7c6bff 100%)');
        app.style.setProperty('--live-accent', '#ff5b9e');
      } else {
        const color = sw.style.getPropertyValue('--sw');
        app.style.setProperty('--live-accent-bg', color);
        app.style.setProperty('--live-accent', color);
      }
      app.style.setProperty('--live-text', textColor);
    });
  });

  // custom color swatch — pick via native color wheel or type a hex code
  if (customSwatch && customPicker) {
    const colorInput = document.getElementById('invoiceColorInput');
    const hexInput = document.getElementById('invoiceHexInput');

    const pickTextColor = (hex) => {
      const c = hex.replace('#', '');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 150 ? '#04160a' : '#ffffff';
    };

    const applyCustomColor = (hex) => {
      swatches.forEach((s) => s.classList.remove('is-active'));
      customSwatch.classList.add('is-active');
      app.style.setProperty('--live-accent-bg', hex);
      app.style.setProperty('--live-accent', hex);
      app.style.setProperty('--live-text', pickTextColor(hex));
    };

    customSwatch.addEventListener('click', () => {
      customPicker.hidden = !customPicker.hidden;
      if (!customPicker.hidden) applyCustomColor(colorInput.value);
    });

    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value.toUpperCase();
      applyCustomColor(colorInput.value);
    });

    hexInput.addEventListener('input', () => {
      let v = hexInput.value.trim();
      if (v && !v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        colorInput.value = v;
        applyCustomColor(v);
      }
    });

    document.addEventListener('click', (e) => {
      if (!customPicker.hidden && !customPicker.contains(e.target) && !customSwatch.contains(e.target)) {
        customPicker.hidden = true;
      }
    });
  }

  // logo upload — click the empty box to pick a file; once uploaded, drag
  // the corner handle to resize it right there, or hit × to remove it.
  const logoInput = document.getElementById('invoiceLogoInput');
  const logoBox = document.getElementById('invoiceLogoBox');
  const logoImg = document.getElementById('invoiceLogoImg');
  const logoRemove = document.getElementById('invoiceLogoRemove');
  const logoResize = document.getElementById('invoiceLogoResize');
  let logoObjectUrl = null;
  const logoBaseW = 128;
  const logoBaseH = 82;
  let logoScale = 1;

  logoBox?.addEventListener('click', () => {
    if (!logoBox.classList.contains('has-logo')) logoInput.click();
  });

  logoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    logoObjectUrl = URL.createObjectURL(file);
    logoImg.src = logoObjectUrl;
    logoImg.hidden = false;
    logoBox.classList.add('has-logo');
    logoScale = 1;
    logoBox.style.width = logoBaseW + 'px';
    logoBox.style.height = logoBaseH + 'px';
  });

  logoRemove?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    logoObjectUrl = null;
    logoImg.src = '';
    logoImg.hidden = true;
    logoBox.classList.remove('has-logo');
    logoBox.style.width = '';
    logoBox.style.height = '';
    logoInput.value = '';
  });

  // drag-to-resize — grows the box itself (not just the image inside it),
  // so there's no fixed container clipping how big the logo can get
  logoResize?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startScale = logoScale;
    const canvasScale = parseFloat(getComputedStyle(builderCanvas).getPropertyValue('--bs')) || 1;
    logoResize.classList.add('is-dragging');

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / canvasScale;
      logoScale = Math.min(3, Math.max(0.5, startScale + dx / 70));
      logoBox.style.width = logoBaseW * logoScale + 'px';
      logoBox.style.height = logoBaseH * logoScale + 'px';
    };
    const onUp = () => {
      logoResize.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  // "Download PDF" is real — works with no account, no backend, and
  // downloads automatically with no dialog. Earlier attempts rasterized the
  // on-screen invoice with html2canvas, which turned out unreliable across
  // real browsers/extensions (intermittent flat-grey renders), and a
  // window.print()-based version worked but required the user to click
  // through a native "Save as PDF" dialog. This instead *draws* the
  // invoice directly with jsPDF's own text/shape/image primitives — no
  // rasterization library involved, so none of those failure modes apply,
  // and pdf.save() triggers a real, automatic browser download.
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function resolveAccentColor(value, fallback) {
    const v = (value || '').trim();
    if (!v) return fallback;
    if (v.startsWith('#')) return v;
    const match = v.match(/#[0-9a-fA-F]{3,6}/);
    return match ? match[0] : fallback;
  }
  async function toDataUrl(src) {
    if (!src || src.startsWith('data:')) return src || null;
    try {
      const blob = await fetch(src).then((r) => r.blob());
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  function imgFormatFromDataUrl(dataUrl) {
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'PNG';
  }
  function drawImageContain(pdf, dataUrl, x, y, maxW, maxH) {
    const props = pdf.getImageProperties(dataUrl);
    const ratio = Math.min(maxW / props.width, maxH / props.height);
    const w = props.width * ratio;
    const h = props.height * ratio;
    pdf.addImage(dataUrl, imgFormatFromDataUrl(dataUrl), x, y, w, h);
    return h;
  }

  async function buildInvoicePdf() {
    const app = document.getElementById('invoiceApp');
    const appStyle = getComputedStyle(app);
    const accentBg = resolveAccentColor(appStyle.getPropertyValue('--live-accent-bg'), '#00d639');
    const accent = resolveAccentColor(appStyle.getPropertyValue('--live-accent'), '#00d639');
    const liveText = resolveAccentColor(appStyle.getPropertyValue('--live-text'), '#ffffff');
    const dark = [26, 29, 31];
    const title = [13, 15, 16];
    const muted = [156, 163, 175];
    const bodyMuted = [107, 114, 128];
    const accentRgb = hexToRgb(accent);
    const accentBgRgb = hexToRgb(accentBg);
    const liveTextRgb = hexToRgb(liveText);

    const pdf = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const MARGIN = 50;
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const RIGHT = PAGE_W - MARGIN;
    const CONTENT_W = RIGHT - MARGIN;
    let y = MARGIN;

    // Logo (top-left) + invoice meta (top-right)
    let topRowHeight = 0;
    const logoImg = document.getElementById('invoiceLogoImg');
    const hasLogo = document.getElementById('invoiceLogoBox')?.classList.contains('has-logo') && logoImg?.src;
    if (hasLogo) {
      const dataUrl = await toDataUrl(logoImg.src);
      if (dataUrl) topRowHeight = Math.max(topRowHeight, drawImageContain(pdf, dataUrl, MARGIN, y, 130, 60));
    }

    const metaLabels = document.querySelectorAll('.invoice-meta-row span');
    const metaValues = document.querySelectorAll('.invoice-meta-row strong');
    let metaY = y + 8;
    pdf.setFontSize(9);
    metaValues.forEach((valueEl, i) => {
      const label = `${metaLabels[i]?.textContent.trim() || ''}   `;
      const value = valueEl.textContent.trim();
      pdf.setFont('helvetica', 'bold');
      const valueW = pdf.getTextWidth(value);
      pdf.setFont('helvetica', 'normal');
      const labelW = pdf.getTextWidth(label);
      pdf.setTextColor(...muted);
      pdf.text(label, RIGHT - labelW - valueW, metaY);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...dark);
      pdf.text(value, RIGHT, metaY, { align: 'right' });
      metaY += 14;
    });
    topRowHeight = Math.max(topRowHeight, metaY - y);
    y += topRowHeight + 16;

    // Accent stripe
    pdf.setFillColor(...accentBgRgb);
    pdf.rect(MARGIN, y, CONTENT_W, 3, 'F');
    y += 26;

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...title);
    pdf.text(document.getElementById('invoiceDocTitle')?.textContent.trim() || 'Invoice', MARGIN, y);
    y += 34;

    // Bill from / Bill to
    const partyNames = document.querySelectorAll('.invoice-party strong');
    const partyAddresses = document.querySelectorAll('.invoice-party p');
    const colW = (CONTENT_W - 24) / 2;
    const col2X = MARGIN + colW + 24;

    function drawParty(x, label, name, addressText) {
      let py = y;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(label.toUpperCase(), x, py);
      py += 14;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(...dark);
      pdf.text(name || '', x, py);
      py += 14;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...bodyMuted);
      (addressText || '').split('\n').filter(Boolean).forEach((line) => {
        pdf.text(line.trim(), x, py);
        py += 12;
      });
      return py;
    }

    const y1 = drawParty(MARGIN, 'Bill from', partyNames[0]?.textContent.trim(), partyAddresses[0]?.innerText);
    const y2 = drawParty(col2X, 'Bill to', partyNames[1]?.textContent.trim(), partyAddresses[1]?.innerText);
    y = Math.max(y1, y2) + 16;

    // Line items table
    const colQtyX = MARGIN + 300;
    const colRateX = MARGIN + 375;

    pdf.setDrawColor(...accentRgb);
    pdf.setLineWidth(2.5);
    pdf.line(MARGIN, y, RIGHT, y);
    y += 16;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text('ITEM', MARGIN, y);
    pdf.text('QTY', colQtyX, y, { align: 'right' });
    pdf.text('RATE', colRateX, y, { align: 'right' });
    pdf.text('AMOUNT', RIGHT, y, { align: 'right' });
    y += 8;
    pdf.setDrawColor(236, 236, 238);
    pdf.setLineWidth(0.75);
    pdf.line(MARGIN, y, RIGHT, y);
    y += 18;

    const rows = document.querySelectorAll('.invoice-table-row[data-row]');
    rows.forEach((row, i) => {
      if (y > PAGE_H - 140) {
        pdf.addPage();
        y = MARGIN;
      }
      if (i % 2 === 1) {
        pdf.setFillColor(245, 246, 247);
        pdf.rect(MARGIN - 6, y - 14, CONTENT_W + 12, 24, 'F');
      }
      const name = row.children[0]?.textContent.trim();
      const qty = row.querySelector('.is-qty')?.textContent.trim();
      const rate = row.querySelector('.is-rate')?.textContent.trim();
      const amount = row.querySelector('.amount')?.textContent.trim();

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...dark);
      pdf.text(name || '', MARGIN, y);
      pdf.setTextColor(...bodyMuted);
      pdf.text(qty || '', colQtyX, y, { align: 'right' });
      pdf.text(rate || '', colRateX, y, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...dark);
      pdf.text(amount || '', RIGHT, y, { align: 'right' });

      y += 10;
      pdf.setDrawColor(241, 242, 243);
      pdf.setLineWidth(0.5);
      pdf.line(MARGIN, y, RIGHT, y);
      y += 18;
    });
    y += 8;

    // Totals
    const totalsX = RIGHT - 200;
    function totalsRow(label, value) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...bodyMuted);
      pdf.text(label, totalsX, y);
      pdf.text(value, RIGHT, y, { align: 'right' });
      y += 18;
    }
    totalsRow('Subtotal', document.getElementById('invoiceSubtotal')?.textContent.trim() || '');
    if (!document.getElementById('invoiceDiscountRow')?.hidden) {
      totalsRow('Discount', document.getElementById('invoiceDiscountAmt')?.textContent.trim() || '');
    }
    if (!document.getElementById('invoiceTaxRow')?.hidden) {
      totalsRow('Tax', document.getElementById('invoiceTaxAmt')?.textContent.trim() || '');
    }
    if (!document.getElementById('invoiceShippingRow')?.hidden) {
      totalsRow('Shipping', document.getElementById('invoiceShippingAmt')?.textContent.trim() || '');
    }
    y += 4;
    pdf.setFillColor(...accentBgRgb);
    pdf.roundedRect(totalsX - 12, y - 14, 212, 26, 4, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...liveTextRgb);
    pdf.text('Amount due', totalsX, y + 4);
    pdf.text(document.getElementById('invoiceDue')?.textContent.trim() || '', RIGHT, y + 4, { align: 'right' });
    y += 42;

    // Notes / terms / bank (left) + signature / stamp (right)
    pdf.setDrawColor(241, 242, 243);
    pdf.setLineWidth(0.75);
    pdf.line(MARGIN, y, RIGHT, y);
    y += 20;

    let leftY = y;
    const leftColW = CONTENT_W - 220;
    function drawLabelBlock(label, text) {
      if (!text) return;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(label.toUpperCase(), MARGIN, leftY);
      leftY += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...muted);
      pdf.splitTextToSize(text, leftColW).forEach((line) => {
        pdf.text(line, MARGIN, leftY);
        leftY += 12;
      });
      leftY += 10;
    }
    drawLabelBlock('Notes', document.querySelector('.invoice-notes p')?.innerText.trim());
    if (!document.getElementById('invoiceTermsBlock')?.hidden) {
      drawLabelBlock('Terms & conditions', document.querySelector('.invoice-terms p')?.innerText.trim());
    }
    drawLabelBlock('Bank account details', document.querySelector('.invoice-bank p')?.innerText.trim());

    const sigColX = RIGHT - 200;
    let sigY = y;
    const sigBlockHidden = document.getElementById('invoiceSignatureBlock')?.hidden;
    const sigDrawn = document.getElementById('invoiceSigPlaceholder')?.hidden;
    if (!sigBlockHidden && sigDrawn) {
      const sigDataUrl = document.getElementById('invoiceSigCanvas')?.toDataURL('image/png');
      let stampH = 0;
      const stampCluster = document.getElementById('invoiceStampCluster');
      if (stampCluster && !stampCluster.hidden) {
        const stampDataUrl = await toDataUrl(document.getElementById('invoiceStampImg')?.src);
        if (stampDataUrl) stampH = drawImageContain(pdf, stampDataUrl, sigColX + 130, sigY, 60, 60);
      }
      if (sigDataUrl) {
        const sigH = drawImageContain(pdf, sigDataUrl, sigColX, sigY, 190, 70);
        sigY += Math.max(sigH, stampH) + 6;
      }
      pdf.setDrawColor(...dark);
      pdf.setLineWidth(1);
      pdf.line(sigColX, sigY, sigColX + 200, sigY);
      sigY += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text('Authorized signature', sigColX, sigY);
      sigY += 10;
    }
    y = Math.max(leftY, sigY) + 10;

    // Footer contact bar — anchored near the bottom of the page so it
    // reads as a page footer instead of floating with dead space below it
    const footerParts = Array.from(document.querySelectorAll('.invoice-footer-bar > span'))
      .map((s) => s.textContent.trim())
      .filter(Boolean);
    if (footerParts.length) {
      const footerBarH = 28;
      const footerY = Math.max(y, PAGE_H - MARGIN - footerBarH);
      pdf.setFillColor(246, 247, 248);
      pdf.roundedRect(MARGIN, footerY, CONTENT_W, footerBarH, 6, 6, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...bodyMuted);
      pdf.text(footerParts.join('     ·     '), PAGE_W / 2, footerY + 18, { align: 'center' });
    }

    return pdf;
  }

  const downloadBtn = document.getElementById('invoiceDownloadBtn');
  downloadBtn?.addEventListener('click', async () => {
    const span = downloadBtn.querySelector('span');
    const original = span.textContent;
    if (typeof jspdf === 'undefined') return;

    downloadBtn.disabled = true;
    span.textContent = 'Preparing…';

    try {
      const pdf = await buildInvoicePdf();
      const name = document.getElementById('invoiceBillToName')?.textContent.trim();
      const companyLine = document.getElementById('invoiceBillToCompany')?.textContent.trim().split('\n')[0];
      const who = (name || companyLine || 'BillZino')
        .replace(/[^\w\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const docType = (document.getElementById('invoiceDocTitle')?.textContent.trim() || 'Invoice').replace(/\s+/g, '-');
      pdf.save(`${docType}-${who || 'BillZino'}.pdf`);
      span.textContent = 'Downloaded ✓';
    } catch (err) {
      span.textContent = 'Try again';
    } finally {
      setTimeout(() => {
        span.textContent = original;
        downloadBtn.disabled = false;
      }, 1600);
    }
  });

  // optional blocks — terms & conditions and the signature pad only take up
  // room on the invoice once the client actually asks for them
  const termsBox = document.getElementById('invoiceAddTerms');
  const termsBlock = document.getElementById('invoiceTermsBlock');
  termsBox?.addEventListener('change', () => {
    termsBlock.hidden = !termsBox.checked;
  });

  const signatureBox = document.getElementById('invoiceAddSignature');
  const signatureBlock = document.getElementById('invoiceSignatureBlock');
  signatureBox?.addEventListener('change', () => {
    signatureBlock.hidden = !signatureBox.checked;
  });

  // signature pad — draw with mouse or touch
  const sigCanvas = document.getElementById('invoiceSigCanvas');
  const sigCtx = sigCanvas?.getContext('2d');
  const sigPlaceholder = document.getElementById('invoiceSigPlaceholder');
  const sigClearBtn = document.getElementById('invoiceSigClear');
  let isDrawing = false;
  let lastPoint = null;

  function sigPointFromEvent(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * sigCanvas.width,
      y: ((e.clientY - rect.top) / rect.height) * sigCanvas.height,
    };
  }

  sigCanvas?.addEventListener('pointerdown', (e) => {
    isDrawing = true;
    sigPlaceholder.hidden = true;
    lastPoint = sigPointFromEvent(e);
    try { sigCanvas.setPointerCapture(e.pointerId); } catch { /* no active pointer session to capture — drawing still works */ }
  });
  sigCanvas?.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    const p = sigPointFromEvent(e);
    sigCtx.strokeStyle = '#1a1d1f';
    sigCtx.lineWidth = 2;
    sigCtx.lineJoin = 'round';
    sigCtx.lineCap = 'round';
    sigCtx.beginPath();
    sigCtx.moveTo(lastPoint.x, lastPoint.y);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    lastPoint = p;
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
    sigCanvas?.addEventListener(evt, () => { isDrawing = false; });
  });
  sigClearBtn?.addEventListener('click', () => {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    sigPlaceholder.hidden = false;
  });

  // digital stamp upload — client can drag it anywhere, drag the corner
  // handle to resize it, or hit × to remove it (logo uses the same pattern)
  const stampInput = document.getElementById('invoiceStampInput');
  const stampCluster = document.getElementById('invoiceStampCluster');
  const stampImg = document.getElementById('invoiceStampImg');
  const stampRemove = document.getElementById('invoiceStampRemove');
  const stampResize = document.getElementById('invoiceStampResize');
  const sigPadWrap = document.querySelector('.invoice-sig-pad-wrap');
  let stampObjectUrl = null;
  let stampSize = 88; // px, at canvas-native resolution
  let stampX = 0;
  let stampY = 0;

  function clampStampPos(x, y) {
    const wrapW = sigPadWrap.clientWidth;
    const wrapH = sigPadWrap.clientHeight;
    const margin = stampSize * 0.6; // let it hang past the edges a bit, like a real stamp
    return {
      x: Math.min(wrapW + margin - stampSize, Math.max(-margin, x)),
      y: Math.min(wrapH + margin - stampSize, Math.max(-margin, y)),
    };
  }

  stampInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (stampObjectUrl) URL.revokeObjectURL(stampObjectUrl);
    stampObjectUrl = URL.createObjectURL(file);
    stampImg.src = stampObjectUrl;
    stampSize = 88;
    stampCluster.style.width = stampSize + 'px';
    stampCluster.style.height = stampSize + 'px';
    const start = clampStampPos(sigPadWrap.clientWidth - stampSize, sigPadWrap.clientHeight - stampSize);
    stampX = start.x;
    stampY = start.y;
    stampCluster.style.left = stampX + 'px';
    stampCluster.style.top = stampY + 'px';
    stampCluster.hidden = false;
  });
  stampRemove?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (stampObjectUrl) URL.revokeObjectURL(stampObjectUrl);
    stampObjectUrl = null;
    stampImg.src = '';
    stampCluster.hidden = true;
    stampInput.value = '';
  });

  // move — drag the stamp image itself anywhere within the signature pad
  stampImg?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = stampX;
    const startTop = stampY;
    const canvasScale = parseFloat(getComputedStyle(builderCanvas).getPropertyValue('--bs')) || 1;

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / canvasScale;
      const dy = (ev.clientY - startY) / canvasScale;
      const pos = clampStampPos(startLeft + dx, startTop + dy);
      stampX = pos.x;
      stampY = pos.y;
      stampCluster.style.left = stampX + 'px';
      stampCluster.style.top = stampY + 'px';
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  // resize — drag the corner handle
  stampResize?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startSize = stampSize;
    const canvasScale = parseFloat(getComputedStyle(builderCanvas).getPropertyValue('--bs')) || 1;
    stampResize.classList.add('is-dragging');

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / canvasScale;
      stampSize = Math.min(220, Math.max(36, startSize + dx));
      stampCluster.style.width = stampSize + 'px';
      stampCluster.style.height = stampSize + 'px';
    };
    const onUp = () => {
      stampResize.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  recalcTotals();
})();

// ---------- How it works: scroll-scrubbed line + traveling glow + step activation ----------
(function () {
  const row = document.getElementById('stepsRow');
  const fill = document.getElementById('stepsLineFill');
  const dot = document.getElementById('stepsLineDot');
  const steps = Array.from(document.querySelectorAll('.step'));
  if (!row || !fill || !dot || !steps.length) return;

  const thresholds = steps.map((_, i) => i / (steps.length - 1));
  let ticking = false;
  let active = false;

  function update() {
    ticking = false;
    const rect = row.getBoundingClientRect();
    const vh = window.innerHeight;

    // progress: 0 as the row's top approaches the bottom of the viewport,
    // 1 once it has scrolled up into the upper third — the whole sequence
    // "plays" while the section is the thing you're actively scrolling past.
    const start = vh * 0.85;
    const end = vh * 0.3;
    const raw = (start - rect.top) / (start - end);
    const progress = Math.min(1, Math.max(0, raw));

    const inRange = rect.bottom > 0 && rect.top < vh;
    row.classList.toggle('is-scrubbing', inRange);
    if (!inRange) return;

    fill.style.width = progress * 100 + '%';
    dot.style.left = progress * 100 + '%';

    steps.forEach((step, i) => {
      step.classList.toggle('is-active', progress >= thresholds[i] - 0.03);
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
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

