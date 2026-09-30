/*
 * Business logic shared across sections. Keeps related records consistent:
 * paying an invoice reactivates hosting and extends domains, email
 * authentication is derived from DNS records, and so on.
 */
(function () {
  'use strict';
  const { daysUntil, addYears, uid } = Util;

  const Services = {
    plan(planId) {
      return Store.get('hostingPlans').find((p) => p.id === planId) || null;
    },
    account(id) {
      return Store.find('hostingAccounts', id);
    },
    accounts() {
      return Store.get('hostingAccounts');
    },
    accountLabel(account) {
      return account.ref + ' - ' + account.primaryDomain;
    },
    accountOptions() {
      return Services.accounts().map((a) => ({ value: a.id, label: Services.accountLabel(a) + ' (' + Services.plan(a.planId).name + ')' }));
    },
    selectedAccount() {
      const id = App.param('account') || Store.ui('account') || 'h1';
      return Services.account(id) || Services.accounts()[0];
    },
    rememberAccount(id) {
      Store.ui('account', id);
      App.setParam('account', id);
    },

    domain(name) {
      return Store.find('domains', name, 'name');
    },
    domains() {
      return Store.get('domains');
    },
    domainStatus(domain) {
      if (/^Pending/.test(domain.status)) return domain.status;
      const days = daysUntil(domain.expires);
      if (days < 0) return 'Expired';
      if (days <= 30) return 'Expiring Soon';
      return 'Active';
    },
    manageableDomains() {
      return Services.domains().filter((d) => !/^Pending/.test(d.status));
    },
    selectedDomain(list) {
      const pool = list || Services.manageableDomains();
      const name = App.param('domain') || Store.ui('domain');
      return pool.find((d) => d.name === name) || pool[0];
    },
    rememberDomain(name) {
      Store.ui('domain', name);
      App.setParam('domain', name);
    },
    tldOf(name) {
      const pricing = Store.get('tldPricing').map((p) => p.tld).sort((a, b) => b.length - a.length);
      return pricing.find((tld) => name.endsWith(tld)) || '.' + name.split('.').pop();
    },
    priceFor(tld) {
      return Store.get('tldPricing').find((p) => p.tld === tld) || { tld, register: 14.99, renew: 16.99, transfer: 14.99 };
    },

    /* ---------- Billing ---------- */
    invoiceTotal(invoice) {
      return invoice.items.reduce((sum, item) => sum + item.amount, 0);
    },
    invoiceStatus(invoice) {
      if (invoice.status === 'Unpaid' && daysUntil(invoice.due) < 0) return 'Overdue';
      return invoice.status;
    },
    openInvoices() {
      return Store.get('invoices').filter((inv) => ['Unpaid', 'Overdue'].indexOf(Services.invoiceStatus(inv)) !== -1)
        .sort((a, b) => a.due.localeCompare(b.due));
    },
    outstanding() {
      return Services.openInvoices().reduce((sum, inv) => sum + Services.invoiceTotal(inv), 0);
    },
    overdueInvoices() {
      return Services.openInvoices().filter((inv) => Services.invoiceStatus(inv) === 'Overdue');
    },
    lastPayment() {
      return Store.get('transactions').filter((t) => t.type === 'Payment' && t.status === 'Completed')
        .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    },
    upcomingRenewal() {
      const invoiced = new Set();
      Services.openInvoices().forEach((inv) => inv.items.forEach((item) => invoiced.add(item.relatedId)));
      const subs = Store.get('subscriptions')
        .filter((s) => s.status === 'Active' && !invoiced.has(s.relatedId) && daysUntil(s.nextRenewal) >= 0)
        .sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
      if (!subs.length) return null;
      const date = subs[0].nextRenewal;
      const group = subs.filter((s) => s.nextRenewal === date);
      return { date, invoiceDate: fmt.isoDate(Util.addDays(date, -14)), subscriptions: group, total: group.reduce((sum, s) => sum + s.price, 0) };
    },
    nextInvoiceId() {
      const year = App.now().getFullYear();
      const max = Store.get('invoices').reduce((m, inv) => {
        const match = /^INV-(\d{4})-(\d{4})$/.exec(inv.id);
        return match && Number(match[1]) === year ? Math.max(m, Number(match[2])) : m;
      }, 0);
      return 'INV-' + year + '-' + String(max + 1).padStart(4, '0');
    },
    createInvoice(items, opts) {
      const today = App.now();
      const invoice = {
        id: Services.nextInvoiceId(),
        date: fmt.isoDate(today),
        due: fmt.isoDate(Util.addDays(today, (opts && opts.dueDays) || 7)),
        status: 'Unpaid',
        items
      };
      Store.prepend('invoices', invoice);
      App.log('Billing', 'Invoice generated', invoice.id + ' (' + fmt.money(Services.invoiceTotal(invoice)) + ')');
      App.notify('Invoice ' + invoice.id + ' generated', fmt.money(Services.invoiceTotal(invoice)) + ' due ' + fmt.date(invoice.due) + '.', 'billing/invoices.html?id=' + invoice.id);
      return invoice;
    },
    paymentMethodLabel(method) {
      return method.type === 'Bank transfer' ? 'Bank transfer' : method.type + ' ending ' + method.last4;
    },
    payInvoice(invoiceId, methodLabel, charged) {
      const invoice = Store.find('invoices', invoiceId);
      if (!invoice) return null;
      const total = charged === undefined ? Services.invoiceTotal(invoice) : charged;
      const nowIso = fmt.isoDateTime(App.now());
      Store.patch('invoices', invoiceId, { status: 'Paid', paidOn: fmt.isoDate(App.now()), method: methodLabel });
      Store.prepend('transactions', {
        id: 'TXN-' + String(Date.now()).slice(-6), date: nowIso, description: 'Payment for ' + invoiceId,
        type: 'Payment', method: methodLabel, amount: total, status: 'Completed', invoiceId
      });
      const effects = [];
      invoice.items.forEach((item) => {
        const hosting = Services.account(item.relatedId);
        if (hosting) {
          if (hosting.status === 'Suspended') {
            const renewal = addYears(hosting.renewal, hosting.billingCycle === 'Annually' ? 1 : 0);
            Store.patch('hostingAccounts', hosting.id, { status: 'Active', suspendReason: null, renewal });
            Store.update('subscriptions', (list) => list.forEach((s) => { if (s.relatedId === hosting.id) { s.status = 'Active'; s.nextRenewal = renewal; } }));
            Store.update('mailboxes', (list) => list.forEach((m) => { if (m.address.endsWith('@' + hosting.primaryDomain) && m.status === 'Suspended') m.status = 'Active'; }));
            Store.update('databases', (list) => list.forEach((d) => { if (d.hostingId === hosting.id && d.status === 'Locked') d.status = 'Active'; }));
            Store.update('sslCertificates', (list) => list.forEach((c) => {
              if (c.hostingId === hosting.id && c.status === 'Expired') {
                c.status = 'Active'; c.issued = fmt.isoDate(App.now()); c.expires = fmt.isoDate(Util.addDays(App.now(), 90));
              }
            }));
            App.log('Hosting', 'Hosting account reactivated', hosting.ref + ' after payment of ' + invoiceId);
            effects.push(hosting.ref + ' reactivated');
          }
        }
        const cert = Store.find('sslCertificates', item.relatedId);
        if (cert && cert.status === 'Pending') {
          const today = fmt.isoDate(App.now());
          Store.patch('sslCertificates', cert.id, { status: 'Active', issued: today, expires: addYears(today, 1) });
          App.log('SSL', 'SSL certificate issued', cert.domain);
          effects.push('Certificate for ' + cert.domain + ' issued');
        }
        const domain = Store.find('domains', item.relatedId);
        if (domain && /renewal|registration/i.test(item.description)) {
          const years = Number((/\((\d+) years?\)/.exec(item.description) || [])[1]) || 1;
          if (domain.status === 'Pending Registration') {
            Store.patch('domains', domain.id, { status: 'Active', registered: fmt.isoDate(App.now()), expires: addYears(fmt.isoDate(App.now()), years) });
            App.log('Domains', 'Domain registered', domain.name);
            effects.push(domain.name + ' registered');
          } else {
            const base = daysUntil(domain.expires) < 0 ? fmt.isoDate(App.now()) : domain.expires;
            const expires = addYears(base, years);
            Store.patch('domains', domain.id, { status: 'Active', expires });
            Store.update('subscriptions', (list) => list.forEach((s) => { if (s.relatedId === domain.id) { s.nextRenewal = expires; s.status = 'Active'; } }));
            App.log('Domains', 'Domain renewed', domain.name + ' until ' + fmt.date(expires));
            effects.push(domain.name + ' renewed until ' + fmt.date(expires));
          }
        }
      });
      App.log('Billing', 'Payment received', invoiceId + ' (' + fmt.money(total) + ')');
      App.notify('Payment received for ' + invoiceId, fmt.money(total) + ' via ' + methodLabel + '.', 'billing/invoices.html?id=' + invoiceId);
      return { invoice: Store.find('invoices', invoiceId), effects };
    },
    renewDomain(domain, years) {
      const price = domain.renewalPrice || Services.priceFor(Services.tldOf(domain.name)).renew;
      return Services.createInvoice([{
        description: 'Domain renewal - ' + domain.name + ' (' + years + ' year' + (years > 1 ? 's' : '') + ')',
        amount: Math.round(price * years * 100) / 100,
        relatedId: domain.id
      }]);
    },

    /* ---------- Email authentication (derived from DNS) ---------- */
    emailAuth(domainName) {
      const records = Store.get('dnsRecords').filter((r) => r.domain === domainName && r.type === 'TXT');
      const spf = records.find((r) => r.name === '@' && /^v=spf1/i.test(r.value));
      const dkim = records.find((r) => /\._domainkey$/.test(r.name) && /v=DKIM1/i.test(r.value));
      const dmarc = records.find((r) => r.name === '_dmarc' && /^v=DMARC1/i.test(r.value));
      const result = {
        spf: { label: 'SPF', record: spf, host: '@', expected: 'v=spf1 a mx include:_spf.examplehost.com ~all' },
        dkim: { label: 'DKIM', record: dkim, host: 'default._domainkey', expected: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAdemoKeyOnly' },
        dmarc: { label: 'DMARC', record: dmarc, host: '_dmarc', expected: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domainName }
      };
      result.spf.status = !spf ? 'Missing' : /\+all/.test(spf.value) ? 'Warning' : 'Configured';
      result.spf.message = !spf ? 'No SPF record found. Receiving servers cannot verify which hosts may send mail for this domain.'
        : result.spf.status === 'Warning' ? 'The record ends with +all, which allows any server to send mail as this domain.' : 'Authorised senders are published.';
      result.dkim.status = dkim ? 'Configured' : 'Missing';
      result.dkim.message = dkim ? 'A public key is published for selector "default".' : 'Messages are signed on the server but the public key is not published in DNS.';
      const policy = dmarc ? ((/p=(\w+)/.exec(dmarc.value) || [])[1] || 'none') : null;
      result.dmarc.status = !dmarc ? 'Missing' : policy === 'none' ? 'Warning' : 'Configured';
      result.dmarc.message = !dmarc ? 'No DMARC policy. Spoofed mail using this domain is not rejected.'
        : policy === 'none' ? 'Policy is "none": reports are collected but failing mail is still delivered.' : 'Policy "' + policy + '" is enforced.';
      return result;
    },
    publishAuthRecord(domainName, key) {
      const auth = Services.emailAuth(domainName)[key];
      Store.update('dnsRecords', (list) => {
        if (auth.record) {
          const existing = list.find((r) => r.id === auth.record.id);
          existing.value = auth.expected;
        } else {
          list.push({ id: uid('r'), domain: domainName, type: 'TXT', name: auth.host, value: auth.expected, ttl: 3600, priority: null });
        }
      });
      App.log('DNS', auth.record ? 'DNS record updated' : 'DNS record added', 'TXT ' + (auth.host === '@' ? '' : auth.host + '.') + domainName + ' (' + auth.label + ')');
    },

    /* ---------- Security ---------- */
    securityScore() {
      const sec = Store.get('security');
      const keys = Store.get('apiKeys').filter((k) => k.status === 'Active');
      const passwordAge = -daysUntil(sec.passwordChanged);
      const otherSessions = Store.get('sessions').filter((s) => !s.current).length;
      const checks = [
        { label: 'Two-factor authentication enabled', ok: sec.twoFactor, weight: 30, href: 'security/2fa.html' },
        { label: 'Password changed in the last 180 days', ok: passwordAge <= 180, weight: 20, href: 'security/login-security.html' },
        { label: 'Sign-in alerts enabled', ok: sec.loginAlerts, weight: 10, href: 'security/login-security.html' },
        { label: 'Recovery email configured', ok: !!sec.recoveryEmail, weight: 10, href: 'security/login-security.html' },
        { label: 'No more than 3 other active sessions', ok: otherSessions <= 3, weight: 10, href: 'security/index.html#sessions' },
        { label: 'IP allowlist enabled for sign-in', ok: sec.ipAllowlistEnabled, weight: 10, href: 'security/login-security.html' },
        { label: 'No unused API keys (idle 90+ days)', ok: !keys.some((k) => -daysUntil(k.lastUsed) > 90), weight: 10, href: 'account/api.html' }
      ];
      const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
      return { score, checks, rating: score >= 80 ? 'Strong' : score >= 55 ? 'Fair' : 'Weak' };
    },

    /* ---------- Cron ---------- */
    cronField(field, min, max) {
      const values = new Set();
      field.split(',').forEach((part) => {
        const [range, stepText] = part.split('/');
        const step = stepText ? Number(stepText) : 1;
        let start = min; let end = max;
        if (range !== '*') {
          const bounds = range.split('-').map(Number);
          start = bounds[0]; end = bounds.length > 1 ? bounds[1] : (stepText ? max : bounds[0]);
        }
        if ([start, end, step].some((n) => isNaN(n)) || start < min || end > max || step < 1) throw new Error('Invalid field');
        for (let v = start; v <= end; v += step) values.add(v);
      });
      return values;
    },
    parseCron(expr) {
      const parts = String(expr).trim().split(/\s+/);
      if (parts.length !== 5) return null;
      try {
        return {
          minute: Services.cronField(parts[0], 0, 59),
          hour: Services.cronField(parts[1], 0, 23),
          day: Services.cronField(parts[2], 1, 31),
          month: Services.cronField(parts[3], 1, 12),
          weekday: Services.cronField(parts[4].replace(/7/g, '0'), 0, 6),
          dayAny: parts[2] === '*', weekdayAny: parts[4] === '*'
        };
      } catch (e) { return null; }
    },
    cronNext(expr, from) {
      const cron = Services.parseCron(expr);
      if (!cron) return null;
      const d = new Date(from || App.now());
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() + 1);
      for (let i = 0; i < 366 * 24 * 60; i++) {
        const dayMatch = cron.dayAny && cron.weekdayAny ? true
          : cron.dayAny ? cron.weekday.has(d.getDay())
            : cron.weekdayAny ? cron.day.has(d.getDate())
              : cron.day.has(d.getDate()) || cron.weekday.has(d.getDay());
        if (cron.month.has(d.getMonth() + 1) && dayMatch && cron.hour.has(d.getHours()) && cron.minute.has(d.getMinutes())) return d;
        d.setMinutes(d.getMinutes() + 1);
      }
      return null;
    },
    cronDescribe(expr) {
      const presets = {
        '* * * * *': 'Every minute', '*/5 * * * *': 'Every 5 minutes', '*/15 * * * *': 'Every 15 minutes', '*/30 * * * *': 'Every 30 minutes',
        '0 * * * *': 'Hourly', '0 0 * * *': 'Daily at 00:00', '0 0 * * 0': 'Weekly on Sunday at 00:00', '0 0 1 * *': 'Monthly on the 1st at 00:00'
      };
      if (presets[expr]) return presets[expr];
      const parts = String(expr).split(/\s+/);
      if (parts.length !== 5) return 'Invalid expression';
      const [m, h, dom, mon, dow] = parts;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (/^\d+$/.test(m) && /^\d+$/.test(h)) {
        const time = Util.pad(h) + ':' + Util.pad(m);
        if (dom === '*' && mon === '*' && dow === '*') return 'Daily at ' + time;
        if (dom === '*' && mon === '*' && /^\d$/.test(dow)) return 'Weekly on ' + days[Number(dow) % 7] + ' at ' + time;
        if (/^\d+$/.test(dom) && mon === '*' && dow === '*') return 'Monthly on day ' + dom + ' at ' + time;
      }
      if (/^\*\/\d+$/.test(m) && h === '*' && dom === '*' && mon === '*' && dow === '*') return 'Every ' + m.slice(2) + ' minutes';
      return 'Custom schedule';
    },

    /* ---------- Deterministic series for charts ---------- */
    series(seed, count, base, variance, floor, ceil) {
      let state = 0;
      for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0;
      const out = [];
      let value = base;
      for (let i = 0; i < count; i++) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const noise = (state / 4294967296 - 0.5) * variance;
        value = Math.max(floor === undefined ? 0 : floor, Math.min(ceil === undefined ? 100 : ceil, value * 0.6 + (base + noise) * 0.4));
        out.push(Math.round(value * 10) / 10);
      }
      return out;
    },

    ticketCounts() {
      const counts = { Open: 0, Pending: 0, Resolved: 0, Closed: 0 };
      Store.get('tickets').forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
      return counts;
    },
    unreadNotifications() {
      return Store.get('notifications').filter((n) => !n.read).length;
    },
    teamRoles: ['Owner', 'Administrator', 'Billing', 'Support', 'Developer', 'Viewer'],
    rolePermissions: {
      Owner: ['domains', 'dns', 'hosting', 'email', 'billing', 'security', 'support', 'team', 'api'],
      Administrator: ['domains', 'dns', 'hosting', 'email', 'billing', 'security', 'support', 'team', 'api'],
      Billing: ['billing', 'support'],
      Support: ['support', 'email'],
      Developer: ['dns', 'hosting', 'email', 'support', 'api'],
      Viewer: []
    }
  };

  window.Services = Services;
})();
