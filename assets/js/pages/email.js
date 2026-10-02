/* Email: overview, mailboxes, forwarders, webmail, authentication. */
(function () {
  'use strict';
  const { esc, uid } = Util;
  const icon = Icons.icon;
  const FOLDERS = [['Inbox', 'inbox'], ['Sent', 'send'], ['Drafts', 'file'], ['Spam', 'alert'], ['Trash', 'trash']];

  function mailDomains() {
    return Services.domains().filter((d) => d.hostingId && !/^Pending/.test(d.status)).map((d) => d.name);
  }

  function domainOf(address) { return address.split('@')[1]; }

  function hostingFor(domainName) {
    const d = Services.domain(domainName);
    return d && d.hostingId ? Services.account(d.hostingId) : null;
  }

  function header(root, opts) {
    root.innerHTML = View.pageHeader({ title: opts.title, description: opts.description, crumbs: [['Email', 'email/index.html'], [opts.crumb || opts.title]], actions: opts.actions }) + '<div id="page-body"></div>';
    return root.querySelector('#page-body');
  }

  function authBadges(domainName) {
    const auth = Services.emailAuth(domainName);
    return ['spf', 'dkim', 'dmarc'].map((k) => '<span class="nowrap">' + auth[k].label + ' ' + View.badge(auth[k].status) + '</span>').join(' ');
  }

  /* ---------- Overview ---------- */
  App.page('email.index', (root) => {
    const body = header(root, { title: 'Email', crumb: 'Overview', description: 'Mailboxes, forwarding and sender authentication for your domains.', actions: '<a class="btn btn-secondary" href="' + App.url('email/webmail.html') + '">' + icon('inbox', 14) + 'Open webmail</a><a class="btn btn-primary" href="' + App.url('email/mailboxes.html?new=1') + '">' + icon('plus', 14) + 'Create mailbox</a>' });
    const boxes = Store.get('mailboxes');
    const used = boxes.reduce((s, m) => s + m.usedMB, 0);
    const quota = boxes.reduce((s, m) => s + m.quotaMB, 0);
    const nearFull = boxes.filter((m) => m.usedMB / m.quotaMB >= 0.85);
    const domains = mailDomains();
    const issues = domains.filter((d) => { const a = Services.emailAuth(d); return a.spf.status !== 'Configured' || a.dkim.status !== 'Configured' || a.dmarc.status !== 'Configured'; });
    body.innerHTML =
      '<div class="grid grid-4 stats-grid">' +
        View.stat({ label: 'Mailboxes', value: boxes.length, href: 'email/mailboxes.html', meta: boxes.filter((m) => m.status !== 'Active').length + ' suspended' }) +
        View.stat({ label: 'Storage used', value: fmt.mb(used), meta: 'of ' + fmt.mb(quota) + ' allocated' }) +
        View.stat({ label: 'Forwarders', value: Store.get('forwarders').length, href: 'email/forwarders.html' }) +
        View.stat({ label: 'Authentication issues', value: issues.length, href: 'email/authentication.html', meta: issues.length ? issues.length + ' domain' + (issues.length === 1 ? '' : 's') + ' need attention' : 'All domains configured' }) +
      '</div>' +
      '<div class="grid grid-main section">' +
        View.panel({ title: 'Domains', subtitle: 'Mail routing and authentication status', flush: true,
          body: '<div class="table-wrap"><table class="table"><thead><tr><th>Domain</th><th>Mailboxes</th><th>Authentication</th><th class="col-actions">Actions</th></tr></thead><tbody>' +
            domains.map((d) => '<tr><td><span class="cell-main">' + esc(d) + '</span><span class="cell-sub">MX ' + esc((Store.get('dnsRecords').find((r) => r.domain === d && r.type === 'MX') || { value: 'not set' }).value) + '</span></td><td>' + boxes.filter((m) => domainOf(m.address) === d).length + '</td><td>' + authBadges(d) + '</td>' +
              '<td class="col-actions"><a class="btn btn-secondary btn-xs" href="' + App.url('email/authentication.html?domain=' + encodeURIComponent(d)) + '">Review</a></td></tr>').join('') + '</tbody></table></div>' }) +
        View.panel({ title: 'Client settings', subtitle: 'Replace yourdomain.com with the mailbox domain', body: View.kv([
          ['Incoming (IMAP)', '<span class="mono">mail.yourdomain.com</span><span class="cell-sub">Port 993, SSL/TLS</span>'],
          ['Incoming (POP3)', '<span class="mono">mail.yourdomain.com</span><span class="cell-sub">Port 995, SSL/TLS</span>'],
          ['Outgoing (SMTP)', '<span class="mono">mail.yourdomain.com</span><span class="cell-sub">Port 465 SSL/TLS or 587 STARTTLS</span>'],
          ['Username', 'Full email address'],
          ['Webmail', '<a href="' + App.url('email/webmail.html') + '">Open webmail</a>']
        ]) }) +
      '</div>' +
      '<div class="section">' + View.panel({ title: 'Mailboxes near quota', flush: true, body: nearFull.length ? '<ul class="list">' + nearFull.map((m) =>
        '<li class="list-item"><span class="list-item-main"><span class="list-item-title">' + esc(m.address) + '</span><span class="list-item-sub">' + fmt.mb(m.usedMB) + ' of ' + fmt.mb(m.quotaMB) + '</span></span><span style="width:200px">' + View.meter({ label: 'Usage', used: m.usedMB, total: m.quotaMB }) + '</span></li>').join('') + '</ul>'
        : View.empty({ title: 'No mailboxes near quota', text: 'All mailboxes are below 85% of their quota.' }) }) + '</div>';
  });

  /* ---------- Mailboxes ---------- */
  App.page('email.mailboxes', (root) => {
    const body = header(root, { title: 'Mailboxes', description: 'Email accounts, storage quotas and access.', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Create mailbox</button>' });
    body.innerHTML = '<div class="panel" id="mb-table"></div>';
    const boxes = () => Store.get('mailboxes');

    const table = UI.DataTable(body.querySelector('#mb-table'), {
      data: boxes,
      searchKeys: ['address', 'status'],
      searchPlaceholder: 'Search mailboxes',
      filters: [
        { key: 'domain', label: 'Domain', allLabel: 'All domains', options: Array.from(new Set(Store.get('mailboxes').map((m) => domainOf(m.address)))), match: (m, v) => domainOf(m.address) === v },
        { key: 'status', label: 'Status', options: ['Active', 'Suspended'] }
      ],
      selectable: true,
      bulkActions: [{ action: 'delete', label: 'Delete selected', danger: true }],
      columns: [
        { key: 'address', label: 'Mailbox', render: (m) => '<span class="cell-main">' + esc(m.address) + '</span><span class="cell-sub">Created ' + fmt.date(m.created) + '</span>' },
        { key: 'usedMB', label: 'Storage', render: (m) => fmt.mb(m.usedMB) },
        { key: 'quotaMB', label: 'Quota', render: (m) => fmt.mb(m.quotaMB) },
        { key: 'usage', label: 'Usage', sortValue: (m) => m.usedMB / m.quotaMB, render: (m) => { const pct = fmt.percent(m.usedMB, m.quotaMB); return '<span class="mini-meter meter-' + (pct >= 90 ? 'critical' : pct >= 75 ? 'high' : 'normal') + '"><span class="meter-track"><span class="meter-fill" style="display:block;width:' + pct + '%"></span></span><span>' + pct + '%</span></span>'; } },
        { key: 'status', label: 'Status', render: (m) => View.badge(m.status) },
        { key: 'lastLogin', label: 'Last Login', render: (m) => m.lastLogin ? fmt.relative(m.lastLogin) : '<span class="muted">Never</span>' }
      ],
      actions: (m) => [
        { label: 'Webmail', primary: true, href: App.url('email/webmail.html?mailbox=' + encodeURIComponent(m.address)) },
        { action: 'quota', label: 'Change quota', icon: 'database' },
        { action: 'password', label: 'Reset password', icon: 'key' },
        { action: 'toggle', label: m.status === 'Active' ? 'Suspend' : 'Activate', icon: m.status === 'Active' ? 'pause' : 'play', disabled: m.status === 'Suspended' && (hostingFor(domainOf(m.address)) || {}).status === 'Suspended' },
        { label: 'Client settings', icon: 'settings', href: App.url('email/index.html') },
        { divider: true },
        { action: 'delete', label: 'Delete', icon: 'trash', danger: true }
      ],
      onAction: async (action, m) => {
        if (action === 'quota') {
          UI.formModal({
            title: 'Change quota', subtitle: m.address,
            fields: [{ name: 'quota', label: 'Quota', type: 'select', value: m.quotaMB, options: [1024, 2048, 5120, 10240, 20480, 51200].map((v) => ({ value: v, label: fmt.mb(v) })), hint: 'Currently using ' + fmt.mb(m.usedMB) + '.' }],
            submitLabel: 'Save quota',
            onSubmit: (values) => {
              if (Number(values.quota) < m.usedMB) return { field: 'quota', message: 'Quota cannot be lower than current usage (' + fmt.mb(m.usedMB) + ').' };
              Store.patch('mailboxes', m.id, { quotaMB: Number(values.quota) });
              App.log('Email', 'Mailbox quota changed', m.address + ' to ' + fmt.mb(Number(values.quota)));
              UI.toast('Quota updated for ' + m.address + '.');
              table.refresh();
            }
          });
        }
        if (action === 'password') {
          UI.formModal({
            title: 'Reset password', subtitle: m.address,
            fields: [
              { name: 'password', label: 'New password', type: 'password', required: true, strength: true, autocomplete: 'new-password', validate: (v) => UI.passwordStrength(v).score < 3 ? 'Use at least 12 characters with mixed case, numbers and symbols.' : '' },
              { name: 'confirm', label: 'Confirm password', type: 'password', required: true, autocomplete: 'new-password', validate: (v, all) => v !== all.password ? 'Passwords do not match.' : '' },
              { name: 'logout', label: 'Sign out existing IMAP and webmail sessions', type: 'checkbox', value: true }
            ],
            submitLabel: 'Reset password', successMessage: 'Password reset for ' + m.address + '.',
            onSubmit: () => { App.log('Email', 'Mailbox password reset', m.address); }
          });
        }
        if (action === 'toggle') {
          const status = m.status === 'Active' ? 'Suspended' : 'Active';
          if (status === 'Suspended' && !(await UI.confirm({ title: 'Suspend mailbox', message: 'Suspend ' + m.address + '? Incoming mail is rejected and logins are blocked until reactivated.', confirmLabel: 'Suspend', danger: true }))) return;
          Store.patch('mailboxes', m.id, { status });
          App.log('Email', 'Mailbox ' + (status === 'Active' ? 'activated' : 'suspended'), m.address);
          UI.toast(m.address + ' ' + status.toLowerCase() + '.');
          table.refresh();
        }
        if (action === 'delete') deleteBoxes([m]);
      },
      onBulk: (action, rows) => deleteBoxes(rows)
    });

    async function deleteBoxes(rows) {
      const ok = await UI.confirm({
        title: 'Delete ' + (rows.length === 1 ? 'mailbox' : rows.length + ' mailboxes'),
        message: 'All stored messages will be permanently deleted. Forwarders pointing to ' + (rows.length === 1 ? 'this mailbox' : 'these mailboxes') + ' are removed as well.',
        detail: '<div class="record-box">' + rows.map((r) => esc(r.address)).join('<br>') + '</div>',
        confirmLabel: 'Delete', danger: true, requireText: rows.length === 1 ? rows[0].address : 'DELETE'
      });
      if (!ok) return;
      const addresses = rows.map((r) => r.address);
      Store.update('mailboxes', (list) => list.filter((m) => addresses.indexOf(m.address) === -1));
      Store.update('forwarders', (list) => list.filter((f) => addresses.indexOf(f.destination) === -1));
      App.log('Email', 'Mailbox deleted', addresses.join(', '));
      UI.toast(rows.length + ' mailbox' + (rows.length === 1 ? '' : 'es') + ' deleted.');
      table.clearSelection();
    }

    function create() {
      const domains = mailDomains();
      UI.formModal({
        title: 'Create mailbox',
        fields: [
          { name: 'local', label: 'Email address', required: true, placeholder: 'sales', mono: true, half: true, pattern: /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/i, patternMessage: 'Use letters, numbers, dots, hyphens or underscores.' },
          { name: 'domain', label: 'Domain', type: 'select', options: domains.map((d) => ({ value: d, label: '@' + d })), half: true },
          { name: 'password', label: 'Password', type: 'password', required: true, strength: true, autocomplete: 'new-password', validate: (v) => UI.passwordStrength(v).score < 3 ? 'Use at least 12 characters with mixed case, numbers and symbols.' : '' },
          { name: 'quota', label: 'Quota', type: 'select', value: 5120, options: [1024, 2048, 5120, 10240, 20480].map((v) => ({ value: v, label: fmt.mb(v) })) },
          { name: 'welcome', label: 'Send setup instructions to my account email', type: 'checkbox', value: true }
        ],
        submitLabel: 'Create mailbox',
        onSubmit: (values) => {
          const address = values.local.toLowerCase() + '@' + values.domain;
          const account = hostingFor(values.domain);
          if (account && account.status === 'Suspended') return 'The hosting account for ' + values.domain + ' is suspended.';
          if (Store.get('mailboxes').some((m) => m.address === address)) return { field: 'local', message: address + ' already exists.' };
          if (Store.get('forwarders').some((f) => f.source === address)) return { field: 'local', message: address + ' is already used by a forwarder.' };
          const plan = account ? Services.plan(account.planId) : null;
          if (plan && Store.get('mailboxes').filter((m) => domainOf(m.address) === values.domain).length >= plan.emails) return 'The ' + plan.name + ' plan allows ' + plan.emails + ' mailboxes.';
          Store.update('mailboxes', (list) => { list.push({ id: uid('m'), address, quotaMB: Number(values.quota), usedMB: 0, status: 'Active', created: fmt.isoDate(App.now()), lastLogin: null }); });
          App.log('Email', 'Mailbox created', address);
          UI.toast('Mailbox ' + address + ' created.' + (values.welcome ? ' Setup instructions sent' : ''));
          table.refresh();
        }
      });
    }

    root.addEventListener('click', (e) => { if (e.target.closest('[data-create]')) create(); });
    if (App.param('new')) create();
    if (App.param('q')) table.setQuery(App.param('q'));
  });

  /* ---------- Forwarders ---------- */
  App.page('email.forwarders', (root) => {
    const body = header(root, { title: 'Forwarders', description: 'Redirect mail sent to one address to another mailbox or external address.', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Create forwarder</button>' });
    body.innerHTML = '<div class="panel" id="fw-table"></div><div class="section" id="catch-all"></div>';

    const table = UI.DataTable(body.querySelector('#fw-table'), {
      data: () => Store.get('forwarders'),
      searchKeys: ['source', 'destination'],
      searchPlaceholder: 'Search forwarders',
      filters: [{ key: 'domain', label: 'Domain', allLabel: 'All domains', options: mailDomains(), match: (f, v) => domainOf(f.source) === v }],
      emptyTitle: 'No forwarders',
      emptyText: 'Create a forwarder to redirect mail without a separate mailbox.',
      columns: [
        { key: 'source', label: 'Address', render: (f) => '<span class="cell-main">' + esc(f.source) + '</span>' },
        { key: 'arrow', label: '', sortable: false, render: () => icon('chevronRight', 14) },
        { key: 'destination', label: 'Forwards to', render: (f) => esc(f.destination) + (Store.find('mailboxes', f.destination, 'address') ? '' : '<span class="cell-sub">External address</span>') },
        { key: 'created', label: 'Created', render: (f) => fmt.date(f.created) }
      ],
      actions: () => [{ action: 'delete', label: 'Delete', primary: true }],
      onAction: async (action, f) => {
        if (await UI.confirm({ title: 'Delete forwarder', message: 'Stop forwarding ' + f.source + ' to ' + f.destination + '? Mail to ' + f.source + ' will be handled by the catch-all setting.', confirmLabel: 'Delete', danger: true })) {
          Store.remove('forwarders', f.id);
          App.log('Email', 'Forwarder deleted', f.source + ' to ' + f.destination);
          UI.toast('Forwarder deleted.');
          table.refresh();
        }
      }
    });

    function renderCatchAll() {
      const settings = Store.get('catchAll');
      body.querySelector('#catch-all').innerHTML = View.panel({
        title: 'Catch-all (default address)', subtitle: 'What happens to mail sent to addresses that do not exist', flush: true,
        body: mailDomains().map((d) => {
          const value = settings[d] || 'reject';
          const mode = value === 'reject' || value === 'discard' ? value : 'forward';
          return '<div class="status-row"><span><strong>' + esc(d) + '</strong><small>' + (mode === 'forward' ? 'Forwarded to ' + esc(value) : mode === 'discard' ? 'Silently discarded' : 'Rejected with a bounce message') + '</small></span>' +
            '<select class="select select-sm" data-catch="' + esc(d) + '" aria-label="Catch-all for ' + esc(d) + '">' + View.options([{ value: 'reject', label: 'Reject (recommended)' }, { value: 'discard', label: 'Discard' }].concat(Store.get('mailboxes').filter((m) => domainOf(m.address) === d).map((m) => ({ value: m.address, label: 'Forward to ' + m.address }))), value) + '</select></div>';
        }).join('')
      });
    }

    body.addEventListener('change', (e) => {
      const d = e.target.dataset.catch;
      if (!d) return;
      Store.update('catchAll', (all) => { all[d] = e.target.value; });
      App.log('Email', 'Catch-all changed', d + ': ' + e.target.value);
      UI.toast('Catch-all updated for ' + d + '.');
      renderCatchAll();
    });

    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-create]')) return;
      UI.formModal({
        title: 'Create forwarder',
        fields: [
          { name: 'local', label: 'Address', required: true, placeholder: 'sales', mono: true, half: true, pattern: /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/i, patternMessage: 'Use letters, numbers, dots, hyphens or underscores.' },
          { name: 'domain', label: 'Domain', type: 'select', options: mailDomains().map((d) => ({ value: d, label: '@' + d })), half: true },
          { name: 'destination', label: 'Forward to', type: 'email', required: true, placeholder: 'admin@exampleclient.com', hint: 'A mailbox in this account or an external address.' }
        ],
        submitLabel: 'Create forwarder',
        onSubmit: (values) => {
          const source = values.local.toLowerCase() + '@' + values.domain;
          const destination = values.destination.toLowerCase();
          if (source === destination) return { field: 'destination', message: 'An address cannot forward to itself.' };
          if (Store.get('mailboxes').some((m) => m.address === source)) return { field: 'local', message: source + ' is a mailbox. Forward from the mailbox settings instead.' };
          if (Store.get('forwarders').some((f) => f.source === source && f.destination === destination)) return 'This forwarder already exists.';
          if (Store.get('forwarders').some((f) => f.source === destination && f.destination === source)) return 'This would create a forwarding loop.';
          Store.update('forwarders', (list) => { list.push({ id: uid('fw'), source, destination, created: fmt.isoDate(App.now()) }); });
          App.log('Email', 'Forwarder created', source + ' to ' + destination);
          UI.toast('Forwarder created.');
          table.refresh();
        }
      });
    });
    renderCatchAll();
  });

  /* ---------- Webmail ---------- */
  App.page('email.webmail', (root) => {
    const boxes = Store.get('mailboxes').filter((m) => m.status === 'Active');
    let mailbox = App.param('mailbox') && boxes.some((b) => b.address === App.param('mailbox')) ? App.param('mailbox') : (Store.ui('webmailBox') || 'admin@exampleclient.com');
    if (!boxes.some((b) => b.address === mailbox)) mailbox = boxes[0] ? boxes[0].address : '';
    let folder = 'Inbox';
    let openId = null;
    let query = '';

    root.innerHTML = View.pageHeader({
      title: 'Webmail', description: 'Read and send mail in the browser.',
      crumbs: [['Email', 'email/index.html'], ['Webmail']],
      actions: '<label class="sr-only" for="wm-mailbox">Mailbox</label><select id="wm-mailbox" class="select">' + View.options(boxes.map((b) => b.address), mailbox) + '</select>' +
        '<button type="button" class="btn btn-primary" data-compose>' + icon('edit', 14) + 'Compose</button>'
    }) + '<div class="panel"><div class="webmail"><nav class="wm-folders" id="wm-folders" aria-label="Folders"></nav><div class="wm-list" id="wm-list"></div><div class="wm-reader" id="wm-reader"></div></div></div>';

    const messages = () => Store.get('messages').filter((m) => m.mailbox === mailbox);

    function renderFolders() {
      root.querySelector('#wm-folders').innerHTML = FOLDERS.map((f) => {
        const list = messages().filter((m) => m.folder === f[0]);
        const unread = list.filter((m) => !m.read).length;
        const count = f[0] === 'Drafts' ? list.length : unread;
        return '<button type="button" class="wm-folder' + (folder === f[0] ? ' active' : '') + '" data-folder="' + f[0] + '"' + (folder === f[0] ? ' aria-current="true"' : '') + '>' + icon(f[1], 15) + '<span>' + f[0] + '</span>' + (count ? '<small>' + count + '</small>' : '') + '</button>';
      }).join('') + '<div class="menu-divider"></div><div class="small muted" style="padding:6px 10px">' + (function () { const b = Store.find('mailboxes', mailbox, 'address'); return b ? fmt.mb(b.usedMB) + ' of ' + fmt.mb(b.quotaMB) + ' used' : ''; })() + '</div>';
    }

    function renderList() {
      const list = messages().filter((m) => m.folder === folder && (!query || (m.subject + ' ' + m.fromName + ' ' + m.from + ' ' + m.body).toLowerCase().indexOf(query.toLowerCase()) !== -1))
        .sort((a, b) => b.date.localeCompare(a.date));
      const listEl = root.querySelector('#wm-list');
      const head = '<div class="wm-list-head"><div class="search-input">' + icon('search', 14) + '<input type="search" class="input input-sm" id="wm-search" placeholder="Search ' + folder.toLowerCase() + '" aria-label="Search messages" value="' + esc(query) + '"></div>' +
        (folder === 'Trash' || folder === 'Spam' ? '<button type="button" class="btn btn-ghost btn-xs mt-8" data-empty' + (list.length ? '' : ' disabled') + '>Empty ' + folder.toLowerCase() + '</button>' : '') + '</div>';
      listEl.innerHTML = head + (list.length ? list.map((m) =>
        '<button type="button" class="wm-item' + (m.read ? '' : ' unread') + (m.id === openId ? ' active' : '') + '" data-msg="' + m.id + '">' +
        '<span class="wm-row"><span class="wm-from">' + (m.starred ? icon('star', 12) + ' ' : '') + esc(folder === 'Sent' || folder === 'Drafts' ? 'To: ' + m.to : m.fromName) + '</span><span class="wm-date">' + (fmt.isoDate(Util.parseDate(m.date)) === fmt.isoDate(App.now()) ? fmt.time(m.date) : fmt.date(m.date)) + '</span></span>' +
        '<span class="wm-subject">' + esc(m.subject || '(no subject)') + '</span><span class="wm-preview">' + esc(m.body.replace(/\s+/g, ' ').slice(0, 90)) + '</span></button>').join('')
        : View.empty({ icon: 'inbox', title: query ? 'No matching messages' : folder + ' is empty', text: query ? 'Try another search.' : '' }));
    }

    function renderReader() {
      const reader = root.querySelector('#wm-reader');
      const m = openId ? Store.find('messages', openId) : null;
      if (!m || m.mailbox !== mailbox) {
        reader.innerHTML = View.empty({ icon: 'mail', title: 'No message selected', text: 'Select a message to read it.' });
        return;
      }
      reader.innerHTML =
        '<div class="wm-reader-actions">' +
          (m.folder === 'Drafts' ? '<button type="button" class="btn btn-primary btn-sm" data-wm="edit-draft">' + icon('edit', 14) + 'Continue editing</button>'
            : '<button type="button" class="btn btn-secondary btn-sm" data-wm="reply">Reply</button><button type="button" class="btn btn-secondary btn-sm" data-wm="forward">Forward</button>') +
          '<button type="button" class="btn btn-ghost btn-sm" data-wm="star">' + icon('star', 14) + (m.starred ? 'Unstar' : 'Star') + '</button>' +
          (m.folder !== 'Drafts' && m.folder !== 'Sent' ? '<button type="button" class="btn btn-ghost btn-sm" data-wm="unread">Mark unread</button>' : '') +
          (m.folder === 'Inbox' ? '<button type="button" class="btn btn-ghost btn-sm" data-wm="spam">Spam</button>' : '') +
          (m.folder === 'Spam' || m.folder === 'Trash' ? '<button type="button" class="btn btn-ghost btn-sm" data-wm="restore">Move to inbox</button>' : '') +
          '<button type="button" class="btn btn-ghost btn-sm" data-wm="delete">' + icon('trash', 14) + (m.folder === 'Trash' ? 'Delete forever' : 'Delete') + '</button>' +
        '</div>' +
        '<div class="wm-reader-head"><h2>' + esc(m.subject || '(no subject)') + '</h2>' +
          '<div class="flex"><span class="avatar avatar-sm">' + esc(Shell.initials(m.fromName)) + '</span><div><strong>' + esc(m.fromName) + '</strong> <span class="muted">&lt;' + esc(m.from) + '&gt;</span><div class="small muted">To ' + esc(m.to) + ' - ' + fmt.datetime(m.date) + '</div></div></div></div>' +
        '<div class="wm-reader-body">' + esc(m.body) + '</div>';
    }

    function renderAll() { renderFolders(); renderList(); renderReader(); }

    function compose(prefill) {
      const draft = prefill || {};
      const dialog = UI.formModal({
        title: draft.id ? 'Edit draft' : 'New message', subtitle: 'From ' + mailbox, size: 'lg',
        fields: [
          { name: 'to', label: 'To', required: true, value: draft.to || '', placeholder: 'name@example.com', validate: (v) => v.split(/[,;]\s*/).every((a) => UI.EMAIL_RE.test(a)) ? '' : 'Enter one or more valid addresses separated by commas.' },
          { name: 'cc', label: 'Cc', value: draft.cc || '', validate: (v) => !v || v.split(/[,;]\s*/).every((a) => UI.EMAIL_RE.test(a)) ? '' : 'Enter valid addresses separated by commas.' },
          { name: 'subject', label: 'Subject', value: draft.subject || '', maxlength: 200 },
          { name: 'body', label: 'Message', type: 'textarea', rows: 10, required: true, value: draft.body || '' }
        ],
        submitLabel: 'Send',
        loadingText: 'Sending...',
        footerNote: '<button type="button" class="btn btn-ghost btn-sm" data-save-draft>Save draft</button>',
        onSubmit: (values) => {
          const profile = Store.get('profile');
          Store.update('messages', (list) => {
            const filtered = draft.id ? list.filter((m) => m.id !== draft.id) : list;
            filtered.push({ id: uid('msg'), mailbox, folder: 'Sent', fromName: profile.name, from: mailbox, to: values.to, subject: values.subject, date: fmt.isoDateTime(App.now()), read: true, starred: false, body: values.body });
            return filtered;
          });
          App.log('Email', 'Message sent from webmail', mailbox + ' to ' + values.to);
          UI.toast('Message sent.');
          if (draft.id && openId === draft.id) openId = null;
          renderAll();
        }
      });
      dialog.el.querySelector('[data-save-draft]').addEventListener('click', () => {
        const form = dialog.el.querySelector('form');
        const values = { to: form.elements.to.value.trim(), subject: form.elements.subject.value.trim(), body: form.elements.body.value };
        const profile = Store.get('profile');
        Store.update('messages', (list) => {
          const filtered = draft.id ? list.filter((m) => m.id !== draft.id) : list;
          filtered.push({ id: draft.id || uid('msg'), mailbox, folder: 'Drafts', fromName: profile.name, from: mailbox, to: values.to, subject: values.subject, date: fmt.isoDateTime(App.now()), read: true, starred: false, body: values.body });
          return filtered;
        });
        dialog.close();
        UI.toast('Draft saved.');
        renderAll();
      });
    }

    function move(m, target) {
      Store.patch('messages', m.id, { folder: target });
      openId = null;
      UI.toast('Moved to ' + target + '.', 'info');
      renderAll();
    }

    root.addEventListener('click', async (e) => {
      const folderBtn = e.target.closest('[data-folder]');
      if (folderBtn) { folder = folderBtn.dataset.folder; openId = null; query = ''; renderAll(); return; }
      const msgBtn = e.target.closest('[data-msg]');
      if (msgBtn) {
        openId = msgBtn.dataset.msg;
        Store.patch('messages', openId, { read: true });
        renderAll();
        const active = root.querySelector('[data-msg="' + openId + '"]');
        if (active) active.focus();
        return;
      }
      if (e.target.closest('[data-compose]')) { compose(); return; }
      if (e.target.closest('[data-empty]')) {
        if (await UI.confirm({ title: 'Empty ' + folder.toLowerCase(), message: 'Permanently delete all messages in ' + folder + '?', confirmLabel: 'Empty ' + folder.toLowerCase(), danger: true })) {
          Store.update('messages', (list) => list.filter((m) => !(m.mailbox === mailbox && m.folder === folder)));
          openId = null;
          UI.toast(folder + ' emptied.');
          renderAll();
        }
        return;
      }
      const action = e.target.closest('[data-wm]');
      if (!action) return;
      const m = Store.find('messages', openId);
      if (!m) return;
      switch (action.dataset.wm) {
        case 'reply': compose({ to: m.from, subject: /^Re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, body: '\n\nOn ' + fmt.datetime(m.date) + ', ' + m.fromName + ' wrote:\n> ' + m.body.split('\n').join('\n> ') }); break;
        case 'forward': compose({ subject: 'Fwd: ' + m.subject, body: '\n\n---------- Forwarded message ----------\nFrom: ' + m.fromName + ' <' + m.from + '>\nDate: ' + fmt.datetime(m.date) + '\nSubject: ' + m.subject + '\n\n' + m.body }); break;
        case 'edit-draft': compose(m); break;
        case 'star': Store.patch('messages', m.id, { starred: !m.starred }); renderAll(); break;
        case 'unread': Store.patch('messages', m.id, { read: false }); openId = null; renderAll(); break;
        case 'spam': move(m, 'Spam'); break;
        case 'restore': move(m, 'Inbox'); break;
        case 'delete':
          if (m.folder === 'Trash') {
            if (await UI.confirm({ title: 'Delete forever', message: 'Permanently delete this message?', confirmLabel: 'Delete', danger: true })) {
              Store.remove('messages', m.id); openId = null; UI.toast('Message deleted.'); renderAll();
            }
          } else move(m, 'Trash');
          break;
        default: break;
      }
    });
    root.addEventListener('input', Util.debounce((e) => {
      if (e.target.id !== 'wm-search') return;
      query = e.target.value.trim();
      renderList();
      const input = root.querySelector('#wm-search');
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    }, 150));
    root.addEventListener('change', (e) => {
      if (e.target.id !== 'wm-mailbox') return;
      mailbox = e.target.value;
      Store.ui('webmailBox', mailbox);
      App.setParam('mailbox', mailbox);
      folder = 'Inbox'; openId = null; query = '';
      renderAll();
    });
    root.addEventListener('keydown', (e) => {
      if (!e.target.matches('[data-msg]') || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      const items = Array.from(root.querySelectorAll('[data-msg]'));
      const next = items[items.indexOf(e.target) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) next.focus();
    });

    if (!mailbox) { root.querySelector('.webmail').innerHTML = View.empty({ title: 'No active mailboxes', text: 'Create a mailbox to use webmail.' }); return; }
    if (!messages().length) {
      Store.update('messages', (list) => { list.push({ id: uid('msg'), mailbox, folder: 'Inbox', fromName: 'Mail Services', from: 'postmaster@portal.invalid', to: mailbox, subject: 'Your mailbox is ready', date: fmt.isoDateTime(App.now()), read: false, starred: false, body: 'Welcome to webmail for ' + mailbox + '.\n\nConnection settings for desktop and mobile clients are listed on the Email overview page.' }); });
    }
    renderAll();
  });

  /* ---------- Authentication ---------- */
  App.page('email.authentication', (root) => {
    const list = mailDomains().map((name) => Services.domain(name));
    let domain = Services.selectedDomain(list) || list[0];
    root.innerHTML = View.pageHeader({
      title: 'Email Authentication', description: 'SPF, DKIM and DMARC records that let receiving servers verify mail sent from your domains. Status is read from your DNS zone.',
      crumbs: [['Email', 'email/index.html'], ['Authentication']],
      actions: '<label class="sr-only" for="auth-domain">Domain</label><select id="auth-domain" class="select">' + View.options(list.map((d) => d.name), domain.name) + '</select>'
    }) + '<div id="auth-body"></div>';

    function render() {
      const auth = Services.emailAuth(domain.name);
      const card = (key, description) => {
        const a = auth[key];
        return View.panel({
          className: 'auth-card',
          title: a.label,
          subtitle: description,
          actions: View.badge(a.status),
          body: '<p>' + esc(a.message) + '</p>' +
            '<div><span class="label">Host</span><div class="record-box">' + esc(a.host === '@' ? domain.name : a.host + '.' + domain.name) + '</div></div>' +
            '<div><span class="label">Current record</span><div class="record-box">' + (a.record ? esc(a.record.value) : '<span class="muted">No record found</span>') + '</div></div>' +
            (a.status !== 'Configured' ? '<div><span class="label">Recommended</span><div class="record-box">' + esc(a.expected) + '</div></div>' : ''),
          footer: '<button type="button" class="btn btn-secondary btn-sm" data-verify="' + key + '">Verify</button>' +
            (a.status !== 'Configured' ? '<button type="button" class="btn btn-primary btn-sm" data-publish="' + key + '">' + (a.record ? 'Update record' : 'Publish ' + a.label + ' record') + '</button>' : '<a class="btn btn-ghost btn-sm" href="' + App.url('domains/dns.html?domain=' + encodeURIComponent(domain.name)) + '">View in DNS</a>')
        });
      };
      root.querySelector('#auth-body').innerHTML =
        (domain.customNameservers ? View.alert('warning', 'This domain uses custom nameservers. Publish the records at your external DNS provider.') + '<div class="mb-16"></div>' : '') +
        '<div class="grid grid-3">' +
          card('spf', 'Sender Policy Framework') + card('dkim', 'DomainKeys Identified Mail') + card('dmarc', 'Domain-based Message Authentication') +
        '</div>' +
        '<div class="section">' + View.panel({ title: 'All domains', flush: true, body: '<div class="table-wrap"><table class="table"><thead><tr><th>Domain</th><th>SPF</th><th>DKIM</th><th>DMARC</th><th class="col-actions"></th></tr></thead><tbody>' +
          list.map((d) => { const a = Services.emailAuth(d.name); return '<tr><td class="cell-main">' + esc(d.name) + '</td><td>' + View.badge(a.spf.status) + '</td><td>' + View.badge(a.dkim.status) + '</td><td>' + View.badge(a.dmarc.status) + '</td><td class="col-actions"><button type="button" class="btn btn-secondary btn-xs" data-pick="' + esc(d.name) + '">Review</button></td></tr>'; }).join('') +
          '</tbody></table></div>' }) + '</div>';
    }

    root.addEventListener('change', (e) => {
      if (e.target.id !== 'auth-domain') return;
      domain = Services.domain(e.target.value);
      Services.rememberDomain(domain.name);
      render();
    });
    root.addEventListener('click', async (e) => {
      const pick = e.target.closest('[data-pick]');
      if (pick) { domain = Services.domain(pick.dataset.pick); root.querySelector('#auth-domain').value = domain.name; Services.rememberDomain(domain.name); render(); window.scrollTo(0, 0); return; }
      const publish = e.target.closest('[data-publish]');
      if (publish) {
        const key = publish.dataset.publish;
        const a = Services.emailAuth(domain.name)[key];
        if (!(await UI.confirm({ title: (a.record ? 'Update ' : 'Publish ') + a.label + ' record', message: 'This ' + (a.record ? 'updates the existing' : 'adds a') + ' TXT record in the DNS zone for ' + domain.name + '.', detail: '<div class="record-box">' + esc(a.host) + ' 3600 IN TXT "' + esc(a.expected) + '"</div>', confirmLabel: a.record ? 'Update record' : 'Publish record' }))) return;
        Services.publishAuthRecord(domain.name, key);
        UI.toast(a.label + ' record ' + (a.record ? 'updated' : 'published') + ' for ' + domain.name + '.');
        const related = Store.get('tickets').find((t) => t.service === domain.name && t.status === 'Pending' && new RegExp(a.label, 'i').test(t.subject));
        if (related) UI.toast('Remember to update ticket ' + related.id + '.', 'info');
        render();
        return;
      }
      const verify = e.target.closest('[data-verify]');
      if (verify) {
        UI.setButtonLoading(verify, true, 'Checking...');
        await Util.delay(800);
        UI.setButtonLoading(verify, false);
        const a = Services.emailAuth(domain.name)[verify.dataset.verify];
        UI.toast(a.label + ' for ' + domain.name + ': ' + a.status + '. (Checked against the portal DNS zone; no external lookup was made.)', a.status === 'Configured' ? 'success' : 'info');
      }
    });
    render();
  });
})();
