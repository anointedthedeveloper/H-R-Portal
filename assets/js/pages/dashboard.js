/* Dashboard */
(function () {
  'use strict';
  const { esc, daysUntil } = Util;
  const icon = Icons.icon;

  function alertsHTML() {
    const alerts = [];
    Services.overdueInvoices().forEach((inv) => {
      alerts.push(View.alert('critical', '<strong>Invoice ' + inv.id + ' is overdue</strong> (' + fmt.money(Services.invoiceTotal(inv)) + ', due ' + fmt.date(inv.due) + ').' +
        (inv.items.some((i) => (Services.account(i.relatedId) || {}).status === 'Suspended') ? ' The related hosting account is suspended.' : ''),
        '<a class="btn btn-primary btn-sm" href="' + App.url('billing/invoice.html?id=' + inv.id) + '">Pay now</a>'));
    });
    Services.domains().forEach((d) => {
      const status = Services.domainStatus(d);
      if (status === 'Expiring Soon' && !d.autoRenew) {
        alerts.push(View.alert('warning', '<strong>' + esc(d.name) + '</strong> expires in ' + daysUntil(d.expires) + ' days (' + fmt.date(d.expires) + ') and auto-renewal is off.',
          '<a class="btn btn-secondary btn-sm" href="' + App.url('domains/index.html?renew=' + encodeURIComponent(d.name)) + '">Renew</a>'));
      }
      if (status === 'Expired') {
        alerts.push(View.alert('warning', '<strong>' + esc(d.name) + '</strong> expired on ' + fmt.date(d.expires) + '. It can be restored during the grace period.',
          '<a class="btn btn-secondary btn-sm" href="' + App.url('domains/index.html?renew=' + encodeURIComponent(d.name)) + '">Restore</a>'));
      }
    });
    Store.get('sslCertificates').filter((c) => c.status === 'Expired').forEach((c) => {
      alerts.push(View.alert('warning', 'SSL certificate for <strong>' + esc(c.domain) + '</strong> expired on ' + fmt.date(c.expires) + '.',
        '<a class="btn btn-secondary btn-sm" href="' + App.url('hosting/ssl.html') + '">View</a>'));
    });
    return alerts.length ? '<div class="alerts">' + alerts.slice(0, 4).join('') + '</div>' : '';
  }

  function statsHTML() {
    const domains = Services.domains();
    const activeDomains = domains.filter((d) => ['Active', 'Expiring Soon'].indexOf(Services.domainStatus(d)) !== -1);
    const expiring = domains.filter((d) => Services.domainStatus(d) === 'Expiring Soon').length;
    const accounts = Services.accounts();
    const suspended = accounts.filter((a) => a.status === 'Suspended').length;
    const certs = Store.get('sslCertificates');
    const activeCerts = certs.filter((c) => c.status === 'Active');
    const soon = activeCerts.filter((c) => daysUntil(c.expires) <= 30).length;
    const mailboxes = Store.get('mailboxes');
    const usedMB = mailboxes.reduce((s, m) => s + m.usedMB, 0);
    const open = Services.openInvoices();
    const overdue = Services.overdueInvoices().length;
    const counts = Services.ticketCounts();
    return '<div class="grid grid-6 stats-grid">' +
      View.stat({ label: 'Active Domains', value: activeDomains.length, icon: 'globe', href: 'domains/index.html', meta: expiring ? '<strong>' + expiring + '</strong> expiring within 30 days' : 'None expiring soon' }) +
      View.stat({ label: 'Hosting Accounts', value: accounts.length, icon: 'server', href: 'hosting/accounts.html', meta: suspended ? '<strong>' + suspended + '</strong> suspended' : 'All active' }) +
      View.stat({ label: 'SSL Certificates', value: activeCerts.length + '/' + certs.length, icon: 'lock', href: 'hosting/ssl.html', meta: (certs.length - activeCerts.length ? '<strong>' + (certs.length - activeCerts.length) + '</strong> expired' : 'All valid') + (soon ? ', ' + soon + ' renewing soon' : '') }) +
      View.stat({ label: 'Email Accounts', value: mailboxes.length, icon: 'mail', href: 'email/mailboxes.html', meta: fmt.mb(usedMB) + ' stored' }) +
      View.stat({ label: 'Outstanding Balance', value: fmt.money(Services.outstanding()), icon: 'card', href: 'billing/invoices.html', meta: open.length + ' open invoice' + (open.length === 1 ? '' : 's') + (overdue ? ', <strong>' + overdue + ' overdue</strong>' : '') }) +
      View.stat({ label: 'Open Support Tickets', value: counts.Open + counts.Pending, icon: 'lifebuoy', href: 'support/tickets.html', meta: counts.Open + ' open, ' + counts.Pending + ' pending' }) +
      '</div>';
  }

  function domainsPanel() {
    const rows = Services.domains().slice().sort((a, b) => a.expires.localeCompare(b.expires)).slice(0, 6);
    return View.panel({
      title: 'Domain Overview',
      subtitle: 'Sorted by expiry date',
      actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('domains/index.html') + '">All domains</a>',
      flush: true,
      body: '<div class="table-wrap"><table class="table"><thead><tr><th>Domain</th><th>Status</th><th>Expires</th><th>Auto renewal</th><th class="col-actions">Actions</th></tr></thead><tbody>' +
        rows.map((d) => {
          const days = daysUntil(d.expires);
          return '<tr><td><span class="cell-main">' + esc(d.name) + '</span></td><td>' + View.badge(Services.domainStatus(d)) + '</td>' +
            '<td class="nowrap">' + fmt.date(d.expires) + '<span class="cell-sub">' + (days >= 0 ? 'in ' + days + ' days' : Math.abs(days) + ' days ago') + '</span></td>' +
            '<td>' + (d.autoRenew ? 'Enabled' : '<strong>Disabled</strong>') + '</td>' +
            '<td class="col-actions"><div class="row-actions"><a class="btn btn-secondary btn-xs" href="' + App.url('domains/index.html?manage=' + encodeURIComponent(d.name)) + '">Manage</a>' +
            (/^Pending/.test(d.status) ? '' : '<a class="btn btn-secondary btn-xs" href="' + App.url('domains/dns.html?domain=' + encodeURIComponent(d.name)) + '">DNS</a>') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>'
    });
  }

  function hostingPanel(account) {
    const plan = Services.plan(account.planId);
    const u = account.usage;
    const ssl = Store.get('sslCertificates').filter((c) => c.hostingId === account.id);
    return View.panel({
      title: 'Hosting Overview',
      subtitle: account.ref + ' on ' + account.server + ' (' + account.location + ')',
      actions: '<label class="sr-only" for="dash-account">Hosting account</label><select id="dash-account" class="select select-sm">' + View.options(Services.accountOptions(), account.id) + '</select>',
      body:
        (account.status === 'Suspended' ? View.alert('critical', 'This account is suspended: ' + esc(account.suspendReason || 'contact billing') + '.', '<a class="btn btn-primary btn-sm" href="' + App.url('billing/invoices.html') + '">Resolve</a>') + '<div class="mt-16"></div>' : '') +
        '<div class="spec-grid">' +
          spec('Plan', plan.name) + spec('Status', View.badge(account.status)) +
          spec('Storage', u.storageGB + ' / ' + plan.storageGB + ' GB') + spec('Bandwidth', fmt.number(u.bandwidthGB) + ' / ' + fmt.number(plan.bandwidthGB) + ' GB') +
          spec('CPU', plan.cpu + ' vCPU') + spec('RAM', plan.ramGB + ' GB') +
          spec('Websites', u.websites + ' / ' + plan.websites) + spec('SSL', ssl.filter((c) => c.status === 'Active').length + ' active (' + esc(plan.ssl) + ')') +
        '</div>' +
        '<h3 class="panel-title mt-16 mb-8">Resource Usage</h3>' +
        View.meter({ label: 'Disk Usage', used: u.storageGB, total: plan.storageGB, text: u.storageGB + ' GB of ' + plan.storageGB + ' GB' }) +
        View.meter({ label: 'Bandwidth (this month)', used: u.bandwidthGB, total: plan.bandwidthGB, text: fmt.number(u.bandwidthGB) + ' GB of ' + fmt.number(plan.bandwidthGB) + ' GB' }) +
        View.meter({ label: 'CPU', percent: u.cpu, text: 'avg. last hour' }) +
        View.meter({ label: 'Memory', used: u.ramGB, total: plan.ramGB, text: u.ramGB + ' GB of ' + plan.ramGB + ' GB' }) +
        View.meter({ label: 'Inodes', used: u.inodes, total: plan.inodes, text: fmt.number(u.inodes) + ' of ' + fmt.number(plan.inodes) }),
      footer: '<span class="muted">Renews ' + fmt.date(account.renewal) + ' (' + esc(account.billingCycle.toLowerCase()) + ')</span><a class="panel-link" href="' + App.url('hosting/resources.html?account=' + account.id) + '">Detailed usage</a>'
    });
  }

  function spec(label, value) {
    return '<div class="spec"><small>' + esc(label) + '</small><strong>' + value + '</strong></div>';
  }

  function billingPanel() {
    const open = Services.openInvoices();
    const next = open[0];
    const last = Services.lastPayment();
    const upcoming = Services.upcomingRenewal();
    return View.panel({
      title: 'Billing Summary',
      actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('billing/index.html') + '">Billing</a>',
      body: View.kv([
        ['Current balance', '<strong>' + fmt.money(Services.outstanding()) + '</strong>'],
        ['Next payment', next ? fmt.money(Services.invoiceTotal(next)) + ' due ' + fmt.date(next.due) + '<span class="cell-sub"><a href="' + App.url('billing/invoice.html?id=' + next.id) + '">' + next.id + '</a> ' + View.badge(Services.invoiceStatus(next)) + '</span>' : 'Nothing due'],
        ['Last payment', last ? fmt.money(last.amount) + ' on ' + fmt.date(last.date) + '<span class="cell-sub">' + esc(last.method) + '</span>' : '-'],
        ['Upcoming invoice', upcoming ? fmt.money(upcoming.total) + ' on ' + fmt.date(upcoming.invoiceDate) + '<span class="cell-sub">' + upcoming.subscriptions.map((s) => esc(s.plan)).join(', ') + '</span>' : 'None scheduled'],
        ['Account credit', fmt.money(Store.get('accountCredit'))]
      ]),
      footer: next ? '<span class="muted">' + open.length + ' open invoice' + (open.length === 1 ? '' : 's') + '</span><a class="btn btn-primary btn-sm" href="' + App.url('billing/invoice.html?id=' + next.id) + '">Pay ' + next.id + '</a>' : '<span class="muted">All invoices are paid.</span>'
    });
  }

  function activityPanel() {
    const icons = { DNS: 'globe', Domains: 'globe', Billing: 'card', Hosting: 'server', SSL: 'lock', Security: 'shield', Email: 'mail', Support: 'lifebuoy', Account: 'user' };
    const items = Store.get('activity').slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    return View.panel({
      title: 'Recent Activity',
      actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('account/activity.html') + '">Activity log</a>',
      flush: true,
      body: '<ul class="list">' + items.map((a) =>
        '<li class="list-item"><span class="list-icon">' + icon(icons[a.category] || 'activity', 14) + '</span><span class="list-item-main"><span class="list-item-title">' + esc(a.action) + '</span><span class="list-item-sub">' + esc(a.target) + '</span></span>' +
        '<span class="list-item-meta" title="' + fmt.datetime(a.date) + '">' + fmt.relative(a.date) + '<br>' + esc(a.user) + '</span></li>').join('') + '</ul>'
    });
  }

  function ticketsPanel() {
    const tickets = Store.get('tickets').filter((t) => t.status === 'Open' || t.status === 'Pending').sort((a, b) => b.updated.localeCompare(a.updated));
    return View.panel({
      title: 'Active Support Tickets',
      actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('support/tickets.html?new=1') + '">' + icon('plus', 14) + 'New ticket</a>',
      flush: true,
      body: tickets.length ? '<ul class="list">' + tickets.map((t) =>
        '<li><a class="list-item" href="' + App.url('support/ticket.html?id=' + t.id) + '"><span class="list-item-main"><span class="list-item-title">' + esc(t.subject) + '</span><span class="list-item-sub">' + t.id + ' - ' + esc(t.department) + ' - updated ' + fmt.relative(t.updated) + '</span></span>' + View.badge(t.status) + '</a></li>').join('') + '</ul>'
        : View.empty({ title: 'No active tickets', text: 'Everything is running smoothly.' })
    });
  }

  function statusPanel() {
    return View.panel({
      title: 'Service Status',
      flush: true,
      body: Store.get('serviceStatus').map((s) => '<div class="status-row"><span>' + esc(s.name) + (s.note ? '<small>' + esc(s.note) + '</small>' : '') + '</span>' + View.badge(s.status) + '</div>').join(''),
      footer: '<a class="panel-link" href="' + App.url('support/index.html#status') + '">Status details</a>'
    });
  }

  function quickActions() {
    const actions = [
      ['globe', 'Register a domain', 'domains/search.html'], ['edit', 'Edit DNS records', 'domains/dns.html'], ['mail', 'Create a mailbox', 'email/mailboxes.html?new=1'],
      ['folder', 'Open file manager', 'hosting/file-manager.html'], ['download', 'Run a backup', 'hosting/backups.html'], ['card', 'Pay an invoice', 'billing/invoices.html?status=Unpaid']
    ];
    return View.panel({
      title: 'Quick Actions',
      flush: true,
      body: '<ul class="list">' + actions.map((a) => '<li><a class="list-item" href="' + App.url(a[2]) + '"><span class="list-icon">' + icon(a[0], 14) + '</span><span class="list-item-main list-item-title">' + a[1] + '</span>' + icon('chevronRight', 14) + '</a></li>').join('') + '</ul>'
    });
  }

  App.page('dashboard', (root) => {
    const profile = Store.get('profile');
    let account = Services.account(Store.ui('dashAccount')) || Services.accounts()[0];
    const firstName = profile.name.split(' ')[0];

    function render() {
      root.innerHTML = View.pageHeader({
        title: 'Dashboard',
        description: 'Welcome back, ' + firstName + '. Service overview for ' + profile.company + ' (' + profile.customerId + ').',
        crumbs: [],
        actions: '<a class="btn btn-secondary" href="' + App.url('domains/search.html') + '">' + icon('search', 14) + 'Register domain</a>' +
          '<a class="btn btn-primary" href="' + App.url('support/tickets.html?new=1') + '">' + icon('plus', 14) + 'Open ticket</a>'
      }) +
      alertsHTML() + statsHTML() +
      '<div class="grid grid-main section">' + domainsPanel() + billingPanel() + '</div>' +
      '<div class="grid grid-main section"><div id="hosting-slot">' + hostingPanel(account) + '</div>' + activityPanel() + '</div>' +
      '<div class="grid grid-3 section">' + ticketsPanel() + statusPanel() + quickActions() + '</div>';
      bindAccountSelect();
    }

    function bindAccountSelect() {
      const select = root.querySelector('#dash-account');
      select.addEventListener('change', () => {
        account = Services.account(select.value);
        Store.ui('dashAccount', account.id);
        root.querySelector('#hosting-slot').innerHTML = hostingPanel(account);
        bindAccountSelect();
        root.querySelector('#dash-account').focus();
      });
    }

    render();
  });
})();
