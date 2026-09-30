/* Hosting: overview, accounts, resources, file manager, SSL, backups, FTP, databases, PHP, cron. */
(function () {
  'use strict';
  const { esc, daysUntil, uid } = Util;
  const icon = Icons.icon;

  function accountSelectHTML(account) {
    return '<label class="sr-only" for="account-select">Hosting account</label><select id="account-select" class="select">' + View.options(Services.accountOptions(), account.id) + '</select>';
  }

  /* Wires the header account selector; `render` is called with the new account. */
  function bindAccountSelect(root, render) {
    root.addEventListener('change', (e) => {
      if (e.target.id !== 'account-select') return;
      Services.rememberAccount(e.target.value);
      render(Services.account(e.target.value));
    });
  }

  function suspendedNotice(account) {
    return account.status === 'Suspended'
      ? View.alert('critical', '<strong>' + esc(account.ref) + ' is suspended.</strong> ' + esc(account.suspendReason || '') + '. Changes are disabled until the account is reactivated.', '<a class="btn btn-primary btn-sm" href="' + App.url('billing/invoices.html?status=Overdue') + '">Pay overdue invoice</a>') + '<div class="mb-16"></div>'
      : '';
  }

  function guardSuspended(account) {
    if (account.status !== 'Suspended') return false;
    UI.toast(account.ref + ' is suspended. Pay the overdue invoice to make changes.', 'error');
    return true;
  }

  function spec(label, value) {
    return '<div class="spec"><small>' + esc(label) + '</small><strong>' + value + '</strong></div>';
  }

  function hostingHeader(root, opts, account) {
    root.innerHTML = View.pageHeader({
      title: opts.title,
      description: opts.description,
      crumbs: [['Hosting', 'hosting/index.html'], [opts.crumb || opts.title]],
      actions: (account ? accountSelectHTML(account) : '') + (opts.actions || '')
    }) + '<div id="page-body"></div>';
    return root.querySelector('#page-body');
  }

  /* ---------- Overview ---------- */
  App.page('hosting.index', (root) => {
    const accounts = Services.accounts();
    const body = hostingHeader(root, { title: 'Hosting', crumb: 'Overview', description: 'All hosting accounts, their health and the tools available for each.', actions: '<a class="btn btn-primary" href="' + App.url('hosting/accounts.html') + '">Manage accounts</a>' });
    const totals = accounts.reduce((t, a) => { const p = Services.plan(a.planId); t.storage += a.usage.storageGB; t.cap += p.storageGB; t.sites += a.usage.websites; t.dbs += a.usage.databases; return t; }, { storage: 0, cap: 0, sites: 0, dbs: 0 });
    const tools = [
      ['folder', 'File Manager', 'Browse and edit files', 'hosting/file-manager.html'],
      ['lock', 'SSL Certificates', Store.get('sslCertificates').length + ' certificates', 'hosting/ssl.html'],
      ['download', 'Backups', Store.get('backups').length + ' restore points', 'hosting/backups.html'],
      ['upload', 'FTP Accounts', Store.get('ftpAccounts').length + ' accounts', 'hosting/ftp.html'],
      ['database', 'Databases', Store.get('databases').length + ' databases', 'hosting/databases.html'],
      ['terminal', 'PHP Settings', 'Versions and limits', 'hosting/php.html'],
      ['clock', 'Cron Jobs', Store.get('cronJobs').filter((c) => c.status === 'Enabled').length + ' scheduled', 'hosting/cron.html'],
      ['activity', 'Resource Usage', 'CPU, memory and I/O', 'hosting/resources.html']
    ];
    body.innerHTML = '<div class="grid grid-4 stats-grid">' +
      View.stat({ label: 'Accounts', value: accounts.length, meta: accounts.filter((a) => a.status === 'Active').length + ' active, ' + accounts.filter((a) => a.status === 'Suspended').length + ' suspended' }) +
      View.stat({ label: 'Storage used', value: totals.storage.toFixed(1) + ' GB', meta: 'of ' + totals.cap + ' GB allocated' }) +
      View.stat({ label: 'Websites', value: totals.sites, meta: 'across all accounts' }) +
      View.stat({ label: 'Databases', value: totals.dbs, meta: Store.get('databases').reduce((s, d) => s + d.sizeMB, 0) > 0 ? fmt.mb(Store.get('databases').reduce((s, d) => s + d.sizeMB, 0)) + ' total' : '' }) +
      '</div>' +
      '<div class="grid grid-2 section">' + accounts.map((a) => {
        const plan = Services.plan(a.planId);
        return View.panel({
          className: 'service-card',
          title: a.primaryDomain,
          subtitle: a.ref + ' - ' + plan.name + ' - ' + a.server + ' (' + a.location + ')',
          actions: View.badge(a.status),
          body: (a.status === 'Suspended' ? View.alert('critical', esc(a.suspendReason)) + '<div class="mb-16"></div>' : '') +
            View.meter({ label: 'Disk', used: a.usage.storageGB, total: plan.storageGB, text: a.usage.storageGB + ' / ' + plan.storageGB + ' GB' }) +
            View.meter({ label: 'Bandwidth', used: a.usage.bandwidthGB, total: plan.bandwidthGB, text: fmt.number(a.usage.bandwidthGB) + ' / ' + fmt.number(plan.bandwidthGB) + ' GB' }) +
            View.meter({ label: 'CPU', percent: a.usage.cpu, text: plan.cpu + ' vCPU' }),
          footer: '<span class="muted">IP ' + a.ip + ' - renews ' + fmt.date(a.renewal) + '</span><span class="flex"><a class="btn btn-secondary btn-sm" href="' + App.url('hosting/resources.html?account=' + a.id) + '">Usage</a><a class="btn btn-primary btn-sm" href="' + App.url('hosting/accounts.html#' + a.id) + '">Manage</a></span>'
        });
      }).join('') + '</div>' +
      '<div class="section">' + View.panel({ title: 'Tools', flush: true, body: '<div class="grid grid-4" style="gap:0">' + tools.map((t) =>
        '<a class="list-item" href="' + App.url(t[3]) + '" style="border-right:1px solid var(--gray-150)"><span class="list-icon">' + icon(t[0], 14) + '</span><span class="list-item-main"><span class="list-item-title">' + t[1] + '</span><span class="list-item-sub">' + t[2] + '</span></span></a>').join('') + '</div>' }) + '</div>';
  });

  /* ---------- Accounts ---------- */
  App.page('hosting.accounts', (root) => {
    const body = hostingHeader(root, { title: 'Hosting Accounts', description: 'Plans, allocations and server details for each hosting account.' });

    function render() {
      const accounts = Services.accounts();
      const plans = Store.get('hostingPlans');
      body.innerHTML = accounts.map((a) => {
        const plan = Services.plan(a.planId);
        const u = a.usage;
        const sslCount = Store.get('sslCertificates').filter((c) => c.hostingId === a.id && c.status === 'Active').length;
        const schedule = Store.get('backupSchedules')[a.id];
        const mailboxes = Store.get('mailboxes').filter((m) => m.address.split('@')[1] === a.primaryDomain).length;
        return '<div id="' + a.id + '" class="mb-16">' + View.panel({
          title: plan.name + ' - ' + a.primaryDomain,
          subtitle: a.ref + ' - created ' + fmt.date(a.created) + ' - billed ' + a.billingCycle.toLowerCase(),
          actions: View.badge(a.status) + UI.menu([
            { action: 'panel', label: 'Open control panel', icon: 'external', data: ' data-account="' + a.id + '"' },
            { action: 'upgrade', label: 'Change plan', icon: 'arrowUp', data: ' data-account="' + a.id + '"', disabled: a.status === 'Suspended' },
            { action: 'renew', label: 'Renew now', icon: 'refresh', data: ' data-account="' + a.id + '"' },
            { action: 'restart', label: 'Restart PHP processes', icon: 'refresh', data: ' data-account="' + a.id + '"', disabled: a.status === 'Suspended' },
            { divider: true },
            { action: 'cancel', label: 'Request cancellation', icon: 'x', danger: true, data: ' data-account="' + a.id + '"' }
          ], { label: 'Actions for ' + a.ref }),
          body: (a.status === 'Suspended' ? View.alert('critical', '<strong>Suspended:</strong> ' + esc(a.suspendReason) + '. Websites, email and FTP for this account are offline.', '<a class="btn btn-primary btn-sm" href="' + App.url('billing/invoices.html?status=Overdue') + '">Pay now</a>') + '<div class="mb-16"></div>' : '') +
            '<div class="grid grid-main"><div class="spec-grid">' +
              spec('Storage', u.storageGB + ' / ' + plan.storageGB + ' GB') +
              spec('Bandwidth', fmt.number(u.bandwidthGB) + ' / ' + fmt.number(plan.bandwidthGB) + ' GB') +
              spec('Websites', u.websites + ' / ' + plan.websites) +
              spec('Databases', u.databases + ' / ' + plan.databases) +
              spec('Email accounts', mailboxes + ' / ' + plan.emails) +
              spec('SSL', sslCount + ' active - ' + esc(plan.ssl)) +
              spec('Backups', esc(schedule ? schedule.frequency + ', ' + schedule.retention + ' kept' : plan.backups)) +
              spec('Renewal date', fmt.date(a.renewal)) +
              spec('Status', View.badge(a.status)) +
              spec('CPU / RAM', plan.cpu + ' vCPU / ' + plan.ramGB + ' GB') +
              spec('Inodes', fmt.number(u.inodes) + ' / ' + fmt.number(plan.inodes)) +
              spec('Price', fmt.money(a.billingCycle === 'Annually' ? plan.price * 12 : plan.price) + (a.billingCycle === 'Annually' ? '/yr' : '/mo')) +
            '</div>' +
            '<div>' + View.kv([
              ['Server', a.server + ' (' + esc(a.location) + ')'],
              ['IP address', View.copyable(a.ip)],
              ['Username', '<span class="mono">' + a.username + '</span>'],
              ['Home directory', '<span class="mono">/home/' + a.username + '</span>'],
              ['Nameservers', 'ns1.examplehost.com<br>ns2.examplehost.com'],
              ['Control panel', esc(a.panel)]
            ]) + '</div></div>',
          footer: '<span class="flex flex-wrap"><a class="btn btn-secondary btn-sm" href="' + App.url('hosting/file-manager.html?account=' + a.id) + '">' + icon('folder', 14) + 'Files</a>' +
            '<a class="btn btn-secondary btn-sm" href="' + App.url('hosting/backups.html?account=' + a.id) + '">' + icon('download', 14) + 'Backups</a>' +
            '<a class="btn btn-secondary btn-sm" href="' + App.url('hosting/databases.html?account=' + a.id) + '">' + icon('database', 14) + 'Databases</a>' +
            '<a class="btn btn-secondary btn-sm" href="' + App.url('hosting/resources.html?account=' + a.id) + '">' + icon('activity', 14) + 'Usage</a></span>' +
            '<button type="button" class="btn btn-primary btn-sm" data-action="panel" data-account="' + a.id + '">' + icon('external', 14) + 'Open control panel</button>'
        }) + '</div>';
      }).join('') +
      View.panel({
        title: 'Plan comparison', flush: true,
        body: '<div class="table-wrap"><table class="table"><thead><tr><th>Plan</th><th>Price</th><th>Storage</th><th>Bandwidth</th><th>Websites</th><th>Databases</th><th>Email</th><th>CPU / RAM</th><th>Backups</th><th>SSL</th></tr></thead><tbody>' +
          plans.map((p) => '<tr><td><strong>' + p.name + '</strong></td><td>' + fmt.money(p.price) + '/mo</td><td>' + p.storageGB + ' GB</td><td>' + fmt.number(p.bandwidthGB) + ' GB</td><td>' + p.websites + '</td><td>' + p.databases + '</td><td>' + p.emails + '</td><td>' + p.cpu + ' / ' + p.ramGB + ' GB</td><td>' + p.backups + '</td><td>' + p.ssl + '</td></tr>').join('') + '</tbody></table></div>'
      });
    }

    body.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-action][data-account]');
      if (!el || el.disabled) return;
      const account = Services.account(el.dataset.account);
      const plan = Services.plan(account.planId);
      switch (el.dataset.action) {
        case 'panel':
          if (guardSuspended(account)) return;
          UI.modal({ title: 'Control panel single sign-on', size: 'sm', body: '<p>In production this opens ' + esc(account.panel) + ' for <strong>' + esc(account.username) + '</strong> on ' + account.server + ' in a new window.</p>' + View.demoNote('Demo environment: no control panel session is created.') });
          App.log('Hosting', 'Control panel login', account.ref);
          break;
        case 'restart':
          UI.toast('PHP processes restarted on ' + account.server + ' for ' + account.ref + '. Demo action completed successfully.');
          App.log('Hosting', 'PHP processes restarted', account.ref);
          break;
        case 'renew': {
          const open = Services.openInvoices().find((inv) => inv.items.some((i) => i.relatedId === account.id));
          if (open) { location.href = App.url('billing/invoice.html?id=' + open.id + '&pay=1'); return; }
          const amount = account.billingCycle === 'Annually' ? Math.round(plan.price * 12 * 100) / 100 : plan.price;
          if (!(await UI.confirm({ title: 'Renew ' + account.ref, message: 'Create an invoice for ' + fmt.money(amount) + ' to renew ' + plan.name + ' (' + account.billingCycle.toLowerCase() + ') from ' + fmt.date(account.renewal) + '?', confirmLabel: 'Create invoice' }))) return;
          const invoice = Services.createInvoice([{ description: plan.name + ' ' + account.ref + ' renewal from ' + fmt.date(account.renewal), amount, relatedId: account.id }]);
          location.href = App.url('billing/invoice.html?id=' + invoice.id + '&pay=1');
          break;
        }
        case 'upgrade':
          UI.formModal({
            title: 'Change plan',
            subtitle: account.ref + ' - currently ' + plan.name,
            fields: [
              { name: 'plan', label: 'New plan', type: 'select', value: plan.id, options: Store.get('hostingPlans').map((p) => ({ value: p.id, label: p.name + ' - ' + fmt.money(p.price) + '/mo' + (p.id === plan.id ? ' (current)' : '') })) },
              { name: 'summary', type: 'static', label: 'Summary', html: '<div id="plan-summary" class="muted"></div>' }
            ],
            submitLabel: 'Change plan',
            onChange: (values, form) => {
              const next = Services.plan(values.plan);
              const smaller = next.storageGB < account.usage.storageGB || next.websites < account.usage.websites;
              form.querySelector('#plan-summary').innerHTML = next.id === plan.id ? 'Select a different plan.' :
                (smaller ? '<strong>Current usage exceeds the ' + esc(next.name) + ' limits.</strong> ' : '') +
                'Monthly price changes from ' + fmt.money(plan.price) + ' to ' + fmt.money(next.price) + '. ' + (next.price > plan.price ? 'A prorated invoice for the remainder of the current period is created.' : 'The difference is added as account credit.');
            },
            onSubmit: (values) => {
              const next = Services.plan(values.plan);
              if (next.id === plan.id) return { field: 'plan', message: 'Select a different plan.' };
              if (next.storageGB < account.usage.storageGB || next.websites < account.usage.websites) return { field: 'plan', message: 'Reduce usage below the plan limits before downgrading.' };
              Store.patch('hostingAccounts', account.id, { planId: next.id });
              Store.update('subscriptions', (list) => list.forEach((s) => { if (s.relatedId === account.id) { s.plan = next.name; s.price = account.billingCycle === 'Annually' ? Math.round(next.price * 12 * 100) / 100 : next.price; } }));
              App.log('Hosting', 'Plan changed', account.ref + ': ' + plan.name + ' to ' + next.name);
              const days = Math.max(1, daysUntil(account.renewal) % 31);
              const diff = Math.round(((next.price - plan.price) * days / 30) * 100) / 100;
              if (diff > 0) Services.createInvoice([{ description: 'Plan change ' + account.ref + ': ' + plan.name + ' to ' + next.name + ' (prorated ' + days + ' days)', amount: diff, relatedId: account.id }]);
              else Store.set('accountCredit', Math.round((Store.get('accountCredit') + Math.abs(diff)) * 100) / 100);
              UI.toast(account.ref + ' moved to ' + next.name + '.');
              render();
            }
          });
          break;
        case 'cancel':
          if (await UI.confirm({ title: 'Request cancellation', message: 'Submit a cancellation request for ' + account.ref + ' (' + account.primaryDomain + ')? Our team will confirm by ticket before anything is removed.', confirmLabel: 'Submit request', danger: true, requireText: account.ref })) {
            const id = 'TKT-' + (58300 + Store.get('tickets').length);
            const stamp = fmt.isoDateTime(App.now());
            Store.prepend('tickets', { id, subject: 'Cancellation request for ' + account.ref, department: 'Billing', priority: 'Medium', status: 'Open', created: stamp, updated: stamp, service: account.ref, messages: [{ author: Store.get('profile').name, role: 'client', date: stamp, body: 'Please cancel ' + account.ref + ' (' + account.primaryDomain + ') at the end of the current billing period.' }] });
            App.log('Hosting', 'Cancellation requested', account.ref);
            UI.toast('Cancellation request submitted as ' + id + '.');
          }
          break;
        default: break;
      }
    });

    render();
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 50);
    }
  });

  /* ---------- Resource usage ---------- */
  App.page('hosting.resources', (root) => {
    let account = Services.selectedAccount();
    let range = '24h';
    const body = hostingHeader(root, { title: 'Resource Usage', description: 'CPU, memory, storage, bandwidth, inode and process usage against plan limits.' }, account);
    bindAccountSelect(root, (a) => { account = a; render(); });

    function chart(values, max, limit, labels, unit) {
      const peak = Math.max.apply(null, values);
      return '<div class="bar-chart" role="img" aria-label="Chart, peak ' + peak + unit + '">' +
        values.map((v) => '<div class="bar' + (v === peak ? ' peak' : '') + '" style="height:' + Math.max(1, (v / max) * 100) + '%" title="' + v + unit + '"></div>').join('') +
        (limit ? '<div class="limit-line" style="bottom:' + (limit / max) * 100 + '%"><span>Limit ' + limit + unit + '</span></div>' : '') +
        '</div><div class="chart-axis">' + labels.map((l) => '<span>' + l + '</span>').join('') + '</div>';
    }

    function render() {
      const plan = Services.plan(account.planId);
      const u = account.usage;
      const suspended = account.status === 'Suspended';
      const points = range === '24h' ? 48 : range === '7d' ? 56 : 60;
      const labels = range === '24h' ? ['24h ago', '18h', '12h', '6h', 'Now'] : range === '7d' ? ['7d ago', '5d', '3d', '1d', 'Now'] : ['30d ago', '22d', '15d', '7d', 'Now'];
      const cpu = suspended ? new Array(points).fill(0) : Services.series(account.id + range + 'cpu', points, u.cpu, 60, 2, 100);
      const mem = suspended ? new Array(points).fill(0) : Services.series(account.id + range + 'mem', points, (u.ramGB / plan.ramGB) * 100, 30, 5, 100).map((v) => Math.round(v * plan.ramGB) / 100);
      const bw = Services.series(account.id + 'bw', 30, u.bandwidthGB / 30, u.bandwidthGB / 25, 0, u.bandwidthGB);
      const procs = suspended ? 0 : u.processes;
      const avgCpu = Math.round(cpu.reduce((s, v) => s + v, 0) / cpu.length);
      const limitHits = cpu.filter((v) => v >= 95).length;
      body.innerHTML = suspendedNotice(account) +
        '<div class="grid grid-3">' +
          View.panel({ title: 'CPU', subtitle: plan.cpu + ' vCPU allocated', body: View.meter({ label: 'Current', percent: suspended ? 0 : u.cpu, text: 'of allocation' }) + '<p class="muted small mt-8">Average ' + avgCpu + '% over ' + range + ', ' + limitHits + (limitHits === 1 ? ' sample' : ' samples') + ' at limit.</p>' }) +
          View.panel({ title: 'Memory (RAM)', subtitle: plan.ramGB + ' GB allocated', body: View.meter({ label: 'Physical memory', used: suspended ? 0 : u.ramGB, total: plan.ramGB, text: (suspended ? 0 : u.ramGB) + ' GB of ' + plan.ramGB + ' GB' }) }) +
          View.panel({ title: 'Disk', subtitle: plan.storageGB + ' GB SSD', body: View.meter({ label: 'Used space', used: u.storageGB, total: plan.storageGB, text: u.storageGB + ' GB of ' + plan.storageGB + ' GB' }) }) +
          View.panel({ title: 'Bandwidth', subtitle: 'Resets on the 1st', body: View.meter({ label: 'This month', used: u.bandwidthGB, total: plan.bandwidthGB, text: fmt.number(u.bandwidthGB) + ' GB of ' + fmt.number(plan.bandwidthGB) + ' GB' }) }) +
          View.panel({ title: 'Inodes', subtitle: 'Files and directories', body: View.meter({ label: 'Inodes used', used: u.inodes, total: plan.inodes, text: fmt.number(u.inodes) + ' of ' + fmt.number(plan.inodes) }) }) +
          View.panel({ title: 'Processes', subtitle: 'Entry processes', body: View.meter({ label: 'Concurrent', used: procs, total: plan.processes, text: procs + ' of ' + plan.processes }) }) +
        '</div>' +
        '<div class="section">' + View.panel({
          title: 'CPU and memory history',
          actions: '<div class="btn-group" role="group" aria-label="Time range">' + ['24h', '7d', '30d'].map((r) => '<button type="button" class="btn btn-secondary btn-sm' + (r === range ? ' active' : '') + '" data-range="' + r + '" aria-pressed="' + (r === range) + '">' + r + '</button>').join('') + '</div>',
          body: '<div class="grid grid-2"><div><div class="chart-legend"><span>CPU usage (%)</span><span>Peak <strong>' + Math.max.apply(null, cpu) + '%</strong></span><span>Average <strong>' + avgCpu + '%</strong></span></div>' + chart(cpu, 100, 100, labels, '%') + '</div>' +
            '<div><div class="chart-legend"><span>Memory (GB)</span><span>Peak <strong>' + Math.max.apply(null, mem) + ' GB</strong></span><span>Limit <strong>' + plan.ramGB + ' GB</strong></span></div>' + chart(mem, plan.ramGB, plan.ramGB, labels, ' GB') + '</div></div>'
        }) + '</div>' +
        '<div class="grid grid-main section">' +
          View.panel({ title: 'Daily bandwidth (last 30 days)', body: '<div class="chart-legend"><span>Transfer (GB)</span><span>Total <strong>' + fmt.number(Math.round(bw.reduce((s, v) => s + v, 0))) + ' GB</strong></span></div>' + chart(bw, Math.max.apply(null, bw) * 1.15, null, ['1 Sep', '8 Sep', '15 Sep', '22 Sep', '30 Sep'], ' GB') }) +
          View.panel({ title: 'Top processes', subtitle: 'Snapshot', flush: true, body: suspended ? View.empty({ title: 'No processes', text: 'The account is suspended.' }) :
            '<div class="table-wrap"><table class="table table-compact"><thead><tr><th>Command</th><th class="align-right">CPU</th><th class="align-right">Memory</th></tr></thead><tbody>' +
            [['php-fpm: pool ' + account.username, 0.42], ['php-fpm: pool ' + account.username, 0.21], ['mariadbd', 0.18], ['cron: ' + (Store.get('cronJobs').find((c) => c.hostingId === account.id) || { command: 'wp-cron.php' }).command.split('/').pop().split(' ')[0], 0.11], ['lsphp', 0.08]]
              .map((p) => '<tr><td class="mono">' + esc(p[0]) + '</td><td class="align-right">' + Math.round(u.cpu * p[1]) + '%</td><td class="align-right">' + Math.round(u.ramGB * 1024 * p[1]) + ' MB</td></tr>').join('') + '</tbody></table></div>' }) +
        '</div>';
    }

    body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-range]');
      if (btn) { range = btn.dataset.range; render(); body.querySelector('[data-range="' + range + '"]').focus(); }
    });
    render();
  });

  /* ---------- File manager ---------- */
  const TEXT_EXT = /\.(html?|css|js|json|txt|xml|php|md|htaccess|log|ini|conf|sh|yml|yaml|env)$|^\.htaccess$/i;

  function seedTree(account) {
    return { name: '', type: 'dir', modified: fmt.isoDateTime(App.now()), perms: '0750', children: [
      { name: 'public_html', type: 'dir', modified: account.created + 'T09:00:00', perms: '0750', children: [
        { name: 'index.html', type: 'file', size: 2048, modified: account.created + 'T09:00:00', perms: '0644', content: '<!doctype html>\n<title>' + account.primaryDomain + '</title>\n<h1>' + account.primaryDomain + '</h1>\n' }
      ] },
      { name: 'logs', type: 'dir', modified: account.created + 'T09:00:00', perms: '0750', children: [] },
      { name: 'tmp', type: 'dir', modified: account.created + 'T09:00:00', perms: '0755', children: [] },
      { name: 'mail', type: 'dir', modified: account.created + 'T09:00:00', perms: '0750', children: [] }
    ] };
  }

  App.page('hosting.files', (root) => {
    let account = Services.selectedAccount();
    let path = [];
    let selected = new Set();
    let filter = '';
    let sort = { key: 'name', dir: 'asc' };
    const body = hostingHeader(root, { title: 'File Manager', description: 'Browse, upload and edit files in the account home directory.' }, account);
    bindAccountSelect(root, (a) => { account = a; path = []; selected.clear(); filter = ''; renderAll(); });

    function tree() {
      const all = Store.get('files');
      if (!all[account.id]) { all[account.id] = seedTree(account); Store.set('files', all); }
      return all[account.id];
    }
    function save() { Store.set('files', Store.get('files')); }
    function nodeAt(p) {
      let node = tree();
      for (const name of p) {
        node = (node.children || []).find((c) => c.name === name && c.type === 'dir');
        if (!node) return null;
      }
      return node;
    }
    function current() { return nodeAt(path) || tree(); }
    function sizeOf(node) { return node.type === 'file' ? node.size || 0 : (node.children || []).reduce((s, c) => s + sizeOf(c), 0); }
    function fullPath(name) { return '/home/' + account.username + '/' + path.concat(name ? [name] : []).join('/'); }
    function touch(node) { node.modified = fmt.isoDateTime(App.now()); }
    function validName(name, dir, except) {
      if (!name) return 'Enter a name.';
      if (/[\/\\\0]/.test(name) || name === '.' || name === '..') return 'Names cannot contain slashes or be "." or "..".';
      if (name.length > 255) return 'Name is too long.';
      if ((dir.children || []).some((c) => c.name === name && c.name !== except)) return 'An item with this name already exists here.';
      return '';
    }

    function renderAll() {
      const suspended = account.status === 'Suspended';
      body.innerHTML = suspendedNotice(account) +
        '<div class="panel"><div class="fm-layout">' +
          '<nav class="fm-tree" aria-label="Folder tree"><ul id="fm-tree"></ul></nav>' +
          '<div class="fm-main">' +
            '<div class="fm-toolbar">' +
              '<button type="button" class="btn btn-primary btn-sm" data-fm="upload"' + (suspended ? ' disabled' : '') + '>' + icon('upload', 14) + 'Upload</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-fm="new-folder"' + (suspended ? ' disabled' : '') + '>' + icon('folder', 14) + 'New folder</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-fm="new-file"' + (suspended ? ' disabled' : '') + '>' + icon('file', 14) + 'New file</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-fm="up" aria-label="Up one level" data-tooltip="Up one level">' + icon('arrowUp', 14) + '</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-fm="refresh" aria-label="Refresh" data-tooltip="Refresh">' + icon('refresh', 14) + '</button>' +
              '<span class="divider-v"></span>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-fm="download-selected" disabled>' + icon('download', 14) + 'Download</button>' +
              '<button type="button" class="btn btn-danger btn-sm" data-fm="delete-selected" disabled>' + icon('trash', 14) + 'Delete</button>' +
              '<div class="dt-spacer"></div>' +
              '<div class="search-input">' + icon('search', 14) + '<input type="search" class="input input-sm" id="fm-search" placeholder="Search this folder" aria-label="Search this folder" value="' + esc(filter) + '"></div>' +
              '<input type="file" id="fm-upload" multiple hidden>' +
            '</div>' +
            '<div class="fm-path" id="fm-path" aria-label="Current path"></div>' +
            '<div class="table-wrap fm-drop" id="fm-drop"><table class="table fm-table"><thead><tr><th class="col-check"><input type="checkbox" id="fm-all" aria-label="Select all"></th>' +
              [['name', 'Name'], ['size', 'Size'], ['modified', 'Modified'], ['perms', 'Permissions']].map((c) => '<th><button type="button" class="th-sort' + (sort.key === c[0] ? ' active' : '') + '" data-sort="' + c[0] + '">' + c[1] + '<span class="sort-indicator">' + (sort.key === c[0] ? (sort.dir === 'asc' ? '&#9650;' : '&#9660;') : '&#8693;') + '</span></button></th>').join('') +
              '<th class="col-actions">Actions</th></tr></thead><tbody id="fm-rows"></tbody></table></div>' +
            '<div class="fm-status" id="fm-status"></div>' +
          '</div>' +
        '</div></div>' + View.demoNote('Files are simulated. Uploads record the file name and size only; file contents never leave your browser.');
      renderTree(); renderList();
    }

    function renderTree() {
      const build = (node, p) => (node.children || []).filter((c) => c.type === 'dir').sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
        const cp = p.concat(c.name);
        const active = cp.join('/') === path.join('/');
        const open = path.join('/').indexOf(cp.join('/')) === 0;
        return '<li><button type="button" class="' + (active ? 'active' : '') + '" data-path="' + esc(cp.join('/')) + '">' + icon('folder', 14) + esc(c.name) + '</button>' + (open ? '<ul>' + build(c, cp) + '</ul>' : '') + '</li>';
      }).join('');
      body.querySelector('#fm-tree').innerHTML = '<li><button type="button" class="' + (path.length ? '' : 'active') + '" data-path="">' + icon('server', 14) + '/home/' + account.username + '</button><ul>' + build(tree(), []) + '</ul></li>';
    }

    function items() {
      let list = (current().children || []).slice();
      if (filter) list = list.filter((c) => c.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1);
      const dir = sort.dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        const va = sort.key === 'size' ? sizeOf(a) : a[sort.key] || '';
        const vb = sort.key === 'size' ? sizeOf(b) : b[sort.key] || '';
        return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
      });
      return list;
    }

    function renderList() {
      const crumbs = [['/home/' + account.username, '']].concat(path.map((p, i) => [p, path.slice(0, i + 1).join('/')]));
      body.querySelector('#fm-path').innerHTML = crumbs.map((c, i) => (i ? '<span>/</span>' : '') + '<button type="button" data-path="' + esc(c[1]) + '">' + esc(c[0]) + '</button>').join('');
      const list = items();
      const rows = body.querySelector('#fm-rows');
      rows.innerHTML = list.length ? list.map((node) =>
        '<tr data-name="' + esc(node.name) + '" class="' + (selected.has(node.name) ? 'selected' : '') + '" tabindex="0">' +
        '<td class="col-check"><input type="checkbox" data-select' + (selected.has(node.name) ? ' checked' : '') + ' aria-label="Select ' + esc(node.name) + '"></td>' +
        '<td><button type="button" class="fm-name" data-open>' + icon(node.type === 'dir' ? 'folder' : 'file', 15) + '<span>' + esc(node.name) + '</span></button></td>' +
        '<td class="nowrap">' + (node.type === 'dir' ? '<span class="muted">' + (node.children || []).length + ' items</span>' : fmt.bytes(node.size)) + '</td>' +
        '<td class="nowrap">' + fmt.datetime(node.modified) + '</td>' +
        '<td class="mono">' + esc(node.perms || '0644') + '</td>' +
        '<td class="col-actions">' + UI.menu(rowMenu(node), { label: 'Actions for ' + node.name }) + '</td></tr>').join('')
        : '<tr class="empty-row"><td colspan="6">' + View.empty({ icon: 'folder', title: filter ? 'No matching files' : 'This folder is empty', text: filter ? 'No items in this folder match "' + filter + '".' : 'Upload files or create a new folder. You can also drop files here.' }) + '</td></tr>';
      body.querySelector('#fm-status').innerHTML = '<span>' + list.length + ' items' + (selected.size ? ', ' + selected.size + ' selected' : '') + '</span><span>' + fmt.bytes(sizeOf(current())) + ' in folder - ' + account.usage.storageGB + ' GB of ' + Services.plan(account.planId).storageGB + ' GB used on account</span>';
      body.querySelector('#fm-all').checked = list.length > 0 && list.every((n) => selected.has(n.name));
      body.querySelector('[data-fm="download-selected"]').disabled = !selected.size;
      body.querySelector('[data-fm="delete-selected"]').disabled = !selected.size || account.status === 'Suspended';
      body.querySelector('[data-fm="up"]').disabled = !path.length;
    }

    function rowMenu(node) {
      const suspended = account.status === 'Suspended';
      return [
        { action: 'open', label: node.type === 'dir' ? 'Open' : (TEXT_EXT.test(node.name) ? 'Edit' : 'View details'), icon: node.type === 'dir' ? 'folder' : 'edit' },
        { action: 'rename', label: 'Rename', icon: 'edit', disabled: suspended },
        { action: 'download', label: node.type === 'dir' ? 'Download as .zip' : 'Download', icon: 'download' },
        { action: 'chmod', label: 'Permissions', icon: 'lock', disabled: suspended },
        { action: 'copy-path', label: 'Copy path', icon: 'copy' },
        { divider: true },
        { action: 'delete', label: 'Delete', icon: 'trash', danger: true, disabled: suspended }
      ];
    }

    function navigate(p) { path = p ? p.split('/').filter(Boolean) : []; selected.clear(); filter = ''; const s = body.querySelector('#fm-search'); if (s) s.value = ''; renderTree(); renderList(); }

    function openNode(node) {
      if (node.type === 'dir') { navigate(path.concat(node.name).join('/')); return; }
      if (TEXT_EXT.test(node.name)) {
        const readOnly = account.status === 'Suspended';
        const dialog = UI.modal({
          title: node.name, subtitle: fullPath(node.name) + ' - ' + fmt.bytes(node.size), size: 'lg',
          body: '<label class="sr-only" for="fm-editor">File contents</label><textarea id="fm-editor" class="textarea mono" rows="18" spellcheck="false"' + (readOnly ? ' readonly' : '') + '>' + esc(node.content !== undefined ? node.content : '# ' + node.name + '\n# Preview not stored in the demo data set.\n') + '</textarea>',
          actions: [{ label: 'Close', variant: 'secondary' }].concat(readOnly ? [] : [{ label: 'Save changes', variant: 'primary', loadingText: 'Saving...', onClick: async (api) => {
            await Util.delay(400);
            const value = api.el.querySelector('#fm-editor').value;
            node.content = value; node.size = new Blob([value]).size; touch(node); save();
            App.log('Hosting', 'File edited', fullPath(node.name));
            UI.toast(node.name + ' saved.');
            renderList();
          } }])
        });
        dialog.el.querySelector('#fm-editor').focus();
        return;
      }
      UI.modal({ title: node.name, size: 'sm', body: View.kv([['Path', '<span class="mono">' + esc(fullPath(node.name)) + '</span>'], ['Size', fmt.bytes(node.size)], ['Modified', fmt.datetime(node.modified)], ['Permissions', '<span class="mono">' + esc(node.perms) + '</span>']]) + '<p class="muted mt-8">Binary file. Preview is not available.</p>' });
    }

    function act(action, node) {
      const dir = current();
      switch (action) {
        case 'open': openNode(node); break;
        case 'rename':
          UI.formModal({
            title: 'Rename', fields: [{ name: 'name', label: 'New name', value: node.name, required: true, mono: true, validate: (v) => validName(v, dir, node.name) }],
            submitLabel: 'Rename',
            onSubmit: (values) => {
              if (values.name === node.name) return;
              const old = node.name;
              node.name = values.name; touch(node); save();
              if (selected.delete(old)) selected.add(values.name);
              App.log('Hosting', 'File renamed', fullPath(old) + ' to ' + values.name);
              UI.toast('Renamed to ' + values.name + '.');
              renderTree(); renderList();
            }
          });
          break;
        case 'download':
          UI.toast((node.type === 'dir' ? 'Archive of ' : '') + node.name + ' prepared. Demo action completed successfully; no file was transferred.', 'info');
          break;
        case 'chmod': {
          const perms = node.perms || '0644';
          UI.formModal({
            title: 'Permissions', subtitle: fullPath(node.name),
            fields: [{ name: 'perms', label: 'Octal mode', value: perms, required: true, mono: true, pattern: /^0?[0-7]{3}$/, patternMessage: 'Enter an octal mode such as 0644 or 755.', hint: 'Common: 0644 files, 0755 folders, 0600 private files.' }],
            submitLabel: 'Apply',
            onSubmit: (values) => {
              node.perms = values.perms.length === 3 ? '0' + values.perms : values.perms; save();
              App.log('Hosting', 'Permissions changed', fullPath(node.name) + ' to ' + node.perms);
              UI.toast('Permissions set to ' + node.perms + '.');
              renderList();
            }
          });
          break;
        }
        case 'copy-path': {
          const btn = document.createElement('button');
          btn.dataset.copy = fullPath(node.name);
          document.body.appendChild(btn); btn.click(); btn.remove();
          break;
        }
        case 'delete':
          deleteNodes([node]);
          break;
        default: break;
      }
    }

    async function deleteNodes(nodes) {
      const names = nodes.map((n) => n.name);
      const ok = await UI.confirm({ title: 'Delete ' + (nodes.length === 1 ? names[0] : nodes.length + ' items'), message: 'Permanently delete ' + (nodes.length === 1 ? 'this item' : 'these items') + (nodes.some((n) => n.type === 'dir') ? ' and all folder contents' : '') + '? This cannot be undone.', detail: '<div class="record-box">' + names.map(esc).join('<br>') + '</div>', confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      const dir = current();
      dir.children = dir.children.filter((c) => names.indexOf(c.name) === -1);
      touch(dir); save();
      names.forEach((n) => selected.delete(n));
      App.log('Hosting', 'Files deleted', names.length + ' item(s) in ' + fullPath(''));
      UI.toast(names.length + ' item' + (names.length === 1 ? '' : 's') + ' deleted.');
      renderTree(); renderList();
    }

    function create(type) {
      const dir = current();
      UI.formModal({
        title: type === 'dir' ? 'New folder' : 'New file', subtitle: fullPath(''),
        fields: [{ name: 'name', label: type === 'dir' ? 'Folder name' : 'File name', required: true, mono: true, placeholder: type === 'dir' ? 'images' : 'notes.txt', validate: (v) => validName(v, dir) }],
        submitLabel: 'Create',
        onSubmit: (values) => {
          const node = type === 'dir' ? { name: values.name, type: 'dir', modified: fmt.isoDateTime(App.now()), perms: '0755', children: [] }
            : { name: values.name, type: 'file', size: 0, modified: fmt.isoDateTime(App.now()), perms: '0644', content: '' };
          dir.children.push(node); touch(dir); save();
          App.log('Hosting', type === 'dir' ? 'Folder created' : 'File created', fullPath(values.name));
          UI.toast((type === 'dir' ? 'Folder ' : 'File ') + values.name + ' created.');
          renderTree(); renderList();
        }
      });
    }

    async function upload(files) {
      if (!files.length) return;
      if (guardSuspended(account)) return;
      const dir = current();
      const status = body.querySelector('#fm-status');
      status.innerHTML = '<span><span class="spinner"></span> Uploading ' + files.length + ' file' + (files.length === 1 ? '' : 's') + '...</span>';
      await Util.delay(700);
      let replaced = 0;
      Array.from(files).forEach((file) => {
        const existing = dir.children.find((c) => c.name === file.name);
        if (existing && existing.type === 'dir') return;
        if (existing) { replaced++; dir.children = dir.children.filter((c) => c !== existing); }
        const node = { name: file.name, type: 'file', size: file.size, modified: fmt.isoDateTime(App.now()), perms: '0644' };
        dir.children.push(node);
        if (file.size < 100000 && TEXT_EXT.test(file.name)) {
          file.text().then((text) => { node.content = text; save(); });
        }
      });
      touch(dir); save();
      App.log('Hosting', 'Files uploaded', files.length + ' file(s) to ' + fullPath(''));
      UI.toast(files.length + ' file' + (files.length === 1 ? '' : 's') + ' uploaded' + (replaced ? ' (' + replaced + ' replaced)' : '') + '.');
      renderList();
    }

    let contextMenu = null;
    function closeContext() { if (contextMenu) { contextMenu.remove(); contextMenu = null; } }
    function showContext(x, y, node) {
      closeContext();
      const items = node ? rowMenu(node) : [
        { action: 'ctx-new-folder', label: 'New folder', icon: 'folder' }, { action: 'ctx-new-file', label: 'New file', icon: 'file' },
        { action: 'ctx-upload', label: 'Upload files', icon: 'upload' }, { action: 'ctx-refresh', label: 'Refresh', icon: 'refresh' }
      ];
      contextMenu = document.createElement('div');
      contextMenu.className = 'dropdown-menu context-menu';
      contextMenu.setAttribute('role', 'menu');
      contextMenu.innerHTML = items.map((i) => i.divider ? '<div class="menu-divider"></div>' : '<button type="button" class="menu-item' + (i.danger ? ' danger' : '') + '" role="menuitem" data-ctx="' + i.action + '"' + (i.disabled ? ' disabled' : '') + '>' + icon(i.icon, 14) + '<span>' + esc(i.label) + '</span></button>').join('');
      document.body.appendChild(contextMenu);
      const rect = contextMenu.getBoundingClientRect();
      contextMenu.style.left = Math.min(x, window.innerWidth - rect.width - 8) + 'px';
      contextMenu.style.top = Math.min(y, window.innerHeight - rect.height - 8) + 'px';
      contextMenu.querySelector('.menu-item:not([disabled])').focus();
      contextMenu.addEventListener('click', (e) => {
        const item = e.target.closest('[data-ctx]');
        if (!item || item.disabled) return;
        const action = item.dataset.ctx;
        closeContext();
        if (action === 'ctx-new-folder') create('dir');
        else if (action === 'ctx-new-file') create('file');
        else if (action === 'ctx-upload') body.querySelector('#fm-upload').click();
        else if (action === 'ctx-refresh') renderList();
        else act(action, node);
      });
      contextMenu.addEventListener('keydown', (e) => {
        const all = Array.from(contextMenu.querySelectorAll('.menu-item:not([disabled])'));
        const i = all.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
        if (e.key === 'Escape') closeContext();
      });
    }
    document.addEventListener('click', (e) => { if (contextMenu && !contextMenu.contains(e.target)) closeContext(); });
    window.addEventListener('scroll', closeContext, true);

    function nodeFromRow(el) {
      const tr = el.closest('tr[data-name]');
      return tr ? current().children.find((c) => c.name === tr.dataset.name) : null;
    }

    body.addEventListener('click', (e) => {
      const pathBtn = e.target.closest('[data-path]');
      if (pathBtn) { navigate(pathBtn.dataset.path); return; }
      const sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) { const key = sortBtn.dataset.sort; sort = { key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' }; renderAll(); return; }
      const tool = e.target.closest('[data-fm]');
      if (tool && !tool.disabled) {
        const action = tool.dataset.fm;
        if (action === 'upload') body.querySelector('#fm-upload').click();
        if (action === 'new-folder') create('dir');
        if (action === 'new-file') create('file');
        if (action === 'up') navigate(path.slice(0, -1).join('/'));
        if (action === 'refresh') { renderTree(); renderList(); UI.toast('Folder refreshed.', 'info'); }
        if (action === 'delete-selected') deleteNodes(current().children.filter((c) => selected.has(c.name)));
        if (action === 'download-selected') UI.toast('Archive of ' + selected.size + ' item(s) prepared. Demo action completed successfully.', 'info');
        return;
      }
      const openBtn = e.target.closest('[data-open]');
      if (openBtn) { openNode(nodeFromRow(openBtn)); return; }
      const actionEl = e.target.closest('.dropdown-menu [data-action]');
      if (actionEl && !actionEl.disabled) { act(actionEl.dataset.action, nodeFromRow(actionEl.closest('.dropdown'))); }
    });
    body.addEventListener('dblclick', (e) => {
      if (e.target.closest('input, button')) return;
      const node = nodeFromRow(e.target);
      if (node) openNode(node);
    });
    body.addEventListener('keydown', (e) => {
      if (e.target.matches('tr[data-name]')) {
        const node = nodeFromRow(e.target);
        if (e.key === 'Enter') openNode(node);
        if (e.key === 'Delete' && account.status !== 'Suspended') deleteNodes([node]);
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = e.target.getBoundingClientRect(); showContext(r.left + 40, r.bottom, node); }
      }
      if (e.key === 'Backspace' && e.target.matches('tr[data-name]') && path.length) navigate(path.slice(0, -1).join('/'));
    });
    body.addEventListener('change', (e) => {
      if (e.target.matches('[data-select]')) {
        const name = e.target.closest('tr').dataset.name;
        if (e.target.checked) selected.add(name); else selected.delete(name);
        renderList();
      }
      if (e.target.id === 'fm-all') {
        items().forEach((n) => { if (e.target.checked) selected.add(n.name); else selected.delete(n.name); });
        renderList();
      }
      if (e.target.id === 'fm-upload') { upload(e.target.files); e.target.value = ''; }
    });
    body.addEventListener('input', Util.debounce((e) => { if (e.target.id === 'fm-search') { filter = e.target.value.trim(); renderList(); } }, 120));
    body.addEventListener('contextmenu', (e) => {
      const drop = e.target.closest('#fm-drop');
      if (!drop) return;
      e.preventDefault();
      showContext(e.clientX, e.clientY, nodeFromRow(e.target));
    });
    ['dragenter', 'dragover'].forEach((type) => body.addEventListener(type, (e) => {
      const drop = e.target.closest('#fm-drop');
      if (!drop) return;
      e.preventDefault(); drop.classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach((type) => body.addEventListener(type, (e) => {
      const drop = e.target.closest('#fm-drop');
      if (!drop) return;
      e.preventDefault(); drop.classList.remove('dragging');
      if (type === 'drop' && e.dataTransfer) upload(e.dataTransfer.files);
    }));

    renderAll();
  });

  /* ---------- SSL ---------- */
  App.page('hosting.ssl', (root) => {
    const body = hostingHeader(root, {
      title: 'SSL Certificates', description: 'Certificates installed on your hosting accounts. Free certificates renew automatically 30 days before expiry.',
      actions: '<button type="button" class="btn btn-primary" data-issue>' + icon('plus', 14) + 'Issue certificate</button>'
    });
    body.innerHTML = '<div id="ssl-stats"></div><div class="panel section" id="ssl-table"></div><div class="section" id="https-panel"></div>';
    const certs = () => Store.get('sslCertificates');

    function certStatus(c) {
      if (c.status === 'Active' && daysUntil(c.expires) < 0) return 'Expired';
      if (c.status === 'Active' && daysUntil(c.expires) <= 30) return 'Expiring';
      return c.status;
    }

    function renderStats() {
      const list = certs();
      body.querySelector('#ssl-stats').innerHTML = '<div class="grid grid-4 stats-grid">' +
        View.stat({ label: 'Certificates', value: list.length }) +
        View.stat({ label: 'Active', value: list.filter((c) => c.status === 'Active').length }) +
        View.stat({ label: 'Expiring in 30 days', value: list.filter((c) => certStatus(c) === 'Expiring').length, meta: 'Auto-renewal handles DV certificates' }) +
        View.stat({ label: 'Expired', value: list.filter((c) => certStatus(c) === 'Expired').length }) + '</div>';
      const https = Store.ui('forceHttps') || {};
      body.querySelector('#https-panel').innerHTML = View.panel({
        title: 'HTTPS redirects', subtitle: 'Redirect all HTTP traffic to HTTPS with a 301 response.', flush: true,
        body: Services.accounts().map((a) => '<div class="status-row"><span><strong>' + esc(a.primaryDomain) + '</strong><small>' + a.ref + '</small></span>' +
          View.switchControl({ checked: https[a.id] !== false, disabled: a.status === 'Suspended', data: 'data-https="' + a.id + '"', srLabel: 'Force HTTPS for ' + a.primaryDomain }) + '</div>').join('')
      });
    }

    const table = UI.DataTable(body.querySelector('#ssl-table'), {
      data: certs,
      searchKeys: ['domain', 'altNames', 'issuer', 'type'],
      searchPlaceholder: 'Search certificates',
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Expiring', 'Expired', 'Pending'], match: (c, v) => certStatus(c) === v }],
      defaultSort: { key: 'expires', dir: 'asc' },
      columns: [
        { key: 'domain', label: 'Domain', render: (c) => '<span class="cell-main">' + esc(c.domain) + '</span>' + (c.altNames ? '<span class="cell-sub">' + esc(c.altNames) + '</span>' : '') },
        { key: 'type', label: 'Certificate Type' },
        { key: 'issuer', label: 'Issuer' },
        { key: 'issued', label: 'Issue Date', render: (c) => c.issued ? fmt.date(c.issued) : '-' },
        { key: 'expires', label: 'Expiry', render: (c) => c.expires ? fmt.date(c.expires) + '<span class="cell-sub">' + (daysUntil(c.expires) >= 0 ? daysUntil(c.expires) + ' days left' : 'expired') + '</span>' : '-' },
        { key: 'status', label: 'Status', render: (c) => View.badge(certStatus(c)), sortValue: certStatus },
        { key: 'autoRenew', label: 'Auto-renew', render: (c) => View.switchControl({ checked: c.autoRenew, disabled: c.status === 'Pending', data: 'data-ssl-renew="' + c.id + '"', srLabel: 'Auto-renew ' + c.domain }) }
      ],
      actions: (c) => [
        { action: 'details', label: 'Details', primary: true },
        { action: 'renew', label: 'Renew now', icon: 'refresh', disabled: c.status === 'Pending' },
        { action: 'download', label: 'Download bundle', icon: 'download', disabled: c.status !== 'Active' },
        { divider: true },
        { action: 'remove', label: 'Uninstall', icon: 'trash', danger: true }
      ],
      onAction: async (action, c) => {
        const account = Services.account(c.hostingId);
        if (action === 'details') {
          UI.modal({ title: c.domain, subtitle: c.type, size: 'lg', body: '<div class="grid grid-2"><div>' + View.kv([
            ['Common name', esc(c.domain)], ['Subject alt. names', esc(c.altNames || '-')], ['Issuer', esc(c.issuer)], ['Key', esc(c.key)],
            ['Valid from', fmt.date(c.issued)], ['Valid until', fmt.date(c.expires)], ['Status', View.badge(certStatus(c))], ['Installed on', account ? esc(Services.accountLabel(account)) : '-']
          ]) + '</div><div><span class="label">Certificate (mock)</span><pre class="whois-block">-----BEGIN CERTIFICATE-----\nDEMO-CERTIFICATE-PLACEHOLDER-FOR\n' + esc(c.domain.toUpperCase()) + '\nNOT-A-VALID-CERTIFICATE\n-----END CERTIFICATE-----</pre></div></div>' });
        }
        if (action === 'renew') {
          if (account && guardSuspended(account)) return;
          Store.patch('sslCertificates', c.id, { status: 'Pending' });
          table.refresh(); renderStats();
          UI.toast('Renewal requested for ' + c.domain + '. Validating domain control...', 'info');
          setTimeout(() => {
            const today = fmt.isoDate(App.now());
            const days = /OV/.test(c.type) ? 365 : 90;
            Store.patch('sslCertificates', c.id, { status: 'Active', issued: today, expires: fmt.isoDate(Util.addDays(today, days)) });
            App.log('SSL', 'SSL certificate renewed', c.domain);
            App.notify('SSL certificate renewed', c.domain + ' is valid until ' + fmt.date(Util.addDays(today, days)) + '.', 'hosting/ssl.html');
            UI.toast('Certificate for ' + c.domain + ' renewed.');
            table.refresh(); renderStats();
          }, 1800);
        }
        if (action === 'download') {
          Util.downloadText(c.domain + '-demo-bundle.txt', 'Demo environment placeholder for ' + c.domain + '.\nThis file does not contain a real certificate or private key.\n');
          UI.toast('Certificate bundle placeholder downloaded.', 'info');
        }
        if (action === 'remove' && await UI.confirm({ title: 'Uninstall certificate', message: 'Remove the certificate for ' + c.domain + '? HTTPS for this hostname will stop working until a new certificate is issued.', confirmLabel: 'Uninstall', danger: true })) {
          Store.remove('sslCertificates', c.id);
          App.log('SSL', 'SSL certificate uninstalled', c.domain);
          UI.toast('Certificate uninstalled.');
          table.refresh(); renderStats();
        }
      }
    });

    function issue() {
      const hostedDomains = Services.domains().filter((d) => d.hostingId && !/^Pending/.test(d.status));
      UI.formModal({
        title: 'Issue certificate',
        fields: [
          { name: 'domain', label: 'Domain', type: 'select', options: hostedDomains.map((d) => d.name) },
          { name: 'sub', label: 'Hostname prefix (optional)', placeholder: 'staging', mono: true, hint: 'Leave empty for the root domain and www.', validate: (v) => !v || /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(v) ? '' : 'Use letters, numbers, dots and hyphens.' },
          { name: 'type', label: 'Certificate type', type: 'select', options: [{ value: 'dv', label: 'Domain Validated (free)' }, { value: 'wildcard', label: 'Wildcard DV (free on Professional and above)' }, { value: 'ov', label: 'Organization Validated - $129.00/yr' }] }
        ],
        submitLabel: 'Issue certificate',
        onSubmit: (values) => {
          const d = Services.domain(values.domain);
          const account = Services.account(d.hostingId);
          if (account.status === 'Suspended') return 'The hosting account for this domain is suspended.';
          if (values.type === 'wildcard' && ['professional', 'enterprise'].indexOf(account.planId) === -1) return { field: 'type', message: 'Wildcard certificates require the Professional or Enterprise plan.' };
          const host = values.type === 'wildcard' ? '*.' + d.name : (values.sub ? values.sub + '.' : '') + d.name;
          if (certs().some((c) => c.domain === host && c.status !== 'Expired')) return { field: 'sub', message: 'A certificate for ' + host + ' already exists.' };
          const types = { dv: 'Domain Validated (DV)', wildcard: 'Wildcard DV', ov: 'Organization Validated (OV)' };
          const cert = { id: uid('s'), domain: host, altNames: values.sub || values.type === 'wildcard' ? '' : 'www.' + d.name, type: types[values.type], issuer: values.type === 'ov' ? 'Demo Trust CA OV G2' : 'Let\'s Encrypt R11', issued: '', expires: '', status: 'Pending', autoRenew: values.type !== 'ov', hostingId: account.id, key: 'RSA 2048' };
          Store.prepend('sslCertificates', cert);
          App.log('SSL', 'SSL certificate requested', host);
          if (values.type === 'ov') {
            Services.createInvoice([{ description: 'Organization Validated SSL - ' + host + ' (1 year)', amount: 129, relatedId: cert.id }]);
            UI.toast('OV certificate ordered. Validation starts once the invoice is paid.', 'info');
          } else {
            UI.toast('Certificate requested for ' + host + '. Validation in progress...', 'info');
            setTimeout(() => {
              const today = fmt.isoDate(App.now());
              Store.patch('sslCertificates', cert.id, { status: 'Active', issued: today, expires: fmt.isoDate(Util.addDays(today, 90)) });
              App.log('SSL', 'SSL certificate issued', host);
              UI.toast('Certificate issued for ' + host + '.');
              table.refresh(); renderStats();
            }, 2200);
          }
          table.refresh(); renderStats();
        }
      });
    }

    root.addEventListener('click', (e) => { if (e.target.closest('[data-issue]')) issue(); });
    body.addEventListener('change', (e) => {
      const renewId = e.target.dataset.sslRenew;
      if (renewId) {
        Store.patch('sslCertificates', renewId, { autoRenew: e.target.checked });
        UI.toast('Auto-renewal ' + (e.target.checked ? 'enabled' : 'disabled') + '.');
      }
      const httpsId = e.target.dataset.https;
      if (httpsId) {
        const state = Store.ui('forceHttps') || {};
        state[httpsId] = e.target.checked;
        Store.ui('forceHttps', state);
        App.log('Hosting', 'HTTPS redirect ' + (e.target.checked ? 'enabled' : 'disabled'), Services.account(httpsId).primaryDomain);
        UI.toast('HTTPS redirect ' + (e.target.checked ? 'enabled' : 'disabled') + ' for ' + Services.account(httpsId).primaryDomain + '.');
      }
    });
    renderStats();
  });

  /* ---------- Backups ---------- */
  App.page('hosting.backups', (root) => {
    let account = Services.selectedAccount();
    const body = hostingHeader(root, { title: 'Backups', description: 'Restore points for files and databases. Restores overwrite current data.', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Create backup</button>' }, account);
    body.innerHTML = '<div id="backup-top"></div><div class="panel section" id="backup-table"></div>';
    bindAccountSelect(root, (a) => { account = a; refresh(); });
    const backups = () => Store.get('backups').filter((b) => b.hostingId === account.id);

    function renderTop() {
      const list = backups();
      const schedule = Store.get('backupSchedules')[account.id];
      const completed = list.filter((b) => b.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));
      body.querySelector('#backup-top').innerHTML = suspendedNotice(account) + '<div class="grid grid-main">' +
        '<div class="grid grid-3">' +
          View.stat({ label: 'Last successful backup', value: completed[0] ? fmt.relative(completed[0].date) : 'Never', meta: completed[0] ? fmt.datetime(completed[0].date) : '' }) +
          View.stat({ label: 'Restore points', value: list.length, meta: list.filter((b) => b.status === 'Failed').length + ' failed' }) +
          View.stat({ label: 'Backup storage', value: fmt.bytes(list.reduce((s, b) => s + (b.status === 'Completed' ? b.size : 0), 0)), meta: 'Not counted against plan quota' }) +
        '</div>' +
        View.panel({ title: 'Schedule', actions: '<button type="button" class="btn btn-secondary btn-sm" data-schedule>Edit</button>', body: View.kv([['Frequency', esc(schedule.frequency)], ['Time', schedule.frequency === 'Hourly' ? 'Every hour' : schedule.time + ' server time'], ['Retention', schedule.retention + ' restore points'], ['Includes', esc(schedule.include)]]) }) +
        '</div>';
    }

    const table = UI.DataTable(body.querySelector('#backup-table'), {
      data: backups,
      search: false,
      filters: [{ key: 'type', label: 'Type', options: ['Full', 'Files', 'Databases', 'Snapshot'] }, { key: 'status', label: 'Status', options: ['Completed', 'In Progress', 'Failed'] }],
      defaultSort: { key: 'date', dir: 'desc' },
      emptyTitle: 'No backups yet',
      emptyText: 'Create a manual backup or wait for the next scheduled run.',
      columns: [
        { key: 'date', label: 'Backup Date', render: (b) => '<span class="cell-main">' + fmt.datetime(b.date) + '</span><span class="cell-sub">' + fmt.relative(b.date) + '</span>' },
        { key: 'type', label: 'Type' },
        { key: 'size', label: 'Size', render: (b) => b.status === 'In Progress' ? '<span class="muted">-</span>' : fmt.bytes(b.size) },
        { key: 'trigger', label: 'Trigger' },
        { key: 'status', label: 'Status', render: (b) => View.badge(b.status) + (b.note ? '<span class="cell-sub">' + esc(b.note) + '</span>' : '') }
      ],
      actions: (b) => [
        { action: 'restore', label: 'Restore', primary: true, disabled: b.status !== 'Completed' },
        { action: 'download', label: 'Download', primary: true, disabled: b.status !== 'Completed' },
        { action: 'delete', label: 'Delete', icon: 'trash', danger: true, disabled: b.trigger !== 'Manual' || b.status === 'In Progress' }
      ],
      onAction: async (action, b) => {
        if (action === 'restore') restore(b);
        if (action === 'download') {
          UI.toast('Preparing download of ' + fmt.bytes(b.size) + ' backup...', 'info');
          await Util.delay(1200);
          UI.toast('Download link generated for the backup from ' + fmt.datetime(b.date) + '. Demo action completed successfully; no file was transferred.');
          App.log('Hosting', 'Backup download requested', account.ref + ' ' + fmt.datetime(b.date));
        }
        if (action === 'delete' && await UI.confirm({ title: 'Delete backup', message: 'Delete the manual backup from ' + fmt.datetime(b.date) + '?', confirmLabel: 'Delete', danger: true })) {
          Store.remove('backups', b.id);
          App.log('Hosting', 'Backup deleted', account.ref + ' ' + fmt.datetime(b.date));
          UI.toast('Backup deleted.');
          refresh();
        }
      }
    });

    function restore(b) {
      if (guardSuspended(account)) return;
      UI.formModal({
        title: 'Restore backup',
        subtitle: account.ref + ' - ' + fmt.datetime(b.date),
        intro: 'Restoring overwrites current data with the contents of this ' + b.type.toLowerCase() + ' backup.',
        fields: [
          { name: 'files', label: 'Restore files (public_html, mail, configuration)', type: 'checkbox', value: b.type !== 'Databases' },
          { name: 'databases', label: 'Restore databases', type: 'checkbox', value: b.type !== 'Files' },
          { name: 'snapshot', label: 'Create a backup of the current state first', type: 'checkbox', value: true },
          { name: 'confirm', label: 'Type RESTORE to confirm', required: true, validate: (v) => v === 'RESTORE' ? '' : 'Type RESTORE in capitals.' }
        ],
        submitLabel: 'Restore',
        danger: true,
        onSubmit: (values) => {
          if (!values.files && !values.databases) return 'Select files, databases or both.';
          setTimeout(() => runRestore(b, values), 0);
        }
      });
    }

    function runRestore(b, values) {
      const dialog = UI.modal({
        title: 'Restoring backup', size: 'sm', dismissible: false, actions: [],
        body: '<p id="restore-step">Preparing restore...</p><div class="meter-track mt-8"><div class="meter-fill" id="restore-bar" style="width:0%"></div></div>'
      });
      const steps = (values.snapshot ? ['Creating safety backup of current state...'] : []).concat(values.files ? ['Restoring files...'] : [], values.databases ? ['Restoring databases...'] : [], ['Verifying integrity...']);
      let i = 0;
      const tick = () => {
        if (i >= steps.length) {
          dialog.close();
          if (values.snapshot) Store.prepend('backups', { id: uid('b'), hostingId: account.id, date: fmt.isoDateTime(App.now()), type: 'Full', size: b.size * 1.01, status: 'Completed', trigger: 'Manual', note: 'Pre-restore safety backup' });
          App.log('Hosting', 'Backup restored', account.ref + ' from ' + fmt.datetime(b.date));
          App.notify('Restore completed', account.ref + ' restored from ' + fmt.datetime(b.date) + '.', 'hosting/backups.html');
          UI.toast('Restore completed. Demo action completed successfully.');
          refresh();
          return;
        }
        dialog.el.querySelector('#restore-step').textContent = steps[i];
        dialog.el.querySelector('#restore-bar').style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
        i++;
        setTimeout(tick, 900);
      };
      tick();
    }

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-create]')) {
        if (guardSuspended(account)) return;
        UI.formModal({
          title: 'Create backup', subtitle: account.ref,
          fields: [{ name: 'type', label: 'Backup type', type: 'select', options: ['Full', 'Files', 'Databases'] }, { name: 'note', label: 'Note (optional)', placeholder: 'Before plugin update' }],
          submitLabel: 'Start backup',
          onSubmit: (values) => {
            const backup = { id: uid('b'), hostingId: account.id, date: fmt.isoDateTime(App.now()), type: values.type, size: 0, status: 'In Progress', trigger: 'Manual', note: values.note };
            Store.prepend('backups', backup);
            App.log('Hosting', 'Backup started', account.ref + ' (' + values.type + ')');
            UI.toast(values.type + ' backup started.', 'info');
            refresh();
            setTimeout(() => {
              const sizes = { Full: account.usage.storageGB * 1.3e8 * 2, Files: account.usage.storageGB * 1.1e8 * 2, Databases: Store.get('databases').filter((d) => d.hostingId === account.id).reduce((s, d) => s + d.sizeMB * 1048576, 0) };
              Store.patch('backups', backup.id, { status: 'Completed', size: Math.round(sizes[values.type]) });
              App.log('Hosting', 'Backup completed', account.ref + ' (' + values.type + ')');
              UI.toast(values.type + ' backup completed.');
              refresh();
            }, 3000);
          }
        });
      }
      if (e.target.closest('[data-schedule]')) {
        const s = Store.get('backupSchedules')[account.id];
        UI.formModal({
          title: 'Backup schedule', subtitle: account.ref,
          fields: [
            { name: 'frequency', label: 'Frequency', type: 'select', value: s.frequency, options: ['Hourly', 'Daily', 'Weekly'], half: true },
            { name: 'time', label: 'Time (server)', type: 'time', value: s.time, half: true },
            { name: 'retention', label: 'Restore points to keep', type: 'number', value: s.retention, min: 1, max: 60, required: true },
            { name: 'include', label: 'Include', type: 'select', value: s.include, options: ['Files and databases', 'Files only', 'Databases only'] }
          ],
          submitLabel: 'Save schedule',
          successMessage: 'Backup schedule updated.',
          onSubmit: (values) => {
            Store.update('backupSchedules', (all) => { all[account.id] = { frequency: values.frequency, time: values.time || '02:00', retention: values.retention, include: values.include }; });
            App.log('Hosting', 'Backup schedule changed', account.ref + ': ' + values.frequency + ', keep ' + values.retention);
            renderTop();
          }
        });
      }
    });

    function refresh() { renderTop(); table.refresh(); }
    renderTop();
  });

  /* ---------- FTP ---------- */
  App.page('hosting.ftp', (root) => {
    let account = Services.selectedAccount();
    const body = hostingHeader(root, { title: 'FTP Accounts', description: 'Accounts for uploading files over FTPS or SFTP.', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Create FTP account</button>' }, account);
    body.innerHTML = '<div id="ftp-top"></div><div class="panel section" id="ftp-table"></div>';
    bindAccountSelect(root, (a) => { account = a; refresh(); });
    const accounts = () => Store.get('ftpAccounts').filter((f) => f.hostingId === account.id);

    function renderTop() {
      body.querySelector('#ftp-top').innerHTML = suspendedNotice(account) + '<div class="grid grid-2">' +
        View.panel({ title: 'FTPS connection', body: View.kv([['Host', View.copyable('ftp.' + account.primaryDomain)], ['IP address', View.copyable(account.ip)], ['Port', '21 (explicit TLS required)'], ['Passive ports', '30000-30100']]) }) +
        View.panel({ title: 'SFTP connection', body: View.kv([['Host', View.copyable(account.server + '.examplehost.com')], ['Port', '22'], ['Username', '<span class="mono">' + account.username + '</span> (primary account only)'], ['Authentication', 'Password or SSH key']]) }) +
        '</div>';
    }

    const table = UI.DataTable(body.querySelector('#ftp-table'), {
      data: accounts,
      searchKeys: ['username', 'directory'],
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Disabled'] }],
      columns: [
        { key: 'username', label: 'Username', render: (f) => '<span class="cell-main mono">' + esc(f.username) + '</span>' + (f.primary ? '<span class="cell-sub">Primary account</span>' : '') },
        { key: 'host', label: 'Host', sortable: false, render: () => '<span class="mono">ftp.' + esc(account.primaryDomain) + '</span>' },
        { key: 'directory', label: 'Directory', render: (f) => '<span class="mono">' + esc(f.directory) + '</span>' },
        { key: 'quotaMB', label: 'Quota', render: (f) => f.quotaMB ? fmt.mb(f.quotaMB) : 'Unlimited' },
        { key: 'status', label: 'Status', render: (f) => View.badge(f.status) },
        { key: 'created', label: 'Created', render: (f) => fmt.date(f.created) }
      ],
      actions: (f) => [
        { action: 'password', label: 'Change password', primary: true },
        { action: 'edit', label: 'Edit directory and quota', icon: 'edit', disabled: f.primary },
        { action: 'toggle', label: f.status === 'Active' ? 'Disable' : 'Enable', icon: f.status === 'Active' ? 'pause' : 'play', disabled: f.primary },
        { action: 'config', label: 'Client configuration', icon: 'download' },
        { divider: true },
        { action: 'delete', label: 'Delete', icon: 'trash', danger: true, disabled: f.primary }
      ],
      onAction: async (action, f) => {
        if (action !== 'config' && guardSuspended(account)) return;
        if (action === 'password') {
          UI.formModal({
            title: 'Change FTP password', subtitle: f.username,
            fields: [{ name: 'password', label: 'New password', type: 'password', required: true, strength: true, autocomplete: 'new-password', validate: (v) => UI.passwordStrength(v).score < 3 ? 'Use at least 12 characters with mixed case, numbers and symbols.' : '' }],
            submitLabel: 'Change password',
            successMessage: 'Password changed for ' + f.username + '.',
            onSubmit: () => { App.log('Hosting', 'FTP password changed', f.username); }
          });
        }
        if (action === 'edit') ftpForm(f);
        if (action === 'toggle') {
          const status = f.status === 'Active' ? 'Disabled' : 'Active';
          Store.patch('ftpAccounts', f.id, { status });
          App.log('Hosting', 'FTP account ' + status.toLowerCase(), f.username);
          UI.toast(f.username + ' ' + status.toLowerCase() + '.');
          table.refresh();
        }
        if (action === 'config') {
          Util.downloadText(f.username.replace(/[@.]/g, '_') + '-ftp.txt', 'Host: ftp.' + account.primaryDomain + '\nPort: 21\nProtocol: FTP with explicit TLS\nUsername: ' + f.username + '\nRemote directory: ' + f.directory + '\n\n(Demo configuration file)\n');
          UI.toast('Client configuration downloaded.', 'info');
        }
        if (action === 'delete' && await UI.confirm({ title: 'Delete FTP account', message: 'Delete ' + f.username + '? Files in ' + f.directory + ' are not removed.', confirmLabel: 'Delete account', danger: true })) {
          Store.remove('ftpAccounts', f.id);
          App.log('Hosting', 'FTP account deleted', f.username);
          UI.toast('FTP account deleted.');
          table.refresh();
        }
      }
    });

    function ftpForm(existing) {
      const home = '/home/' + account.username;
      UI.formModal({
        title: existing ? 'Edit FTP account' : 'Create FTP account', subtitle: account.ref,
        fields: [
          existing ? { name: 'username', type: 'static', label: 'Username', html: '<span class="mono">' + esc(existing.username) + '</span>' }
            : { name: 'username', label: 'Username', required: true, suffix: '@' + account.primaryDomain, mono: true, pattern: /^[a-z0-9._-]{2,32}$/i, patternMessage: 'Use 2-32 letters, numbers, dots, hyphens or underscores.' },
          existing ? null : { name: 'password', label: 'Password', type: 'password', required: true, strength: true, autocomplete: 'new-password', validate: (v) => UI.passwordStrength(v).score < 3 ? 'Use at least 12 characters with mixed case, numbers and symbols.' : '' },
          { name: 'directory', label: 'Directory', required: true, value: existing ? existing.directory.replace(home, '') || '/' : '/public_html', prefix: home, mono: true, validate: (v) => /^\/[\w./-]*$/.test(v) && v.indexOf('..') === -1 ? '' : 'Enter a path starting with / (no "..").' },
          { name: 'quotaMB', label: 'Quota (MB)', type: 'number', value: existing ? existing.quotaMB : 1024, min: 0, max: 1024000, hint: '0 means unlimited.' }
        ].filter(Boolean),
        submitLabel: existing ? 'Save' : 'Create account',
        onSubmit: (values) => {
          const directory = home + (values.directory === '/' ? '' : values.directory.replace(/\/$/, ''));
          if (existing) {
            Store.patch('ftpAccounts', existing.id, { directory, quotaMB: Number(values.quotaMB) || 0 });
            App.log('Hosting', 'FTP account updated', existing.username);
            UI.toast('FTP account updated.');
          } else {
            const username = values.username.toLowerCase() + '@' + account.primaryDomain;
            if (Store.get('ftpAccounts').some((f) => f.username === username)) return { field: 'username', message: 'This username already exists.' };
            Store.update('ftpAccounts', (list) => { list.push({ id: uid('f'), hostingId: account.id, username, directory, quotaMB: Number(values.quotaMB) || 0, status: 'Active', created: fmt.isoDate(App.now()) }); });
            App.log('Hosting', 'FTP account created', username);
            UI.toast('FTP account ' + username + ' created.');
          }
          table.refresh();
        }
      });
    }

    root.addEventListener('click', (e) => { if (e.target.closest('[data-create]') && !guardSuspended(account)) ftpForm(); });
    function refresh() { renderTop(); table.refresh(); }
    renderTop();
  });

  /* ---------- Databases ---------- */
  App.page('hosting.databases', (root) => {
    let account = Services.selectedAccount();
    const body = hostingHeader(root, { title: 'Databases', description: 'MariaDB and PostgreSQL databases and their users.', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Create database</button>' }, account);
    body.innerHTML = '<div id="db-top"></div><div class="panel section">' + View.tabs('db', [{ id: 'dbs', label: 'Databases' }, { id: 'users', label: 'Users' }], 'dbs') +
      View.tabPanel('db', 'dbs', 'dbs', '<div id="db-table"></div>') + View.tabPanel('db', 'users', 'dbs', '<div id="db-users"></div>') + '</div>';
    bindAccountSelect(root, (a) => { account = a; refresh(); });
    const dbs = () => Store.get('databases').filter((d) => d.hostingId === account.id);
    const users = () => {
      const map = {};
      dbs().forEach((d) => { map[d.user] = map[d.user] || { id: d.user, user: d.user, databases: [], engine: d.engine.split(' ')[0] }; map[d.user].databases.push(d.name); });
      return Object.values(map);
    };

    function renderTop() {
      const plan = Services.plan(account.planId);
      const list = dbs();
      body.querySelector('#db-top').innerHTML = suspendedNotice(account) + '<div class="grid grid-4 stats-grid">' +
        View.stat({ label: 'Databases', value: list.length + ' / ' + plan.databases }) +
        View.stat({ label: 'Total size', value: fmt.mb(list.reduce((s, d) => s + d.sizeMB, 0)) }) +
        View.stat({ label: 'Users', value: users().length }) +
        View.stat({ label: 'Host', value: 'localhost', meta: 'Remote access: 3306 / 5432 from allowed IPs' }) + '</div>';
    }

    const table = UI.DataTable(body.querySelector('#db-table'), {
      data: dbs,
      searchKeys: ['name', 'user', 'engine'],
      filters: [{ key: 'engine', label: 'Type', allLabel: 'All types', options: ['MariaDB 10.11', 'PostgreSQL 16'] }],
      columns: [
        { key: 'name', label: 'Database Name', render: (d) => '<span class="cell-main mono">' + esc(d.name) + '</span>' },
        { key: 'engine', label: 'Type' },
        { key: 'sizeMB', label: 'Size', render: (d) => fmt.mb(d.sizeMB) + '<span class="cell-sub">' + d.tables + ' tables</span>' },
        { key: 'user', label: 'User', render: (d) => '<span class="mono">' + esc(d.user) + '</span>' },
        { key: 'status', label: 'Status', render: (d) => View.badge(d.status) }
      ],
      actions: (d) => [
        { action: 'admin', label: /PostgreSQL/.test(d.engine) ? 'pgAdmin' : 'phpMyAdmin', primary: true, disabled: d.status !== 'Active' },
        { action: 'user', label: 'Change user', icon: 'user', disabled: d.status !== 'Active' },
        { action: 'check', label: 'Check and repair', icon: 'refresh', disabled: d.status !== 'Active' },
        { action: 'export', label: 'Export (.sql)', icon: 'download', disabled: d.status !== 'Active' },
        { divider: true },
        { action: 'delete', label: 'Delete', icon: 'trash', danger: true, disabled: d.status !== 'Active' }
      ],
      onAction: async (action, d) => {
        if (action === 'admin') { UI.modal({ title: (/PostgreSQL/.test(d.engine) ? 'pgAdmin' : 'phpMyAdmin'), size: 'sm', body: '<p>In production this opens a signed session for <span class="mono">' + esc(d.name) + '</span> in a new window.</p>' + View.demoNote() }); }
        if (action === 'check') {
          UI.toast('Checking ' + d.tables + ' tables in ' + d.name + '...', 'info');
          await Util.delay(1200);
          UI.toast(d.name + ': all tables OK. Demo action completed successfully.');
          App.log('Hosting', 'Database checked', d.name);
        }
        if (action === 'export') {
          Util.downloadText(d.name + '-demo.sql', '-- Demo export placeholder for ' + d.name + '\n-- No real data is included.\n');
          UI.toast('Export downloaded.', 'info');
        }
        if (action === 'user') {
          UI.formModal({
            title: 'Change user', subtitle: d.name,
            fields: [{ name: 'user', label: 'Database user', type: 'select', value: d.user, options: users().map((u) => u.user) }],
            submitLabel: 'Save',
            onSubmit: (values) => { Store.patch('databases', d.id, { user: values.user }); App.log('Hosting', 'Database user changed', d.name + ' to ' + values.user); UI.toast('User updated.'); refresh(); }
          });
        }
        if (action === 'delete' && await UI.confirm({ title: 'Delete database', message: 'Permanently delete ' + d.name + ' (' + fmt.mb(d.sizeMB) + ', ' + d.tables + ' tables)? Consider creating a backup first.', confirmLabel: 'Delete database', danger: true, requireText: d.name })) {
          Store.remove('databases', d.id);
          App.log('Hosting', 'Database deleted', d.name);
          UI.toast('Database deleted.');
          refresh();
        }
      }
    });

    const userTable = UI.DataTable(body.querySelector('#db-users'), {
      data: users,
      search: false,
      loading: false,
      columns: [
        { key: 'user', label: 'User', render: (u) => '<span class="cell-main mono">' + esc(u.user) + '</span>' },
        { key: 'engine', label: 'Engine' },
        { key: 'databases', label: 'Databases', sortable: false, render: (u) => u.databases.map((n) => '<span class="tag">' + esc(n) + '</span>').join(' ') },
        { key: 'hosts', label: 'Allowed hosts', sortable: false, render: () => '<span class="mono">localhost</span>' }
      ],
      actions: () => [{ action: 'password', label: 'Change password', primary: true }],
      onAction: (action, u) => {
        if (guardSuspended(account)) return;
        UI.formModal({
          title: 'Change password', subtitle: u.user,
          fields: [{ name: 'password', label: 'New password', type: 'password', required: true, strength: true, autocomplete: 'new-password', validate: (v) => UI.passwordStrength(v).score < 3 ? 'Choose a stronger password.' : '' }],
          submitLabel: 'Change password', successMessage: 'Password changed for ' + u.user + '. Update your application configuration.',
          onSubmit: () => { App.log('Hosting', 'Database user password changed', u.user); }
        });
      }
    });

    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-create]') || guardSuspended(account)) return;
      const plan = Services.plan(account.planId);
      if (dbs().length >= plan.databases) { UI.toast('Database limit reached for ' + plan.name + '.', 'error'); return; }
      const prefix = account.username + '_';
      UI.formModal({
        title: 'Create database', subtitle: account.ref,
        fields: [
          { name: 'name', label: 'Database name', required: true, prefix, mono: true, pattern: /^[a-z0-9_]{1,48}$/, patternMessage: 'Lowercase letters, numbers and underscores only.' },
          { name: 'engine', label: 'Type', type: 'select', options: ['MariaDB 10.11', 'PostgreSQL 16'], half: true },
          { name: 'user', label: 'User', type: 'select', options: [{ value: '__new', label: 'Create new user' }].concat(users().map((u) => u.user)), half: true },
          { name: 'newUser', label: 'New username', prefix, mono: true, pattern: /^[a-z0-9_]{1,24}$/, patternMessage: 'Lowercase letters, numbers and underscores only.' },
          { name: 'password', label: 'New user password', type: 'password', strength: true, autocomplete: 'new-password' }
        ],
        submitLabel: 'Create database',
        onChange: (values, form) => {
          const isNew = values.user === '__new';
          form.querySelector('[data-field="newUser"]').hidden = !isNew;
          form.querySelector('[data-field="password"]').hidden = !isNew;
        },
        onSubmit: (values) => {
          const name = prefix + values.name;
          if (Store.get('databases').some((d) => d.name === name)) return { field: 'name', message: 'A database with this name already exists.' };
          let user = values.user;
          if (user === '__new') {
            if (!values.newUser) return { field: 'newUser', message: 'Enter a username.' };
            if (UI.passwordStrength(values.password).score < 3) return { field: 'password', message: 'Use at least 12 characters with mixed case, numbers and symbols.' };
            user = prefix + values.newUser;
          }
          Store.update('databases', (list) => { list.push({ id: uid('db'), hostingId: account.id, name, engine: values.engine, sizeMB: 0.1, user, status: 'Active', tables: 0 }); });
          App.log('Hosting', 'Database created', name + ' (' + values.engine + ')');
          UI.toast('Database ' + name + ' created.');
          refresh();
        }
      });
    });

    function refresh() { renderTop(); table.refresh(); userTable.refresh(); }
    renderTop();
  });

  /* ---------- PHP ---------- */
  App.page('hosting.php', (root) => {
    let account = Services.selectedAccount();
    const body = hostingHeader(root, { title: 'PHP Settings', description: 'PHP version and runtime limits applied to all sites on the account.' }, account);
    bindAccountSelect(root, (a) => { account = a; render(); });
    const EXTENSIONS = ['bcmath', 'curl', 'exif', 'gd', 'imagick', 'intl', 'mbstring', 'mysqli', 'opcache', 'pdo_mysql', 'pdo_pgsql', 'redis', 'soap', 'sodium', 'xsl', 'zip'];
    const toMB = (v) => Number(String(v).replace(/M$/i, ''));

    function render() {
      const s = Store.get('phpSettings')[account.id];
      const plan = Services.plan(account.planId);
      const maxMem = plan.ramGB >= 8 ? 2048 : plan.ramGB >= 4 ? 1024 : 512;
      const disabled = account.status === 'Suspended';
      body.innerHTML = suspendedNotice(account) + '<div class="grid grid-main">' +
        View.panel({
          title: 'Runtime configuration', subtitle: 'Changes apply after PHP processes restart (automatic).',
          body: '<form id="php-form" class="form-grid" novalidate>' +
            UI.fieldHTML({ name: 'version', label: 'PHP version', type: 'select', value: s.version, options: [{ value: '7.4', label: '7.4 (end of life)' }, '8.1', '8.2', '8.3', { value: '8.4', label: '8.4 (latest)' }], half: true, disabled }) +
            UI.fieldHTML({ name: 'display_errors', label: 'display_errors', type: 'select', value: s.display_errors, options: ['Off', 'On'], half: true, disabled, hint: 'Keep Off in production.' }) +
            '<div class="form-section">Limits</div>' +
            UI.fieldHTML({ name: 'memory_limit', label: 'memory_limit', type: 'select', value: s.memory_limit, options: ['128M', '256M', '512M', '1024M', '2048M'].map((v) => ({ value: v, label: v + (toMB(v) > maxMem ? ' (exceeds plan)' : '') })), half: true, disabled, hint: 'Plan maximum: ' + maxMem + 'M' }) +
            UI.fieldHTML({ name: 'max_execution_time', label: 'max_execution_time (seconds)', type: 'number', value: s.max_execution_time, min: 10, max: 600, half: true, disabled }) +
            UI.fieldHTML({ name: 'upload_max_filesize', label: 'upload_max_filesize', type: 'select', value: s.upload_max_filesize, options: ['2M', '8M', '32M', '64M', '128M', '256M', '512M'], half: true, disabled }) +
            UI.fieldHTML({ name: 'post_max_size', label: 'post_max_size', type: 'select', value: s.post_max_size, options: ['8M', '32M', '64M', '128M', '256M', '512M'], half: true, disabled, hint: 'Must be at least upload_max_filesize.' }) +
            UI.fieldHTML({ name: 'max_input_vars', label: 'max_input_vars', type: 'number', value: s.max_input_vars, min: 1000, max: 20000, half: true, disabled }) +
            '<div class="form-section">Extensions</div>' +
            '<div class="field" style="grid-column:1/-1"><div class="grid grid-4" style="gap:8px">' + EXTENSIONS.map((ext) => '<label class="checkbox"><input type="checkbox" name="ext" value="' + ext + '"' + (s.extensions.indexOf(ext) !== -1 ? ' checked' : '') + (disabled ? ' disabled' : '') + '><span class="mono">' + ext + '</span></label>').join('') + '</div></div>' +
            '<div class="form-error" role="alert" hidden></div>' +
            '<div class="form-actions"><button type="button" class="btn btn-secondary" data-php-reset' + (disabled ? ' disabled' : '') + '>Restore defaults</button><button type="submit" class="btn btn-primary"' + (disabled ? ' disabled' : '') + '>Save settings</button></div>' +
          '</form>'
        }) +
        View.panel({ title: 'Current values', subtitle: 'Effective configuration', body: View.kv([
          ['PHP version', '<strong>' + s.version + '</strong>' + (s.version === '7.4' ? ' ' + View.badge('Warning') : '')],
          ['memory_limit', s.memory_limit], ['upload_max_filesize', s.upload_max_filesize], ['post_max_size', s.post_max_size],
          ['max_execution_time', s.max_execution_time + ' s'], ['max_input_vars', s.max_input_vars], ['display_errors', s.display_errors],
          ['Extensions', s.extensions.length + ' enabled'], ['Handler', 'PHP-FPM (' + account.username + ' pool)']
        ]) }) +
      '</div>';
    }

    body.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const plan = Services.plan(account.planId);
      const maxMem = plan.ramGB >= 8 ? 2048 : plan.ramGB >= 4 ? 1024 : 512;
      const fields = [
        { name: 'version', label: 'PHP version' }, { name: 'display_errors', label: 'display_errors' },
        { name: 'memory_limit', label: 'memory_limit', validate: (v) => toMB(v) > maxMem ? 'Exceeds the ' + plan.name + ' maximum of ' + maxMem + 'M.' : '' },
        { name: 'max_execution_time', label: 'max_execution_time', type: 'number', min: 10, max: 600, required: true },
        { name: 'upload_max_filesize', label: 'upload_max_filesize' },
        { name: 'post_max_size', label: 'post_max_size', validate: (v, all) => toMB(v) < toMB(all.upload_max_filesize) ? 'post_max_size must be at least upload_max_filesize.' : '' },
        { name: 'max_input_vars', label: 'max_input_vars', type: 'number', min: 1000, max: 20000, required: true }
      ];
      const values = UI.readForm(form, fields);
      if (!UI.validateFields(form, fields, values)) return;
      if (values.version === '7.4' && !(await UI.confirm({ title: 'Use PHP 7.4?', message: 'PHP 7.4 no longer receives security updates. Continue only for legacy applications.', confirmLabel: 'Use 7.4' }))) return;
      const button = form.querySelector('[type="submit"]');
      UI.setButtonLoading(button, true, 'Saving...');
      await Util.delay(600);
      const extensions = Array.from(form.querySelectorAll('[name="ext"]:checked')).map((c) => c.value);
      Store.update('phpSettings', (all) => { all[account.id] = Object.assign({}, all[account.id], values, { max_execution_time: String(values.max_execution_time), max_input_vars: String(values.max_input_vars), extensions }); });
      App.log('Hosting', 'PHP settings updated', account.ref + ' (PHP ' + values.version + ', memory ' + values.memory_limit + ')');
      UI.toast('PHP settings saved for ' + account.ref + '.');
      render();
    });
    body.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-php-reset]')) return;
      if (!(await UI.confirm({ title: 'Restore defaults', message: 'Reset PHP settings for ' + account.ref + ' to the original configuration?', confirmLabel: 'Restore defaults' }))) return;
      Store.update('phpSettings', (all) => { all[account.id] = Util.clone(MockData.phpSettings[account.id]); });
      App.log('Hosting', 'PHP settings reset', account.ref);
      UI.toast('PHP settings restored to defaults.');
      render();
    });
    render();
  });

  /* ---------- Cron ---------- */
  App.page('hosting.cron', (root) => {
    let account = Services.selectedAccount();
    const body = hostingHeader(root, { title: 'Cron Jobs', description: 'Scheduled commands run as the account user. Times are in server time (UTC).', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Add cron job</button>' }, account);
    body.innerHTML = '<div id="cron-top"></div><div class="panel section" id="cron-table"></div>';
    bindAccountSelect(root, (a) => { account = a; refresh(); });
    const jobs = () => Store.get('cronJobs').filter((c) => c.hostingId === account.id);
    const PRESETS = [
      { value: '', label: 'Custom' }, { value: '* * * * *', label: 'Every minute' }, { value: '*/5 * * * *', label: 'Every 5 minutes' }, { value: '*/15 * * * *', label: 'Every 15 minutes' },
      { value: '0 * * * *', label: 'Hourly' }, { value: '0 2 * * *', label: 'Daily at 02:00' }, { value: '0 3 * * 0', label: 'Weekly (Sunday 03:00)' }, { value: '0 4 1 * *', label: 'Monthly (1st, 04:00)' }
    ];

    function nextRun(job) {
      if (job.status !== 'Enabled' || account.status === 'Suspended') return null;
      return Services.cronNext(job.schedule);
    }

    function renderTop() {
      const email = Store.ui('cronEmail:' + account.id);
      body.querySelector('#cron-top').innerHTML = suspendedNotice(account) + View.panel({
        title: 'Output notifications',
        body: '<form id="cron-email" class="flex flex-wrap"><label class="label" for="cron-email-input">Email cron output to</label><input id="cron-email-input" class="input" style="max-width:320px" type="email" value="' + esc(email === null ? 'admin@exampleclient.com' : email) + '" placeholder="Leave empty to disable"><button type="submit" class="btn btn-secondary btn-sm">Save</button></form>'
      });
    }

    const table = UI.DataTable(body.querySelector('#cron-table'), {
      data: jobs,
      searchKeys: ['command', 'schedule'],
      filters: [{ key: 'status', label: 'Status', options: ['Enabled', 'Disabled'] }],
      emptyTitle: 'No cron jobs',
      emptyText: 'Add a scheduled command to automate maintenance tasks.',
      columns: [
        { key: 'command', label: 'Command', render: (c) => '<span class="mono">' + esc(c.command) + '</span>' },
        { key: 'schedule', label: 'Schedule', render: (c) => '<span class="mono nowrap">' + esc(c.schedule) + '</span><span class="cell-sub">' + esc(Services.cronDescribe(c.schedule)) + '</span>' },
        { key: 'lastRun', label: 'Last Execution', render: (c) => c.lastRun ? fmt.datetime(c.lastRun) + '<span class="cell-sub">' + esc(c.lastResult || '') + '</span>' : '<span class="muted">Never</span>' },
        { key: 'next', label: 'Next Execution', sortValue: (c) => { const n = nextRun(c); return n ? n.getTime() : null; }, render: (c) => { const n = nextRun(c); return n ? fmt.datetime(n) + '<span class="cell-sub">' + fmt.relative(n) + '</span>' : '<span class="muted">-</span>'; } },
        { key: 'status', label: 'Status', render: (c) => View.badge(account.status === 'Suspended' ? 'Suspended' : c.status) + (/Failed/.test(c.lastResult || '') ? '<span class="cell-sub">Last run failed</span>' : '') }
      ],
      actions: (c) => [
        { action: 'run', label: 'Run now', primary: true, disabled: account.status === 'Suspended' },
        { action: 'edit', label: 'Edit', icon: 'edit' },
        { action: 'toggle', label: c.status === 'Enabled' ? 'Disable' : 'Enable', icon: c.status === 'Enabled' ? 'pause' : 'play' },
        { divider: true },
        { action: 'delete', label: 'Delete', icon: 'trash', danger: true }
      ],
      onAction: async (action, c) => {
        if (action === 'run') {
          UI.toast('Running job...', 'info');
          await Util.delay(1100);
          Store.patch('cronJobs', c.id, { lastRun: fmt.isoDateTime(App.now()), lastResult: 'Success' });
          App.log('Hosting', 'Cron job executed manually', c.command.slice(0, 60));
          UI.toast('Job completed with exit code 0. Demo action completed successfully.');
          table.refresh();
        }
        if (action === 'edit') cronForm(c);
        if (action === 'toggle') {
          const status = c.status === 'Enabled' ? 'Disabled' : 'Enabled';
          Store.patch('cronJobs', c.id, { status });
          App.log('Hosting', 'Cron job ' + status.toLowerCase(), c.command.slice(0, 60));
          UI.toast('Cron job ' + status.toLowerCase() + '.');
          table.refresh();
        }
        if (action === 'delete' && await UI.confirm({ title: 'Delete cron job', message: 'Delete this scheduled command?', detail: '<div class="record-box">' + esc(c.schedule + ' ' + c.command) + '</div>', confirmLabel: 'Delete', danger: true })) {
          Store.remove('cronJobs', c.id);
          App.log('Hosting', 'Cron job deleted', c.command.slice(0, 60));
          UI.toast('Cron job deleted.');
          table.refresh();
        }
      }
    });

    function cronForm(existing) {
      if (guardSuspended(account)) return;
      UI.formModal({
        title: existing ? 'Edit cron job' : 'Add cron job', subtitle: account.ref, size: 'lg',
        fields: [
          { name: 'preset', label: 'Common settings', type: 'select', options: PRESETS, value: existing ? (PRESETS.find((p) => p.value === existing.schedule) || { value: '' }).value : '*/15 * * * *' },
          { name: 'schedule', label: 'Cron expression (minute hour day month weekday)', required: true, mono: true, value: existing ? existing.schedule : '*/15 * * * *', validate: (v) => Services.parseCron(v) ? '' : 'Enter five valid fields, e.g. */15 * * * *.' },
          { name: 'preview', type: 'static', label: 'Schedule preview', html: '<div id="cron-preview" class="muted"></div>' },
          { name: 'command', label: 'Command', type: 'textarea', rows: 2, required: true, mono: true, value: existing ? existing.command : '/usr/local/bin/php /home/' + account.username + '/public_html/', validate: (v) => /rm\s+-rf\s+\/(\s|$)/.test(v) ? 'This command is not allowed.' : '' }
        ],
        submitLabel: existing ? 'Save job' : 'Add job',
        onChange: (values, form) => {
          const scheduleInput = form.elements.schedule;
          if (document.activeElement === form.elements.preset && values.preset) scheduleInput.value = values.preset;
          const expr = scheduleInput.value.trim();
          const preview = form.querySelector('#cron-preview');
          if (!Services.parseCron(expr)) { preview.textContent = 'Invalid expression.'; return; }
          const runs = [];
          let from = App.now();
          for (let i = 0; i < 3; i++) { const n = Services.cronNext(expr, from); if (!n) break; runs.push(fmt.datetime(n)); from = n; }
          preview.innerHTML = '<strong>' + esc(Services.cronDescribe(expr)) + '</strong><br>Next runs: ' + runs.join(', ');
          const match = PRESETS.find((p) => p.value === expr);
          if (document.activeElement === scheduleInput) form.elements.preset.value = match ? match.value : '';
        },
        onSubmit: (values) => {
          const data = { schedule: values.schedule.trim().replace(/\s+/g, ' '), command: values.command.trim() };
          if (existing) {
            Store.patch('cronJobs', existing.id, data);
            App.log('Hosting', 'Cron job updated', data.command.slice(0, 60));
            UI.toast('Cron job updated.');
          } else {
            Store.update('cronJobs', (list) => { list.push(Object.assign({ id: uid('c'), hostingId: account.id, lastRun: null, lastResult: '', status: 'Enabled' }, data)); });
            App.log('Hosting', 'Cron job added', data.command.slice(0, 60));
            UI.toast('Cron job added.');
          }
          table.refresh();
        }
      });
    }

    root.addEventListener('click', (e) => { if (e.target.closest('[data-create]')) cronForm(); });
    body.addEventListener('submit', (e) => {
      if (e.target.id !== 'cron-email') return;
      e.preventDefault();
      const value = e.target.querySelector('input').value.trim();
      if (value && !UI.EMAIL_RE.test(value)) { UI.toast('Enter a valid email address.', 'error'); return; }
      Store.ui('cronEmail:' + account.id, value);
      UI.toast(value ? 'Cron output will be emailed to ' + value + '.' : 'Cron output emails disabled.');
    });
    function refresh() { renderTop(); table.refresh(); }
    renderTop();
  });
})();
