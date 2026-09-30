/* Billing: overview, invoices, invoice detail, payments, subscriptions, transactions. */
(function () {
  'use strict';
  const { esc, daysUntil, uid } = Util;
  const icon = Icons.icon;

  function header(root, opts) {
    root.innerHTML = View.pageHeader({ title: opts.title, description: opts.description, crumbs: [['Billing', 'billing/index.html']].concat(opts.crumbs || [[opts.crumb || opts.title]]), actions: opts.actions }) + '<div id="page-body"></div>';
    return root.querySelector('#page-body');
  }

  function isOpen(inv) { return ['Unpaid', 'Overdue'].indexOf(Services.invoiceStatus(inv)) !== -1; }

  function invoiceDoc(inv) {
    const profile = Store.get('profile');
    const total = Services.invoiceTotal(inv);
    const status = Services.invoiceStatus(inv);
    return '<div class="invoice-doc">' +
      '<div class="invoice-head"><div><h2>Invoice ' + esc(inv.id) + '</h2><p class="muted mb-0">Issued ' + fmt.date(inv.date) + ' - Due ' + fmt.date(inv.due) + '</p></div>' +
      '<div class="text-right"><span class="watermark">' + esc(status) + '</span>' + (inv.paidOn ? '<p class="muted small mt-8 mb-0">Paid ' + fmt.date(inv.paidOn) + ' via ' + esc(inv.method) + '</p>' : '') + '</div></div>' +
      '<div class="invoice-parties">' +
        '<div><h4>Billed to</h4><strong>' + esc(profile.company) + '</strong><br>' + esc(profile.name) + '<br>' + esc(profile.address) + '<br>' + esc(profile.city) + ' ' + esc(profile.postcode) + '<br>' + esc(profile.country) + (profile.vatNumber ? '<br>VAT ' + esc(profile.vatNumber) : '') + '</div>' +
        '<div><h4>From</h4><strong>H&amp;R Portal (Demo Environment)</strong><br>Fictional provider for demonstration<br>No real charges are made<br>Customer ' + esc(profile.customerId) + '</div>' +
      '</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Description</th><th class="align-right">Amount</th></tr></thead><tbody>' +
        inv.items.map((i) => '<tr><td>' + esc(i.description) + '</td><td class="align-right nowrap">' + fmt.money(i.amount) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<dl class="kv invoice-totals"><div class="kv-row"><dt>Subtotal</dt><dd class="text-right">' + fmt.money(total) + '</dd></div><div class="kv-row"><dt>Tax (0%, demo)</dt><dd class="text-right">' + fmt.money(0) + '</dd></div>' +
        '<div class="kv-row total"><dt>Total</dt><dd class="text-right">' + fmt.money(total) + '</dd></div>' +
        '<div class="kv-row"><dt>Balance due</dt><dd class="text-right">' + fmt.money(isOpen(inv) ? total : 0) + '</dd></div></dl>' +
    '</div>';
  }

  function openInvoiceModal(inv, onChange) {
    UI.modal({
      title: inv.id, subtitle: fmt.money(Services.invoiceTotal(inv)) + ' - ' + Services.invoiceStatus(inv), size: 'lg',
      body: invoiceDoc(inv),
      actions: [
        { label: 'Open full page', variant: 'secondary', onClick: () => { location.href = App.url('billing/invoice.html?id=' + inv.id); } },
        { label: 'Print / PDF', variant: 'secondary', icon: 'printer', onClick: () => { window.print(); return false; } }
      ].concat(isOpen(inv) ? [{ label: 'Pay ' + fmt.money(Services.invoiceTotal(inv)), variant: 'primary', onClick: () => { setTimeout(() => payInvoice(inv, onChange), 0); } }] : [])
    });
  }

  /* Payment flow shared by every page that can pay an invoice. */
  function payInvoice(inv, onDone) {
    const methods = Store.get('paymentMethods');
    const cards = methods.filter((m) => m.type !== 'Bank transfer');
    const credit = Store.get('accountCredit');
    const total = Services.invoiceTotal(inv);
    const defaultMethod = (cards.find((m) => m.isDefault) || cards[0] || {}).id;
    const body = '<p>Invoice <strong>' + esc(inv.id) + '</strong> - ' + inv.items.length + ' item' + (inv.items.length === 1 ? '' : 's') + '</p>' +
      '<form id="pay-form" class="stack">' +
      '<fieldset style="border:0;padding:0;margin:0"><legend class="label mb-8">Payment method</legend><div class="stack" style="--gap:8px">' +
        methods.map((m) => '<label class="radio"><input type="radio" name="method" value="' + m.id + '"' + (m.id === defaultMethod ? ' checked' : '') + '><span><strong>' + esc(Services.paymentMethodLabel(m)) + '</strong><small>' + (m.type === 'Bank transfer' ? 'Manual transfer, 1-3 business days' : 'Expires ' + esc(m.expiry) + ' - ' + esc(m.holder)) + (m.isDefault ? ' - default' : '') + '</small></span></label>').join('') +
      '</div></fieldset>' +
      (credit > 0 ? '<label class="checkbox"><input type="checkbox" name="credit" checked><span>Apply account credit (' + fmt.money(credit) + ')</span></label>' : '') +
      '<div class="record-box" id="pay-summary"></div></form>' + View.demoNote('Demo environment: no payment gateway is contacted and no card is charged.');
    const dialog = UI.modal({
      title: 'Pay invoice', size: 'md', body,
      actions: [{ label: 'Cancel', variant: 'secondary' }, { label: 'Pay now', variant: 'primary', loadingText: 'Processing payment...', onClick: (api) => submit(api) }]
    });
    const form = dialog.el.querySelector('#pay-form');
    const summary = () => {
      const useCredit = form.elements.credit && form.elements.credit.checked;
      const applied = useCredit ? Math.min(credit, total) : 0;
      const method = methods.find((m) => m.id === form.elements.method.value);
      dialog.el.querySelector('#pay-summary').innerHTML = 'Invoice total: ' + fmt.money(total) + (applied ? '<br>Account credit: -' + fmt.money(applied) : '') + '<br><strong>To pay: ' + fmt.money(total - applied) + '</strong>' +
        (method && method.type === 'Bank transfer' ? '<br><br>Bank transfer reference: ' + esc(inv.id) + '<br>The invoice is marked paid when the transfer is received.' : '');
      dialog.button(1).textContent = method && method.type === 'Bank transfer' ? 'Get transfer details' : 'Pay ' + fmt.money(total - applied);
    };
    form.addEventListener('change', summary);
    summary();

    async function submit() {
      const method = methods.find((m) => m.id === form.elements.method.value);
      if (!method) { UI.toast('Select a payment method.', 'error'); return false; }
      const useCredit = form.elements.credit && form.elements.credit.checked;
      const applied = useCredit ? Math.min(credit, total) : 0;
      await Util.delay(1200);
      if (method.type === 'Bank transfer') {
        App.log('Billing', 'Bank transfer instructions requested', inv.id);
        UI.toast('Transfer details saved. Use reference ' + inv.id + '. The invoice stays open until funds arrive.', 'info');
        return true;
      }
      if (applied) {
        Store.set('accountCredit', Math.round((credit - applied) * 100) / 100);
        Store.prepend('transactions', { id: 'TXN-' + String(Date.now() + 1).slice(-6), date: fmt.isoDateTime(App.now()), description: 'Account credit applied to ' + inv.id, type: 'Credit', method: 'Account credit', amount: -applied, status: 'Completed', invoiceId: inv.id });
      }
      const result = Services.payInvoice(inv.id, Services.paymentMethodLabel(method));
      if (window.Shell) Shell.refreshNotifications();
      setTimeout(() => {
        UI.modal({
          title: 'Payment successful', size: 'sm',
          body: '<p>' + fmt.money(total) + ' paid for <strong>' + esc(inv.id) + '</strong> using ' + esc(Services.paymentMethodLabel(method)) + (applied ? ' and ' + fmt.money(applied) + ' account credit' : '') + '.</p>' +
            (result.effects.length ? '<ul class="article-body">' + result.effects.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '') + View.demoNote('Simulated payment. No money was moved.'),
          actions: [{ label: 'Done', variant: 'primary' }],
          onClose: () => { if (onDone) onDone(); }
        });
      }, 0);
      return true;
    }
  }

  /* ---------- Overview ---------- */
  App.page('billing.index', (root) => {
    const body = header(root, { title: 'Billing', crumb: 'Overview', description: 'Balance, upcoming charges, subscriptions and recent transactions.', actions: '<a class="btn btn-secondary" href="' + App.url('billing/payments.html') + '">Payment methods</a><a class="btn btn-primary" href="' + App.url('billing/invoices.html') + '">Invoices</a>' });

    function render() {
      const open = Services.openInvoices();
      const next = open[0];
      const upcoming = Services.upcomingRenewal();
      const subs = Store.get('subscriptions');
      const active = subs.filter((s) => s.status === 'Active');
      const monthly = active.reduce((s, sub) => s + (sub.cycle === 'Monthly' ? sub.price : sub.price / 12), 0);
      const method = Store.get('paymentMethods').find((m) => m.isDefault);
      const txns = Store.get('transactions').slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
      const renewals = subs.filter((s) => s.status !== 'Cancelled' && daysUntil(s.nextRenewal) >= -30 && daysUntil(s.nextRenewal) <= 90).sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
      body.innerHTML =
        (Services.overdueInvoices().length ? View.alert('critical', '<strong>' + Services.overdueInvoices().length + ' overdue invoice' + (Services.overdueInvoices().length === 1 ? '' : 's') + '.</strong> Services linked to overdue invoices are suspended 14 days after the due date.', '<a class="btn btn-primary btn-sm" href="' + App.url('billing/invoices.html?status=Overdue') + '">View overdue</a>') + '<div class="mb-16"></div>' : '') +
        '<div class="grid grid-4 stats-grid">' +
          View.stat({ label: 'Outstanding balance', value: fmt.money(Services.outstanding()), href: 'billing/invoices.html?status=Unpaid', meta: open.length + ' open invoice' + (open.length === 1 ? '' : 's') }) +
          View.stat({ label: 'Upcoming payment', value: next ? fmt.money(Services.invoiceTotal(next)) : fmt.money(0), meta: next ? next.id + ' due ' + fmt.date(next.due) : 'Nothing due' }) +
          View.stat({ label: 'Active subscriptions', value: active.length, href: 'billing/subscriptions.html', meta: fmt.money(monthly) + ' per month on average' }) +
          View.stat({ label: 'Account credit', value: fmt.money(Store.get('accountCredit')), meta: 'Applied to the next payment' }) +
        '</div>' +
        '<div class="grid grid-main section">' +
          View.panel({ title: 'Open invoices', flush: true, actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('billing/invoices.html') + '">All invoices</a>',
            body: open.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Due</th><th class="align-right">Amount</th><th>Status</th><th class="col-actions"></th></tr></thead><tbody>' +
              open.map((inv) => '<tr><td><a class="cell-link" href="' + App.url('billing/invoice.html?id=' + inv.id) + '">' + inv.id + '</a><span class="cell-sub">' + esc(inv.items[0].description) + (inv.items.length > 1 ? ' +' + (inv.items.length - 1) + ' more' : '') + '</span></td><td class="nowrap">' + fmt.date(inv.due) + '</td><td class="align-right">' + fmt.money(Services.invoiceTotal(inv)) + '</td><td>' + View.badge(Services.invoiceStatus(inv)) + '</td>' +
                '<td class="col-actions"><button type="button" class="btn btn-primary btn-xs" data-pay="' + inv.id + '">Pay</button></td></tr>').join('') + '</tbody></table></div>'
              : View.empty({ icon: 'check', title: 'No open invoices', text: 'Your account is fully paid.' }) }) +
          '<div class="stack">' +
            View.panel({ title: 'Default payment method', actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('billing/payments.html') + '">Manage</a>', body: method ? View.kv([['Method', '<strong>' + esc(Services.paymentMethodLabel(method)) + '</strong>'], ['Expires', esc(method.expiry || '-')], ['Holder', esc(method.holder)], ['Automatic payments', Store.ui('autopay') === false ? 'Off' : 'On']]) : View.empty({ title: 'No payment method' }) }) +
            View.panel({ title: 'Next invoice estimate', body: upcoming ? View.kv([['Generated on', fmt.date(upcoming.invoiceDate)], ['Renewal date', fmt.date(upcoming.date)], ['Services', upcoming.subscriptions.map((s) => esc(s.service)).join('<br>')], ['Estimated total', '<strong>' + fmt.money(upcoming.total) + '</strong>']]) : View.empty({ title: 'No upcoming renewals' }) }) +
          '</div>' +
        '</div>' +
        '<div class="grid grid-2 section">' +
          View.panel({ title: 'Recent transactions', flush: true, actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('billing/transactions.html') + '">All transactions</a>',
            body: '<ul class="list">' + txns.map((t) => '<li class="list-item"><span class="list-item-main"><span class="list-item-title">' + esc(t.description) + '</span><span class="list-item-sub">' + fmt.datetime(t.date) + ' - ' + esc(t.method) + '</span></span><span class="list-item-meta"><strong>' + (t.type === 'Refund' ? '-' : '') + fmt.money(Math.abs(t.amount)) + '</strong><br>' + View.badge(t.status) + '</span></li>').join('') + '</ul>' }) +
          View.panel({ title: 'Renewals in the next 90 days', flush: true, actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('billing/subscriptions.html') + '">Subscriptions</a>',
            body: renewals.length ? '<ul class="list">' + renewals.map((s) => '<li class="list-item"><span class="list-item-main"><span class="list-item-title">' + esc(s.service) + '</span><span class="list-item-sub">' + esc(s.plan) + ' - ' + (s.autoRenew ? 'auto-renews' : '<strong>manual renewal</strong>') + '</span></span><span class="list-item-meta">' + fmt.date(s.nextRenewal) + '<br>' + fmt.money(s.price) + '</span></li>').join('') + '</ul>' : View.empty({ title: 'No renewals due' }) }) +
        '</div>';
    }
    body.addEventListener('click', (e) => {
      const pay = e.target.closest('[data-pay]');
      if (pay) payInvoice(Store.find('invoices', pay.dataset.pay), render);
    });
    render();
  });

  /* ---------- Invoices ---------- */
  App.page('billing.invoices', (root) => {
    const body = header(root, { title: 'Invoices', description: 'All invoices for your account. Select an invoice to view line items, print or pay.' });
    body.innerHTML = '<div id="inv-stats"></div><div class="panel section" id="inv-table"></div>';
    const initialStatus = App.param('status') || '';

    function renderStats() {
      const all = Store.get('invoices');
      const paidThisYear = all.filter((i) => i.status === 'Paid' && (i.paidOn || '').slice(0, 4) === String(App.now().getFullYear())).reduce((s, i) => s + Services.invoiceTotal(i), 0);
      body.querySelector('#inv-stats').innerHTML = '<div class="grid grid-4 stats-grid">' +
        View.stat({ label: 'Outstanding', value: fmt.money(Services.outstanding()) }) +
        View.stat({ label: 'Overdue', value: Services.overdueInvoices().length, meta: fmt.money(Services.overdueInvoices().reduce((s, i) => s + Services.invoiceTotal(i), 0)) }) +
        View.stat({ label: 'Paid this year', value: fmt.money(paidThisYear) }) +
        View.stat({ label: 'Total invoices', value: all.length }) + '</div>';
    }

    const table = UI.DataTable(body.querySelector('#inv-table'), {
      data: () => Store.get('invoices'),
      searchKeys: ['id', (i) => i.items.map((x) => x.description).join(' ')],
      searchPlaceholder: 'Search invoice # or item',
      filters: [{ key: 'status', label: 'Status', value: initialStatus, options: ['Unpaid', 'Overdue', 'Paid', 'Cancelled', 'Refunded'], match: (i, v) => Services.invoiceStatus(i) === v }],
      defaultSort: { key: 'date', dir: 'desc' },
      onRowClick: (inv) => openInvoiceModal(inv, refresh),
      toolbar: '<button type="button" class="btn btn-secondary btn-sm" data-export>' + icon('download', 14) + 'Export CSV</button>',
      columns: [
        { key: 'id', label: 'Invoice #', render: (i) => '<span class="cell-main mono">' + i.id + '</span><span class="cell-sub">' + esc(i.items[0].description.slice(0, 48)) + (i.items.length > 1 ? ' +' + (i.items.length - 1) : '') + '</span>' },
        { key: 'date', label: 'Date', render: (i) => '<span class="nowrap">' + fmt.date(i.date) + '</span>' },
        { key: 'due', label: 'Due Date', render: (i) => '<span class="nowrap">' + fmt.date(i.due) + '</span>' + (isOpen(i) ? '<span class="cell-sub">' + (daysUntil(i.due) >= 0 ? 'in ' + daysUntil(i.due) + ' days' : Math.abs(daysUntil(i.due)) + ' days late') + '</span>' : '') },
        { key: 'amount', label: 'Amount', align: 'right', sortValue: (i) => Services.invoiceTotal(i), render: (i) => '<strong>' + fmt.money(Services.invoiceTotal(i)) + '</strong>' },
        { key: 'status', label: 'Status', sortValue: (i) => Services.invoiceStatus(i), render: (i) => View.badge(Services.invoiceStatus(i)) }
      ],
      actions: (i) => [
        { action: 'view', label: 'View', primary: true },
        isOpen(i) ? { action: 'pay', label: 'Pay', primary: true } : null,
        { label: 'Open full page', icon: 'external', href: App.url('billing/invoice.html?id=' + i.id) },
        { action: 'print', label: 'Download PDF', icon: 'printer' }
      ],
      onAction: (action, inv) => {
        if (action === 'view') openInvoiceModal(inv, refresh);
        if (action === 'pay') payInvoice(inv, refresh);
        if (action === 'print') location.href = App.url('billing/invoice.html?id=' + inv.id + '&print=1');
      }
    });

    body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-export]')) return;
      const rows = table.rows();
      Util.downloadText('invoices.csv', Util.toCSV(rows, [
        { label: 'Invoice', key: 'id' }, { label: 'Date', key: 'date' }, { label: 'Due', key: 'due' },
        { label: 'Amount', value: (i) => Services.invoiceTotal(i).toFixed(2) }, { label: 'Status', value: (i) => Services.invoiceStatus(i) }
      ]), 'text/csv');
      UI.toast(rows.length + ' invoices exported.', 'info');
    });

    function refresh() { renderStats(); table.refresh(); Shell.refreshNotifications(); }
    renderStats();
    const id = App.param('id');
    if (id) {
      const inv = Store.find('invoices', id);
      if (inv) openInvoiceModal(inv, refresh); else UI.toast('Invoice ' + id + ' was not found.', 'error');
    }
  });

  /* ---------- Invoice detail ---------- */
  App.page('billing.invoice', (root) => {
    const id = App.param('id');
    function render() {
      const inv = Store.find('invoices', id);
      if (!inv) {
        root.innerHTML = View.pageHeader({ title: 'Invoice not found', crumbs: [['Billing', 'billing/index.html'], ['Invoices', 'billing/invoices.html'], ['Not found']] }) +
          View.panel({ body: View.errorState('Invoice not found', 'No invoice with ID "' + (id || '') + '" exists in this account.') });
        return null;
      }
      const related = inv.items.map((i) => Services.account(i.relatedId) || Store.find('domains', i.relatedId)).filter(Boolean);
      root.innerHTML = View.pageHeader({
        title: 'Invoice ' + inv.id,
        description: fmt.money(Services.invoiceTotal(inv)) + ' - issued ' + fmt.date(inv.date),
        crumbs: [['Billing', 'billing/index.html'], ['Invoices', 'billing/invoices.html'], [inv.id]],
        actions: '<a class="btn btn-secondary" href="' + App.url('billing/invoices.html') + '">' + icon('arrowLeft', 14) + 'All invoices</a>' +
          '<button type="button" class="btn btn-secondary" data-print>' + icon('printer', 14) + 'Print / PDF</button>' +
          (isOpen(inv) ? '<button type="button" class="btn btn-primary" data-pay>' + icon('card', 14) + 'Pay ' + fmt.money(Services.invoiceTotal(inv)) + '</button>' : '')
      }) +
      '<div class="grid grid-main">' + View.panel({ body: invoiceDoc(inv) }) +
        '<div class="stack no-print">' +
          View.panel({ title: 'Status', body: View.kv([['Status', View.badge(Services.invoiceStatus(inv))], ['Due', fmt.date(inv.due) + (isOpen(inv) ? '<span class="cell-sub">' + (daysUntil(inv.due) >= 0 ? 'in ' + daysUntil(inv.due) + ' days' : Math.abs(daysUntil(inv.due)) + ' days overdue') + '</span>' : '')], ['Paid on', inv.paidOn ? fmt.date(inv.paidOn) : '-'], ['Method', esc(inv.method || '-')]]) }) +
          View.panel({ title: 'Related services', flush: true, body: related.length ? '<ul class="list">' + related.map((r) => r.ref
            ? '<li><a class="list-item" href="' + App.url('hosting/accounts.html#' + r.id) + '"><span class="list-icon">' + icon('server', 14) + '</span><span class="list-item-main"><span class="list-item-title">' + esc(r.ref) + '</span><span class="list-item-sub">' + esc(r.primaryDomain) + '</span></span>' + View.badge(r.status) + '</a></li>'
            : '<li><a class="list-item" href="' + App.url('domains/index.html?manage=' + encodeURIComponent(r.name)) + '"><span class="list-icon">' + icon('globe', 14) + '</span><span class="list-item-main"><span class="list-item-title">' + esc(r.name) + '</span><span class="list-item-sub">Expires ' + fmt.date(r.expires) + '</span></span>' + View.badge(Services.domainStatus(r)) + '</a></li>').join('') + '</ul>' : View.empty({ title: 'No linked services' }) }) +
          View.panel({ title: 'Payment history', flush: true, body: (function () {
            const txns = Store.get('transactions').filter((t) => t.invoiceId === inv.id);
            return txns.length ? '<ul class="list">' + txns.map((t) => '<li class="list-item"><span class="list-item-main"><span class="list-item-title">' + esc(t.type) + ' - ' + fmt.money(Math.abs(t.amount)) + '</span><span class="list-item-sub">' + fmt.datetime(t.date) + ' - ' + esc(t.method) + (t.note ? ' - ' + esc(t.note) : '') + '</span></span>' + View.badge(t.status) + '</li>').join('') + '</ul>' : View.empty({ title: 'No payments yet' });
          })() }) +
          '<a class="btn btn-ghost btn-block" href="' + App.url('support/tickets.html?new=1&department=Billing&subject=' + encodeURIComponent('Question about ' + inv.id)) + '">Question about this invoice?</a>' +
        '</div></div>';
      return inv;
    }
    const inv = render();
    if (!inv) return;
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-print]')) window.print();
      if (e.target.closest('[data-pay]')) payInvoice(Store.find('invoices', id), () => { render(); Shell.refreshNotifications(); });
    });
    if (App.param('pay') && isOpen(inv)) { App.setParam('pay', null); payInvoice(inv, () => { render(); Shell.refreshNotifications(); }); }
    if (App.param('print')) { App.setParam('print', null); setTimeout(() => window.print(), 300); }
  });

  /* ---------- Payments ---------- */
  function luhn(number) {
    let sum = 0;
    let alt = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let n = Number(number[i]);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  App.page('billing.payments', (root) => {
    const body = header(root, { title: 'Payments', description: 'Payment history and saved payment methods.', actions: '<button type="button" class="btn btn-primary" data-add-card>' + icon('plus', 14) + 'Add payment method</button>' });
    body.innerHTML = '<div id="methods"></div><div class="panel section" id="pay-table"></div>';
    const payments = () => Store.get('transactions').filter((t) => t.type === 'Payment');

    function renderMethods() {
      const methods = Store.get('paymentMethods');
      const autopay = Store.ui('autopay') !== false;
      body.querySelector('#methods').innerHTML = '<div class="grid grid-main">' +
        View.panel({ title: 'Saved payment methods', flush: true, body: '<ul class="list">' + methods.map((m) =>
          '<li class="list-item"><span class="list-icon">' + icon(m.type === 'Bank transfer' ? 'database' : 'card', 14) + '</span><span class="list-item-main"><span class="list-item-title">' + esc(Services.paymentMethodLabel(m)) + (m.isDefault ? ' ' + View.badge('Default', 'ok') : '') + '</span><span class="list-item-sub">' + (m.expiry ? 'Expires ' + esc(m.expiry) + ' - ' : '') + esc(m.holder) + '</span></span>' +
          UI.menu([{ action: 'default', label: 'Set as default', icon: 'check', disabled: m.isDefault || m.type === 'Bank transfer', data: ' data-method="' + m.id + '"' }, { action: 'remove', label: 'Remove', icon: 'trash', danger: true, disabled: m.isDefault, data: ' data-method="' + m.id + '"' }], { label: 'Actions for ' + Services.paymentMethodLabel(m) }) + '</li>').join('') + '</ul>' }) +
        View.panel({ title: 'Automatic payments', body: '<p>Charge the default method automatically on each invoice due date.</p>' + View.switchControl({ checked: autopay, label: autopay ? 'Enabled' : 'Disabled', data: 'data-autopay' }) + View.demoNote('Card details are never stored or transmitted in the demo; only a label and the last four digits are kept locally.') }) +
        '</div>';
    }

    UI.DataTable(body.querySelector('#pay-table'), {
      data: payments,
      searchKeys: ['id', 'description', 'method', 'invoiceId'],
      searchPlaceholder: 'Search payments',
      filters: [{ key: 'status', label: 'Status', options: ['Completed', 'Failed'] }, { key: 'method', label: 'Method', allLabel: 'All methods', options: Array.from(new Set(Store.get('transactions').filter((t) => t.type === 'Payment').map((t) => t.method))) }],
      defaultSort: { key: 'date', dir: 'desc' },
      columns: [
        { key: 'date', label: 'Date', render: (t) => '<span class="nowrap">' + fmt.datetime(t.date) + '</span>' },
        { key: 'id', label: 'Reference', render: (t) => '<span class="mono">' + t.id + '</span>' },
        { key: 'invoiceId', label: 'Invoice', render: (t) => t.invoiceId ? '<a class="cell-link" href="' + App.url('billing/invoice.html?id=' + t.invoiceId) + '">' + t.invoiceId + '</a>' : '-' },
        { key: 'method', label: 'Method' },
        { key: 'amount', label: 'Amount', align: 'right', render: (t) => '<strong>' + fmt.money(t.amount) + '</strong>' },
        { key: 'status', label: 'Status', render: (t) => View.badge(t.status) + (t.note ? '<span class="cell-sub">' + esc(t.note) + '</span>' : '') }
      ],
      actions: (t) => [{ action: 'receipt', label: 'Receipt', primary: true, disabled: t.status !== 'Completed' }],
      onAction: (action, t) => {
        UI.modal({ title: 'Payment receipt', subtitle: t.id, size: 'sm', body: View.kv([['Date', fmt.datetime(t.date)], ['Description', esc(t.description)], ['Method', esc(t.method)], ['Amount', '<strong>' + fmt.money(t.amount) + '</strong>'], ['Status', View.badge(t.status)]]) + View.demoNote('Demo receipt. No payment was processed.'),
          actions: [{ label: 'Close', variant: 'secondary' }, { label: 'Print', variant: 'primary', icon: 'printer', onClick: () => { window.print(); return false; } }] });
      }
    });

    body.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-action][data-method]');
      if (!el || el.disabled) return;
      const m = Store.find('paymentMethods', el.dataset.method);
      if (el.dataset.action === 'default') {
        Store.update('paymentMethods', (list) => list.forEach((x) => { x.isDefault = x.id === m.id; }));
        App.log('Billing', 'Default payment method changed', Services.paymentMethodLabel(m));
        UI.toast(Services.paymentMethodLabel(m) + ' is now the default payment method.');
        renderMethods();
      }
      if (el.dataset.action === 'remove' && await UI.confirm({ title: 'Remove payment method', message: 'Remove ' + Services.paymentMethodLabel(m) + ' from your account?', confirmLabel: 'Remove', danger: true })) {
        Store.remove('paymentMethods', m.id);
        App.log('Billing', 'Payment method removed', Services.paymentMethodLabel(m));
        UI.toast('Payment method removed.');
        renderMethods();
      }
    });
    body.addEventListener('change', (e) => {
      if (!e.target.matches('[data-autopay]')) return;
      Store.ui('autopay', e.target.checked);
      App.log('Billing', 'Automatic payments ' + (e.target.checked ? 'enabled' : 'disabled'), '');
      UI.toast('Automatic payments ' + (e.target.checked ? 'enabled' : 'disabled') + '.');
      renderMethods();
    });
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-add-card]')) return;
      UI.formModal({
        title: 'Add card',
        intro: 'Use a test number such as 4242 4242 4242 4242. Nothing is sent to a payment processor.',
        fields: [
          { name: 'holder', label: 'Cardholder name', required: true, autocomplete: 'off', value: Store.get('profile').name },
          { name: 'number', label: 'Card number', required: true, autocomplete: 'off', mono: true, placeholder: '4242 4242 4242 4242', validate: (v) => { const n = v.replace(/\s+/g, ''); return /^\d{13,19}$/.test(n) && luhn(n) ? '' : 'Enter a valid card number.'; } },
          { name: 'expiry', label: 'Expiry (MM/YY)', required: true, half: true, autocomplete: 'off', placeholder: '08/29', validate: (v) => {
            const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);
            if (!m) return 'Use MM/YY.';
            const now = App.now();
            const expiry = new Date(2000 + Number(m[2]), Number(m[1]), 0);
            return expiry < now ? 'This card has expired.' : '';
          } },
          { name: 'cvc', label: 'CVC', required: true, half: true, type: 'password', autocomplete: 'off', maxlength: 4, validate: (v) => /^\d{3,4}$/.test(v) ? '' : 'Enter 3 or 4 digits.' },
          { name: 'makeDefault', label: 'Set as default payment method', type: 'checkbox' }
        ],
        submitLabel: 'Save card',
        onSubmit: (values) => {
          const n = values.number.replace(/\s+/g, '');
          const type = /^4/.test(n) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : 'Card';
          const method = { id: uid('pm'), type, last4: n.slice(-4), expiry: values.expiry, holder: values.holder, isDefault: values.makeDefault };
          Store.update('paymentMethods', (list) => { if (values.makeDefault) list.forEach((x) => { x.isDefault = false; }); list.push(method); });
          App.log('Billing', 'Payment method added', Services.paymentMethodLabel(method));
          UI.toast(Services.paymentMethodLabel(method) + ' added.');
          renderMethods();
        }
      });
    });
    renderMethods();
  });

  /* ---------- Subscriptions ---------- */
  App.page('billing.subscriptions', (root) => {
    const body = header(root, { title: 'Subscriptions', description: 'Recurring services, their billing cycles and renewal dates.' });
    body.innerHTML = '<div id="sub-stats"></div><div class="panel section" id="sub-table"></div>';
    const subs = () => Store.get('subscriptions');

    function renderStats() {
      const active = subs().filter((s) => s.status === 'Active');
      const monthly = active.reduce((s, sub) => s + (sub.cycle === 'Monthly' ? sub.price : sub.price / 12), 0);
      body.querySelector('#sub-stats').innerHTML = '<div class="grid grid-4 stats-grid">' +
        View.stat({ label: 'Active', value: active.length }) +
        View.stat({ label: 'Monthly equivalent', value: fmt.money(monthly) }) +
        View.stat({ label: 'Annual equivalent', value: fmt.money(monthly * 12) }) +
        View.stat({ label: 'Manual renewals', value: subs().filter((s) => !s.autoRenew && s.status === 'Active').length, meta: 'Auto-renew disabled' }) + '</div>';
    }

    const table = UI.DataTable(body.querySelector('#sub-table'), {
      data: subs,
      searchKeys: ['service', 'plan', 'category'],
      filters: [{ key: 'category', label: 'Category', allLabel: 'All categories', options: ['Hosting', 'Domain', 'SSL'] }, { key: 'status', label: 'Status', options: ['Active', 'Suspended', 'Cancelled'] }],
      defaultSort: { key: 'nextRenewal', dir: 'asc' },
      columns: [
        { key: 'service', label: 'Service', render: (s) => '<span class="cell-main">' + esc(s.service) + '</span><span class="cell-sub">' + esc(s.category) + '</span>' },
        { key: 'plan', label: 'Plan' },
        { key: 'price', label: 'Price', align: 'right', render: (s) => fmt.money(s.price) },
        { key: 'cycle', label: 'Billing Cycle' },
        { key: 'nextRenewal', label: 'Next Renewal', render: (s) => '<span class="nowrap">' + fmt.date(s.nextRenewal) + '</span><span class="cell-sub">' + (s.status === 'Cancelled' ? 'Will not renew' : daysUntil(s.nextRenewal) >= 0 ? 'in ' + daysUntil(s.nextRenewal) + ' days' : 'past due') + '</span>' },
        { key: 'autoRenew', label: 'Auto-renew', render: (s) => View.switchControl({ checked: s.autoRenew, disabled: s.status === 'Cancelled', data: 'data-sub-renew="' + s.id + '"', srLabel: 'Auto-renew ' + s.service }) },
        { key: 'status', label: 'Status', render: (s) => View.badge(s.status) }
      ],
      actions: (s) => [
        { action: 'renew', label: 'Renew now', primary: true, disabled: s.status === 'Cancelled' },
        { action: 'cycle', label: 'Change billing cycle', icon: 'refresh', disabled: s.category !== 'Hosting' || s.status !== 'Active' },
        { divider: true },
        { action: 'cancel', label: 'Cancel subscription', icon: 'x', danger: true, disabled: s.status === 'Cancelled' }
      ],
      onAction: async (action, s) => {
        if (action === 'renew') {
          const open = Services.openInvoices().find((inv) => inv.items.some((i) => i.relatedId === s.relatedId));
          if (open) { location.href = App.url('billing/invoice.html?id=' + open.id + '&pay=1'); return; }
          const domain = Store.find('domains', s.relatedId);
          if (domain) { const inv = Services.renewDomain(domain, 1); location.href = App.url('billing/invoice.html?id=' + inv.id + '&pay=1'); return; }
          if (!(await UI.confirm({ title: 'Renew ' + s.service, message: 'Create an invoice for ' + fmt.money(s.price) + ' (' + s.cycle.toLowerCase() + ')?', confirmLabel: 'Create invoice' }))) return;
          const inv = Services.createInvoice([{ description: s.plan + ' - ' + s.service + ' renewal from ' + fmt.date(s.nextRenewal), amount: s.price, relatedId: s.relatedId }]);
          location.href = App.url('billing/invoice.html?id=' + inv.id + '&pay=1');
        }
        if (action === 'cycle') {
          const account = Services.account(s.relatedId);
          const plan = account ? Services.plan(account.planId) : null;
          UI.formModal({
            title: 'Change billing cycle', subtitle: s.service,
            fields: [{ name: 'cycle', label: 'Billing cycle', type: 'select', value: s.cycle, options: [{ value: 'Monthly', label: 'Monthly - ' + fmt.money(plan.price) + '/mo' }, { value: 'Annually', label: 'Annually - ' + fmt.money(plan.price * 12) + '/yr' }] }],
            submitLabel: 'Save', intro: 'The new cycle starts at the next renewal on ' + fmt.date(s.nextRenewal) + '.',
            onSubmit: (values) => {
              if (values.cycle === s.cycle) return { field: 'cycle', message: 'Select a different cycle.' };
              const price = values.cycle === 'Monthly' ? plan.price : Math.round(plan.price * 12 * 100) / 100;
              Store.patch('subscriptions', s.id, { cycle: values.cycle, price });
              Store.patch('hostingAccounts', account.id, { billingCycle: values.cycle });
              App.log('Billing', 'Billing cycle changed', s.service + ' to ' + values.cycle.toLowerCase());
              UI.toast('Billing cycle changed to ' + values.cycle.toLowerCase() + '.');
              refresh();
            }
          });
        }
        if (action === 'cancel' && await UI.confirm({ title: 'Cancel subscription', message: s.service + ' will not renew on ' + fmt.date(s.nextRenewal) + '. The service remains available until then.', confirmLabel: 'Cancel subscription', danger: true, requireText: 'CANCEL' })) {
          Store.patch('subscriptions', s.id, { status: 'Cancelled', autoRenew: false });
          const domain = Store.find('domains', s.relatedId);
          if (domain) Store.patch('domains', domain.id, { autoRenew: false });
          App.log('Billing', 'Subscription cancelled', s.service);
          UI.toast('Subscription cancelled.');
          refresh();
        }
      }
    });

    body.addEventListener('change', (e) => {
      const id = e.target.dataset.subRenew;
      if (!id) return;
      const s = Store.patch('subscriptions', id, { autoRenew: e.target.checked });
      const domain = Store.find('domains', s.relatedId);
      if (domain) Store.patch('domains', domain.id, { autoRenew: e.target.checked });
      App.log('Billing', 'Auto-renewal ' + (e.target.checked ? 'enabled' : 'disabled'), s.service);
      UI.toast('Auto-renewal ' + (e.target.checked ? 'enabled' : 'disabled') + ' for ' + s.service + '.');
      renderStats();
    });

    function refresh() { renderStats(); table.refresh(); }
    renderStats();
  });

  /* ---------- Transactions ---------- */
  App.page('billing.transactions', (root) => {
    const body = header(root, { title: 'Transactions', description: 'Every payment, refund and credit on the account.' });
    body.innerHTML = '<div class="panel" id="txn-table"></div>';
    const ranges = { '30': 30, '90': 90, '365': 365 };

    const table = UI.DataTable(body.querySelector('#txn-table'), {
      data: () => Store.get('transactions'),
      searchKeys: ['id', 'description', 'method', 'invoiceId'],
      searchPlaceholder: 'Search transactions',
      pageSize: 10,
      filters: [
        { key: 'type', label: 'Type', options: ['Payment', 'Refund', 'Credit'] },
        { key: 'status', label: 'Status', options: ['Completed', 'Failed', 'Pending'] },
        { key: 'range', label: 'Date range', allLabel: 'All time', options: [{ value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: '365', label: 'Last 12 months' }], match: (t, v) => -daysUntil(t.date) <= ranges[v] }
      ],
      defaultSort: { key: 'date', dir: 'desc' },
      toolbar: '<button type="button" class="btn btn-secondary btn-sm" data-export>' + icon('download', 14) + 'Export CSV</button>',
      columns: [
        { key: 'id', label: 'Transaction', render: (t) => '<span class="mono">' + t.id + '</span>' },
        { key: 'date', label: 'Date', render: (t) => '<span class="nowrap">' + fmt.datetime(t.date) + '</span>' },
        { key: 'description', label: 'Description', render: (t) => esc(t.description) + (t.note ? '<span class="cell-sub">' + esc(t.note) + '</span>' : '') },
        { key: 'type', label: 'Type' },
        { key: 'method', label: 'Method' },
        { key: 'amount', label: 'Amount', align: 'right', render: (t) => '<strong class="nowrap">' + (t.type === 'Refund' || t.amount < 0 ? '-' : t.type === 'Credit' ? '+' : '') + fmt.money(Math.abs(t.amount)) + '</strong>' },
        { key: 'status', label: 'Status', render: (t) => View.badge(t.status) }
      ],
      onRowClick: (t) => {
        UI.modal({ title: t.id, subtitle: t.type, size: 'sm', body: View.kv([['Date', fmt.datetime(t.date)], ['Description', esc(t.description)], ['Method', esc(t.method)], ['Amount', fmt.money(t.amount)], ['Status', View.badge(t.status)], ['Invoice', t.invoiceId ? '<a href="' + App.url('billing/invoice.html?id=' + t.invoiceId) + '">' + t.invoiceId + '</a>' : '-'], t.note ? ['Note', esc(t.note)] : null]) });
      }
    });

    body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-export]')) return;
      const rows = table.rows();
      Util.downloadText('transactions.csv', Util.toCSV(rows, [
        { label: 'Transaction', key: 'id' }, { label: 'Date', key: 'date' }, { label: 'Description', key: 'description' }, { label: 'Type', key: 'type' },
        { label: 'Method', key: 'method' }, { label: 'Amount', value: (t) => t.amount.toFixed(2) }, { label: 'Status', key: 'status' }, { label: 'Invoice', key: 'invoiceId' }
      ]), 'text/csv');
      UI.toast(rows.length + ' transactions exported.', 'info');
    });
  });
})();
