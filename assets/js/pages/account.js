/* Account: profile, users & permissions, notifications, API access, activity log, settings. */
(function () {
  'use strict';
  const { esc, uid } = Util;
  const icon = Icons.icon;
  const TIMEZONES = ['Europe/London', 'Europe/Berlin', 'Europe/Amsterdam', 'Africa/Lagos', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'UTC'];
  const COUNTRIES = ['United Kingdom', 'Nigeria', 'Germany', 'Netherlands', 'United States', 'Singapore', 'Other'];
  const API_SCOPES = [['domains:read', 'Read domains'], ['domains:write', 'Manage domains'], ['dns:write', 'Edit DNS records'], ['hosting:read', 'Read hosting accounts'], ['hosting:write', 'Manage hosting'], ['billing:read', 'Read invoices and payments'], ['email:write', 'Manage mailboxes']];
  const PERMISSION_AREAS = [['domains', 'Domains'], ['dns', 'DNS records'], ['hosting', 'Hosting'], ['email', 'Email'], ['billing', 'Billing and payments'], ['security', 'Security settings'], ['support', 'Support tickets'], ['team', 'Team management'], ['api', 'API keys']];
  const ROLE_DESCRIPTIONS = {
    Owner: 'Full access, including ownership transfer and account closure.',
    Administrator: 'Full access except ownership transfer.',
    Billing: 'Invoices, payments and billing support tickets.',
    Support: 'Support tickets and mailbox management.',
    Developer: 'Hosting, DNS, email and API keys. No billing access.',
    Viewer: 'Read-only access to services. Cannot make changes.'
  };

  function header(root, opts) {
    root.innerHTML = View.pageHeader({ title: opts.title, description: opts.description, crumbs: [['Account', 'account/profile.html'], [opts.crumb || opts.title]], actions: opts.actions }) + '<div id="page-body"></div>';
    return root.querySelector('#page-body');
  }

  /* ---------- Profile ---------- */
  App.page('account.profile', (root) => {
    const body = header(root, { title: 'Profile', description: 'Account holder details used on invoices and domain registrations.' });
    const fields = [
      { name: 'name', label: 'Full name', required: true, half: true, autocomplete: 'name', validate: (v) => v.length < 2 ? 'Enter your full name.' : '' },
      { name: 'email', label: 'Email', type: 'email', required: true, half: true, autocomplete: 'email' },
      { name: 'phone', label: 'Phone', half: true, autocomplete: 'tel', validate: (v) => !v || /^\+?[\d\s()-]{7,20}$/.test(v) ? '' : 'Enter a valid phone number.' },
      { name: 'company', label: 'Company', half: true, autocomplete: 'organization' },
      { name: 'vatNumber', label: 'VAT / Tax ID', half: true },
      { name: 'timezone', label: 'Timezone', type: 'select', options: TIMEZONES, half: true },
      { name: 'address', label: 'Address', required: true, autocomplete: 'street-address' },
      { name: 'city', label: 'City', required: true, half: true },
      { name: 'postcode', label: 'Postcode', required: true, half: true },
      { name: 'country', label: 'Country', type: 'select', options: COUNTRIES }
    ];

    function render() {
      const p = Store.get('profile');
      body.innerHTML = '<div class="grid grid-main">' +
        View.panel({ title: 'Personal and company details', body: '<form id="profile-form" class="form-grid" novalidate>' +
          fields.map((f) => UI.fieldHTML(Object.assign({}, f, { value: p[f.name] }))).join('') +
          '<div class="form-error" role="alert" hidden></div>' +
          '<div class="form-actions"><span class="muted small" id="dirty-note"></span><button type="button" class="btn btn-secondary" data-reset disabled>Discard changes</button><button type="submit" class="btn btn-primary" disabled>Save changes</button></div>' +
        '</form>' }) +
        '<div class="stack">' +
          View.panel({ body: '<div class="profile-head"><span class="avatar avatar-lg">' + esc(Shell.initials(p.name)) + '</span><div><h2 style="font-size:16px">' + esc(p.name) + '</h2><p class="muted mb-0">' + esc(p.company) + '</p></div></div><hr>' +
            View.kv([['Customer ID', '<span class="mono">' + esc(p.customerId) + '</span>'], ['Member since', fmt.date(p.memberSince)], ['Role', 'Owner'], ['Local time zone', esc(p.timezone)]]) }) +
          View.panel({ title: 'Used for', body: '<ul class="article-body" style="margin:0"><li>Invoice billing address</li><li>Domain registrant contact (hidden when WHOIS privacy is on)</li><li>Account recovery and security notices</li></ul>' }) +
        '</div></div>';
      bind();
    }

    function bind() {
      const form = body.querySelector('#profile-form');
      const save = form.querySelector('[type="submit"]');
      const reset = form.querySelector('[data-reset]');
      const note = form.querySelector('#dirty-note');
      const initial = JSON.stringify(UI.readForm(form, fields));
      const check = () => {
        const dirty = JSON.stringify(UI.readForm(form, fields)) !== initial;
        save.disabled = !dirty; reset.disabled = !dirty;
        note.textContent = dirty ? 'Unsaved changes' : '';
      };
      form.addEventListener('input', check);
      form.addEventListener('change', check);
      reset.addEventListener('click', render);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const values = UI.readForm(form, fields);
        if (!UI.validateFields(form, fields, values)) return;
        UI.setButtonLoading(save, true, 'Saving...');
        await Util.delay(600);
        const before = Store.get('profile');
        const changed = fields.filter((f) => before[f.name] !== values[f.name]).map((f) => f.label);
        Store.set('profile', Object.assign({}, before, values));
        Store.update('teamMembers', (list) => list.forEach((u) => { if (u.id === 'u1') u.name = values.name; }));
        App.log('Account', 'Profile updated', changed.join(', '));
        Shell.refreshProfile();
        UI.toast('Profile saved.');
        render();
      });
    }
    render();
  });

  /* ---------- Users & permissions ---------- */
  App.page('account.users', (root) => {
    const body = header(root, { title: 'Users & Permissions', description: 'Invite team members and control what each role can access.', actions: '<button type="button" class="btn btn-primary" data-invite>' + icon('plus', 14) + 'Invite user</button>' });
    body.innerHTML = '<div class="panel" id="team-table"></div><div class="section" id="matrix"></div>';

    const table = UI.DataTable(body.querySelector('#team-table'), {
      data: () => Store.get('teamMembers'),
      searchKeys: ['name', 'email', 'role'],
      searchPlaceholder: 'Search users',
      filters: [{ key: 'role', label: 'Role', options: Services.teamRoles }, { key: 'status', label: 'Status', options: ['Active', 'Invited'] }],
      columns: [
        { key: 'name', label: 'User', render: (u) => '<div class="flex"><span class="avatar avatar-sm">' + esc(Shell.initials(u.name)) + '</span><span><span class="cell-main">' + esc(u.name) + '</span><span class="cell-sub">' + esc(u.email) + '</span></span></div>' },
        { key: 'role', label: 'Role', sortValue: (u) => Services.teamRoles.indexOf(u.role), render: (u) => '<strong>' + esc(u.role) + '</strong>' },
        { key: 'status', label: 'Status', render: (u) => View.badge(u.status) },
        { key: 'twoFactor', label: '2FA', render: (u) => { const on = u.id === 'u1' ? Store.get('security').twoFactor : u.twoFactor; return on ? 'Enabled' : '<strong>Off</strong>'; } },
        { key: 'lastActive', label: 'Last active', render: (u) => u.lastActive ? fmt.relative(u.lastActive) : '<span class="muted">Never</span>' }
      ],
      actions: (u) => u.role === 'Owner' ? [{ action: 'noop', label: 'Owner', primary: true, disabled: true }] : [
        { action: 'role', label: 'Change role', primary: true },
        u.status === 'Invited' ? { action: 'resend', label: 'Resend invitation', icon: 'send' } : null,
        { divider: true },
        { action: 'remove', label: u.status === 'Invited' ? 'Revoke invitation' : 'Remove user', icon: 'trash', danger: true }
      ],
      onAction: async (action, u) => {
        if (action === 'role') {
          UI.formModal({
            title: 'Change role', subtitle: u.name,
            fields: [{ name: 'role', label: 'Role', type: 'select', value: u.role, options: Services.teamRoles.filter((r) => r !== 'Owner') }, { name: 'desc', type: 'static', label: 'Access', html: '<span id="role-desc" class="muted"></span>' }],
            submitLabel: 'Save role',
            onChange: (values, form) => { form.querySelector('#role-desc').textContent = ROLE_DESCRIPTIONS[values.role]; },
            onSubmit: (values) => {
              if (values.role === u.role) return;
              Store.patch('teamMembers', u.id, { role: values.role });
              Store.prepend('securityLogs', { id: uid('sl'), date: fmt.isoDateTime(App.now()), event: 'Permission change', detail: u.name + ' changed from ' + u.role + ' to ' + values.role, ip: '198.51.100.42', severity: 'Notice', user: Store.get('profile').name });
              App.log('Account', 'User role changed', u.name + ': ' + u.role + ' to ' + values.role);
              UI.toast(u.name + ' is now ' + values.role + '.');
              table.refresh();
            }
          });
        }
        if (action === 'resend') {
          App.log('Account', 'Invitation resent', u.email);
          UI.toast('Invitation resent to ' + u.email + '');
        }
        if (action === 'remove' && await UI.confirm({ title: u.status === 'Invited' ? 'Revoke invitation' : 'Remove user', message: (u.status === 'Invited' ? 'Revoke the invitation for ' : 'Remove access for ') + u.name + ' (' + u.email + ')? Their active sessions end immediately.', confirmLabel: 'Remove', danger: true })) {
          Store.remove('teamMembers', u.id);
          App.log('Account', 'User removed', u.name + ' (' + u.role + ')');
          UI.toast(u.name + ' removed.');
          table.refresh();
        }
      }
    });

    body.querySelector('#matrix').innerHTML = View.panel({
      title: 'Role permissions', subtitle: 'What each role can manage', flush: true,
      body: '<div class="table-wrap"><table class="table matrix"><thead><tr><th>Area</th>' + Services.teamRoles.map((r) => '<th>' + r + '</th>').join('') + '</tr></thead><tbody>' +
        PERMISSION_AREAS.map((a) => '<tr><td>' + a[1] + '</td>' + Services.teamRoles.map((r) => '<td>' + (Services.rolePermissions[r].indexOf(a[0]) !== -1 ? '<span class="matrix-yes" aria-label="Allowed">' + icon('check', 11) + '</span>' : '<span class="matrix-no" aria-label="Not allowed">-</span>') + '</td>').join('') + '</tr>').join('') +
        '<tr><td>View services</td>' + Services.teamRoles.map(() => '<td><span class="matrix-yes" aria-label="Allowed">' + icon('check', 11) + '</span></td>').join('') + '</tr>' +
        '</tbody></table></div>',
      footer: Services.teamRoles.map((r) => '<span><strong>' + r + ':</strong> ' + esc(ROLE_DESCRIPTIONS[r]) + '</span>').join('')
    });

    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-invite]')) return;
      UI.formModal({
        title: 'Invite user',
        fields: [
          { name: 'name', label: 'Full name', required: true, half: true },
          { name: 'email', label: 'Email', type: 'email', required: true, half: true, validate: (v) => Store.get('teamMembers').some((u) => u.email.toLowerCase() === v.toLowerCase()) ? 'This person is already on the team.' : '' },
          { name: 'role', label: 'Role', type: 'select', value: 'Developer', options: Services.teamRoles.filter((r) => r !== 'Owner') },
          { name: 'desc', type: 'static', label: 'Access', html: '<span id="role-desc" class="muted"></span>' },
          { name: 'require2fa', label: 'Require two-factor authentication on first sign-in', type: 'checkbox', value: true }
        ],
        submitLabel: 'Send invitation',
        onChange: (values, form) => { form.querySelector('#role-desc').textContent = ROLE_DESCRIPTIONS[values.role]; },
        onSubmit: (values) => {
          Store.update('teamMembers', (list) => { list.push({ id: uid('u'), name: values.name, email: values.email.toLowerCase(), role: values.role, status: 'Invited', lastActive: null, twoFactor: false }); });
          App.log('Account', 'User invited', values.email + ' (' + values.role + ')');
          UI.toast('Invitation sent to ' + values.email + '');
          table.refresh();
        }
      });
    });
  });

  /* ---------- Notifications ---------- */
  App.page('account.notifications', (root) => {
    const body = header(root, { title: 'Notifications', description: 'Portal notifications and how we contact you about account events.' });
    let showUnread = false;

    function render() {
      const list = Store.get('notifications').slice().sort((a, b) => b.date.localeCompare(a.date)).filter((n) => !showUnread || !n.read);
      const prefs = Store.get('notificationPrefs');
      const contacts = Store.ui('notifyContacts') || { email: Store.get('profile').email, sms: Store.get('profile').phone };
      body.innerHTML = '<div class="grid grid-main">' +
        View.panel({
          title: 'Inbox', subtitle: Services.unreadNotifications() + ' unread',
          actions: '<label class="checkbox"><input type="checkbox" data-unread' + (showUnread ? ' checked' : '') + '><span>Unread only</span></label><button type="button" class="btn btn-secondary btn-sm" data-read-all' + (Services.unreadNotifications() ? '' : ' disabled') + '>Mark all as read</button>',
          flush: true,
          body: list.length ? '<ul class="list">' + list.map((n) =>
            '<li class="list-item"><span class="notif-dot" style="' + (n.read ? '' : 'background:var(--black);border-color:var(--black)') + '" aria-label="' + (n.read ? 'Read' : 'Unread') + '"></span><span class="list-item-main"><span class="list-item-title"' + (n.read ? '' : ' style="font-weight:700"') + '>' + esc(n.title) + '</span><span class="list-item-sub">' + esc(n.text) + ' - ' + fmt.datetime(n.date) + '</span></span>' +
            '<span class="row-actions">' + (n.link ? '<a class="btn btn-secondary btn-xs" href="' + App.url(n.link) + '" data-open-notif="' + n.id + '">Open</a>' : '') +
            UI.menu([{ action: 'toggle', label: n.read ? 'Mark as unread' : 'Mark as read', icon: 'check', data: ' data-notif="' + n.id + '"' }, { action: 'delete', label: 'Delete', icon: 'trash', danger: true, data: ' data-notif="' + n.id + '"' }]) + '</span></li>').join('') + '</ul>'
            : View.empty({ icon: 'bell', title: showUnread ? 'No unread notifications' : 'No notifications', text: 'New account events will appear here.' })
        }) +
        View.panel({ title: 'Contact details', body: '<form id="contact-form" class="stack" novalidate>' +
          UI.fieldHTML({ name: 'email', label: 'Notification email', type: 'email', value: contacts.email, required: true }) +
          UI.fieldHTML({ name: 'sms', label: 'SMS number', value: contacts.sms }) +
          '<button type="submit" class="btn btn-secondary">Save contacts</button></form>' }) +
        '</div>' +
        '<div class="section">' + View.panel({
          title: 'Preferences', subtitle: 'Choose channels for each type of event. Changes save automatically.', flush: true,
          body: '<div class="table-wrap"><table class="table pref-table"><thead><tr><th>Event type</th><th>Email</th><th>SMS</th><th>Portal</th></tr></thead><tbody>' +
            prefs.map((p) => '<tr><td><span class="cell-main">' + esc(p.label) + '</span><span class="cell-sub">' + esc(p.description) + '</span></td>' +
              ['email', 'sms', 'portal'].map((ch) => '<td>' + View.switchControl({ checked: p[ch], data: 'data-pref="' + p.id + '" data-channel="' + ch + '"', srLabel: p.label + ' by ' + ch, disabled: p.id === 'security' && ch === 'email' }) + '</td>').join('') + '</tr>').join('') +
            '</tbody></table></div>',
          footer: '<span class="muted">Security alerts by email cannot be disabled.</span><button type="button" class="btn btn-secondary btn-sm" data-test>Send test notification</button>'
        }) + '</div>';
    }

    body.addEventListener('change', (e) => {
      if (e.target.matches('[data-unread]')) { showUnread = e.target.checked; render(); return; }
      const pref = e.target.dataset.pref;
      if (pref) {
        const channel = e.target.dataset.channel;
        Store.update('notificationPrefs', (list) => { const p = list.find((x) => x.id === pref); p[channel] = e.target.checked; });
        const p = Store.find('notificationPrefs', pref);
        App.log('Account', 'Notification preference changed', p.label + ' via ' + channel + ': ' + (e.target.checked ? 'on' : 'off'));
        UI.toast(p.label + ' ' + channel.toUpperCase() + ' notifications ' + (e.target.checked ? 'enabled' : 'disabled') + '.', 'info');
      }
    });
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-read-all]')) {
        Store.update('notifications', (list) => list.forEach((n) => { n.read = true; }));
        Shell.refreshNotifications(); render(); UI.toast('All notifications marked as read.', 'info');
      }
      const open = e.target.closest('[data-open-notif]');
      if (open) Store.patch('notifications', open.dataset.openNotif, { read: true });
      const item = e.target.closest('[data-action][data-notif]');
      if (item) {
        const n = Store.find('notifications', item.dataset.notif);
        if (item.dataset.action === 'toggle') Store.patch('notifications', n.id, { read: !n.read });
        if (item.dataset.action === 'delete') { Store.remove('notifications', n.id); UI.toast('Notification deleted.', 'info'); }
        Shell.refreshNotifications(); render();
      }
      if (e.target.closest('[data-test]')) {
        App.notify('Test notification', 'Delivered to the portal. Email and SMS copies follow your preferences.', 'account/notifications.html');
        UI.toast('Test notification sent.');
        render();
      }
    });
    body.addEventListener('submit', (e) => {
      if (e.target.id !== 'contact-form') return;
      e.preventDefault();
      const fields = [{ name: 'email', label: 'Notification email', type: 'email', required: true }, { name: 'sms', label: 'SMS number', validate: (v) => !v || /^\+?[\d\s()-]{7,20}$/.test(v) ? '' : 'Enter a valid phone number.' }];
      const values = UI.readForm(e.target, fields);
      if (!UI.validateFields(e.target, fields, values)) return;
      Store.ui('notifyContacts', values);
      App.log('Account', 'Notification contacts updated', values.email);
      UI.toast('Notification contacts saved.');
    });
    render();
  });

  /* ---------- API access ---------- */
  App.page('account.api', (root) => {
    const body = header(root, { title: 'API Access', description: 'Keys for automating domain, DNS and hosting tasks.', actions: '<button type="button" class="btn btn-primary" data-create>' + icon('plus', 14) + 'Create API key</button>' });
    body.innerHTML = '<div class="panel" id="key-table"></div><div class="grid grid-2 section" id="api-extra"></div>';

    const table = UI.DataTable(body.querySelector('#key-table'), {
      data: () => Store.get('apiKeys'),
      searchKeys: ['name', 'prefix', (k) => k.scopes.join(' ')],
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Revoked'] }],
      emptyTitle: 'No API keys',
      emptyText: 'Create a key to use the API.',
      columns: [
        { key: 'name', label: 'Name', render: (k) => '<span class="cell-main">' + esc(k.name) + '</span>' },
        { key: 'prefix', label: 'Key', render: (k) => '<span class="mono">' + esc(k.prefix) + '_' + '&bull;'.repeat(12) + '</span>' },
        { key: 'scopes', label: 'Scopes', sortable: false, render: (k) => k.scopes.map((s) => '<span class="tag">' + esc(s) + '</span>').join(' ') },
        { key: 'created', label: 'Created', render: (k) => fmt.date(k.created) },
        { key: 'lastUsed', label: 'Last used', render: (k) => k.lastUsed ? fmt.relative(k.lastUsed) : '<span class="muted">Never</span>' },
        { key: 'status', label: 'Status', render: (k) => View.badge(k.status) }
      ],
      actions: (k) => [{ action: 'rename', label: 'Rename', primary: true, disabled: k.status !== 'Active' }, { divider: true }, { action: 'revoke', label: k.status === 'Active' ? 'Revoke' : 'Delete', icon: 'trash', danger: true }],
      onAction: async (action, k) => {
        if (action === 'rename') {
          UI.formModal({ title: 'Rename API key', fields: [{ name: 'name', label: 'Name', required: true, value: k.name, maxlength: 60 }], submitLabel: 'Save',
            onSubmit: (values) => { Store.patch('apiKeys', k.id, { name: values.name }); App.log('Account', 'API key renamed', k.prefix + ': ' + values.name); UI.toast('API key renamed.'); table.refresh(); } });
        }
        if (action === 'revoke') {
          if (k.status === 'Active') {
            if (!(await UI.confirm({ title: 'Revoke API key', message: 'Revoke "' + k.name + '"? Integrations using this key stop working immediately.', confirmLabel: 'Revoke key', danger: true }))) return;
            Store.patch('apiKeys', k.id, { status: 'Revoked' });
            Store.prepend('securityLogs', { id: uid('sl'), date: fmt.isoDateTime(App.now()), event: 'API key revoked', detail: 'Key "' + k.name + '" revoked', ip: '198.51.100.42', severity: 'Notice', user: Store.get('profile').name });
            App.log('Security', 'API key revoked', k.name);
            UI.toast('API key revoked.');
          } else {
            if (!(await UI.confirm({ title: 'Delete API key', message: 'Delete the revoked key "' + k.name + '" from the list?', confirmLabel: 'Delete', danger: true }))) return;
            Store.remove('apiKeys', k.id);
            UI.toast('API key deleted.');
          }
          table.refresh();
        }
      }
    });

    function renderExtra() {
      const settings = Store.get('apiSettings');
      body.querySelector('#api-extra').innerHTML =
        View.panel({ title: 'Access restrictions', body: '<form id="api-settings" class="stack" novalidate>' +
          UI.fieldHTML({ name: 'ipRestriction', label: 'Allowed source IPs (comma separated, CIDR allowed)', value: settings.ipRestriction, mono: true, hint: 'Leave empty to allow any address.' }) +
          View.kv([['Rate limit', esc(settings.rateLimit)], ['Base URL', '<span class="mono">https://api.portal.invalid/v1</span>']]) +
          '<button type="submit" class="btn btn-secondary">Save restrictions</button></form>' }) +
        View.panel({ title: 'Example request', body: '<pre>curl https://api.portal.invalid/v1/domains \\\n  -H "Authorization: Bearer $API_KEY"</pre><pre>{\n  "data": [\n    { "name": "exampleclient.com", "status": "active",\n      "expires": "2026-12-18", "auto_renew": true }\n  ]\n}</pre>' });
    }

    body.addEventListener('submit', (e) => {
      if (e.target.id !== 'api-settings') return;
      e.preventDefault();
      const value = e.target.elements.ipRestriction.value.trim();
      const ok = !value || value.split(/\s*,\s*/).every((v) => /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v));
      UI.setFieldError(e.target.querySelector('[data-field="ipRestriction"]'), ok ? '' : 'Enter IPv4 addresses or CIDR ranges separated by commas.');
      if (!ok) return;
      Store.update('apiSettings', (s) => { s.ipRestriction = value; });
      App.log('Security', 'API IP restriction updated', value || 'Any address');
      UI.toast('API restrictions saved.');
    });

    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-create]')) return;
      const dialog = UI.formModal({
        title: 'Create API key',
        fields: [
          { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Deployment pipeline', maxlength: 60, validate: (v) => Store.get('apiKeys').some((k) => k.name.toLowerCase() === v.toLowerCase() && k.status === 'Active') ? 'An active key with this name already exists.' : '' },
          { name: 'expiry', label: 'Expires', type: 'select', options: ['30 days', '90 days', '1 year', 'Never'], value: '90 days' },
          { name: 'scopes', type: 'static', label: 'Scopes', html: '<div class="grid grid-2" style="gap:6px" id="scope-list">' + API_SCOPES.map((s) => '<label class="checkbox"><input type="checkbox" value="' + s[0] + '"' + (s[0].indexOf(':read') !== -1 ? ' checked' : '') + '><span><span class="mono">' + s[0] + '</span><br><small class="muted">' + s[1] + '</small></span></label>').join('') + '</div>' }
        ],
        submitLabel: 'Create key',
        onSubmit: (values) => {
          const scopes = Array.from(dialog.el.querySelectorAll('#scope-list input:checked')).map((i) => i.value);
          if (!scopes.length) return 'Select at least one scope.';
          const prefix = 'hrp_' + Util.randomHex(4);
          const key = prefix + '_' + Util.randomHex(32);
          Store.prepend('apiKeys', { id: uid('k'), name: values.name, prefix, created: fmt.isoDate(App.now()), lastUsed: null, scopes, status: 'Active', expiry: values.expiry });
          Store.prepend('securityLogs', { id: uid('sl'), date: fmt.isoDateTime(App.now()), event: 'API key created', detail: 'Key "' + values.name + '" with ' + scopes.join(', '), ip: '198.51.100.42', severity: 'Notice', user: Store.get('profile').name });
          App.log('Security', 'API key created', values.name);
          table.refresh();
          setTimeout(() => {
            UI.modal({
              title: 'API key created', dismissible: false,
              body: '<p>Copy this key now. For security it will not be shown again.</p><div class="token-box"><span>' + esc(key) + '</span><button type="button" class="icon-btn" data-copy="' + esc(key) + '" aria-label="Copy key">' + icon('copy') + '</button></div>',
              actions: [{ label: 'I have copied the key', variant: 'primary' }]
            });
          }, 0);
        }
      });
    });
    renderExtra();
  });

  /* ---------- Activity log ---------- */
  App.page('account.activity', (root) => {
    const body = header(root, { title: 'Activity Log', description: 'Every change made to the account by users, API keys and automated systems.' });
    body.innerHTML = '<div class="panel" id="activity-table"></div>';
    const ranges = { '1': 1, '7': 7, '30': 30, '90': 90 };
    const table = UI.DataTable(body.querySelector('#activity-table'), {
      data: () => Store.get('activity'),
      searchKeys: ['action', 'target', 'user', 'ip', 'category'],
      searchPlaceholder: 'Search activity',
      pageSize: 15,
      filters: [
        { key: 'category', label: 'Category', allLabel: 'All categories', options: Array.from(new Set(Store.get('activity').map((a) => a.category).concat(['Account', 'Billing', 'DNS', 'Domains', 'Email', 'Hosting', 'Security', 'SSL', 'Support']))).sort() },
        { key: 'user', label: 'User', allLabel: 'All users', options: Array.from(new Set(Store.get('activity').map((a) => a.user))).sort() },
        { key: 'range', label: 'Date range', allLabel: 'All time', options: [{ value: '1', label: 'Today' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }], match: (a, v) => -Util.daysUntil(a.date) < ranges[v] }
      ],
      defaultSort: { key: 'date', dir: 'desc' },
      toolbar: '<button type="button" class="btn btn-secondary btn-sm" data-export>' + icon('download', 14) + 'Export CSV</button>',
      columns: [
        { key: 'date', label: 'Date', render: (a) => '<span class="nowrap">' + fmt.datetime(a.date) + '</span><span class="cell-sub">' + fmt.relative(a.date) + '</span>' },
        { key: 'category', label: 'Category', render: (a) => '<span class="tag">' + esc(a.category) + '</span>' },
        { key: 'action', label: 'Action', render: (a) => '<span class="cell-main">' + esc(a.action) + '</span><span class="cell-sub">' + esc(a.target) + '</span>' },
        { key: 'user', label: 'User' },
        { key: 'ip', label: 'IP address', render: (a) => '<span class="mono">' + esc(a.ip) + '</span>' }
      ]
    });
    body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-export]')) return;
      const rows = table.rows();
      Util.downloadText('activity-log.csv', Util.toCSV(rows, [{ label: 'Date', key: 'date' }, { label: 'Category', key: 'category' }, { label: 'Action', key: 'action' }, { label: 'Target', key: 'target' }, { label: 'User', key: 'user' }, { label: 'IP', key: 'ip' }]), 'text/csv');
      UI.toast(rows.length + ' events exported.', 'info');
    });
  });

  /* ---------- Settings ---------- */
  App.page('account.settings', (root) => {
    const body = header(root, { title: 'Account Settings', description: 'Display preferences, data management and account options.' });

    function storageSize() {
      let total = 0;
      try { Object.keys(localStorage).filter((k) => k.indexOf('hrp:') === 0).forEach((k) => { total += (localStorage.getItem(k) || '').length * 2; }); } catch (e) { /* storage unavailable */ }
      return total;
    }

    function render() {
      const prefs = Store.get('preferences');
      const session = Auth.session();
      const landing = Shell.nav.filter((n) => n.href).map((n) => ({ value: n.href, label: n.label }))
        .concat([{ value: 'domains/index.html', label: 'My Domains' }, { value: 'hosting/index.html', label: 'Hosting overview' }, { value: 'billing/index.html', label: 'Billing overview' }, { value: 'support/index.html', label: 'Support overview' }]).filter((o) => o.value !== 'account/settings.html');
      body.innerHTML = '<div class="grid grid-main">' +
        '<div class="stack">' +
          View.panel({ title: 'Display preferences', body: '<form id="prefs-form" class="form-grid" novalidate>' +
            UI.fieldHTML({ name: 'dateFormat', label: 'Date format', type: 'select', value: prefs.dateFormat, half: true, options: [{ value: 'DD MMM YYYY', label: '18 Dec 2026' }, { value: 'YYYY-MM-DD', label: '2026-12-18' }, { value: 'MM/DD/YYYY', label: '12/18/2026' }] }) +
            UI.fieldHTML({ name: 'rowsPerPage', label: 'Rows per table page', type: 'select', value: prefs.rowsPerPage, half: true, options: [10, 15, 25, 50] }) +
            UI.fieldHTML({ name: 'landingPage', label: 'Page after sign-in', type: 'select', value: prefs.landingPage, options: landing }) +
            '<div class="form-actions"><button type="submit" class="btn btn-primary">Save preferences</button></div></form>' }) +
          View.panel({ title: 'Data', subtitle: 'Export or reset your account data', body: View.kv([
              ['Storage used', fmt.bytes(storageSize())],
              ['Data set version', String(MockData.version)]
            ]) + '<div class="flex flex-wrap mt-16"><button type="button" class="btn btn-secondary btn-sm" data-export>' + icon('download', 14) + 'Export data (JSON)</button><button type="button" class="btn btn-danger btn-sm" data-reset>' + icon('refresh', 14) + 'Reset data</button></div>' }) +
        '</div>' +
        '<div class="stack">' +
          View.panel({ title: 'Session', body: View.kv([['Signed in as', esc(session.email)], ['Remember me', session.remember ? 'Yes (30 days)' : 'No (8 hours)'], ['Session expires', new Date(session.expiresAt).toLocaleString()]]) + '<button type="button" class="btn btn-secondary btn-sm mt-8" data-logout>' + icon('logout', 14) + 'Logout</button>' }) +
          View.panel({ title: 'Close account', body: '<p>Closing the account cancels all services at the end of their billing periods. Domains must be transferred out or will expire.</p><button type="button" class="btn btn-danger btn-sm" data-close>Request account closure</button>' }) +
        '</div></div>';
    }

    body.addEventListener('submit', async (e) => {
      if (e.target.id !== 'prefs-form') return;
      e.preventDefault();
      const values = UI.readForm(e.target, [{ name: 'dateFormat' }, { name: 'rowsPerPage' }, { name: 'landingPage' }]);
      const button = e.target.querySelector('[type="submit"]');
      UI.setButtonLoading(button, true, 'Saving...');
      await Util.delay(400);
      Store.set('preferences', Object.assign({}, Store.get('preferences'), values, { rowsPerPage: Number(values.rowsPerPage) }));
      App.log('Account', 'Preferences updated', 'Date format ' + values.dateFormat + ', ' + values.rowsPerPage + ' rows');
      UI.toast('Preferences saved.');
      render();
    });
    body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-export]')) {
        const names = Object.keys(MockData).filter((k) => typeof MockData[k] === 'object');
        const data = {};
        names.forEach((n) => { data[n] = Store.get(n); });
        Util.downloadText('hr-portal-data.json', JSON.stringify(data, null, 2), 'application/json');
        UI.toast('Data exported.', 'info');
      }
      if (e.target.closest('[data-reset]')) {
        if (!(await UI.confirm({ title: 'Reset data', message: 'Restore every domain, invoice, ticket, file and setting to its original state? Your session stays signed in.', confirmLabel: 'Reset data', danger: true, requireText: 'RESET' }))) return;
        Store.clearData();
        try { Object.keys(localStorage).filter((k) => k.indexOf('hrp:ui:') === 0).forEach((k) => localStorage.removeItem(k)); } catch (err) { /* storage unavailable */ }
        UI.toast('Data reset.');
        setTimeout(() => location.reload(), 500);
      }
      if (e.target.closest('[data-close]')) {
        if (!(await UI.confirm({ title: 'Request account closure', message: 'Submit a closure request? Our billing team will contact you to confirm before anything is cancelled.', confirmLabel: 'Submit request', danger: true, requireText: Store.get('profile').customerId }))) return;
        App.log('Account', 'Account closure requested', Store.get('profile').customerId);
        UI.toast('Closure request submitted.');
      }
    });
    render();
  });
})();
