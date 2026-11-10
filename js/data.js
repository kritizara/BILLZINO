/**
 * TEMPORARY local data layer, backed by localStorage. Every function here
 * has the exact shape a future Supabase call will have (same args, same
 * return shape) — swapping the auth/data backend later means rewriting
 * the bodies of these functions, not any of the code that calls them.
 *
 * Schema (all arrays; every row carries userId like a future FK column):
 *   billzino-clients:  { id, userId, name, company, createdAt }
 *   billzino-invoices: { id, schemaVersion, userId, clientId, clientName,
 *     clientCompany, docType, invoiceNumber, currency, currencyAfter,
 *     lineItems:[{name,qty,rate,amount}], subtotal, discountPct, discountAmt,
 *     taxPct, taxAmt, shippingAmt, total, issueDate, dueDate, paid, paidAt,
 *     createdAt }
 */
(function (global) {
  const CLIENTS_KEY = 'billzino-clients';
  const INVOICES_KEY = 'billzino-invoices';

  function readAll(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }
  function writeAll(key, rows) {
    localStorage.setItem(key, JSON.stringify(rows));
  }
  function normalize(s) {
    return String(s || '').trim().toLowerCase();
  }

  function getClients(userId) {
    return readAll(CLIENTS_KEY).filter((c) => c.userId === userId);
  }

  // Finds an existing client for this user by normalized name ALONE, or
  // creates one. Returns the client row (with its id). Matching on name
  // only (not the free-text company/address block too) is deliberate:
  // that block is retyped by hand on every invoice and never comes out
  // byte-identical (different whitespace, the email present one time and
  // not the next, address reworded...) — matching on it would fork every
  // invoice to "GLS PRO LLC" into its own separate "client" the moment
  // anything but the name changed. The name is the one field a real user
  // actually reuses consistently, so it's the only thing that has to match.
  function upsertClient(userId, name, company, email) {
    const clients = readAll(CLIENTS_KEY);
    const existing = clients.find((c) => c.userId === userId && normalize(c.name) === normalize(name));
    if (existing) {
      let changed = false;
      if (email && !existing.email) { existing.email = email; changed = true; }
      if (company && !existing.company) { existing.company = company; changed = true; }
      if (changed) writeAll(CLIENTS_KEY, clients);
      return existing;
    }
    const client = {
      id: crypto.randomUUID(),
      userId,
      name: name || 'Unnamed client',
      company: company || '',
      email: email || '',
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    writeAll(CLIENTS_KEY, clients);
    return client;
  }

  function getInvoices(userId) {
    return readAll(INVOICES_KEY).filter((i) => i.userId === userId);
  }

  function getClientInvoices(userId, clientId) {
    return getInvoices(userId).filter((i) => i.clientId === clientId);
  }

  // `row` is everything serializeInvoice() produces except id/clientId/
  // schemaVersion/createdAt/paid/paidAt, which this function fills in.
  // `sent` marks whether this save came from the "Send invoice" button
  // (opened the client's email) vs. a plain "Save only".
  function saveInvoice(userId, row, sent) {
    const client = upsertClient(userId, row.clientName, row.clientCompany, row.clientEmail);
    const invoices = readAll(INVOICES_KEY);
    const invoice = Object.assign({}, row, {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      userId,
      clientId: client.id,
      paid: false,
      paidAt: null,
      sent: !!sent,
      createdAt: new Date().toISOString(),
    });
    invoices.push(invoice);
    writeAll(INVOICES_KEY, invoices);
    return invoice;
  }

  function setInvoicePaid(invoiceId, paid) {
    const invoices = readAll(INVOICES_KEY);
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return null;
    invoice.paid = paid;
    invoice.paidAt = paid ? new Date().toISOString() : null;
    writeAll(INVOICES_KEY, invoices);
    return invoice;
  }

  // "Paid" is a real field; "Overdue" vs "Pending" is always derived from
  // the due date so there's no separate status to fall out of sync.
  function invoiceStatus(invoice) {
    if (invoice.paid) return 'paid';
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return 'overdue';
    return 'pending';
  }

  // Seeds 10 realistic, varied invoices/clients so a fresh test account can
  // see what a busy dashboard looks like. Exposed both as a console helper
  // (billzinoDebug.seed(userId)) and behind the "Load sample invoices"
  // button in Settings.
  global.billzinoDebug = {
    seed(userId) {
      const now = Date.now();
      const day = 86400000;
      const companies = [
        { name: 'Northwind Studio', company: 'Northwind Studio\n55 Harbor Rd, Boston, MA', email: 'billing@northwindstudio.com', num: 'BZ-3001', rate: 2400, daysFromNow: -40, sent: true, paid: true },
        { name: 'Almass Retail Co.', company: 'Almass Retail Co.\nRue 12, Casablanca, Morocco', email: 'contact@almassretail.ma', num: 'BZ-3002', rate: 890, daysFromNow: -15, sent: false, paid: false },
        { name: 'Blue Horizon Marketing', company: 'Blue Horizon Marketing\n200 5th Ave, New York, NY', email: 'hello@bluehorizon.io', num: 'BZ-3003', rate: 1750, daysFromNow: 25, sent: false, paid: false },
        { name: 'Atlas Construction Group', company: 'Atlas Construction Group\n14 Industrial Blvd, Houston, TX', email: 'billing@atlasconstruction.com', num: 'BZ-3004', rate: 5200, daysFromNow: -60, sent: false, paid: true },
        { name: 'Nova Design Studio', company: 'Nova Design Studio\n9 Creative Ln, Austin, TX', email: 'nova@novadesign.co', num: 'BZ-3005', rate: 640, daysFromNow: 10, sent: false, paid: false },
        { name: 'Prime Logistics FZE', company: 'Prime Logistics FZE\nJebel Ali, Dubai, UAE', email: 'accounts@primelogistics.ae', num: 'BZ-3006', rate: 3100, daysFromNow: 30, sent: false, paid: false },
        { name: 'Cedar & Co Consulting', company: 'Cedar & Co Consulting\n88 Bay St, Toronto, ON', email: 'info@cedarco.com', num: 'BZ-3007', rate: 1200, daysFromNow: -5, sent: false, paid: true },
        { name: 'Sahara Textiles SARL', company: 'Sahara Textiles SARL\nZone Industrielle, Tanger, Morocco', email: 'finance@saharatextiles.ma', num: 'BZ-3008', rate: 4300, daysFromNow: 45, sent: true, paid: false },
        { name: 'Velox Software Inc', company: 'Velox Software Inc\n300 Market St, San Francisco, CA', email: 'billing@veloxsoft.com', num: 'BZ-3009', rate: 980, daysFromNow: -22, sent: true, paid: true },
        { name: 'Orion Media Group', company: 'Orion Media Group\n12 Broadcast Way, Los Angeles, CA', email: 'ap@orionmedia.tv', num: 'BZ-3010', rate: 2650, daysFromNow: 60, sent: true, paid: false },
      ];
      companies.forEach((c) => {
        const issueDate = new Date(now + (c.daysFromNow - 20) * day).toISOString().slice(0, 10);
        const dueDate = new Date(now + c.daysFromNow * day).toISOString().slice(0, 10);
        const invoice = saveInvoice(
          userId,
          {
            clientName: c.name,
            clientCompany: `${c.company}\n${c.email}`,
            clientEmail: c.email,
            fromName: 'Nova Studio LLC',
            docType: 'Invoice',
            invoiceNumber: c.num,
            currency: '$',
            currencyAfter: false,
            lineItems: [
              { name: 'Website design', qty: 1, rate: c.rate, amount: c.rate },
              { name: 'Social templates (10)', qty: 1, rate: 450, amount: 450 },
            ],
            subtotal: c.rate + 450,
            discountPct: 0,
            discountAmt: 0,
            taxPct: 0,
            taxAmt: 0,
            shippingAmt: 0,
            total: c.rate + 450,
            issueDate,
            dueDate,
          },
          c.sent
        );
        if (c.paid) setInvoicePaid(invoice.id, true);
      });
      console.log('Seeded 10 test invoices for', userId);
    },
    clear() {
      localStorage.removeItem(CLIENTS_KEY);
      localStorage.removeItem(INVOICES_KEY);
      console.log('Cleared dashboard test data.');
    },
  };

  global.billzinoData = {
    getClients,
    getClientInvoices,
    getInvoices,
    saveInvoice,
    setInvoicePaid,
    invoiceStatus,
  };
})(window);
