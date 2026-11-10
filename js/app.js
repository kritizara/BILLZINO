/* BillZino - below-the-fold application code.
   Loaded by main.js after the first paint so the builder, the demos and the
   dashboard tour never sit in the critical rendering path. */
(function () {
const BZ = window.bzI18n||{t:(k,f)=>f,doc:(c)=>c,code:(c)=>c,fill:(t)=>t,locale:'en-US',commaDecimal:false,lang:'en'};

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
    let t = String(str).replace(/[\s\u00a0\u202f]/g, '');
    if (BZ.commaDecimal && t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const formatMoney = (value) => {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString(BZ.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  addLineBtn?.addEventListener('click', (ev) => {
    const row = document.createElement('div');
    row.className = 'invoice-table-row';
    row.setAttribute('data-row', '');
    row.innerHTML = `
      <span class="editable" contenteditable="true" data-placeholder="${BZ.t('itemName', 'Item name')}"></span>
      <span class="editable is-qty" contenteditable="true" data-placeholder="1">1</span>
      <span class="editable is-rate" contenteditable="true" data-placeholder="0.00">0.00</span>
      <span class="amount">${formatMoney(0)}</span>
      <button type="button" class="invoice-line-remove" aria-label="${BZ.t('removeLine', 'Remove line item')}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    table.appendChild(row);
    recalcTotals();
    // only a real click moves focus (and scrolls); preset rows added while the page loads must not jump the page
    if (ev && ev.isTrusted) row.querySelector('.editable').focus();
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
    if (docTitleEl) { docTitleEl.textContent = BZ.doc(type); docTitleEl.dataset.type = type; }
  }
  docTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setDocType(btn.dataset.type));
  });

  // turning tax on nudges "Invoice" to "Tax Invoice" automatically (and
  // back, if turned off again) — but leaves a deliberately different
  // choice like Quote or Receipt alone either way
  tax.box.addEventListener('change', () => {
    const current = BZ.code(docTitleEl?.textContent.trim());
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
      if (currencyMoreLabel) currencyMoreLabel.textContent = BZ.t('more', 'More');
      if (currencyPicker) currencyPicker.hidden = true;
      btn.classList.add('is-active');
      currencySymbol = btn.dataset.symbol;
      currencyAfter = BZ.commaDecimal && currencySymbol === '€';
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

    function applyCurrency(chosen) {
      currencyButtons.forEach((b) => b.classList.remove('is-active'));
      currencyMoreBtn.classList.add('is-active');
      currencyMoreLabel.textContent = `${chosen.flag || ''} ${chosen.code}`.trim();
      currencySymbol = chosen.symbol;
      currencyAfter = !!chosen.after || (BZ.commaDecimal && chosen.symbol === '€');
      shippingSymbolEl.textContent = chosen.symbol;
      currencyPicker.hidden = true;
      recalcTotals();
    }

    currencyListEl.addEventListener('click', (e) => {
      const opt = e.target.closest('.invoice-currency-option');
      if (!opt) return;
      const chosen = WORLD_CURRENCIES.find((c) => c.code === opt.dataset.code);
      if (chosen) applyCurrency(chosen);
    });

    // ?currency=USD preselects a currency (used by the currency pages).
    // Re-applied after load because the hero demo animates the selector.
    try {
      const wanted = new URLSearchParams(location.search).get('currency');
      if (wanted) {
        const chosen = WORLD_CURRENCIES.find((c) => c.code.toLowerCase() === wanted.toLowerCase());
        if (chosen) {
          applyCurrency(chosen);
          const reapply = () => applyCurrency(chosen);
          window.addEventListener('load', () => { setTimeout(reapply, 1500); setTimeout(reapply, 3500); });
          document.addEventListener('visibilitychange', () => { if (!document.hidden) reapply(); });
        }
      }
    } catch (e) {}

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
    pdf.text(BZ.t('pdfItem', 'ITEM'), MARGIN, y);
    pdf.text(BZ.t('pdfQty', 'QTY'), colQtyX, y, { align: 'right' });
    pdf.text(BZ.t('pdfRate', 'RATE'), colRateX, y, { align: 'right' });
    pdf.text(BZ.t('pdfAmount', 'AMOUNT'), RIGHT, y, { align: 'right' });
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
    pdf.text(BZ.t('pdfDue', 'Amount due'), totalsX, y + 3);
    pdf.text(document.getElementById('invoiceDue')?.textContent.trim() || '', RIGHT, y + 3, { align: 'right' });
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
      pdf.text(BZ.t('pdfSign', 'Authorized signature'), sigColX, sigY);
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

  // ---------- Pixel-faithful A4 export ----------
  // The PDF is rendered from the invoice itself (the same HTML/CSS the client sees),
  // so logo size, dragged stamp, signature, colours, fonts, any currency symbol and
  // any language (Arabic, Chinese…) come out exactly as on screen. A real text layer
  // is added on top so the PDF stays searchable/selectable where the characters are
  // plain Latin. If anything fails we fall back to the vector builder above.
  let h2cPromise = null;
  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    if (h2cPromise) return h2cPromise;
    h2cPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.integrity = 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H';
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return h2cPromise;
  }

  let h2iPromise = null;
  function loadHtmlToImage() {
    if (window.htmlToImage) return Promise.resolve();
    if (h2iPromise) return h2iPromise;
    h2iPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      s.integrity = 'sha384-YAj4cGTKsNinHUzylwDJDDZEpC6gnqNubmrp9eerckq7+gwWjABe5s2plXl3uUKb';
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return h2iPromise;
  }

  // The browser itself lays out and paints the text (SVG foreignObject), so every glyph lands
  // exactly where it is on screen. html2canvas is only the fallback.
  function isBlankCanvas(cv) {
    try {
      const g = cv.getContext('2d');
      const w = cv.width, h = cv.height;
      for (let k = 0; k < 24; k++) {
        const d = g.getImageData(Math.floor(((k * 37) % 97) / 97 * (w - 1)), Math.floor(((k * 53) % 89) / 89 * (h - 1)), 1, 1).data;
        if (d[3] > 0 && !(d[0] > 250 && d[1] > 250 && d[2] > 250)) return false;
      }
      // a mostly-white page is still valid; only treat fully transparent as blank
      for (let k = 0; k < 24; k++) {
        const d = g.getImageData(Math.floor(((k * 31) % 97) / 97 * (w - 1)), Math.floor(((k * 17) % 89) / 89 * (h - 1)), 1, 1).data;
        if (d[3] > 0) return false;
      }
      return true;
    } catch (_) { return false; }
  }
  // Inter is embedded into the page image ourselves (html-to-image can't read Google's cross-origin
  // stylesheet), otherwise the PDF text would silently fall back to Arial/Helvetica.
  let fontCssPromise = null;
  function inlineFontCss() {
    if (fontCssPromise) return fontCssPromise;
    const toDataUrl = (url) => fetch(url).then((r) => r.blob()).then((b) => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    }));
    const faces = [
      ['assets/fonts/inter-latin-ext.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF'],
      ['assets/fonts/inter-latin.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
    ];
    fontCssPromise = Promise.all(faces.map(([url]) => toDataUrl(url))).then((urls) =>
      faces.map(([, range], i) => "@font-face{font-family:'Inter';font-style:normal;font-weight:400 800;src:url(" + urls[i] + ") format('woff2');unicode-range:" + range + '}').join('')
    ).catch(() => { fontCssPromise = null; return ''; });
    return fontCssPromise;
  }

  async function renderPageCanvas(node, scale) {
    try {
      await loadHtmlToImage();
      const fontEmbedCSS = await inlineFontCss();
      const opts = { pixelRatio: scale, backgroundColor: '#ffffff', cacheBust: false };
      if (fontEmbedCSS) opts.fontEmbedCSS = fontEmbedCSS;
      let cv = await window.htmlToImage.toCanvas(node, opts);
      if (isBlankCanvas(cv)) cv = await window.htmlToImage.toCanvas(node, opts); // first paint can come back empty in Safari
      if (!isBlankCanvas(cv)) return cv;
    } catch (err) {
      console.warn('html-to-image failed, trying html2canvas', err);
    }
    await loadHtml2Canvas();
    return window.html2canvas(node, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 794 });
  }

  async function buildRasterPdf() {
    await loadJsPdf();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const app = document.getElementById('invoiceApp');
    const paper = app.querySelector('.invoice-paper');
    const host = document.createElement('div');
    host.className = 'pdf-export-host';
    const wrap = document.createElement('div');
    wrap.className = app.className + ' pdf-export';
    wrap.style.cssText = app.style.cssText;
    const clone = paper.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    wrap.appendChild(clone);
    host.appendChild(wrap);
    document.body.appendChild(host);

    try {
      // canvases (signature) don't survive cloneNode — copy the pixels across
      const srcCanvases = paper.querySelectorAll('canvas');
      clone.querySelectorAll('canvas').forEach((c, i) => {
        try { c.getContext('2d').drawImage(srcCanvases[i], 0, 0); } catch (_) { /* tainted or missing */ }
      });

      // drop anything that is empty so the page only shows what the client wrote
      clone.querySelectorAll('.invoice-table-row[data-row]').forEach((r) => {
        if (!r.children[0].textContent.trim()) r.remove();
      });
      clone.querySelectorAll('.invoice-notes, .invoice-terms, .invoice-bank').forEach((b) => {
        const p = b.querySelector('p');
        if (!p || !p.textContent.trim()) b.remove();
      });
      const bar = clone.querySelector('.invoice-footer-bar');
      if (bar) {
        bar.querySelectorAll(':scope > span').forEach((s) => { if (!s.textContent.trim()) s.remove(); });
        if (!bar.children.length) bar.remove();
      }
      // html2canvas draws text ~one margin lower inside flex bars that have margin-top;
      // so the footer bar is pushed down with a spacer element instead of a margin
      const barEl = clone.querySelector('.invoice-footer-bar');
      if (barEl) { const sp = document.createElement('div'); sp.style.flex = '1 1 auto'; barEl.before(sp); }
      const logoBox = clone.querySelector('.invoice-logo-box');
      if (logoBox && !logoBox.classList.contains('has-logo')) logoBox.remove();
      const sigBlock = clone.querySelector('.invoice-signature');
      const sigDrawn = !sigBlock || sigBlock.hidden ? false : !!document.getElementById('invoiceSigPlaceholder')?.hidden;
      if (sigBlock && !sigDrawn) sigBlock.hidden = true;
      const bottom = clone.querySelector('.invoice-bottom');
      if (bottom && !bottom.querySelector('.invoice-bottom-col > *') && (!sigBlock || sigBlock.hidden)) bottom.remove();

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(clone.querySelectorAll('img')).filter((i) => i.src);
      await Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; }))));

      // an invoice that is only a little longer than one page is scaled to fit ONE A4 page
      // (the page is em-based, so shrinking the font size scales spacing too); longer ones paginate
      const A4FIT = 1123;
      if (clone.scrollHeight > A4FIT && clone.scrollHeight <= A4FIT * 1.45) {
        let fs = 15;
        for (let k = 0; k < 12 && clone.scrollHeight > A4FIT && fs > 11; k++) {
          fs = Math.max(11, fs * (A4FIT / clone.scrollHeight) * 0.985);
          clone.style.setProperty('font-size', fs + 'px', 'important');
        }
        if (clone.scrollHeight > A4FIT) clone.style.removeProperty('font-size');
      }

      // fill whole pages so the contact bar lands at the bottom of the last page
      const A4PX = 1123;
      // one-page invoices fill the sheet (footer at the bottom); longer ones flow naturally so no empty page is created
      clone.style.minHeight = clone.scrollHeight <= A4PX + 2 ? A4PX + 'px' : '0px';
      await new Promise((r) => requestAnimationFrame(r));
      const cRect = clone.getBoundingClientRect();
      const SCALE = cRect.height > 2400 ? 2 : 3; // keep very long invoices inside canvas size limits
      const canvas = await renderPageCanvas(clone, SCALE);

      const W = canvas.width;
      const pageH = Math.round(W * 297 / 210);
      // safe places to cut a long invoice: the bottom edge of a block, never through one
      const blocks = Array.from(clone.querySelectorAll('.invoice-table-head, .invoice-table-row, .invoice-parties, .invoice-totals, .invoice-notes, .invoice-terms, .invoice-bank, .invoice-signature, .invoice-footer-bar'))
        .map((e) => { const r = e.getBoundingClientRect(); return [Math.round((r.top - cRect.top) * SCALE), Math.round((r.bottom - cRect.top) * SCALE)]; });
      const cutOk = (yy) => !blocks.some(([t, bt]) => yy > t + 2 && yy < bt - 2);
      let bottoms = blocks.map((bk) => bk[1]).filter(cutOk).sort((x, z) => x - z);
      // never leave the contact footer alone on a page: it always travels with the block above it
      const footEl0 = clone.querySelector('.invoice-footer-bar');
      if (footEl0) {
        const ft = Math.round((footEl0.getBoundingClientRect().top - cRect.top) * SCALE);
        const above = blocks.map((bk) => bk[1]).filter((bt) => bt <= ft + 2);
        if (above.length) { const lastBottom = Math.max(...above); bottoms = bottoms.filter((bt) => bt !== lastBottom); }
      }
      // page margins: continuation pages get a top margin (and repeat the item-table header when
      // they start inside the table); every page except the last keeps a bottom margin
      const MT = Math.round(44 * SCALE), MB = Math.round(40 * SCALE);
      const px = (r) => [Math.round((r.top - cRect.top) * SCALE), Math.round((r.bottom - cRect.top) * SCALE)];
      const headEl = clone.querySelector('.invoice-table-head');
      const tableEl = clone.querySelector('.invoice-table');
      const headBox = headEl ? px(headEl.getBoundingClientRect()) : null;
      const tableBottom = tableEl ? px(tableEl.getBoundingClientRect())[1] : 0;
      const slices = [];
      let y = 0;
      while (y < canvas.height - 6) {
        const first = slices.length === 0;
        const repeatHead = !first && !!headBox && y > headBox[1] + 2 && y < tableBottom;
        const topOff = first ? 0 : MT + (repeatHead ? headBox[1] - headBox[0] : 0);
        const avail = pageH - topOff;
        let end;
        if (canvas.height - y <= avail) {
          end = canvas.height;
        } else {
          const limit = y + avail - MB;
          end = limit;
          const cands = bottoms.filter((bt) => bt > y + avail * 0.35 && bt <= limit);
          if (cands.length) end = cands[cands.length - 1];
        }
        if (end <= y + 10) end = Math.min(canvas.height, y + avail - MB);
        slices.push([y, end, topOff, repeatHead]);
        y = end;
      }

      const pdf = new jspdf.jsPDF({ unit: 'pt', format: 'a4', compress: true });
      const PW = pdf.internal.pageSize.getWidth();
      const PH = pdf.internal.pageSize.getHeight();
      const ptPerPx = PW / W;
      slices.forEach(([a, b, off, rep], i) => {
        if (i > 0) pdf.addPage();
        const part = document.createElement('canvas');
        part.width = W;
        part.height = off + (b - a);
        const g = part.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, part.height);
        if (rep) g.drawImage(canvas, 0, headBox[0], W, headBox[1] - headBox[0], 0, MT, W, headBox[1] - headBox[0]);
        g.drawImage(canvas, 0, a, W, b - a, 0, off, W, b - a);
        pdf.addImage(part.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, PW, Math.min(PH, part.height * ptPerPx), undefined, 'FAST');
      });
      // "2 / 3" in the bottom margin of multi-page invoices
      if (slices.length > 1) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 156, 163);
        slices.forEach((_, i) => { pdf.setPage(i + 1); pdf.text((i + 1) + ' / ' + slices.length, PW / 2, PH - 16, { align: 'center' }); });
      }

      // invisible text layer (search / select / copy). Latin text only — other scripts stay as pixels.
      try {
        const kx = PW / cRect.width;
        const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const text = node.nodeValue.replace(/\s+/g, ' ').trim();
          if (!text || !/^[ -~ -ÿ€•·–—’“”…]+$/.test(text)) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const r = range.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const yPx = (r.top - cRect.top) * SCALE;
          const si = slices.findIndex(([a, b]) => yPx >= a - 1 && yPx < b);
          if (si < 0) continue;
          pdf.setPage(si + 1);
          pdf.setFontSize(Math.max(4, r.height * kx * 0.78));
          pdf.text(text, (r.left - cRect.left) * kx, (yPx - slices[si][0] + slices[si][2]) * ptPerPx + r.height * kx * 0.8, { renderingMode: 'invisible' });
        }
        pdf.setPage(1);
      } catch (_) { /* text layer is a bonus — the page image is already complete */ }

      return pdf;
    } finally {
      host.remove();
    }
  }

  // always prefer the faithful export; fall back to the vector layout if it can't run
  async function buildPdf() {
    try {
      return await buildRasterPdf();
    } catch (err) {
      console.warn('Faithful PDF export failed, using vector layout instead', err);
      return buildInvoicePdf();
    }
  }
  const warmExport = () => { loadJsPdf().catch(() => {}); loadHtmlToImage().catch(() => {}); };
  document.getElementById('invoiceDownloadBtn')?.addEventListener('pointerenter', warmExport, { once: true });
  document.getElementById('invoiceSendBtn')?.addEventListener('pointerenter', warmExport, { once: true });

  // jsPDF (~90KB) is only ever needed once someone actually clicks Download,
  // so it's loaded on demand here instead of blocking every page load.
  let jsPdfLoadPromise = null;
  function loadJsPdf() {
    if (typeof jspdf !== 'undefined') return Promise.resolve();
    if (jsPdfLoadPromise) return jsPdfLoadPromise;
    jsPdfLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.integrity = 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk';
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    return jsPdfLoadPromise;
  }

  // fresh invoice defaults: issued today, due in 30 days
  (function setDefaultDates() {
    const fmt = (d) => d.toLocaleDateString(BZ.locale, { month: 'short', day: 'numeric', year: 'numeric' });
    const issue = document.getElementById('invoiceIssueField');
    const due = document.getElementById('invoiceDueField');
    if (!issue || !due) return;
    const now = new Date();
    const later = new Date(now.getTime() + 30 * 86400000);
    if (!issue.textContent.trim()) issue.textContent = fmt(now);
    if (!due.textContent.trim()) due.textContent = fmt(later);
  })();

  // An empty invoice is never worth a PDF, a dashboard row, or an email —
  // point at whatever's missing instead of silently producing a blank page.
  function validateInvoice() {
    const fromEl = document.getElementById('invoiceFromName');
    const clientEl = document.getElementById('invoiceBillToName');
    const rows = Array.from(table.querySelectorAll('.invoice-table-row[data-row]'));
    const itemRow = rows.find((r) => r.children[0].textContent.trim() && parseNum(r.querySelector('.amount').textContent) > 0);

    const missing = [];
    if (!fromEl?.textContent.trim()) missing.push({ el: fromEl, label: BZ.t('needCompany', 'your company name') });
    if (!clientEl?.textContent.trim()) missing.push({ el: clientEl, label: BZ.t('needClient', 'your client\u2019s name') });
    if (!itemRow) {
      const target = rows.find((r) => !r.children[0].textContent.trim())?.children[0] || rows[0]?.children[0] || addLineBtn;
      missing.push({ el: target, label: BZ.t('needItem', 'at least one item with a price') });
    }
    if (!missing.length) return true;

    missing.forEach(({ el }) => {
      if (!el) return;
      el.classList.add('is-invalid');
      el.addEventListener('input', () => el.classList.remove('is-invalid'), { once: true });
    });
    const first = missing[0].el;
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => first?.focus?.(), 350);
    const list = missing.map((m) => m.label);
    const joined = list.length > 1 ? list.slice(0, -1).join(', ') + BZ.t('and', ' and ') + list[list.length - 1] : list[0];
    window.billzinoToast(BZ.on ? BZ.fill(BZ.t('needMsg', ''), { list: joined }) : 'Add ' + joined + ' first', 'error');
    return false;
  }

  const downloadBtn = document.getElementById('invoiceDownloadBtn');
  downloadBtn?.addEventListener('click', async () => {
    if (!validateInvoice()) return;
    const span = downloadBtn.querySelector('span');
    const original = span.textContent;

    downloadBtn.disabled = true;
    span.textContent = BZ.t('preparing', 'Preparing…');

    try {
      await loadJsPdf();
      const pdf = await buildPdf();
      const name = document.getElementById('invoiceBillToName')?.textContent.trim();
      const companyLine = document.getElementById('invoiceBillToCompany')?.textContent.trim().split('\n')[0];
      const who = (name || companyLine || 'BillZino')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const docType = (document.getElementById('invoiceDocTitle')?.textContent.trim() || 'Invoice').replace(/\s+/g, '-');
      pdf.save(`${docType}-${who || 'BillZino'}.pdf`);
      span.textContent = BZ.t('downloaded', 'Downloaded ✓');
    } catch (err) {
      console.warn('PDF download failed', err);
      span.textContent = BZ.t('tryAgain', 'Try again');
    } finally {
      setTimeout(() => {
        span.textContent = original;
        downloadBtn.disabled = false;
      }, 1600);
    }
  });

  // Reads the current invoice out of the live DOM into a plain object —
  // everything the dashboard needs, minus images (logo/signature/stamp),
  // which are dropped here since they're never shown on the dashboard and
  // would risk blowing localStorage's ~5-10MB quota after a few saves.
  function serializeInvoice() {
    const metaValues = document.querySelectorAll('.invoice-meta-row strong');
    const partyNames = document.querySelectorAll('.invoice-party strong');
    const partyAddresses = document.querySelectorAll('.invoice-party p');

    const toIso = (text) => {
      const d = new Date(text);
      return isNaN(d) ? null : d.toISOString().slice(0, 10);
    };

    const lineItems = Array.from(table.querySelectorAll('.invoice-table-row[data-row]'))
      .filter((row) => row.children[0].textContent.trim())
      .map((row) => ({
        name: row.children[0].textContent.trim(),
        qty: parseNum(row.querySelector('.is-qty').textContent),
        rate: parseNum(row.querySelector('.is-rate').textContent),
        amount: parseNum(row.querySelector('.amount').textContent),
      }));

    const clientCompanyText = (partyAddresses[1]?.innerText || '').trim();
    const emailMatch = clientCompanyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    const appStyle = getComputedStyle(document.getElementById('invoiceApp'));
    const footerParts = Array.from(document.querySelectorAll('.invoice-footer-bar > span'))
      .map((s) => s.textContent.trim())
      .filter(Boolean);

    return {
      clientName: partyNames[1]?.textContent.trim() || 'Unnamed client',
      clientCompany: clientCompanyText,
      clientEmail: emailMatch ? emailMatch[0] : '',
      fromName: partyNames[0]?.textContent.trim() || 'BillZino',
      fromCompany: (partyAddresses[0]?.innerText || '').trim(),
      notes: (document.querySelector('.invoice-notes p')?.innerText || '').trim(),
      hasTerms: !document.getElementById('invoiceTermsBlock')?.hidden,
      terms: (document.querySelector('.invoice-terms p')?.innerText || '').trim(),
      bankDetails: (document.querySelector('.invoice-bank p')?.innerText || '').trim(),
      footerParts,
      accent: resolveAccentColor(appStyle.getPropertyValue('--live-accent'), '#00d639'),
      accentBg: resolveAccentColor(appStyle.getPropertyValue('--live-accent-bg'), '#00d639'),
      textColor: resolveAccentColor(appStyle.getPropertyValue('--live-text'), '#ffffff'),
      docType: BZ.code(docTitleEl?.textContent.trim()) || 'Invoice',
      invoiceNumber: metaValues[0]?.textContent.trim() || '',
      currency: currencySymbol,
      currencyAfter,
      lineItems,
      subtotal: parseNum(subtotalEl.textContent),
      discountPct: discount.box.checked ? parseNum(discount.input.value) : 0,
      discountAmt: discount.box.checked ? parseNum(discount.amt.textContent) : 0,
      taxPct: tax.box.checked ? parseNum(tax.input.value) : 0,
      taxAmt: tax.box.checked ? parseNum(tax.amt.textContent) : 0,
      shippingAmt: shipping.box.checked ? parseNum(shipping.amt.textContent) : 0,
      total: parseNum(dueEl.textContent),
      issueDate: toIso(metaValues[1]?.textContent.trim()),
      dueDate: toIso(metaValues[2]?.textContent.trim()),
    };
  }

  // Both buttons need a session before anything is persisted. If the user
  // isn't logged in, we stash the already-serialized invoice (no need to
  // re-enter anything) plus which action to finish, then resume it right
  // after login/signup — see login.html/signup.html.
  function requireSessionOrRedirect(invoiceData, action) {
    const session = window.billzinoAuth?.getSession();
    if (session) return session;
    sessionStorage.setItem('billzino-pending-invoice', JSON.stringify({ invoiceData, action }));
    window.location.href = 'login.html';
    return null;
  }

  window.billzinoOpenInvoiceEmail = openInvoiceEmail;
  function openInvoiceEmail(invoice) {
    const docLocal = BZ.doc(invoice.docType);
    const subject = (BZ.on ? BZ.fill(BZ.t('mailSubject', ''), { doc: docLocal, num: invoice.invoiceNumber || '', from: invoice.fromName }) : `${invoice.docType} ${invoice.invoiceNumber || ''} from ${invoice.fromName}`).trim();
    const amount = invoice.currencyAfter
      ? `${invoice.total.toFixed(2)} ${invoice.currency}`
      : `${invoice.currency}${invoice.total.toFixed(2)}`;
    const body = BZ.on ? BZ.fill(BZ.t('mailBody', ''), {
      client: invoice.clientName, doc: BZ.lang === 'de' ? docLocal : docLocal.toLowerCase(), num: invoice.invoiceNumber || '', amount,
      from: invoice.fromName, due: invoice.dueDate ? BZ.fill(BZ.t('mailDue', ''), { date: invoice.dueDate }) + '\n' : BZ.t('mailNoDue', '.') + '\n'
    }) :
      `Hi ${invoice.clientName},\n\n` +
      `Please find attached ${invoice.docType.toLowerCase()} ${invoice.invoiceNumber || ''} for ${amount}` +
      (invoice.dueDate ? `, due ${invoice.dueDate}.\n\n` : '.\n\n') +
      `We've just downloaded the PDF for you to attach — it should be in your Downloads folder.\n\n` +
      `Thanks,\n${invoice.fromName}`;
    const to = encodeURIComponent(invoice.clientEmail || '');
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const saveBtn = document.getElementById('invoiceSaveBtn');
  saveBtn?.addEventListener('click', () => {
    if (!validateInvoice()) return;
    const invoiceData = serializeInvoice();
    const session = requireSessionOrRedirect(invoiceData, 'save');
    if (!session) return;
    window.billzinoData.saveInvoice(session.userId, invoiceData);
    window.billzinoToast(BZ.t('toastSaved', 'Saved to your dashboard ✓'));
    const span = saveBtn.querySelector('span');
    const original = span.textContent;
    span.textContent = BZ.t('saved', 'Saved ✓');
    setTimeout(() => { span.textContent = original; }, 1600);
  });

  const sendBtn = document.getElementById('invoiceSendBtn');
  sendBtn?.addEventListener('click', async () => {
    if (!validateInvoice()) return;
    const invoiceData = serializeInvoice();
    const session = requireSessionOrRedirect(invoiceData, 'send');
    if (!session) return;
    window.billzinoData.saveInvoice(session.userId, invoiceData, true);
    try {
      await loadJsPdf();
      const pdf = await buildPdf();
      const who = (invoiceData.clientName || 'BillZino').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      pdf.save(`${BZ.doc(invoiceData.docType).replace(/\s+/g, '-')}-${who}.pdf`);
    } catch {}
    openInvoiceEmail(invoiceData);
    window.billzinoToast(BZ.t('toastSend', 'Saved — attach the downloaded PDF in your email app'));
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

  // The builder opens as a finished example — items, euro, blue template —
  // like the how-it-works demo. Discount, tax, shipping and the signature
  // pad start switched off; the client turns on what they need.
  (function loadExample() {
    const click = (sel) => document.querySelector(sel)?.click();
    click('.invoice-currency-btn[data-symbol="' + (document.body.dataset.currency || '€') + '"]');
    click('#invoiceSwatches .invoice-swatch[style*="0019D6"]');

    // blank template page: start with empty fields
    if (document.body.dataset.blank) {
      document.querySelectorAll('#builder [contenteditable="true"]').forEach((el) => {
        el.textContent = '';
      });
    }

    // dedicated generator pages (receipt / quote / tax invoice) open pre-set
    const doc = document.body.dataset.doc;
    if (doc) {
      if (document.querySelector('.invoice-doctype-btn[data-type="' + doc + '"]')) click('.invoice-doctype-btn[data-type="' + doc + '"]');
      else setDocType(doc);
    }
    if (doc === 'Tax Invoice') {
      tax.box.checked = true;
      tax.box.dispatchEvent(new Event('change'));
    }

    // trade template pages open with that trade's own line items
    try {
      const preset = JSON.parse(document.body.dataset.preset || 'null');
      if (Array.isArray(preset) && preset.length) {
        const getRows = () => Array.from(table.querySelectorAll('.invoice-table-row[data-row]'));
        while (getRows().length < preset.length) addLineBtn?.click();
        while (getRows().length > preset.length) getRows().pop().querySelector('.invoice-line-remove')?.click();
        getRows().forEach((row, i) => {
          const [name, qty, rate] = preset[i];
          row.children[0].textContent = name;
          row.querySelector('.is-qty').textContent = String(qty);
          row.querySelector('.is-rate').textContent = Number(rate).toFixed(2);
        });
      }
    } catch (e) {}

    // optional notes / seller line preset (used by the auto-entrepreneur page)
    try {
      const ds = document.body.dataset;
      if (ds.from) { const el = document.getElementById('invoiceFromName'); if (el) el.textContent = ds.from; }
      if (ds.notes) { const el = document.getElementById('invoiceNotes'); if (el) el.textContent = ds.notes; }
      if (ds.tax && !tax.box.checked) {
        tax.box.checked = true;
        tax.box.dispatchEvent(new Event('change'));
        tax.input.value = ds.tax;
        tax.input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (ds.number) { const el = document.getElementById('invoiceNumberField'); if (el) el.textContent = ds.number; }
    } catch (e) {}
  })();

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

// ---------- How it works: auto-playing builder walkthrough (sample data) ----------
(function () {
  const root = document.getElementById('demo');
  const stage = document.getElementById('demoStage');
  const canvas = document.getElementById('demoCanvas');
  if (!root || !stage || !canvas) return;

  const $ = (id) => document.getElementById(id);
  const el = {
    company: $('dmCompany'), pCompany: $('dmPCompany'), chips: Array.from(canvas.querySelectorAll('.dm-chip')),
    pTitle: $('dmPTitle'), select: $('dmSelect'), menu: $('dmMenu'), opts: Array.from(canvas.querySelectorAll('.dm-opt')),
    disc: $('dmDisc'), tax: $('dmTax'), tileLogo: $('dmTileLogo'), tileSig: $('dmTileSig'),
    tileStamp: $('dmTileStamp'), pLogo: $('dmPLogo'), sig: $('dmSig'), stamp: $('dmStamp'), paper: $('dmPaper'),
    rows: Array.from(canvas.querySelectorAll('.dm-row')), rowDisc: $('dmRowDisc'), rowTax: $('dmRowTax'),
    sub: $('dmSub'), disc2: $('dmDisc2'), tax2: $('dmTax2'), total: $('dmTotal'),
    swatches: Array.from(canvas.querySelectorAll('.dm-sw')), custom: $('dmCustom'), hex: $('dmHex'), add: $('dmAdd'),
    dialog: $('dmDialog'),
    send: $('dmSend'), download: $('dmDownload'), toast: $('dmToast'), cursor: $('dmCursor'),
  };
  el.swatches.forEach((s) => { if (s.dataset.c[0] === '#') s.style.setProperty('--c', s.dataset.c); });
  // "Bill from" on the sample invoice mirrors the company name as it is typed
  const pFrom = $('dmPFrom');
  if (pFrom && el.pCompany && 'MutationObserver' in window) {
    new MutationObserver(() => { pFrom.textContent = el.pCompany.textContent; }).observe(el.pCompany, { childList: true, characterData: true, subtree: true });
  }
  const play = $('demoPlay'), replay = $('demoReplay'), segsBox = $('demoSegs');
  const capBox = root.querySelector('.demo-caption');
  const capNum = $('demoCapNum'), capTitle = $('demoCapTitle'), capText = $('demoCapText');

  const CUR = { USD: { s: '$', f: '🇺🇸' }, EUR: { s: '€', f: '🇪🇺' }, GBP: { s: '£', f: '🇬🇧' } };
  const ITEMS = [['Brand identity design', 1, 1200], ['Landing page design', 1, 1800], ['Monthly support', 3, 150]];
  const COMPANY = 'Northwind Studio';
  const DISC = 0.10, TAX = 0.08;

  const state = { cur: 'USD', disc: false, tax: false, shown: 0 };
  let scale = 1;
  let run = 0, fast = false, userPaused = false, offscreen = true, ended = false, started = false;
  let resumers = [];
  const CANCEL = { cancelled: true };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- scaling: the canvas has a fixed design size, scaled to the stage width ----
  function layout() {
    const w = stage.clientWidth;
    if (!w) return;
    const compact = w < 640;
    const cw = compact ? 620 : 960;
    canvas.classList.toggle('is-compact', compact);
    canvas.style.width = cw + 'px';
    canvas.style.height = compact ? 'auto' : '650px';
    const ch = canvas.offsetHeight;
    scale = w / cw;
    canvas.style.transform = 'scale(' + scale + ')';
    stage.style.height = ch * scale + 'px';
  }
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
  else window.addEventListener('resize', layout);

  // ---- timing (pausable, cancellable, skippable when fast-forwarding) ----
  async function sleep(ms) {
    const id = run;
    if (!fast) {
      let left = ms;
      while (left > 0) {
        if (id !== run) throw CANCEL;
        if (root.classList.contains('is-paused')) { await new Promise((r) => resumers.push(r)); continue; }
        const d = Math.min(left, 60);
        await new Promise((r) => setTimeout(r, d));
        left -= d;
      }
    }
    if (id !== run) throw CANCEL;
  }

  function press(node) {
    node.classList.add('is-press');
    setTimeout(() => node.classList.remove('is-press'), 170);
  }

  const visible = (n) => n.offsetParent !== null;
  const pick = (panelNode, paperNode) => (visible(panelNode) ? panelNode : paperNode);

  async function moveTo(node, ox, oy, ms) {
    const c = canvas.getBoundingClientRect(), r = node.getBoundingClientRect();
    const x = (r.left - c.left + r.width * (ox == null ? 0.5 : ox)) / scale;
    const y = (r.top - c.top + r.height * (oy == null ? 0.5 : oy)) / scale;
    el.cursor.classList.add('is-on');
    if (ms) el.cursor.style.transition = 'transform ' + ms + 'ms cubic-bezier(.5,.05,.2,1), opacity .3s';
    el.cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    await sleep(ms ? ms + 40 : 900);
    if (ms) el.cursor.style.transition = '';
  }
  async function click(node) {
    el.cursor.classList.remove('is-click');
    void el.cursor.offsetWidth;
    if (!fast) el.cursor.classList.add('is-click');
    if (node && !fast) press(node);
    await sleep(260);
  }

  async function typeInto(targets, text, per) {
    targets.forEach((t) => t.classList.add('is-typing'));
    for (let i = 1; i <= text.length; i++) {
      targets.forEach((t) => t.fn(text.slice(0, i)));
      if (fast) continue;
      await sleep((per || 65) + (i % 3) * 14);
    }
    targets.forEach((t) => t.classList.remove('is-typing'));
  }

  // ---- rendering helpers ----
  const money = (n) => CUR[state.cur].s + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shownAmounts = () => ITEMS.slice(0, state.shown).map((it) => it[1] * it[2]);

  const tweens = new Map();
  function setNum(node, target, fmt) {
    cancelAnimationFrame(tweens.get(node));
    const from = parseFloat(node.dataset.v || '0');
    node.dataset.v = target;
    if (fast || from === target) { node.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 520;
    (function step(now) {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt(from + (target - from) * e);
      if (k < 1) tweens.set(node, requestAnimationFrame(step));
    })(t0);
  }

  function renderMoney() {
    const sub = shownAmounts().reduce((a, b) => a + b, 0);
    const disc = state.disc ? sub * DISC : 0;
    const tax = state.tax ? (sub - disc) * TAX : 0;
    setNum(el.sub, sub, money);
    setNum(el.disc2, disc, (v) => '-' + money(v));
    setNum(el.tax2, tax, money);
    setNum(el.total, sub - disc + tax, money);
    el.rows.forEach((row, i) => {
      if (i < state.shown) {
        row.classList.add('is-filled');
        row.querySelector('.dm-c-qty').textContent = ITEMS[i][1];
        row.querySelector('.dm-c-rate').textContent = money(ITEMS[i][2]);
        row.querySelector('.dm-c-amt').textContent = money(ITEMS[i][1] * ITEMS[i][2]);
      }
    });
  }

  function setDoc(v) {
    el.chips.forEach((c) => c.classList.toggle('is-on', c.dataset.v === v));
    el.pTitle.textContent = v;
    if (!fast) { el.pTitle.classList.remove('is-flash'); void el.pTitle.offsetWidth; el.pTitle.classList.add('is-flash'); }
  }

  function setColor(c, sw) {
    el.paper.style.setProperty('--dm-a', c);
    el.swatches.forEach((s) => s.classList.toggle('is-on', s === sw));
    if (sw && sw === el.custom) sw.style.setProperty('--c', c);
  }

  function setCur(code) {
    state.cur = code;
    el.select.querySelector('.dm-flag').textContent = CUR[code].f;
    el.select.querySelector('b').textContent = code;
    el.select.querySelector('em').textContent = canvas.querySelector('.dm-opt[data-c="' + code + '"] em').textContent;
    el.opts.forEach((o) => o.classList.toggle('is-on', o.dataset.c === code));
    renderMoney();
    if (!fast && started) {
      canvas.querySelectorAll('.dm-c-rate, .dm-c-amt, .dm-totals b').forEach((n, i) => {
        n.classList.remove('dm-money-flip'); void n.offsetWidth;
        n.style.animationDelay = (i * 45) + 'ms';
        n.classList.add('dm-money-flip');
      });
    }
  }

  let toastTimer;
  function toast(text, hold) {
    el.toast.textContent = text;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-on'), hold || 1900);
  }

  function reset() {
    state.cur = 'USD'; state.disc = false; state.tax = false; state.shown = 0;
    clearTimeout(toastTimer);
    el.toast.classList.remove('is-on');
    el.company.classList.remove('has-text', 'is-focus', 'is-typing');
    el.company.firstElementChild.textContent = '';
    el.pCompany.textContent = '';
    el.pCompany.classList.remove('is-typing');
    el.tileLogo.classList.remove('has-logo', 'is-uploading', 'is-on');
    el.pLogo.classList.remove('has-logo');
    el.tileSig.classList.remove('is-on'); el.tileStamp.classList.remove('is-on');
    el.sig.classList.remove('is-signed'); el.stamp.classList.remove('is-in');
    el.disc.classList.remove('is-on'); el.tax.classList.remove('is-on');
    el.rowDisc.classList.remove('is-in'); el.rowTax.classList.remove('is-in');
    el.menu.classList.remove('is-open'); el.select.classList.remove('is-focus');
    el.opts.forEach((o) => o.classList.remove('is-hover'));
    el.rows.forEach((r) => {
      r.classList.remove('is-in', 'is-typing', 'is-filled');
      r.querySelectorAll('span').forEach((s) => { s.textContent = ''; });
    });
    el.rows[0].classList.add('is-in');
    el.dialog.classList.remove('is-open');
    el.dialog.querySelectorAll('.dm-file').forEach((f) => f.classList.remove('is-hover', 'is-sel'));
    el.send.classList.remove('is-done'); el.download.classList.remove('is-done');
    el.download.textContent = 'Download PDF';
    [el.sub, el.disc2, el.tax2, el.total].forEach((n) => { cancelAnimationFrame(tweens.get(n)); n.dataset.v = '0'; });
    setDoc('Invoice'); el.pTitle.classList.remove('is-flash');
    setCur('USD'); el.custom.style.removeProperty('--c'); el.hex.classList.remove('is-on'); setColor('#1a1d1f', el.swatches[0]);
    canvas.querySelectorAll('.dm-money-flip').forEach((n) => n.classList.remove('dm-money-flip'));
    el.cursor.classList.remove('is-on', 'is-click');
    el.cursor.style.transform = 'translate(' + (canvas.classList.contains('is-compact') ? 520 : 780) + 'px,440px)';
  }

  // ---- the script ----
  const chapters = [
    {
      title: 'Type your company name',
      tag: 'Typing company name',
      text: 'Start with your business name — it appears on the invoice as you type.',
      est: 5200,
      async run() {
        const input = pick(el.company, el.pCompany);
        await moveTo(input, 0.3);
        await click(null);
        el.company.classList.add('is-focus');
        const inner = el.company.firstElementChild;
        await typeInto([
          Object.assign(el.company, { fn: (t) => { inner.textContent = t; el.company.classList.add('has-text'); } }),
          Object.assign(el.pCompany, { fn: (t) => { el.pCompany.textContent = t; } }),
        ], COMPANY, 62);
        el.company.classList.remove('is-focus');
        await sleep(500);
      },
    },
    {
      title: 'Upload your company logo',
      text: 'Click the logo box and pick your logo file — it sits at the top of every invoice.',
      tag: 'Choosing a logo file',
      est: 4600,
      async run() {
        await moveTo(el.pLogo, 0.5, 0.5);
        await click(el.pLogo);
        // small picker that opens right beside the logo box (not a full-screen modal)
        const c = canvas.getBoundingClientRect(), lr = el.pLogo.getBoundingClientRect();
        const cw = canvas.offsetWidth, ch = canvas.offsetHeight, dw = 236, dh = 150;
        el.dialog.style.left = Math.min(cw - dw - 8, (lr.right - c.left) / scale + 12) + 'px';
        el.dialog.style.top = Math.min(ch - dh - 8, Math.max(8, (lr.top - c.top) / scale - 6)) + 'px';
        el.dialog.classList.add('is-open');
        await sleep(280);
        const file = el.dialog.querySelector('[data-file="logo"]');
        await moveTo(file, 0.4, 0.5, 520);
        file.classList.add('is-sel');
        await click(file);
        await sleep(120);
        const openBtn = $('dmDlgOpen');
        await moveTo(openBtn, 0.5, 0.5, 420);
        await click(openBtn);
        el.dialog.classList.remove('is-open');
        el.pLogo.classList.add('has-logo');
        el.tileLogo.classList.add('has-logo', 'is-on');
        await sleep(750);
      },
    },
    {
      title: 'Choose the document type',
      tag: 'Picking document type',
      text: 'Invoice, Tax Invoice, Quote or Receipt — one click and the title updates.',
      est: 4600,
      async run() {
        const chip = (v) => el.chips.find((c) => c.dataset.v === v);
        await moveTo(pick(chip('Quote'), el.pTitle), 0.5);
        await click(chip('Quote'));
        setDoc('Quote');
        await sleep(900);
        await moveTo(pick(chip('Invoice'), el.pTitle), 0.5);
        await click(chip('Invoice'));
        setDoc('Invoice');
        await sleep(600);
      },
    },
    {
      title: 'Add your line items',
      tag: 'Adding items',
      text: 'Describe the work, set quantity and rate — totals add up on their own.',
      est: 8000,
      async run() {
        for (let i = 0; i < ITEMS.length; i++) {
          const row = el.rows[i];
          const name = row.querySelector('.dm-c-name');
          if (i > 0) {
            await moveTo(el.add, 0.2);
            await click(el.add);
            row.classList.add('is-in');
            await sleep(500);
          }
          await moveTo(name, 0.2);
          await click(null);
          row.classList.add('is-in');
          await typeInto([Object.assign(row, { fn: (t) => { name.textContent = t; } })], ITEMS[i][0], 42);
          state.shown = i + 1;
          renderMoney();
          await sleep(650);
        }
      },
    },
    {
      title: 'Pick your currency',
      tag: 'Switching currency',
      text: 'Dollars, euros, pounds and more — every amount switches instantly, no retyping.',
      est: 5200,
      async run() {
        await moveTo(pick(el.select, el.total), 0.5);
        await click(el.select);
        el.select.classList.add('is-focus');
        el.menu.classList.add('is-open');
        await sleep(650);
        const eur = el.opts.find((o) => o.dataset.c === 'EUR');
        if (visible(eur)) {
          await moveTo(eur, 0.4);
          eur.classList.add('is-hover');
          await sleep(220);
          await click(eur);
        } else await sleep(300);
        el.menu.classList.remove('is-open');
        el.select.classList.remove('is-focus');
        setCur('EUR');
        await sleep(1700);
      },
    },
    {
      title: 'Add a discount and tax',
      tag: 'Turning on tax',
      text: 'Toggle either on and the totals recalculate. Adding tax turns Invoice into Tax Invoice.',
      est: 7600,
      async run() {
        await moveTo(pick(el.disc, el.rowDisc), 0.2);
        await click(el.disc);
        state.disc = true; el.disc.classList.add('is-on'); el.rowDisc.classList.add('is-in');
        renderMoney();
        await sleep(1000);
        await moveTo(pick(el.tax, el.rowTax), 0.2);
        await click(el.tax);
        state.tax = true; el.tax.classList.add('is-on'); el.rowTax.classList.add('is-in');
        renderMoney();
        await sleep(500);
        setDoc('Tax Invoice');
        await sleep(1100);
      },
    },
    {
      title: 'Change the template color',
      tag: 'Picking a colour',
      text: 'Pick any color — or your exact brand color — and the whole invoice follows.',
      est: 5400,
      async run() {
        const blue = el.swatches.find((s) => s.dataset.c === '#0019D6');
        await moveTo(el.custom, 0.5);
        await click(el.custom);
        el.hex.classList.add('is-on');
        await sleep(450);
        setColor('#e5252a', el.custom);
        await sleep(1500);
        el.hex.classList.remove('is-on');
        await moveTo(blue, 0.5);
        await click(blue);
        setColor('#0019D6', blue);
        await sleep(1500);
      },
    },
    {
      title: 'Add your signature',
      tag: 'Drawing signature',
      text: 'Sign it right on the page — no printing, no scanning.',
      est: 4400,
      async run() {
        await moveTo(pick(el.tileSig, el.sig), 0.5, 0.5);
        await click(el.tileSig);
        el.tileSig.classList.add('is-on');
        await moveTo(el.sig, 0.15, 0.35);
        el.sig.classList.add('is-signed');
        await sleep(1700);
      },
    },
    {
      title: 'Stamp it',
      tag: 'Placing the stamp',
      text: 'Press your company stamp onto the invoice to make it official.',
      est: 3800,
      async run() {
        await moveTo(pick(el.tileStamp, el.stamp), 0.5, 0.5);
        await click(el.tileStamp);
        el.tileStamp.classList.add('is-on');
        await moveTo(el.stamp, 0.5, 0.5);
        await sleep(200);
        el.stamp.classList.add('is-in');
        if (!fast) { el.paper.classList.remove('is-thump'); void el.paper.offsetWidth; el.paper.classList.add('is-thump'); }
        await sleep(1400);
      },
    },
    {
      title: 'Download it or send it',
      tag: 'Downloading PDF',
      text: 'Get a clean A4 PDF, or send the invoice to your client by email.',
      est: 6000,
      async run() {
        await moveTo(el.download, 0.5);
        await click(el.download);
        el.download.classList.add('is-done');
        el.download.textContent = '✓ Downloaded';
        toast('✓ invoice-0042.pdf saved');
        await sleep(1500);
        await moveTo(el.send, 0.5);
        await click(el.send);
        el.send.classList.add('is-done');
        toast('✉ Email to your client is ready');
        await sleep(2300);
      },
    },
  ];

  // ---- caption + progress segments ----
  const segs = chapters.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'demo-seg'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + c.title);
    b.innerHTML = '<i></i>';
    b.style.setProperty('--seg-dur', c.est + 'ms');
    b.addEventListener('click', () => start(i));
    segsBox.appendChild(b);
    return b;
  });

  function setChapter(k) {
    segs.forEach((s, j) => {
      s.classList.toggle('is-done', j < k);
      const active = j === k;
      if (active) { s.classList.remove('is-active'); void s.offsetWidth; }
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    capNum.textContent = k + 1;
    const stepTag = $('demoStepTag'); if (stepTag) stepTag.textContent = 'Step ' + (k + 1) + ' of ' + chapters.length;
    const curTag = $('dmCurTag'); if (curTag) curTag.textContent = chapters[k].tag || '';
    capTitle.textContent = chapters[k].title;
    capText.textContent = chapters[k].text;
    capBox.classList.remove('is-swap'); void capBox.offsetWidth; capBox.classList.add('is-swap');
  }

  function syncPause() {
    const paused = userPaused || offscreen || document.hidden;
    root.classList.toggle('is-paused', paused);
    root.classList.toggle('is-user-paused', userPaused);
    if (!paused) { const rs = resumers; resumers = []; rs.forEach((r) => r()); }
    play.setAttribute('aria-label', userPaused ? 'Play demo' : 'Pause demo');
  }

  async function start(from) {
    const id = ++run;
    started = true; ended = false;
    resumers.forEach((r) => r()); resumers = [];
    try {
      reset();
      fast = true;
      canvas.classList.add('is-fast');
      for (let k = 0; k < from; k++) await chapters[k].run();
      await new Promise((r) => requestAnimationFrame(r));
      if (id !== run) return;
      fast = false;
      canvas.classList.remove('is-fast');
      if (from >= chapters.length) {
        segs.forEach((s) => { s.classList.remove('is-active'); s.classList.add('is-done'); });
        setChapter(chapters.length - 1);
        segs[chapters.length - 1].classList.remove('is-active'); segs[chapters.length - 1].classList.add('is-done');
        ended = true;
        return;
      }
      for (let k = from; k < chapters.length; k++) {
        setChapter(k);
        await chapters[k].run();
        await sleep(450);
      }
      segs[chapters.length - 1].classList.add('is-done');
      await sleep(3400);
      if (id === run) start(0);
    } catch (e) {
      if (e !== CANCEL) { fast = false; canvas.classList.remove('is-fast'); throw e; }
    }
  }

  play.addEventListener('click', () => {
    if (ended) { userPaused = false; syncPause(); start(0); return; }
    userPaused = !userPaused;
    syncPause();
  });
  replay.addEventListener('click', () => { userPaused = false; syncPause(); start(0); });
  document.addEventListener('visibilitychange', syncPause);

  // "Watch the demo" links (hero) scroll here and play it from the top
  document.querySelectorAll('a[href="#demo"]').forEach((a) => {
    a.addEventListener('click', () => {
      setTimeout(() => { userPaused = false; syncPause(); start(0); }, 700);
    });
  });

  reset();
  setChapter(0);
  if (reduceMotion) {
    userPaused = true;
    syncPause();
    start(chapters.length);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        offscreen = !e.isIntersecting;
        syncPause();
        if (e.isIntersecting && !started && !reduceMotion) start(0);
      });
    }, { threshold: 0.3 }).observe(root);
  } else {
    offscreen = false;
    syncPause();
    if (!reduceMotion) start(0);
  }
})();

// ---------- Dashboard showcase: interactive tour (sample data) ----------
(function () {
  const live = document.getElementById('live');
  const stage = document.getElementById('lvStage');
  const root = document.getElementById('lvRoot');
  const app = document.getElementById('lvApp');
  const pane = document.getElementById('lvPane');
  if (!live || !stage || !root || !app || !pane) return;

  const $ = (id) => document.getElementById(id);
  const cursor = $('lvCursor'), laptop = $('lvLaptop');
  const tabsBox = $('lvTabs');
  const tabBtns = Array.from(tabsBox.querySelectorAll('.lv-tab'));
  const sideBtns = Array.from(document.querySelectorAll('#lvSideNav button'));
  const TABS = ['overview', 'invoices', 'clients', 'reports'];
  const DUR = { overview: 6500, invoices: 10500, clients: 6500, reports: 7000 };
  const META = {
    overview: ['Overview', "Here's your month."],
    invoices: ['Invoices', 'Filter, search, mark paid.'],
    clients: ['Clients', 'Every invoice, grouped by client.'],
    reports: ['Reports', 'Who owes you — and for how long.'],
  };
  const COLORS = { 'Solaris Design Group': '#00d639', 'Northwind Studio': '#4dc9ff', 'Almass Retail Co.': '#f5b342', 'Kestrel & Co': '#ff7ab6' };
  const MONTHS = [['Jan', 7.4], ['Feb', 9.9], ['Mar', 8.2], ['Apr', 12.6], ['May', 10.8], ['Jun', 14.9]];
  const BASE = [
    { id: 'BZ-2049', client: 'Solaris Design Group', amt: 5150, st: 'pending', due: 'Nov 14', age: -9 },
    { id: 'BZ-2048', client: 'Northwind Studio', amt: 2275, st: 'paid', due: 'Oct 30' },
    { id: 'BZ-2047', client: 'Almass Retail Co.', amt: 980, st: 'paid', due: 'Oct 26' },
    { id: 'BZ-2046', client: 'Kestrel & Co', amt: 720, st: 'overdue', due: 'Oct 4', age: 18 },
    { id: 'BZ-2045', client: 'Northwind Studio', amt: 3400, st: 'paid', due: 'Oct 12' },
    { id: 'BZ-2044', client: 'Solaris Design Group', amt: 4350, st: 'paid', due: 'Oct 8' },
    { id: 'BZ-2043', client: 'Almass Retail Co.', amt: 1545, st: 'overdue', due: 'Sep 11', age: 41 },
  ];
  const BASE_EVENTS = [
    { t: 'Invoice BZ-2049 sent', s: 'Solaris Design Group · $5,150', w: '2h ago', c: '#00d639' },
    { t: 'Northwind Studio paid', s: 'BZ-2048 · $2,275', w: 'Yesterday', c: '#4dc9ff' },
    { t: 'BZ-2046 is now overdue', s: 'Kestrel & Co · 18 days', w: '2 days ago', c: '#ff5d5d' },
    { t: 'Almass Retail Co. paid', s: 'BZ-2047 · $980', w: '4 days ago', c: '#f5b342' },
  ];

  let inv, events, filter = 'all', tab = 'overview', scale = 1, compact = false, selClient = null;
  const shown = {};
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const money2 = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sums = () => {
    const s = { total: 0, paid: 0, pending: 0, overdue: 0 };
    inv.forEach((i) => { s.total += i.amt; s[i.st] += i.amt; });
    return s;
  };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initial = (n) => n.trim()[0].toUpperCase();

  function resetData() {
    inv = clone(BASE);
    events = clone(BASE_EVENTS);
    filter = 'all'; selClient = null;
    Object.keys(shown).forEach((k) => delete shown[k]);
  }

  // ---- scaling ----
  function layout() {
    const w = stage.clientWidth;
    if (!w) return;
    compact = w < 700;
    root.classList.toggle('is-compact', compact);
    const rw = compact ? 600 : 1160, rh = compact ? 700 : 640;
    scale = w / rw;
    root.style.transform = 'scale(' + scale + ')';
    stage.style.height = rh * scale + 'px';
  }

  // ---- count-up + build animations ----
  function countUp(el) {
    const key = el.dataset.key, to = parseFloat(el.dataset.count);
    const fmt = el.dataset.fmt === 'pct' ? (v) => Math.round(v) + '%' : el.dataset.fmt === 'money2' ? money2 : money;
    const from = shown[key] || 0;
    shown[key] = to;
    if (from === to || reduceMotion) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 800;
    (function step(now) {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function animateIn(scope) {
    scope.querySelectorAll('[data-count]').forEach(countUp);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scope.querySelectorAll('.lv-bar').forEach((b) => { b.style.height = b.dataset.h; });
      scope.querySelectorAll('.lv-seg i, .lv-track i').forEach((b) => { b.style.width = b.dataset.w; });
      scope.querySelectorAll('.lv-ring .fg').forEach((c) => { c.style.strokeDasharray = c.dataset.dash; });
    }));
  }

  const ring = (pct, r, size) => {
    const C = 2 * Math.PI * r;
    return '<svg class="lv-ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><circle class="tr" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '"/><circle class="fg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" data-dash="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>';
  };
  const pill = (st) => '<i class="lv-pill is-' + st + '">' + { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }[st] + '</i>';

  // ---- tab renderers ----
  function viewOverview() {
    const s = sums();
    const last = MONTHS[MONTHS.length - 1][1] * 1000;
    const maxV = Math.max(s.total, ...MONTHS.map((m) => m[1] * 1000));
    const pct = Math.round((s.total / (MONTHS[MONTHS.length - 1][1] * 1000) - 1) * 100);
    const bars = MONTHS.map((m, i) => '<div class="lv-barcol"><i class="lv-bar" style="--i:' + i + '" data-v="' + money(m[1] * 1000) + '" data-h="' + (m[1] * 1000 / maxV * 100).toFixed(0) + '%"></i><span>' + m[0] + '</span></div>').join('') +
      '<div class="lv-barcol"><i class="lv-bar is-now" style="--i:6" data-v="' + money(s.total) + '" data-h="' + (s.total / maxV * 100).toFixed(0) + '%"></i><span>Jul</span></div>';
    const evs = events.slice(0, 5).map((e, i) => '<div class="lv-ev' + (e.isNew ? ' is-new' : '') + '" style="--c:' + e.c + '"><i></i><div><b>' + e.t + '</b><small>' + e.s + ' · ' + e.w + '</small></div></div>').join('');
    return '<div class="lv-stats" style="--i:0">' +
      '<div class="lv-stat"><span>Total invoiced</span><strong data-key="ov-total" data-count="' + s.total + '">$0</strong><small>' + inv.length + ' invoices</small></div>' +
      '<div class="lv-stat" style="--c:#00d639"><span>Paid</span><strong data-key="ov-paid" data-count="' + s.paid + '">$0</strong><small>' + Math.round(s.paid / s.total * 100) + '% collected</small></div>' +
      '<div class="lv-stat" style="--c:#f5b342"><span>Pending</span><strong data-key="ov-pending" data-count="' + s.pending + '">$0</strong><small>Not due yet</small></div>' +
      '<div class="lv-stat" style="--c:#ff5d5d"><span>Overdue</span><strong data-key="ov-overdue" data-count="' + s.overdue + '">$0</strong><small>Needs a nudge</small></div></div>' +
      '<div class="lv-ov" style="--i:1"><div class="lv-card lv-chart"><div class="lv-card-head"><span>Invoiced overview</span><em>' + (pct >= 0 ? '+' : '') + pct + '% vs last month</em></div><div class="lv-bars">' + bars + '</div></div>' +
      '<div class="lv-card lv-feed"><div class="lv-card-head"><span>Activity</span></div>' + evs + '</div></div>';
  }

  function rowsHtml() {
    const list = inv.filter((i) => filter === 'all' || i.st === filter);
    return list.map((i) => {
      const act = i.st === 'paid' ? '<span class="lv-done">Settled</span>'
        : (i.st === 'overdue' ? (i.reminded ? '<button class="is-sent" type="button">Reminder ready ✓</button>' : '<button type="button" data-act="remind" data-id="' + i.id + '">Remind</button>') : '') +
          '<button type="button" data-act="paid" data-id="' + i.id + '">Mark paid</button>';
      return '<div class="lv-trow" data-row="' + i.id + '"><span class="mono-lv">#' + i.id + '</span><span>' + i.client + '</span><span>' + i.due + '</span><span>' + pill(i.st) + '</span><span class="mono-lv">' + money2(i.amt) + '</span><span class="lv-act">' + act + '</span></div>';
    }).join('');
  }
  function chipsHtml() {
    const c = (st) => inv.filter((i) => st === 'all' || i.st === st).length;
    return [['all', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['overdue', 'Overdue']]
      .map(([k, l]) => '<button type="button" class="lv-chip' + (filter === k ? ' is-on' : '') + '" data-filter="' + k + '">' + l + ' <b>' + c(k) + '</b></button>').join('');
  }
  function viewInvoices() {
    const s = sums();
    return '<div class="lv-sum" style="--i:0"><div style="--c:#00d639"><span>Paid</span><strong data-key="iv-paid" data-count="' + s.paid + '">$0</strong></div>' +
      '<div style="--c:#f5b342"><span>Outstanding</span><strong data-key="iv-pend" data-count="' + s.pending + '">$0</strong></div>' +
      '<div style="--c:#ff5d5d"><span>Overdue</span><strong data-key="iv-over" data-count="' + s.overdue + '">$0</strong></div></div>' +
      '<div class="lv-card lv-table" style="--i:1"><div class="lv-filters" id="lvFilters">' + chipsHtml() + '</div>' +
      '<div class="lv-trow lv-thead"><span>Invoice</span><span>Client</span><span>Due</span><span>Status</span><span style="text-align:right">Amount</span><span></span></div>' +
      '<div id="lvRows">' + rowsHtml() + '</div></div>';
  }

  function groups() {
    const g = {};
    inv.forEach((i) => { (g[i.client] = g[i.client] || { name: i.client, billed: 0, paid: 0, pending: 0, overdue: 0, n: 0 }); const o = g[i.client]; o.billed += i.amt; o[i.st] += i.amt; o.n++; });
    return Object.values(g).sort((a, b) => b.billed - a.billed);
  }
  function clientStatus(c) {
    if (c.overdue) return ['is-late', c.overdue ? money(c.overdue) + ' overdue' : ''];
    if (c.pending) return ['is-owed', money(c.pending) + ' due'];
    return ['is-clear', 'All paid'];
  }
  function detailHtml(c) {
    const col = COLORS[c.name] || '#00d639';
    const pct = Math.round(c.paid / c.billed * 100);
    const st = clientStatus(c);
    const rows = inv.filter((i) => i.client === c.name).map((i) => '<div class="lv-drow"><span class="mono-lv">#' + i.id + '</span><span>' + i.due + '</span>' + pill(i.st) + '<span class="mono-lv">' + money2(i.amt) + '</span></div>').join('');
    return '<div class="lv-dhead"><span class="lv-av lg" style="--c:' + col + '">' + initial(c.name) + '</span><div><b>' + c.name + '</b><small>' + c.n + ' invoice' + (c.n > 1 ? 's' : '') + ' · grouped automatically</small></div><i class="lv-cbadge ' + st[0] + '">' + st[1] + '</i></div>' +
      '<div class="lv-dgrid"><div class="lv-dring">' + ring(pct, 46, 116) + '<div><strong data-key="cd-pct" data-fmt="pct" data-count="' + pct + '">0%</strong><span>collected</span></div></div>' +
      '<div class="lv-dstats"><div><i style="background:#8b949c"></i><span>Billed</span><b data-key="cd-b" data-count="' + c.billed + '">$0</b></div>' +
      '<div><i style="background:#00d639"></i><span>Paid</span><b data-key="cd-p" data-count="' + c.paid + '">$0</b></div>' +
      '<div><i style="background:' + (c.overdue ? '#ff5d5d' : '#f5b342') + '"></i><span>Outstanding</span><b class="' + (c.overdue ? 'is-late' : c.pending ? 'is-owed' : 'is-clear') + '" data-key="cd-o" data-count="' + (c.pending + c.overdue) + '">$0</b></div></div></div>' +
      '<div class="lv-dlabel">Invoices</div><div class="lv-dlist">' + rows + '</div>';
  }
  function viewClients() {
    const gs = groups();
    if (!selClient || !gs.some((g) => g.name === selClient)) selClient = gs[0].name;
    const items = gs.map((c) => {
      const st = clientStatus(c);
      return '<button type="button" class="lv-citem' + (c.name === selClient ? ' is-on' : '') + '" data-client="' + c.name + '"><span class="lv-av" style="--c:' + (COLORS[c.name] || '#00d639') + '">' + initial(c.name) + '</span><div><b>' + c.name + '</b><small>' + c.n + ' invoice' + (c.n > 1 ? 's' : '') + '</small></div><i class="lv-cbadge ' + st[0] + '">' + st[1] + '</i></button>';
    }).join('');
    return '<div class="lv-cm"><div class="lv-clist" style="--i:0"><div class="lv-clist-head"><span>Clients</span><em>' + gs.length + '</em></div>' + items + '</div>' +
      '<div class="lv-card lv-cdetail" id="lvCDetail" style="--i:1">' + detailHtml(gs.find((g) => g.name === selClient)) + '</div></div>';
  }
  function selectClient(name) {
    selClient = name;
    pane.querySelectorAll('.lv-citem').forEach((b) => b.classList.toggle('is-on', b.dataset.client === name));
    ['cd-pct', 'cd-b', 'cd-p', 'cd-o'].forEach((k) => delete shown[k]);
    const d = $('lvCDetail');
    d.innerHTML = detailHtml(groups().find((g) => g.name === name));
    d.classList.remove('is-fresh'); void d.offsetWidth; d.classList.add('is-fresh');
    animateIn(d);
  }

  function viewReports() {
    const s = sums();
    const buckets = [['Not due yet', 0, '#00d639'], ['1–30 days late', 0, '#f5b342'], ['31–60 days late', 0, '#ff8a3d'], ['60+ days late', 0, '#ff5d5d']];
    inv.forEach((i) => {
      if (i.st === 'paid') return;
      const a = i.age == null ? -1 : i.age;
      buckets[a <= 0 ? 0 : a <= 30 ? 1 : a <= 60 ? 2 : 3][1] += i.amt;
    });
    const unpaid = Math.max(1, buckets.reduce((a, b) => a + b[1], 0));
    const aging = buckets.map((b, i) => '<div class="lv-arow"><span>' + b[0] + '<b data-key="rp-a' + i + '" data-count="' + b[1] + '">$0</b></span><div class="lv-track"><i style="--c:' + b[2] + '" data-w="' + (b[1] / unpaid * 100).toFixed(0) + '%"></i></div></div>').join('');
    const pct = Math.round(s.paid / s.total * 100);
    const top = groups().slice(0, 3);
    const mx = top[0].billed;
    const tops = top.map((c) => '<div class="lv-trk"><span class="lv-av" style="--c:' + (COLORS[c.name] || '#00d639') + '">' + initial(c.name) + '</span><div><b>' + c.name + '<em>' + money(c.billed) + '</em></b><div class="lv-track"><i style="--c:' + (COLORS[c.name] || '#00d639') + '" data-w="' + (c.billed / mx * 100).toFixed(0) + '%"></i></div></div></div>').join('');
    return '<div class="lv-rgrid">' +
      '<div class="lv-card" style="--i:0"><div class="lv-card-head"><span>Who owes you</span></div><div class="lv-aging">' + aging + '</div></div>' +
      '<div class="lv-card lv-donut" style="--i:1">' + ring(pct, 52, 132) + '<div class="lv-donut-c"><strong data-key="rp-pct" data-fmt="pct" data-count="' + pct + '">0%</strong><span>collected</span></div><small>' + money(s.paid) + ' of ' + money(s.total) + '</small></div>' +
      '<div class="lv-card" style="--i:2"><div class="lv-card-head"><span>Top clients</span></div><div class="lv-top3">' + tops + '</div></div></div>';
  }
  const VIEWS = { overview: viewOverview, invoices: viewInvoices, clients: viewClients, reports: viewReports };

  function render(animate) {
    if (animate) Object.keys(shown).forEach((k) => { if (k.indexOf('lvP') !== 0) delete shown[k]; });
    pane.innerHTML = VIEWS[tab]();
    pane.classList.remove('is-swap');
    if (animate) { void pane.offsetWidth; pane.classList.add('is-swap'); }
    animateIn(pane);
    events.forEach((e) => { delete e.isNew; });
  }

  // ---- phone (kept in sync with the same data) ----
  let notifTimer;
  function renderPhone() {
    const s = sums();
    const set = (id, v) => { const n = $(id); n.dataset.key = id; n.dataset.count = v; countUp(n); };
    set('lvPDue', s.pending + s.overdue); set('lvPPaid', s.paid); set('lvPTotal', s.total);
    $('lvPBar').style.width = (s.paid / s.total * 100).toFixed(0) + '%';
    $('lvPList').innerHTML = inv.slice(0, 3).map((i) => '<div class="lv-pit"><span class="lv-av" style="--c:' + (COLORS[i.client] || '#00d639') + '">' + initial(i.client) + '</span><div><b>' + i.client + '</b><small>#' + i.id + ' · due ' + i.due + '</small></div><div class="lv-pr"><em>' + money(i.amt) + '</em><i class="lv-pchip is-' + i.st + '">' + { paid: 'Paid', pending: 'Sent', overdue: 'Overdue' }[i.st] + '</i></div></div>').join('');
  }
  function notify(title, sub, ico, color) {
    const n = $('lvNotif');
    $('lvNotifT').textContent = title;
    $('lvNotifS').textContent = sub;
    const ic = $('lvNotifIco');
    ic.textContent = ico; ic.style.background = color || '';
    n.classList.add('is-on');
    const bell = document.querySelector('.lv-bell');
    bell.classList.add('is-on');
    bell.classList.remove('is-ring'); void bell.offsetWidth; bell.classList.add('is-ring');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => n.classList.remove('is-on'), 3200);
  }

  // ---- actions (used by both the visitor and the scripted tour) ----
  function markPaid(id) {
    const i = inv.find((x) => x.id === id);
    if (!i || i.st === 'paid') return;
    i.st = 'paid'; delete i.age; delete i.reminded;
    events.unshift({ t: i.client + ' paid', s: i.id + ' · ' + money(i.amt), w: 'just now', c: '#00d639', isNew: true });
    if (tab === 'invoices') {
      const s = sums();
      $('lvFilters').innerHTML = chipsHtml();
      $('lvRows').innerHTML = rowsHtml();
      const row = pane.querySelector('[data-row="' + id + '"]');
      if (row) { row.classList.add('lv-flash'); const p = row.querySelector('.lv-pill'); if (p) p.classList.add('is-pop'); }
      [['iv-paid', s.paid], ['iv-pend', s.pending], ['iv-over', s.overdue]].forEach(([k, v]) => {
        const n = pane.querySelector('[data-key="' + k + '"]'); n.dataset.count = v; countUp(n);
      });
    } else render(false);
    renderPhone();
    notify(i.client + ' paid', i.id + ' · ' + money(i.amt), '✓');
  }
  function remind(id) {
    const i = inv.find((x) => x.id === id);
    if (!i || i.reminded) return;
    i.reminded = true;
    events.unshift({ t: 'Reminder ready for ' + i.client, s: i.id + ' · opens in your email app', w: 'just now', c: '#f5b342', isNew: true });
    if (tab === 'invoices') { $('lvRows').innerHTML = rowsHtml(); const row = pane.querySelector('[data-row="' + id + '"]'); if (row) row.classList.add('lv-flash'); }
    notify('Reminder ready', i.client + ' · opens in your email app', '✉', '#f5b342');
  }

  // ---- navigation ----
  function setTab(t) {
    tab = t;
    tabBtns.forEach((b) => {
      const on = b.dataset.tab === t, idx = TABS.indexOf(b.dataset.tab);
      b.classList.toggle('is-active', on);
      b.classList.toggle('is-done', idx < TABS.indexOf(t));
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) { b.style.setProperty('--dur', DUR[t] + 'ms'); const u = b.querySelector('.lv-tab-bar u'); u.style.animation = 'none'; void u.offsetWidth; u.style.animation = ''; }
    });
    sideBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.tab === t));
    $('lvTitle').textContent = META[t][0];
    $('lvSub').textContent = META[t][1];
    cursor.classList.remove('is-on');
    render(true);
  }

  // ---- tour (cancellable, pausable) ----
  const CANCEL = { cancelled: true };
  let tour = 0, offscreen = true, hovering = false, lastUser = 0, resumeT = 0;
  const held = () => hovering || Date.now() - lastUser < 12000;
  const paused = () => offscreen || document.hidden || held();
  const syncHeld = () => live.classList.toggle('is-held', paused());
  async function sleep(ms, id) {
    let left = ms;
    while (left > 0) {
      if (id !== tour) throw CANCEL;
      syncHeld();
      if (!paused()) left -= 100;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (id !== tour) throw CANCEL;
  }
  function posIn(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== app) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return [x, y];
  }
  async function moveTo(el, id, ox, oy) {
    const [x, y] = posIn(el);
    cursor.classList.add('is-on');
    cursor.style.transform = 'translate(' + (x + el.offsetWidth * (ox == null ? .5 : ox)) + 'px,' + (y + el.offsetHeight * (oy == null ? .5 : oy)) + 'px)';
    await sleep(950, id);
  }
  async function click(el, id) {
    cursor.classList.remove('is-click'); void cursor.offsetWidth; cursor.classList.add('is-click');
    if (el) { el.classList.add('is-press'); setTimeout(() => el.classList.remove('is-press'), 160); }
    await sleep(280, id);
  }

  const SCRIPT = {
    async overview(id) { await sleep(DUR.overview, id); },
    async invoices(id) {
      await sleep(1300, id);
      let b = pane.querySelector('[data-act="paid"][data-id="BZ-2049"]');
      if (b) { await moveTo(b, id); await click(b, id); markPaid('BZ-2049'); }
      await sleep(2000, id);
      const r = pane.querySelector('[data-act="remind"][data-id="BZ-2046"]');
      if (r) { await moveTo(r, id); await click(r, id); remind('BZ-2046'); }
      await sleep(2600, id);
      const chip = pane.querySelector('[data-filter="paid"]');
      if (chip) { await moveTo(chip, id); await click(chip, id); filter = 'paid'; $('lvFilters').innerHTML = chipsHtml(); $('lvRows').innerHTML = rowsHtml(); }
      await sleep(1600, id);
    },
    async clients(id) {
      await sleep(1200, id);
      for (const name of ['Almass Retail Co.', 'Kestrel & Co', 'Northwind Studio']) {
        const b = pane.querySelector('[data-client="' + name + '"]');
        if (!b) continue;
        await moveTo(b, id, .5, .5); await click(b, id);
        selectClient(name);
        await sleep(1400, id);
      }
    },
    async reports(id) { await sleep(DUR.reports, id); },
  };
  async function runTour(startIdx) {
    const id = ++tour;
    try {
      let k = startIdx || 0;
      for (;;) {
        const t = TABS[k % TABS.length];
        if (t === 'overview' && k > 0 && k % TABS.length === 0) { resetData(); renderPhone(); }
        setTab(t);
        await SCRIPT[t](id);
        k++;
      }
    } catch (e) { if (e !== CANCEL) throw e; }
  }
  function userTouched() {
    lastUser = Date.now();
    tour++;                                   // cancel the scripted tour
    cursor.classList.remove('is-on');
    clearTimeout(resumeT);
    const wait = () => {
      if (hovering || Date.now() - lastUser < 12000 || offscreen) { resumeT = setTimeout(wait, 1500); return; }
      runTour((TABS.indexOf(tab) + 1));
    };
    resumeT = setTimeout(wait, 12000);
    syncHeld();
  }

  // ---- visitor interaction ----
  function go(t) { userTouched(); setTab(t); }
  tabBtns.forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  sideBtns.forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  pane.addEventListener('click', (e) => {
    const cl = e.target.closest('[data-client]');
    if (cl) { userTouched(); selectClient(cl.dataset.client); return; }
    const f = e.target.closest('[data-filter]');
    if (f) { userTouched(); filter = f.dataset.filter; $('lvFilters').innerHTML = chipsHtml(); $('lvRows').innerHTML = rowsHtml(); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    userTouched();
    if (a.dataset.act === 'paid') markPaid(a.dataset.id); else remind(a.dataset.id);
  });
  live.addEventListener('pointerenter', () => { hovering = true; syncHeld(); });
  live.addEventListener('pointerleave', () => { hovering = false; syncHeld(); });

  // ---- 3D tilt: rises into place on scroll, leans toward the pointer ----
  let ticking = false;
  function tilt() {
    ticking = false;
    if (compact || reduceMotion) { laptop.style.setProperty('--rx', 0); laptop.style.setProperty('--ry', 0); return; }
    const r = stage.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
    laptop.style.setProperty('--rx', ((1 - p) * 16 + py * -3).toFixed(2));
    laptop.style.setProperty('--ry', (px * 5).toFixed(2));
  }
  let px = 0, py = 0;
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(tilt); } };
  window.addEventListener('scroll', kick, { passive: true });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; kick();
  });
  stage.addEventListener('pointerleave', () => { px = py = 0; kick(); });

  // ---- boot ----
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(() => { layout(); kick(); }).observe(stage);
  else window.addEventListener('resize', () => { layout(); kick(); });
  resetData();
  renderPhone();
  setTab('overview');
  tilt();
  document.addEventListener('visibilitychange', syncHeld);

  let started = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        offscreen = !e.isIntersecting;
        syncHeld();
        if (e.isIntersecting && !started && !reduceMotion) { started = true; runTour(0); }
      });
    }, { threshold: 0.25 }).observe(stage);
  } else if (!reduceMotion) { offscreen = false; started = true; runTour(0); }
})();
})();
