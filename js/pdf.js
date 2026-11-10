/**
 * Regenerates an invoice PDF from a stored data object (the same shape
 * serializeInvoice() in main.js produces) — used by the dashboard's
 * "View PDF" action, where there's no live builder DOM to read from.
 *
 * Deliberately does NOT draw a logo, signature, or stamp: those are only
 * ever available as data: URLs while the invoice is open in the builder,
 * and storing them for every saved invoice would risk blowing localStorage's
 * ~5-10MB per-origin quota after a handful of invoices. Everything else
 * (parties, line items, totals, notes/terms/bank, accent color) is stored
 * and reproduced faithfully.
 */
(function (global) {
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
      document.head.appendChild(script);
    });
    return jsPdfLoadPromise;
  }

  function hexToRgb(hex) {
    const h = (hex || '#00d639').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function formatMoney(value, currency, currencyAfter) {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currencyAfter ? `${sign}${abs} ${currency}` : `${sign}${currency}${abs}`;
  }

  async function renderInvoicePdfFromData(inv) {
    const dark = [26, 29, 31];
    const title = [13, 15, 16];
    const muted = [156, 163, 175];
    const bodyMuted = [107, 114, 128];
    const accentRgb = hexToRgb(inv.accent);
    const accentBgRgb = hexToRgb(inv.accentBg);
    const liveTextRgb = hexToRgb(inv.textColor || '#ffffff');

    const pdf = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const MARGIN = 50;
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const RIGHT = PAGE_W - MARGIN;
    const CONTENT_W = RIGHT - MARGIN;
    let y = MARGIN;

    // Invoice meta (top-right) — no logo, since it's never stored
    const metaRows = [
      ['Invoice #', inv.invoiceNumber],
      ['Issue date', inv.issueDate],
      ['Due date', inv.dueDate],
    ].filter(([, v]) => v);
    let metaY = y + 8;
    pdf.setFontSize(9);
    metaRows.forEach(([label, value]) => {
      const labelText = `${label}   `;
      pdf.setFont('helvetica', 'bold');
      const valueW = pdf.getTextWidth(value);
      pdf.setFont('helvetica', 'normal');
      const labelW = pdf.getTextWidth(labelText);
      pdf.setTextColor(...muted);
      pdf.text(labelText, RIGHT - labelW - valueW, metaY);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...dark);
      pdf.text(value, RIGHT, metaY, { align: 'right' });
      metaY += 14;
    });
    y += Math.max(metaY - y, 20) + 16;

    pdf.setFillColor(...accentBgRgb);
    pdf.rect(MARGIN, y, CONTENT_W, 3, 'F');
    y += 26;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...title);
    pdf.text(inv.docType || 'Invoice', MARGIN, y);
    y += 34;

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

    const y1 = drawParty(MARGIN, 'Bill from', inv.fromName, inv.fromCompany);
    const y2 = drawParty(col2X, 'Bill to', inv.clientName, inv.clientCompany);
    y = Math.max(y1, y2) + 16;

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

    (inv.lineItems || []).forEach((item, i) => {
      if (y > PAGE_H - 140) {
        pdf.addPage();
        y = MARGIN;
      }
      if (i % 2 === 1) {
        pdf.setFillColor(245, 246, 247);
        pdf.rect(MARGIN - 6, y - 14, CONTENT_W + 12, 24, 'F');
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...dark);
      pdf.text(item.name || '', MARGIN, y);
      pdf.setTextColor(...bodyMuted);
      pdf.text(String(item.qty ?? ''), colQtyX, y, { align: 'right' });
      pdf.text(formatMoney(item.rate || 0, inv.currency, inv.currencyAfter), colRateX, y, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...dark);
      pdf.text(formatMoney(item.amount || 0, inv.currency, inv.currencyAfter), RIGHT, y, { align: 'right' });

      y += 10;
      pdf.setDrawColor(241, 242, 243);
      pdf.setLineWidth(0.5);
      pdf.line(MARGIN, y, RIGHT, y);
      y += 18;
    });
    y += 8;

    const totalsX = RIGHT - 200;
    function totalsRow(label, value) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...bodyMuted);
      pdf.text(label, totalsX, y);
      pdf.text(value, RIGHT, y, { align: 'right' });
      y += 18;
    }
    totalsRow('Subtotal', formatMoney(inv.subtotal || 0, inv.currency, inv.currencyAfter));
    if (inv.discountAmt) totalsRow('Discount', formatMoney(inv.discountAmt, inv.currency, inv.currencyAfter));
    if (inv.taxAmt) totalsRow('Tax', formatMoney(inv.taxAmt, inv.currency, inv.currencyAfter));
    if (inv.shippingAmt) totalsRow('Shipping', formatMoney(inv.shippingAmt, inv.currency, inv.currencyAfter));
    y += 4;
    pdf.setFillColor(...accentBgRgb);
    pdf.roundedRect(totalsX - 12, y - 14, 212, 26, 4, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...liveTextRgb);
    pdf.text('Amount due', totalsX, y + 3);
    pdf.text(formatMoney(inv.total || 0, inv.currency, inv.currencyAfter), RIGHT, y + 3, { align: 'right' });
    y += 42;

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
    drawLabelBlock('Notes', inv.notes);
    if (inv.hasTerms) drawLabelBlock('Terms & conditions', inv.terms);
    drawLabelBlock('Bank account details', inv.bankDetails);
    y = leftY + 10;

    if ((inv.footerParts || []).length) {
      const footerBarH = 28;
      const footerY = Math.max(y, PAGE_H - MARGIN - footerBarH);
      pdf.setFillColor(246, 247, 248);
      pdf.roundedRect(MARGIN, footerY, CONTENT_W, footerBarH, 6, 6, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...bodyMuted);
      pdf.text(inv.footerParts.join('     ·     '), PAGE_W / 2, footerY + 18, { align: 'center' });
    }

    return pdf;
  }

  global.billzinoPdf = { loadJsPdf, renderInvoicePdfFromData };
})(window);
