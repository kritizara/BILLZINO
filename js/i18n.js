/* BillZino — builder translations (fr / de / es). English is the default and needs no entries. */
(function () {
  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var D = {
    fr: {
      locale: 'fr-FR',
      docs: { 'Invoice': 'Facture', 'Tax Invoice': 'Facture TVA', 'Quote': 'Devis', 'Receipt': 'Reçu', 'Estimate': 'Estimation', 'Proforma Invoice': 'Facture proforma', 'Deposit Invoice': 'Facture d’acompte' },
      more: 'Plus', preparing: 'Préparation…', downloaded: 'Téléchargé ✓', tryAgain: 'Réessayer', saved: 'Enregistré ✓',
      itemName: 'Nom de l’article', removeLine: 'Supprimer la ligne',
      toastSaved: 'Enregistré dans votre tableau de bord ✓',
      toastSend: 'Enregistré — joignez le PDF téléchargé dans votre application e-mail',
      needCompany: 'le nom de votre entreprise', needClient: 'le nom de votre client', needItem: 'au moins une ligne avec un prix',
      needMsg: 'Ajoutez {list} d’abord', and: ' et ',
      pdfItem: 'ARTICLE', pdfQty: 'QTÉ', pdfRate: 'PRIX', pdfAmount: 'MONTANT', pdfDue: 'Total à payer', pdfSign: 'Signature autorisée',
      mailSubject: '{doc} {num} de {from}',
      mailBody: 'Bonjour {client},\n\nVeuillez trouver ci-joint {doc} {num} d’un montant de {amount}{due}\n\nNous venons de télécharger le PDF à joindre — il devrait se trouver dans votre dossier Téléchargements.\n\nCordialement,\n{from}',
      mailDue: ', à régler avant le {date}.', mailNoDue: '.'
    },
    de: {
      locale: 'de-DE',
      docs: { 'Invoice': 'Rechnung', 'Tax Invoice': 'Steuerrechnung', 'Quote': 'Angebot', 'Receipt': 'Quittung', 'Estimate': 'Kostenvoranschlag', 'Proforma Invoice': 'Proforma-Rechnung', 'Deposit Invoice': 'Anzahlungsrechnung' },
      more: 'Mehr', preparing: 'Wird vorbereitet…', downloaded: 'Heruntergeladen ✓', tryAgain: 'Erneut versuchen', saved: 'Gespeichert ✓',
      itemName: 'Artikelname', removeLine: 'Position entfernen',
      toastSaved: 'In Ihrem Dashboard gespeichert ✓',
      toastSend: 'Gespeichert — hängen Sie das heruntergeladene PDF in Ihrer E-Mail-App an',
      needCompany: 'Ihren Firmennamen', needClient: 'den Namen Ihres Kunden', needItem: 'mindestens eine Position mit Preis',
      needMsg: 'Bitte zuerst {list} ergänzen', and: ' und ',
      pdfItem: 'POSITION', pdfQty: 'MENGE', pdfRate: 'PREIS', pdfAmount: 'BETRAG', pdfDue: 'Fälliger Betrag', pdfSign: 'Unterschrift',
      mailSubject: '{doc} {num} von {from}',
      mailBody: 'Guten Tag {client},\n\nanbei finden Sie {doc} {num} über {amount}{due}\n\nWir haben das PDF soeben heruntergeladen, damit Sie es anhängen können — es liegt in Ihrem Download-Ordner.\n\nMit freundlichen Grüßen\n{from}',
      mailDue: ', fällig am {date}.', mailNoDue: '.'
    },
    es: {
      locale: 'es-ES',
      docs: { 'Invoice': 'Factura', 'Tax Invoice': 'Factura con IVA', 'Quote': 'Presupuesto', 'Receipt': 'Recibo', 'Estimate': 'Estimación', 'Proforma Invoice': 'Factura proforma', 'Deposit Invoice': 'Factura de anticipo' },
      more: 'Más', preparing: 'Preparando…', downloaded: 'Descargado ✓', tryAgain: 'Reintentar', saved: 'Guardado ✓',
      itemName: 'Nombre del artículo', removeLine: 'Quitar línea',
      toastSaved: 'Guardado en su panel ✓',
      toastSend: 'Guardado — adjunte el PDF descargado en su aplicación de correo',
      needCompany: 'el nombre de su empresa', needClient: 'el nombre de su cliente', needItem: 'al menos un concepto con precio',
      needMsg: 'Primero añada {list}', and: ' y ',
      pdfItem: 'CONCEPTO', pdfQty: 'CANT.', pdfRate: 'PRECIO', pdfAmount: 'IMPORTE', pdfDue: 'Total a pagar', pdfSign: 'Firma autorizada',
      mailSubject: '{doc} {num} de {from}',
      mailBody: 'Hola {client}:\n\nAdjunto {doc} {num} por importe de {amount}{due}\n\nAcabamos de descargar el PDF para que lo adjunte — debería estar en su carpeta de Descargas.\n\nUn saludo,\n{from}',
      mailDue: ', con vencimiento el {date}.', mailNoDue: '.'
    }
  };
  var L = D[lang] || null;
  var api = {
    lang: lang,
    on: !!L,
    locale: L ? L.locale : 'en-US',
    commaDecimal: !!L,
    t: function (key, fallback) { return (L && L[key] != null) ? L[key] : fallback; },
    doc: function (code) { return (L && L.docs[code]) || code; },
    code: function (text) {
      if (!L) return text;
      for (var k in L.docs) { if (L.docs[k] === text) return k; }
      return text;
    },
    fill: function (tpl, vars) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; }); }
  };
  window.bzI18n = api;
})();
