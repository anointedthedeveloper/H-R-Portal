/* Domains: list, registration search, DNS, nameservers, transfers, WHOIS. */
(function () {
  'use strict';
  const { esc, daysUntil, uid } = Util;
  const icon = Icons.icon;

  const HOST_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}\.?$/i;
  const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const IPV6_RE = /^(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|([0-9a-f]{1,4}:){1,7}:|([0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|([0-9a-f]{1,4}:){1,5}(:[0-9a-f]{1,4}){1,2}|([0-9a-f]{1,4}:){1,4}(:[0-9a-f]{1,4}){1,3}|([0-9a-f]{1,4}:){1,3}(:[0-9a-f]{1,4}){1,4}|([0-9a-f]{1,4}:){1,2}(:[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:(:[0-9a-f]{1,4}){1,6}|:((:[0-9a-f]{1,4}){1,7}|:))$/i;
  const NO_PRIVACY_TLDS = ['.ng', '.com.ng', '.co.uk'];
  const DEFAULT_NS = ['ns1.examplehost.com', 'ns2.examplehost.com'];

  function domainLink(name, path) {
    return App.url(path + (path.indexOf('?') === -1 ? '?' : '&') + 'domain=' + encodeURIComponent(name));
  }

  function privacySupported(domain) {
    return NO_PRIVACY_TLDS.indexOf(Services.tldOf(domain.name)) === -1;
  }

  function domainSelectHTML(current, list) {
    return '<label class="sr-only" for="domain-select">Domain</label><select id="domain-select" class="select">' +
      View.options((list || Services.manageableDomains()).map((d) => ({ value: d.name, label: d.name })), current.name) + '</select>';
  }

  function hashOf(text) {
    let h = 7;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h;
  }

  /* Mock registry availability: deterministic so repeated searches agree. */
  function availability(fqdn) {
    const owned = Services.domain(fqdn);
    if (owned) return { available: false, reason: 'In your account' };
    const tld = Services.tldOf(fqdn);
    const label = fqdn.slice(0, -tld.length);
    const h = hashOf(fqdn);
    if (tld === '.com' && (label.length <= 10 || h % 2 === 0)) return { available: false, reason: 'Registered' };
    if (tld !== '.com' && h % 9 === 0) return { available: false, reason: 'Registered' };
    const premium = label.length <= 3;
    return { available: true, premium };
  }

  /* ---------- Shared modals ---------- */
  function openManage(domain, onChange) {
    const status = Services.domainStatus(domain);
    const hosting = domain.hostingId ? Services.account(domain.hostingId) : null;
    const pending = /^Pending/.test(domain.status);
    const privacyOk = privacySupported(domain);
    const dialog = UI.modal({
      title: domain.name,
      subtitle: 'Domain management',
      size: 'lg',
      body:
        '<div class="grid grid-2">' +
          '<div>' + View.kv([
            ['Status', View.badge(status)],
            ['Registrar', esc(domain.registrar)],
            ['Registered', fmt.date(domain.registered)],
            ['Expires', fmt.date(domain.expires) + ' <span class="muted">(' + (daysUntil(domain.expires) >= 0 ? 'in ' + daysUntil(domain.expires) + ' days' : 'expired') + ')</span>'],
            ['Renewal price', fmt.money(domain.renewalPrice) + ' / year'],
            ['Nameservers', domain.nameservers.map(esc).join('<br>')],
            ['Linked hosting', hosting ? '<a href="' + App.url('hosting/accounts.html#' + hosting.id) + '">' + esc(Services.accountLabel(hosting)) + '</a>' : 'None']
          ]) + '</div>' +
          '<div><h3 class="panel-title mb-8">Settings</h3><div class="stack" id="manage-toggles">' +
            toggleRow('autoRenew', 'Auto-renewal', 'Renew automatically 14 days before expiry using the default payment method.', domain.autoRenew, pending) +
            toggleRow('privacy', 'WHOIS privacy protection', privacyOk ? 'Replace registrant contact details in public WHOIS with proxy details.' : 'Not offered by the ' + Services.tldOf(domain.name) + ' registry.', domain.privacy && privacyOk, pending || !privacyOk) +
            toggleRow('locked', 'Transfer lock', 'Prevents the domain from being transferred to another registrar.', domain.locked, pending) +
            toggleRow('dnssec', 'DNSSEC', 'Sign the DNS zone and publish DS records at the registry.', domain.dnssec, pending) +
          '</div></div>' +
        '</div>' + (pending ? View.demoNote('Settings become available after the pending operation completes.') : ''),
      actions: [
        { label: 'WHOIS', variant: 'secondary', onClick: () => { location.href = domainLink(domain.name, 'domains/whois.html'); } },
        pending ? null : { label: 'Nameservers', variant: 'secondary', onClick: () => { location.href = domainLink(domain.name, 'domains/nameservers.html'); } },
        pending ? null : { label: 'DNS records', variant: 'secondary', onClick: () => { location.href = domainLink(domain.name, 'domains/dns.html'); } },
        pending ? null : { label: 'Renew', variant: 'primary', onClick: () => { setTimeout(() => openRenew(domain), 0); } }
      ].filter(Boolean)
    });
    dialog.el.querySelector('#manage-toggles').addEventListener('change', (e) => {
      const key = e.target.name;
      const value = e.target.checked;
      Store.patch('domains', domain.id, { [key]: value });
      domain[key] = value;
      const labels = { autoRenew: 'Auto-renewal', privacy: 'WHOIS privacy', locked: 'Transfer lock', dnssec: 'DNSSEC' };
      App.log('Domains', labels[key] + (value ? ' enabled' : ' disabled'), domain.name);
      if (key === 'autoRenew') Store.update('subscriptions', (list) => list.forEach((s) => { if (s.relatedId === domain.id) s.autoRenew = value; }));
      UI.toast(labels[key] + (value ? ' enabled' : ' disabled') + ' for ' + domain.name + '.');
      if (onChange) onChange();
    });
  }

  function toggleRow(name, label, hint, checked, disabled) {
    return '<div class="flex-between"><div><strong>' + esc(label) + '</strong><p class="hint">' + esc(hint) + '</p></div>' +
      View.switchControl({ name, checked, disabled, srLabel: label }) + '</div>';
  }

  function openRenew(domain) {
    const openInvoice = Services.openInvoices().find((inv) => inv.items.some((i) => i.relatedId === domain.id && /renewal/i.test(i.description)));
    if (openInvoice) {
      UI.modal({
        title: 'Renewal already invoiced',
        size: 'sm',
        body: '<p>' + esc(domain.name) + ' is included in open invoice <strong>' + openInvoice.id + '</strong> (' + fmt.money(Services.invoiceTotal(openInvoice)) + ', due ' + fmt.date(openInvoice.due) + '). Pay that invoice to complete the renewal.</p>',
        actions: [{ label: 'Close', variant: 'secondary' }, { label: 'View invoice', variant: 'primary', onClick: () => { location.href = App.url('billing/invoice.html?id=' + openInvoice.id + '&pay=1'); } }]
      });
      return;
    }
    const price = domain.renewalPrice;
    const expired = daysUntil(domain.expires) < 0;
    UI.formModal({
      title: (expired ? 'Restore ' : 'Renew ') + domain.name,
      intro: 'Current expiry: <strong>' + fmt.date(domain.expires) + '</strong>. ' + (expired ? 'The domain is in its grace period; renewing restores it from today.' : 'Renewal years are added to the current expiry date.'),
      fields: [
        { name: 'years', label: 'Renewal period', type: 'select', value: '1', options: [1, 2, 3, 5].map((y) => ({ value: y, label: y + ' year' + (y > 1 ? 's' : '') + ' - ' + fmt.money(price * y) })) },
        { name: 'summary', type: 'static', label: 'New expiry date', html: '<strong id="renew-new-expiry"></strong>' }
      ],
      submitLabel: 'Create invoice',
      onChange: (values, form) => {
        const base = expired ? fmt.isoDate(App.now()) : domain.expires;
        form.querySelector('#renew-new-expiry').textContent = fmt.date(Util.addYears(base, Number(values.years)));
      },
      onSubmit: (values) => {
        const invoice = Services.renewDomain(domain, Number(values.years));
        setTimeout(() => {
          UI.modal({
            title: 'Invoice ' + invoice.id + ' created',
            size: 'sm',
            body: '<p>The renewal for <strong>' + esc(domain.name) + '</strong> has been added to invoice ' + invoice.id + ' (' + fmt.money(Services.invoiceTotal(invoice)) + '). The domain is renewed as soon as the invoice is paid.</p>',
            actions: [{ label: 'Pay later', variant: 'secondary' }, { label: 'Pay now', variant: 'primary', onClick: () => { location.href = App.url('billing/invoice.html?id=' + invoice.id + '&pay=1'); } }]
          });
        }, 0);
      }
    });
  }

  /* ---------- My Domains ---------- */
  App.page('domains.index', (root) => {
    const domains = () => Store.get('domains');
    root.innerHTML = View.pageHeader({
      title: 'My Domains',
      description: 'Registration status, renewal and protection settings for every domain in your account.',
      crumbs: [['Domains', 'domains/index.html'], ['My Domains']],
      actions: '<a class="btn btn-secondary" href="' + App.url('domains/transfer.html') + '">Transfer domain</a><a class="btn btn-primary" href="' + App.url('domains/search.html') + '">' + icon('plus', 14) + 'Register domain</a>'
    }) + '<div id="domain-stats"></div><div class="panel section" id="domains-table"></div>';

    function renderStats() {
      const list = domains();
      const by = (s) => list.filter((d) => Services.domainStatus(d) === s).length;
      root.querySelector('#domain-stats').innerHTML = '<div class="grid grid-4 stats-grid">' +
        View.stat({ label: 'Total domains', value: list.length, meta: list.filter((d) => /^Pending/.test(d.status)).length + ' pending' }) +
        View.stat({ label: 'Active', value: by('Active') + by('Expiring Soon'), meta: by('Expiring Soon') + ' expiring within 30 days' }) +
        View.stat({ label: 'Expired', value: by('Expired'), meta: 'Restorable during grace period' }) +
        View.stat({ label: 'Auto-renew off', value: list.filter((d) => !d.autoRenew).length, meta: 'Renew manually before expiry' }) + '</div>';
    }

    const table = UI.DataTable(root.querySelector('#domains-table'), {
      data: domains,
      searchPlaceholder: 'Search domains',
      searchKeys: ['name', 'registrar'],
      selectable: true,
      bulkActions: [{ action: 'renew-on', label: 'Enable auto-renew' }, { action: 'renew-off', label: 'Disable auto-renew' }],
      filters: [
        { key: 'status', label: 'Status', options: ['Active', 'Expiring Soon', 'Expired', 'Pending Transfer', 'Pending Registration'], match: (row, v) => Services.domainStatus(row) === v },
        { key: 'tld', label: 'TLD', allLabel: 'All TLDs', options: Array.from(new Set(Store.get('domains').map((d) => Services.tldOf(d.name)))), match: (row, v) => Services.tldOf(row.name) === v }
      ],
      defaultSort: { key: 'expires', dir: 'asc' },
      columns: [
        { key: 'name', label: 'Domain', render: (d) => '<button type="button" class="link-btn cell-main" data-action="manage">' + esc(d.name) + '</button>' + (d.hostingId ? '<span class="cell-sub">' + esc(Services.account(d.hostingId).ref) + '</span>' : '<span class="cell-sub">No hosting</span>') },
        { key: 'status', label: 'Status', render: (d) => View.badge(Services.domainStatus(d)), sortValue: (d) => Services.domainStatus(d) },
        { key: 'registered', label: 'Registration Date', render: (d) => fmt.date(d.registered) },
        { key: 'expires', label: 'Expiry Date', render: (d) => { const days = daysUntil(d.expires); return '<span class="nowrap">' + fmt.date(d.expires) + '</span><span class="cell-sub">' + (days >= 0 ? days + ' days left' : 'Expired ' + Math.abs(days) + ' days ago') + '</span>'; } },
        { key: 'autoRenew', label: 'Auto Renew', render: (d) => View.switchControl({ checked: d.autoRenew, disabled: /^Pending/.test(d.status), data: 'data-autorenew="' + d.id + '"', srLabel: 'Auto-renew ' + d.name }) },
        { key: 'privacy', label: 'Privacy', render: (d) => privacySupported(d) ? (d.privacy ? 'Protected' : '<strong>Public</strong>') : '<span class="muted" data-tooltip="Not offered by this registry">N/A</span>' }
      ],
      actions: (d) => {
        const pending = /^Pending/.test(d.status);
        return [
          { action: 'manage', label: 'Manage', primary: true },
          pending ? null : { label: 'DNS', primary: true, href: domainLink(d.name, 'domains/dns.html') },
          { action: 'renew', label: Services.domainStatus(d) === 'Expired' ? 'Restore' : 'Renew', icon: 'refresh', disabled: pending },
          { label: 'Transfer', icon: 'external', href: domainLink(d.name, 'domains/transfer.html?tab=out'), disabled: pending },
          { label: 'WHOIS', icon: 'info', href: domainLink(d.name, 'domains/whois.html') },
          { label: 'Nameservers', icon: 'server', href: domainLink(d.name, 'domains/nameservers.html'), disabled: pending },
          { divider: true },
          { action: 'lock', label: d.locked ? 'Remove transfer lock' : 'Enable transfer lock', icon: d.locked ? 'unlock' : 'lock', disabled: pending }
        ];
      },
      onAction: (action, d) => {
        if (action === 'manage') openManage(d, refresh);
        if (action === 'renew') openRenew(d);
        if (action === 'lock') {
          const locked = !d.locked;
          const apply = () => {
            Store.patch('domains', d.id, { locked });
            App.log('Domains', 'Transfer lock ' + (locked ? 'enabled' : 'disabled'), d.name);
            UI.toast('Transfer lock ' + (locked ? 'enabled' : 'removed') + ' for ' + d.name + '.');
            refresh();
          };
          if (locked) apply();
          else UI.confirm({ title: 'Remove transfer lock', message: 'Without the lock, ' + d.name + ' can be transferred to another registrar with its authorisation code.', confirmLabel: 'Remove lock', danger: true }).then((ok) => { if (ok) apply(); });
        }
      },
      onBulk: (action, rows) => {
        const value = action === 'renew-on';
        const eligible = rows.filter((d) => !/^Pending/.test(d.status));
        Store.update('domains', (list) => list.forEach((d) => { if (eligible.some((r) => r.id === d.id)) d.autoRenew = value; }));
        App.log('Domains', 'Auto-renewal ' + (value ? 'enabled' : 'disabled'), eligible.map((d) => d.name).join(', '));
        UI.toast('Auto-renewal ' + (value ? 'enabled' : 'disabled') + ' for ' + eligible.length + ' domain' + (eligible.length === 1 ? '' : 's') + '.');
        table.clearSelection();
        refresh();
      }
    });

    root.querySelector('#domains-table').addEventListener('change', (e) => {
      const id = e.target.dataset && e.target.dataset.autorenew;
      if (!id) return;
      const d = Store.find('domains', id);
      Store.patch('domains', id, { autoRenew: e.target.checked });
      Store.update('subscriptions', (list) => list.forEach((s) => { if (s.relatedId === id) s.autoRenew = e.target.checked; }));
      App.log('Domains', 'Auto-renewal ' + (e.target.checked ? 'enabled' : 'disabled'), d.name);
      UI.toast('Auto-renewal ' + (e.target.checked ? 'enabled' : 'disabled') + ' for ' + d.name + '.');
      renderStats();
    });

    function refresh() { renderStats(); table.refresh(); }
    renderStats();

    const manage = App.param('manage');
    const renew = App.param('renew');
    if (manage && Services.domain(manage)) openManage(Services.domain(manage), refresh);
    if (renew && Services.domain(renew)) openRenew(Services.domain(renew));
  });

  /* ---------- Domain search / registration ---------- */
  App.page('domains.search', (root) => {
    const tlds = ['.com', '.net', '.org', '.ng', '.com.ng', '.io', '.co', '.dev', '.africa'];
    root.innerHTML = View.pageHeader({
      title: 'Register a Domain',
      description: 'Check availability across popular extensions. Results are simulated in this demo; no registry is queried.',
      crumbs: [['Domains', 'domains/index.html'], ['Register Domain']]
    }) +
    '<div class="grid grid-main">' +
      '<div class="stack">' +
        View.panel({ body:
          '<form id="search-form" novalidate><label class="label mb-8" for="domain-query">Find a domain name</label>' +
          '<div class="search-hero"><input id="domain-query" class="input" placeholder="e.g. mybusiness or mybusiness.ng" autocomplete="off" spellcheck="false">' +
          '<button class="btn btn-primary btn-lg" type="submit">' + icon('search', 15) + 'Search</button></div>' +
          '<p class="field-error mt-8" id="search-error" role="alert"></p></form>' }) +
        '<div id="search-results" aria-live="polite"></div>' +
        View.panel({ title: 'Extension pricing', subtitle: 'Prices per year, excluding tax', flush: true, body:
          '<div class="table-wrap"><table class="table"><thead><tr><th>Extension</th><th class="align-right">Register</th><th class="align-right">Renew</th><th class="align-right">Transfer</th></tr></thead><tbody>' +
          Store.get('tldPricing').map((p) => '<tr><td><strong>' + p.tld + '</strong></td><td class="align-right">' + fmt.money(p.register) + '</td><td class="align-right">' + fmt.money(p.renew) + '</td><td class="align-right">' + (p.transfer ? fmt.money(p.transfer) : '<span class="muted">Free</span>') + '</td></tr>').join('') +
          '</tbody></table></div>' }) +
      '</div>' +
      '<div id="cart-panel"></div>' +
    '</div>';

    const input = root.querySelector('#domain-query');
    const results = root.querySelector('#search-results');
    const errorEl = root.querySelector('#search-error');
    input.focus();

    function cart() { return Store.get('cart'); }

    function renderCart() {
      const items = cart();
      const total = items.reduce((s, i) => s + i.price * i.years, 0);
      root.querySelector('#cart-panel').innerHTML = View.panel({
        title: 'Cart',
        subtitle: items.length + ' item' + (items.length === 1 ? '' : 's'),
        body: items.length ? items.map((i) =>
          '<div class="cart-line"><div><strong>' + esc(i.domain) + '</strong><span class="cell-sub">Registration</span></div>' +
          '<div class="flex"><select class="select select-sm" data-cart-years="' + esc(i.domain) + '" aria-label="Years for ' + esc(i.domain) + '">' + View.options([1, 2, 3, 5].map((y) => ({ value: y, label: y + ' yr' })), i.years) + '</select>' +
          '<span class="nowrap strong">' + fmt.money(i.price * i.years) + '</span>' +
          '<button type="button" class="icon-btn icon-btn-sm" data-cart-remove="' + esc(i.domain) + '" aria-label="Remove ' + esc(i.domain) + '">' + icon('x', 14) + '</button></div></div>').join('') +
          '<hr>' + View.kv([['WHOIS privacy', 'Included where supported'], ['DNS hosting', 'Included'], ['Total', '<strong>' + fmt.money(total) + '</strong>']])
          : View.empty({ icon: 'cart', title: 'Your cart is empty', text: 'Search for a domain and add available names here.' }),
        footer: items.length ? '<button type="button" class="btn btn-ghost btn-sm" data-cart-clear>Clear cart</button><button type="button" class="btn btn-primary" data-checkout>Checkout</button>' : ''
      });
    }

    function inCart(name) { return cart().some((i) => i.domain === name); }

    function resultRow(fqdn, primary) {
      const tld = Services.tldOf(fqdn);
      const status = availability(fqdn);
      const price = Services.priceFor(tld);
      const register = status.premium ? price.register * 12 : price.register;
      return '<div class="domain-result' + (status.available ? '' : ' unavailable') + (primary ? ' primary-result' : '') + '">' +
        '<span class="name">' + esc(fqdn) + (status.premium ? ' <span class="badge badge-neutral">Premium</span>' : '') + '</span>' +
        (status.available ? View.badge('Available') : View.badge(status.reason === 'In your account' ? 'In your account' : 'Unavailable', 'neutral')) +
        '<span class="price">' + (status.available ? fmt.money(register) + '<small>renews at ' + fmt.money(price.renew) + '/yr</small>' : '<small>&nbsp;</small>') + '</span>' +
        (status.available
          ? (inCart(fqdn) ? '<button type="button" class="btn btn-secondary btn-sm" data-cart-remove="' + esc(fqdn) + '">' + icon('check', 14) + 'In cart</button>'
            : '<button type="button" class="btn btn-primary btn-sm" data-add="' + esc(fqdn) + '" data-price="' + register + '">' + icon('cart', 14) + 'Add to cart</button>')
          : '<a class="btn btn-secondary btn-sm" href="' + domainLink(fqdn, 'domains/whois.html') + '">WHOIS</a>') +
        '</div>';
    }

    let lastQuery = '';
    async function search(raw) {
      let query = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      errorEl.textContent = '';
      if (!query) { errorEl.textContent = 'Enter a name to search.'; input.focus(); return; }
      let label = query;
      let requestedTld = null;
      const matchedTld = Store.get('tldPricing').map((p) => p.tld).sort((a, b) => b.length - a.length).find((t) => query.endsWith(t) && query.length > t.length);
      if (matchedTld) { requestedTld = matchedTld; label = query.slice(0, -matchedTld.length); }
      else if (query.indexOf('.') !== -1) { errorEl.textContent = 'That extension is not offered. Search without an extension to see all options.'; return; }
      if (!LABEL_RE.test(label)) { errorEl.textContent = 'Use letters, numbers and hyphens only (no spaces), and do not start or end with a hyphen.'; return; }
      lastQuery = query;
      App.setParam('q', query);
      results.innerHTML = View.panel({ title: 'Checking availability...', body: View.skeleton(5) });
      await Util.delay(650);
      const primaryTld = requestedTld || '.com';
      const list = [label + primaryTld].concat(tlds.filter((t) => t !== primaryTld).map((t) => label + t));
      const suggestions = ['get' + label + '.com', label + 'hq.com', label + '-online.com', label + 'group.net'].filter((s) => LABEL_RE.test(s.split('.')[0]));
      results.innerHTML = View.panel({
        title: 'Results for "' + label + '"',
        subtitle: list.filter((f) => availability(f).available).length + ' of ' + list.length + ' extensions available',
        flush: true,
        body: list.map((f, i) => resultRow(f, i === 0)).join('')
      }) + '<div class="section">' + View.panel({ title: 'Suggestions', flush: true, body: suggestions.map((s) => resultRow(s)).join('') }) + '</div>' +
      View.demoNote('Availability is simulated and deterministic for the demo. No registry or WHOIS server is queried.');
    }

    root.querySelector('#search-form').addEventListener('submit', (e) => { e.preventDefault(); search(input.value); });

    root.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) {
        Store.update('cart', (list) => { list.push({ domain: add.dataset.add, price: Number(add.dataset.price), years: 1 }); });
        UI.toast(add.dataset.add + ' added to cart.');
        renderCart(); if (lastQuery) search(lastQuery);
        return;
      }
      const remove = e.target.closest('[data-cart-remove]');
      if (remove) {
        Store.update('cart', (list) => list.filter((i) => i.domain !== remove.dataset.cartRemove));
        renderCart(); if (lastQuery && results.querySelector('[data-cart-remove="' + remove.dataset.cartRemove + '"]')) search(lastQuery);
        return;
      }
      if (e.target.closest('[data-cart-clear]')) {
        Store.set('cart', []); renderCart(); if (lastQuery) search(lastQuery);
        return;
      }
      if (e.target.closest('[data-checkout]')) checkout();
    });
    root.addEventListener('change', (e) => {
      const years = e.target.dataset && e.target.dataset.cartYears;
      if (!years) return;
      Store.update('cart', (list) => list.forEach((i) => { if (i.domain === years) i.years = Number(e.target.value); }));
      renderCart();
    });

    function checkout() {
      const items = cart();
      const total = items.reduce((s, i) => s + i.price * i.years, 0);
      const profile = Store.get('profile');
      UI.formModal({
        title: 'Checkout',
        intro: 'Domains are registered to <strong>' + esc(profile.company) + '</strong> using your account contact details.',
        fields: [
          { name: 'summary', type: 'static', label: 'Order', html: items.map((i) => esc(i.domain) + ' - ' + i.years + ' yr - ' + fmt.money(i.price * i.years)).join('<br>') + '<br><strong>Total ' + fmt.money(total) + '</strong>' },
          { name: 'hosting', label: 'Point new domains to', type: 'select', options: [{ value: '', label: 'Default nameservers, no hosting' }].concat(Services.accountOptions()) },
          { name: 'terms', label: 'I agree to the registration agreement and the registry policies for these extensions.', type: 'checkbox', validate: (v) => v ? '' : 'You must accept the registration agreement.' }
        ],
        submitLabel: 'Place order',
        loadingText: 'Placing order...',
        onSubmit: (values) => {
          if (!values.terms) return { field: 'terms', message: 'You must accept the registration agreement.' };
          const today = fmt.isoDate(App.now());
          const created = items.map((i) => ({
            id: uid('d'), name: i.domain, status: 'Pending Registration', registered: today, expires: Util.addYears(today, i.years),
            autoRenew: true, privacy: NO_PRIVACY_TLDS.indexOf(Services.tldOf(i.domain)) === -1, locked: true, hostingId: values.hosting || null,
            registrar: 'Demo Registrar Services', nameservers: DEFAULT_NS.slice(), customNameservers: false, dnssec: false,
            renewalPrice: Services.priceFor(Services.tldOf(i.domain)).renew
          }));
          Store.update('domains', (list) => { created.forEach((d) => list.push(d)); });
          const invoice = Services.createInvoice(created.map((d, idx) => ({
            description: 'Domain registration - ' + d.name + ' (' + items[idx].years + ' year' + (items[idx].years > 1 ? 's' : '') + ')',
            amount: Math.round(items[idx].price * items[idx].years * 100) / 100,
            relatedId: d.id
          })), { dueDays: 3 });
          App.log('Domains', 'Domain order placed', created.map((d) => d.name).join(', '));
          Store.set('cart', []);
          setTimeout(() => { location.href = App.url('billing/invoice.html?id=' + invoice.id + '&pay=1'); }, 200);
        }
      });
    }

    renderCart();
    const initial = App.param('q');
    if (initial) { input.value = initial; search(initial); }
  });

  /* ---------- DNS ---------- */
  const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'];
  const TTL_OPTIONS = [{ value: 300, label: '5 minutes (300)' }, { value: 1800, label: '30 minutes (1800)' }, { value: 3600, label: '1 hour (3600)' }, { value: 14400, label: '4 hours (14400)' }, { value: 86400, label: '1 day (86400)' }];
  const TYPE_HINTS = {
    A: 'IPv4 address, e.g. 203.0.113.24', AAAA: 'IPv6 address, e.g. 2001:db8::1', CNAME: 'Target hostname, e.g. example.com',
    MX: 'Mail server hostname', TXT: 'Text value, e.g. v=spf1 include:_spf.examplehost.com ~all', NS: 'Nameserver hostname',
    SRV: 'Weight, port and target, e.g. 5 5061 sip.example.com', CAA: 'Flags, tag and value, e.g. 0 issue "letsencrypt.org"'
  };

  function ttlLabel(ttl) {
    if (ttl >= 86400 && ttl % 86400 === 0) return ttl / 86400 + ' day' + (ttl > 86400 ? 's' : '');
    if (ttl >= 3600 && ttl % 3600 === 0) return ttl / 3600 + ' hr';
    if (ttl >= 60 && ttl % 60 === 0) return ttl / 60 + ' min';
    return ttl + ' s';
  }

  function validateRecord(values, domainName, editingId) {
    const v = values.value;
    const name = values.name;
    if (name !== '@' && !/^(\*\.)?([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?)(\.[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?)*$/i.test(name)) return { field: 'name', message: 'Use @ for the root, or a hostname such as www or _dmarc.' };
    const others = Store.get('dnsRecords').filter((r) => r.domain === domainName && r.id !== editingId && r.name.toLowerCase() === name.toLowerCase());
    switch (values.type) {
      case 'A': if (!IPV4_RE.test(v)) return { field: 'value', message: 'Enter a valid IPv4 address.' }; break;
      case 'AAAA': if (!IPV6_RE.test(v)) return { field: 'value', message: 'Enter a valid IPv6 address.' }; break;
      case 'CNAME':
        if (name === '@') return { field: 'name', message: 'A CNAME cannot be created at the zone root (@).' };
        if (!HOST_RE.test(v)) return { field: 'value', message: 'Enter a valid hostname.' };
        if (others.length) return { field: 'name', message: 'A CNAME cannot share a name with other records (' + others.map((r) => r.type).join(', ') + ').' };
        break;
      case 'MX': case 'NS': if (!HOST_RE.test(v)) return { field: 'value', message: 'Enter a valid hostname.' }; break;
      case 'TXT': if (v.length > 2048) return { field: 'value', message: 'TXT values are limited to 2048 characters.' }; break;
      case 'SRV':
        if (!/^_[a-z0-9-]+\._(tcp|udp|tls)$/i.test(name)) return { field: 'name', message: 'SRV names use the form _service._protocol, e.g. _sip._tls.' };
        if (!/^\d{1,5} \d{1,5} \S+$/.test(v)) return { field: 'value', message: 'Use the format: weight port target.' };
        break;
      case 'CAA': if (!/^\d{1,3} (issue|issuewild|iodef) "[^"]+"$/.test(v)) return { field: 'value', message: 'Use the format: 0 issue "ca.example".' }; break;
      default: break;
    }
    if (values.type !== 'CNAME' && others.some((r) => r.type === 'CNAME')) return { field: 'name', message: 'This name already has a CNAME record; other records cannot be added to it.' };
    if (['MX', 'SRV'].indexOf(values.type) !== -1 && (values.priority === '' || values.priority < 0 || values.priority > 65535)) return { field: 'priority', message: 'Priority must be between 0 and 65535.' };
    const duplicate = Store.get('dnsRecords').some((r) => r.domain === domainName && r.id !== editingId && r.type === values.type && r.name.toLowerCase() === name.toLowerCase() && r.value === v);
    if (duplicate) return 'An identical record already exists.';
    return null;
  }

  App.page('domains.dns', (root) => {
    let domain = Services.selectedDomain();
    if (!domain) { root.innerHTML = View.empty({ title: 'No domains', text: 'Register a domain to manage DNS.' }); return; }
    const requested = App.param('domain');
    const notFound = requested && !Services.domain(requested);

    root.innerHTML = View.pageHeader({
      title: 'DNS Management',
      description: 'Edit the DNS zone served by the default nameservers. Changes typically propagate within the record TTL.',
      crumbs: [['Domains', 'domains/index.html'], ['DNS Management']],
      actions: domainSelectHTML(domain)
    }) + (notFound ? View.alert('warning', 'The domain <strong>' + esc(requested) + '</strong> is not in your account. Showing ' + esc(domain.name) + ' instead.') + '<div class="mb-16"></div>' : '') +
    '<div id="dns-summary"></div><div class="panel section" id="dns-table"></div>';

    function records() { return Store.get('dnsRecords').filter((r) => r.domain === domain.name); }

    function renderSummary() {
      const list = records();
      const counts = RECORD_TYPES.map((t) => t + ' ' + list.filter((r) => r.type === t).length).join(' &middot; ');
      const serial = fmt.isoDate(App.now()).replace(/-/g, '') + String(list.length).padStart(2, '0');
      root.querySelector('#dns-summary').innerHTML =
        (domain.customNameservers ? View.alert('warning', '<strong>' + esc(domain.name) + '</strong> uses custom nameservers (' + domain.nameservers.map(esc).join(', ') + '). Records below are stored but not served until the default nameservers are restored.', '<a class="btn btn-secondary btn-sm" href="' + domainLink(domain.name, 'domains/nameservers.html') + '">Nameservers</a>') + '<div class="mb-16"></div>' : '') +
        '<div class="grid grid-3">' +
        View.panel({ title: 'Zone', body: View.kv([['Domain', '<strong>' + esc(domain.name) + '</strong>'], ['Records', list.length + '<span class="cell-sub">' + counts + '</span>'], ['Status', View.badge(Services.domainStatus(domain))]]) }) +
        View.panel({ title: 'SOA', body: View.kv([['Primary NS', esc(domain.nameservers[0])], ['Serial', '<span class="mono">' + serial + '</span>'], ['Refresh / Retry', '3600 / 900'], ['Minimum TTL', '300']]) }) +
        View.panel({ title: 'DNSSEC', body: View.kv([['Status', domain.dnssec ? View.badge('Enabled') : View.badge('Disabled')], ['Algorithm', domain.dnssec ? '13 (ECDSAP256SHA256)' : '-'], ['DS record', domain.dnssec ? 'Published at registry' : 'Not published']]) +
          '<div class="mt-8">' + View.switchControl({ checked: domain.dnssec, label: domain.dnssec ? 'Signing enabled' : 'Enable signing', data: 'data-dnssec' }) + '</div>' }) +
        '</div>';
    }

    const table = UI.DataTable(root.querySelector('#dns-table'), {
      data: records,
      searchPlaceholder: 'Search name or value',
      searchKeys: ['name', 'value', 'type'],
      selectable: true,
      bulkActions: [{ action: 'delete', label: 'Delete selected', danger: true }],
      filters: [{ key: 'type', label: 'Type', options: RECORD_TYPES, allLabel: 'All types' }],
      toolbar: '<button type="button" class="btn btn-secondary btn-sm" data-export>' + icon('download', 14) + 'Export zone</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-reset>' + icon('refresh', 14) + 'Reset</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-add-record>' + icon('plus', 14) + 'Add record</button>',
      emptyTitle: 'No DNS records',
      emptyText: 'Add an A record to point this domain to a server.',
      columns: [
        { key: 'type', label: 'Type', render: (r) => '<span class="tag type-tag">' + r.type + '</span>', width: '80px' },
        { key: 'name', label: 'Name', render: (r) => '<span class="mono">' + esc(r.name) + '</span><span class="cell-sub">' + esc(r.name === '@' ? domain.name : r.name + '.' + domain.name) + '</span>' },
        { key: 'value', label: 'Value', render: (r) => '<span class="mono">' + esc(r.value) + '</span>' },
        { key: 'ttl', label: 'TTL', render: (r) => '<span class="nowrap" title="' + r.ttl + ' seconds">' + ttlLabel(r.ttl) + '</span>' },
        { key: 'priority', label: 'Priority', render: (r) => r.priority === null || r.priority === undefined || r.priority === '' ? '<span class="muted">-</span>' : String(r.priority) }
      ],
      actions: () => [{ action: 'edit', label: 'Edit', primary: true }, { action: 'duplicate', label: 'Duplicate', icon: 'copy' }, { action: 'delete', label: 'Delete', icon: 'trash', danger: true }],
      onAction: (action, record) => {
        if (action === 'edit') recordForm(record);
        if (action === 'duplicate') recordForm(Object.assign({}, record, { id: null }));
        if (action === 'delete') {
          UI.confirm({ title: 'Delete DNS record', message: 'Delete this ' + record.type + ' record? Resolvers may keep the cached value for up to ' + ttlLabel(record.ttl) + '.', detail: '<div class="record-box">' + esc(record.name) + ' ' + record.ttl + ' IN ' + record.type + ' ' + (record.priority !== null && record.priority !== undefined ? record.priority + ' ' : '') + esc(record.value) + '</div>', confirmLabel: 'Delete record', danger: true })
            .then((ok) => {
              if (!ok) return;
              Store.remove('dnsRecords', record.id);
              App.log('DNS', 'DNS record deleted', record.type + ' ' + (record.name === '@' ? '' : record.name + '.') + domain.name);
              UI.toast('DNS record deleted.');
              refresh();
            });
        }
      },
      onBulk: (action, rows) => {
        UI.confirm({ title: 'Delete ' + rows.length + ' records', message: 'Delete the selected DNS records from ' + domain.name + '?', confirmLabel: 'Delete records', danger: true }).then((ok) => {
          if (!ok) return;
          const ids = new Set(rows.map((r) => r.id));
          Store.update('dnsRecords', (list) => list.filter((r) => !ids.has(r.id)));
          App.log('DNS', 'DNS records deleted', rows.length + ' records on ' + domain.name);
          UI.toast(rows.length + ' records deleted.');
          table.clearSelection();
          refresh();
        });
      }
    });

    function recordForm(record) {
      const editing = record && record.id;
      const initial = record || { type: 'A', name: '@', value: '', ttl: 3600, priority: '' };
      UI.formModal({
        title: editing ? 'Edit DNS record' : 'Add DNS record',
        subtitle: domain.name,
        fields: [
          { name: 'type', label: 'Type', type: 'select', options: RECORD_TYPES, value: initial.type, half: true },
          { name: 'ttl', label: 'TTL', type: 'select', options: TTL_OPTIONS, value: initial.ttl, half: true },
          { name: 'name', label: 'Name', value: initial.name, required: true, suffix: '.' + domain.name, mono: true, hint: 'Use @ for the root domain.' },
          { name: 'value', label: 'Value', type: initial.type === 'TXT' ? 'textarea' : 'text', rows: 3, value: initial.value, required: true, mono: true, hint: TYPE_HINTS[initial.type] },
          { name: 'priority', label: 'Priority', type: 'number', value: initial.priority === null ? '' : initial.priority, min: 0, max: 65535, hint: 'Lower values are preferred.' }
        ],
        submitLabel: editing ? 'Save record' : 'Add record',
        onChange: (values, form) => {
          form.querySelector('[data-field="priority"]').hidden = ['MX', 'SRV'].indexOf(values.type) === -1;
          form.querySelector('[data-field="value"] .hint').textContent = TYPE_HINTS[values.type];
        },
        onSubmit: (values) => {
          values.name = values.name.replace(new RegExp('\\.?' + domain.name.replace(/\./g, '\\.') + '\\.?$', 'i'), '') || '@';
          values.value = values.value.trim();
          const error = validateRecord(values, domain.name, editing ? record.id : null);
          if (error) return error;
          const data = { type: values.type, name: values.name, value: values.value, ttl: Number(values.ttl), priority: ['MX', 'SRV'].indexOf(values.type) !== -1 ? Number(values.priority) : null };
          const label = data.type + ' ' + (data.name === '@' ? '' : data.name + '.') + domain.name;
          if (editing) {
            Store.patch('dnsRecords', record.id, data);
            App.log('DNS', 'DNS record updated', label);
          } else {
            Store.update('dnsRecords', (list) => { list.push(Object.assign({ id: uid('r'), domain: domain.name }, data)); });
            App.log('DNS', 'DNS record added', label);
          }
          UI.toast(editing ? 'DNS record updated.' : 'DNS record added.');
          refresh();
        }
      });
    }

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-add-record]')) recordForm();
      if (e.target.closest('[data-export]')) {
        const lines = ['; Zone file for ' + domain.name + ' (demo export)', '$ORIGIN ' + domain.name + '.', '$TTL 3600', ''];
        records().forEach((r) => lines.push([r.name, r.ttl, 'IN', r.type, r.priority !== null && r.priority !== undefined ? r.priority : '', r.type === 'TXT' ? '"' + r.value + '"' : r.value].filter((x) => x !== '').join('\t')));
        Util.downloadText(domain.name + '.zone', lines.join('\n') + '\n');
        UI.toast('Zone file exported.', 'info');
      }
      if (e.target.closest('[data-reset]')) {
        UI.confirm({ title: 'Reset DNS zone', message: 'Replace all records for ' + domain.name + ' with the original records from the demo data set?', confirmLabel: 'Reset zone', danger: true, requireText: domain.name }).then((ok) => {
          if (!ok) return;
          const seed = MockData.dnsRecords.filter((r) => r.domain === domain.name);
          Store.update('dnsRecords', (list) => list.filter((r) => r.domain !== domain.name).concat(Util.clone(seed)));
          App.log('DNS', 'DNS zone reset', domain.name);
          UI.toast('Zone reset to default records.');
          refresh();
        });
      }
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'domain-select') {
        domain = Services.domain(e.target.value);
        Services.rememberDomain(domain.name);
        refresh();
      }
      if (e.target.matches('[data-dnssec]')) {
        const on = e.target.checked;
        Store.patch('domains', domain.id, { dnssec: on });
        domain = Services.domain(domain.name);
        App.log('DNS', 'DNSSEC ' + (on ? 'enabled' : 'disabled'), domain.name);
        UI.toast('DNSSEC ' + (on ? 'enabled' : 'disabled') + ' for ' + domain.name + '.');
        renderSummary();
      }
    });

    function refresh() { renderSummary(); table.refresh(); }
    renderSummary();
    if (App.param('add')) recordForm();
  });

  /* ---------- Nameservers ---------- */
  App.page('domains.nameservers', (root) => {
    let domain = Services.selectedDomain();
    root.innerHTML = View.pageHeader({
      title: 'Nameservers',
      description: 'Choose which DNS provider answers for each domain, and register child nameservers.',
      crumbs: [['Domains', 'domains/index.html'], ['Nameservers']],
      actions: domainSelectHTML(domain)
    }) + '<div id="ns-body"></div>';

    function render() {
      const children = Store.get('childNameservers').filter((c) => c.domain === domain.name);
      const custom = domain.customNameservers;
      const ns = domain.nameservers.slice();
      root.querySelector('#ns-body').innerHTML =
        '<div class="grid grid-main">' +
          View.panel({
            title: 'Nameservers for ' + domain.name,
            subtitle: 'Last changed values take effect at the registry immediately; resolvers update within 24-48 hours.',
            body: '<form id="ns-form" novalidate>' +
              '<div class="grid grid-2 mb-16">' +
                '<label class="radio"><input type="radio" name="mode" value="default"' + (custom ? '' : ' checked') + '><span><strong>Default nameservers</strong><small>' + DEFAULT_NS.join(', ') + '. DNS records are managed in this portal.</small></span></label>' +
                '<label class="radio"><input type="radio" name="mode" value="custom"' + (custom ? ' checked' : '') + '><span><strong>Custom nameservers</strong><small>Use an external DNS provider. Portal DNS records will not be served.</small></span></label>' +
              '</div>' +
              '<div id="ns-list" class="stack"></div>' +
              '<div class="flex mt-16"><button type="button" class="btn btn-secondary btn-sm" data-ns-add>' + icon('plus', 14) + 'Add nameserver</button><span class="muted small">Between 2 and 5 nameservers.</span></div>' +
              '<div class="form-error mt-16" role="alert" hidden></div>' +
              '<div class="form-actions mt-16"><button type="button" class="btn btn-secondary" data-ns-revert>Revert</button><button type="submit" class="btn btn-primary">Save nameservers</button></div>' +
            '</form>'
          }) +
          '<div class="stack">' +
            View.panel({ title: 'Current delegation', body: View.kv([['Mode', custom ? 'Custom' : 'Default'], ['Nameservers', domain.nameservers.map((n) => '<span class="mono">' + esc(n) + '</span>').join('<br>')], ['Domain status', View.badge(Services.domainStatus(domain))]]) +
              '<button type="button" class="btn btn-secondary btn-sm mt-16" data-propagation>' + icon('activity', 14) + 'Check propagation</button><div id="propagation"></div>' }) +
          '</div>' +
        '</div>' +
        '<div class="section">' + View.panel({
          title: 'Child nameservers (glue records)',
          subtitle: 'Register hostnames under ' + domain.name + ' that act as nameservers.',
          actions: '<button type="button" class="btn btn-secondary btn-sm" data-child-add>' + icon('plus', 14) + 'Register child nameserver</button>',
          flush: true,
          body: children.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Hostname</th><th>IP address</th><th class="col-actions">Actions</th></tr></thead><tbody>' +
            children.map((c) => '<tr><td class="mono">' + esc(c.host) + '</td><td class="mono">' + esc(c.ip) + '</td><td class="col-actions"><button type="button" class="btn btn-secondary btn-xs" data-child-delete="' + c.id + '">Delete</button></td></tr>').join('') + '</tbody></table></div>'
            : View.empty({ icon: 'server', title: 'No child nameservers', text: 'Only needed if you run your own nameservers under this domain.' })
        }) + '</div>';
      renderList(custom ? ns : DEFAULT_NS, !custom);
    }

    function renderList(values, readonly) {
      const list = root.querySelector('#ns-list');
      list.innerHTML = values.map((value, i) =>
        '<div class="field" data-field="ns' + i + '"><label class="label" for="ns-' + i + '">Nameserver ' + (i + 1) + '</label><div class="ns-row"><input class="input mono" id="ns-' + i + '" value="' + esc(value) + '"' + (readonly ? ' readonly' : '') + ' spellcheck="false">' +
        (!readonly && values.length > 2 ? '<button type="button" class="icon-btn" data-ns-remove="' + i + '" aria-label="Remove nameserver ' + (i + 1) + '">' + icon('trash', 14) + '</button>' : '') + '</div><p class="field-error" role="alert"></p></div>').join('');
      root.querySelector('[data-ns-add]').disabled = readonly || values.length >= 5;
    }

    function currentValues() {
      return Array.from(root.querySelectorAll('#ns-list input')).map((i) => i.value.trim().toLowerCase());
    }

    root.addEventListener('change', (e) => {
      if (e.target.id === 'domain-select') {
        domain = Services.domain(e.target.value);
        Services.rememberDomain(domain.name);
        render();
      }
      if (e.target.name === 'mode') {
        const custom = e.target.value === 'custom';
        renderList(custom ? (domain.customNameservers ? domain.nameservers : ['', '']) : DEFAULT_NS, !custom);
        if (custom) root.querySelector('#ns-0').focus();
      }
    });

    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-ns-add]')) { const values = currentValues(); values.push(''); renderList(values, false); root.querySelector('#ns-' + (values.length - 1)).focus(); }
      const remove = e.target.closest('[data-ns-remove]');
      if (remove) { const values = currentValues(); values.splice(Number(remove.dataset.nsRemove), 1); renderList(values, false); }
      if (e.target.closest('[data-ns-revert]')) render();
      const del = e.target.closest('[data-child-delete]');
      if (del) {
        const child = Store.find('childNameservers', del.dataset.childDelete);
        const inUse = Services.domains().some((d) => d.nameservers.indexOf(child.host) !== -1);
        if (inUse) { UI.toast(child.host + ' is used as a nameserver by a domain and cannot be deleted.', 'error'); return; }
        if (await UI.confirm({ title: 'Delete child nameserver', message: 'Remove the glue record for ' + child.host + ' at the registry?', confirmLabel: 'Delete', danger: true })) {
          Store.remove('childNameservers', child.id);
          App.log('Domains', 'Child nameserver deleted', child.host);
          UI.toast('Child nameserver deleted.');
          render();
        }
      }
      if (e.target.closest('[data-child-add]')) {
        UI.formModal({
          title: 'Register child nameserver',
          fields: [
            { name: 'host', label: 'Hostname', required: true, suffix: '.' + domain.name, placeholder: 'ns1', mono: true, validate: (v) => LABEL_RE.test(v.replace(new RegExp('\\.' + domain.name.replace(/\./g, '\\.') + '$'), '')) ? '' : 'Enter a single label such as ns1.' },
            { name: 'ip', label: 'IPv4 address', required: true, mono: true, validate: (v) => IPV4_RE.test(v) ? '' : 'Enter a valid IPv4 address.' }
          ],
          submitLabel: 'Register',
          onSubmit: (values) => {
            const host = values.host.replace(new RegExp('\\.' + domain.name.replace(/\./g, '\\.') + '$'), '') + '.' + domain.name;
            if (Store.get('childNameservers').some((c) => c.host === host)) return { field: 'host', message: 'This child nameserver already exists.' };
            Store.update('childNameservers', (list) => { list.push({ id: uid('cn'), domain: domain.name, host, ip: values.ip }); });
            App.log('Domains', 'Child nameserver registered', host + ' (' + values.ip + ')');
            UI.toast('Child nameserver ' + host + ' registered.');
            render();
          }
        });
      }
      const check = e.target.closest('[data-propagation]');
      if (check) {
        UI.setButtonLoading(check, true, 'Checking...');
        await Util.delay(900);
        UI.setButtonLoading(check, false);
        const resolvers = [['Resolver A (London)', true], ['Resolver B (Frankfurt)', true], ['Resolver C (New York)', true], ['Resolver D (Singapore)', hashOf(domain.nameservers.join()) % 3 !== 0], ['Resolver E (Lagos)', true]];
        root.querySelector('#propagation').innerHTML = '<table class="table table-compact mt-16"><tbody>' + resolvers.map((r) => '<tr><td>' + r[0] + '</td><td class="align-right">' + View.badge(r[1] ? 'Updated' : 'Pending', r[1] ? 'ok' : 'warn') + '</td></tr>').join('') + '</tbody></table>' + View.demoNote('Simulated lookup. No DNS queries were made.');
      }
    });

    root.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorBox = form.querySelector('.form-error');
      errorBox.hidden = true;
      const custom = form.elements.mode.value === 'custom';
      const values = custom ? currentValues() : DEFAULT_NS.slice();
      let valid = true;
      if (custom) {
        values.forEach((v, i) => {
          const wrapper = form.querySelector('[data-field="ns' + i + '"]');
          const error = !v ? 'Enter a hostname.' : !HOST_RE.test(v) ? 'Enter a valid hostname, e.g. ns1.provider.net.' : values.indexOf(v) !== i ? 'Duplicate nameserver.' : '';
          UI.setFieldError(wrapper, error);
          if (error) valid = false;
        });
        if (values.length < 2) { errorBox.textContent = 'At least two nameservers are required.'; errorBox.hidden = false; valid = false; }
      }
      if (!valid) return;
      const same = values.join() === domain.nameservers.join() && custom === domain.customNameservers;
      if (same) { UI.toast('No changes to save.', 'info'); return; }
      if (custom && !(await UI.confirm({ title: 'Switch to custom nameservers', message: 'DNS records managed in this portal (including email and website records) will stop being served for ' + domain.name + '. Continue?', confirmLabel: 'Save nameservers' }))) return;
      const button = form.querySelector('[type="submit"]');
      UI.setButtonLoading(button, true, 'Saving...');
      await Util.delay(700);
      Store.patch('domains', domain.id, { nameservers: values, customNameservers: custom });
      domain = Services.domain(domain.name);
      App.log('Domains', 'Nameservers updated', domain.name + ': ' + values.join(', '));
      UI.toast('Nameservers updated for ' + domain.name + '.');
      render();
    });

    render();
  });

  /* ---------- Transfers ---------- */
  App.page('domains.transfer', (root) => {
    const initialTab = App.param('tab') || (App.param('domain') ? 'out' : 'in');
    let outDomain = Services.selectedDomain();
    root.innerHTML = View.pageHeader({
      title: 'Domain Transfers',
      description: 'Move domains in from another registrar, or prepare a domain to leave.',
      crumbs: [['Domains', 'domains/index.html'], ['Transfers']]
    }) + '<div class="panel">' + View.tabs('transfer', [{ id: 'in', label: 'Transfer in' }, { id: 'out', label: 'Transfer out' }, { id: 'history', label: 'History', count: Store.get('transfers').length }], initialTab) +
      View.tabPanel('transfer', 'in', initialTab, '<div class="panel-body" id="transfer-in"></div>') +
      View.tabPanel('transfer', 'out', initialTab, '<div class="panel-body" id="transfer-out"></div>') +
      View.tabPanel('transfer', 'history', initialTab, '<div id="transfer-history"></div>') + '</div>';

    root.querySelector('#transfer-in').innerHTML =
      '<div class="grid grid-main"><form id="transfer-form" class="form-grid" novalidate>' +
        UI.fieldHTML({ name: 'domain', label: 'Domain name', required: true, placeholder: 'example.net', mono: true }) +
        UI.fieldHTML({ name: 'code', label: 'Authorisation (EPP) code', required: true, type: 'password', hint: 'Provided by the current registrar.' }) +
        UI.fieldHTML({ name: 'confirm', type: 'checkbox', label: 'I confirm the domain is unlocked and I am authorised to transfer it.' }) +
        '<div class="form-error" role="alert" hidden></div>' +
        '<div class="form-actions"><span class="muted small" id="transfer-price"></span><button type="submit" class="btn btn-primary">Start transfer</button></div>' +
      '</form>' +
      '<div>' + View.panel({ title: 'Before you start', body: '<ol class="article-body" style="padding-left:18px;margin:0"><li>Unlock the domain at the current registrar.</li><li>Disable WHOIS privacy if the registrar requires it.</li><li>Request the authorisation code.</li><li>Make sure the domain was registered more than 60 days ago.</li></ol>' }) + '</div></div>';

    const transferForm = root.querySelector('#transfer-form');
    transferForm.elements.domain.addEventListener('input', () => {
      const name = transferForm.elements.domain.value.trim().toLowerCase();
      const tld = HOST_RE.test(name) ? Services.tldOf(name) : null;
      const price = tld ? Services.priceFor(tld) : null;
      root.querySelector('#transfer-price').textContent = price ? 'Transfer fee ' + fmt.money(price.transfer) + ' (includes 1 year renewal)' : '';
    });
    transferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = [
        { name: 'domain', label: 'Domain name', required: true, validate: (v) => HOST_RE.test(v) ? (Services.domain(v.toLowerCase()) ? 'This domain is already in your account.' : '') : 'Enter a full domain name such as example.net.' },
        { name: 'code', label: 'Authorisation code', required: true, validate: (v) => v.length < 6 ? 'Authorisation codes are at least 6 characters.' : '' },
        { name: 'confirm', type: 'checkbox', label: 'Confirmation', validate: (v) => v ? '' : 'Please confirm the domain is unlocked.' }
      ];
      const values = UI.readForm(transferForm, fields);
      if (!UI.validateFields(transferForm, fields, values)) return;
      const button = transferForm.querySelector('[type="submit"]');
      UI.setButtonLoading(button, true, 'Submitting...');
      await Util.delay(900);
      UI.setButtonLoading(button, false);
      const name = values.domain.toLowerCase();
      const tld = Services.tldOf(name);
      const price = Services.priceFor(tld);
      const today = fmt.isoDate(App.now());
      const domainId = uid('d');
      Store.update('domains', (list) => { list.push({ id: domainId, name, status: 'Pending Transfer', registered: today, expires: Util.addYears(today, 1), autoRenew: true, privacy: NO_PRIVACY_TLDS.indexOf(tld) === -1, locked: false, hostingId: null, registrar: 'Previous Registrar (demo)', nameservers: ['ns1.previous-dns.invalid', 'ns2.previous-dns.invalid'], customNameservers: true, dnssec: false, renewalPrice: price.renew }); });
      Store.prepend('transfers', { id: uid('t'), domain: name, direction: 'Inbound', status: 'Awaiting Approval', started: today, eta: fmt.isoDate(Util.addDays(today, 5)), fromRegistrar: 'Previous Registrar (demo)' });
      App.log('Domains', 'Inbound transfer started', name);
      const invoice = price.transfer ? Services.createInvoice([{ description: 'Domain transfer - ' + name + ' (1 year)', amount: price.transfer, relatedId: domainId }], { dueDays: 3 }) : null;
      transferForm.reset();
      root.querySelector('#transfer-price').textContent = '';
      UI.modal({
        title: 'Transfer started',
        size: 'sm',
        body: '<p>The transfer of <strong>' + esc(name) + '</strong> has been submitted. An approval email is sent to the registrant contact (simulated in this demo).</p>' + (invoice ? '<p>Invoice ' + invoice.id + ' for ' + fmt.money(price.transfer) + ' has been created.</p>' : ''),
        actions: [{ label: 'Close', variant: 'secondary' }].concat(invoice ? [{ label: 'Pay invoice', variant: 'primary', onClick: () => { location.href = App.url('billing/invoice.html?id=' + invoice.id + '&pay=1'); } }] : [])
      });
      historyTable.refresh();
    });

    function renderOut() {
      const d = outDomain;
      root.querySelector('#transfer-out').innerHTML =
        '<div class="flex mb-16"><label class="label" for="out-domain">Domain</label><select id="out-domain" class="select select-sm">' + View.options(Services.manageableDomains().map((x) => x.name), d.name) + '</select></div>' +
        '<div class="steps"><div class="step ' + (d.locked ? 'active' : 'done') + '"><b>1</b>Remove transfer lock</div><div class="step ' + (d.locked ? '' : 'active') + '"><b>2</b>Request authorisation code</div><div class="step"><b>3</b>Start transfer at new registrar</div></div>' +
        '<div class="grid grid-2">' +
          View.panel({ title: 'Transfer lock', body: '<p>' + (d.locked ? 'The domain is locked. Remove the lock before requesting a transfer.' : 'The lock is off. The domain can be transferred with its authorisation code.') + '</p>' + View.switchControl({ checked: d.locked, label: d.locked ? 'Locked' : 'Unlocked', data: 'data-out-lock' }) }) +
          View.panel({ title: 'Authorisation code', body: '<p>The code is shown here and emailed to the registrant contact.</p><div id="auth-code-slot"></div><button type="button" class="btn btn-primary btn-sm mt-8" data-auth-code' + (d.locked ? ' disabled' : '') + '>' + icon('key', 14) + 'Generate code</button>' + (d.locked ? '<p class="hint mt-8">Unlock the domain first.</p>' : '') }) +
        '</div>' + View.demoNote('Authorisation codes shown here are placeholders for the demo and are not valid at any registry.');
    }

    root.addEventListener('change', (e) => {
      if (e.target.id === 'out-domain') { outDomain = Services.domain(e.target.value); Services.rememberDomain(outDomain.name); renderOut(); }
      if (e.target.matches('[data-out-lock]')) {
        const locked = e.target.checked;
        Store.patch('domains', outDomain.id, { locked });
        outDomain = Services.domain(outDomain.name);
        App.log('Domains', 'Transfer lock ' + (locked ? 'enabled' : 'disabled'), outDomain.name);
        UI.toast('Transfer lock ' + (locked ? 'enabled' : 'removed') + '.');
        renderOut();
      }
    });
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-auth-code]');
      if (!btn) return;
      UI.setButtonLoading(btn, true, 'Generating...');
      await Util.delay(700);
      UI.setButtonLoading(btn, false);
      const code = 'DEMO-' + Util.randomHex(4).toUpperCase() + '-' + Util.randomHex(4).toUpperCase();
      root.querySelector('#auth-code-slot').innerHTML = View.copyable(code);
      App.log('Domains', 'Authorisation code requested', outDomain.name);
      UI.toast('Authorisation code generated and sent to the registrant contact (simulated).');
    });

    const historyTable = UI.DataTable(root.querySelector('#transfer-history'), {
      data: () => Store.get('transfers'),
      searchKeys: ['domain', 'status', 'fromRegistrar'],
      filters: [{ key: 'status', label: 'Status', options: ['Awaiting Approval', 'Completed', 'Cancelled'] }],
      columns: [
        { key: 'domain', label: 'Domain', render: (t) => '<span class="cell-main">' + esc(t.domain) + '</span>' },
        { key: 'direction', label: 'Direction' },
        { key: 'fromRegistrar', label: 'From registrar' },
        { key: 'status', label: 'Status', render: (t) => View.badge(t.status) },
        { key: 'started', label: 'Started', render: (t) => fmt.date(t.started) },
        { key: 'eta', label: 'Expected completion', render: (t) => fmt.date(t.eta) }
      ],
      actions: (t) => t.status === 'Awaiting Approval' ? [{ action: 'resend', label: 'Resend approval', primary: true }, { action: 'cancel', label: 'Cancel transfer', danger: true, icon: 'x' }] : [],
      onAction: async (action, t) => {
        if (action === 'resend') { UI.toast('Approval email resent to the registrant contact for ' + t.domain + ' (simulated).'); App.log('Domains', 'Transfer approval resent', t.domain); }
        if (action === 'cancel' && await UI.confirm({ title: 'Cancel transfer', message: 'Cancel the pending transfer of ' + t.domain + '? The domain stays with its current registrar.', confirmLabel: 'Cancel transfer', danger: true })) {
          Store.patch('transfers', t.id, { status: 'Cancelled' });
          Store.update('domains', (list) => list.filter((d) => !(d.name === t.domain && d.status === 'Pending Transfer')));
          App.log('Domains', 'Transfer cancelled', t.domain);
          UI.toast('Transfer cancelled.');
          historyTable.refresh();
        }
      }
    });

    renderOut();
  });

  /* ---------- WHOIS ---------- */
  App.page('domains.whois', (root) => {
    const initial = App.param('domain') || (Services.domains()[0] || {}).name || '';
    root.innerHTML = View.pageHeader({
      title: 'WHOIS Lookup',
      description: 'Registration details as published in WHOIS/RDAP. All records on this page are mock data.',
      crumbs: [['Domains', 'domains/index.html'], ['WHOIS']]
    }) +
    View.panel({ body: '<form id="whois-form" class="search-hero" novalidate><label class="sr-only" for="whois-q">Domain</label><input id="whois-q" class="input mono" value="' + esc(initial) + '" placeholder="example.com" spellcheck="false"><button class="btn btn-primary btn-lg" type="submit">' + icon('search', 15) + 'Lookup</button></form>' +
      '<div class="flex flex-wrap mt-8"><span class="muted small">Your domains:</span>' + Services.domains().map((d) => '<button type="button" class="btn btn-ghost btn-xs" data-whois="' + esc(d.name) + '">' + esc(d.name) + '</button>').join('') + '</div>' }) +
    '<div id="whois-result" class="section" aria-live="polite"></div>';

    const form = root.querySelector('#whois-form');
    const input = root.querySelector('#whois-q');
    const result = root.querySelector('#whois-result');

    async function lookup(name) {
      name = name.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!HOST_RE.test(name)) { result.innerHTML = View.alert('critical', 'Enter a valid domain name, such as example.com.'); return; }
      App.setParam('domain', name);
      result.innerHTML = View.panel({ title: 'Querying WHOIS...', body: View.skeleton(8) });
      await Util.delay(500);
      const owned = Services.domain(name);
      if (!owned && availability(name).available) {
        result.innerHTML = View.panel({ title: name, body: View.empty({ icon: 'search', title: 'No match for "' + name + '"', text: 'This domain does not appear to be registered (mock result).', action: '<a class="btn btn-primary btn-sm" href="' + App.url('domains/search.html?q=' + encodeURIComponent(name)) + '">Register it</a>' }) });
        return;
      }
      const d = owned || {
        name, registrar: 'Example Registrar Inc. (fictional)', registered: '2015-05-20', expires: '2027-05-20', locked: true, privacy: true, dnssec: false,
        nameservers: ['ns1.example-dns.invalid', 'ns2.example-dns.invalid'], status: 'Active'
      };
      const profile = Store.get('profile');
      const redacted = 'REDACTED FOR PRIVACY';
      const privacy = owned ? d.privacy && privacySupported(d) : true;
      const statuses = [];
      if (d.locked) statuses.push('clientTransferProhibited');
      if (/Pending Transfer/.test(d.status)) statuses.push('pendingTransfer');
      if (Services.domainStatus(d) === 'Expired') statuses.push('redemptionPeriod');
      if (!statuses.length) statuses.push('ok');
      const contact = (role) => privacy ? [role + ' Name: ' + redacted, role + ' Organization: Privacy service (demo)', role + ' Email: ' + role.toLowerCase() + '@privacy-proxy.invalid'] :
        [role + ' Name: ' + profile.name, role + ' Organization: ' + profile.company, role + ' City: ' + profile.city, role + ' Country: ' + profile.country, role + ' Email: ' + profile.email];
      const text = ['% MOCK WHOIS RECORD - DEMO ENVIRONMENT - NOT REAL REGISTRY DATA', '',
        'Domain Name: ' + d.name.toUpperCase(), 'Registrar: ' + d.registrar, 'Creation Date: ' + d.registered + 'T00:00:00Z', 'Registry Expiry Date: ' + d.expires + 'T00:00:00Z',
        statuses.map((s) => 'Domain Status: ' + s).join('\n'), d.nameservers.map((n) => 'Name Server: ' + n.toUpperCase()).join('\n'), 'DNSSEC: ' + (d.dnssec ? 'signedDelegation' : 'unsigned'), '']
        .concat(contact('Registrant'), [''], contact('Admin'), [''], contact('Tech'), ['', '>>> Last update of WHOIS database: ' + fmt.isoDateTime(App.now()) + 'Z <<<']).join('\n');
      result.innerHTML = '<div class="grid grid-main">' +
        View.panel({ title: 'Raw record', subtitle: 'Mock output', actions: '<button type="button" class="btn btn-secondary btn-sm" data-copy="' + esc(text) + '">' + icon('copy', 14) + 'Copy</button>', body: '<pre class="whois-block">' + esc(text) + '</pre>' }) +
        View.panel({ title: 'Summary', body: View.kv([
          ['Domain', '<strong>' + esc(d.name) + '</strong>'],
          ['Registrar', esc(d.registrar)],
          ['Registration Date', fmt.date(d.registered)],
          ['Expiration Date', fmt.date(d.expires)],
          ['Status', owned ? View.badge(Services.domainStatus(d)) + '<span class="cell-sub mono">' + statuses.join(', ') + '</span>' : '<span class="mono">' + statuses.join(', ') + '</span>'],
          ['Nameservers', d.nameservers.map((n) => '<span class="mono">' + esc(n) + '</span>').join('<br>')],
          ['Privacy Protection', privacy ? 'Enabled' : (owned && !privacySupported(d) ? 'Not available for this TLD' : '<strong>Disabled</strong> - contact details are public')]
        ]) + (owned ? '<div class="flex mt-16"><a class="btn btn-secondary btn-sm" href="' + App.url('domains/index.html?manage=' + encodeURIComponent(d.name)) + '">Manage domain</a></div>' : '') }) +
        '</div>';
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); lookup(input.value); });
    root.addEventListener('click', (e) => {
      const quick = e.target.closest('[data-whois]');
      if (quick) { input.value = quick.dataset.whois; lookup(quick.dataset.whois); }
    });
    if (initial) lookup(initial);
  });
})();
