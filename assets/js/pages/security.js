/* Security: center, login security, two-factor authentication, logs. */
(function () {
  'use strict';
  const { esc, daysUntil, uid } = Util;
  const icon = Icons.icon;
  const CURRENT_IP = '198.51.100.42';

  function header(root, opts) {
    root.innerHTML = View.pageHeader({ title: opts.title, description: opts.description, crumbs: [['Security', 'security/index.html'], [opts.crumb || opts.title]], actions: opts.actions }) + '<div id="page-body"></div>';
    return root.querySelector('#page-body');
  }

  function secLog(event, detail, severity) {
    Store.prepend('securityLogs', { id: uid('sl'), date: fmt.isoDateTime(App.now()), event, detail, ip: CURRENT_IP, severity: severity || 'Notice', user: Store.get('profile').name });
    App.log('Security', event, detail);
  }

  function ipInRange(ip, cidr) {
    const [range, bits] = cidr.split('/');
    const toInt = (a) => a.split('.').reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
    const mask = bits === undefined ? 0xffffffff : (~0 << (32 - Number(bits))) >>> 0;
    return (toInt(ip) & mask) === (toInt(range) & mask);
  }

  function sessionsTable(container, onChange) {
    return UI.DataTable(container, {
      data: () => Store.get('sessions'),
      search: false,
      loading: false,
      rowId: (s) => s.id,
      columns: [
        { key: 'device', label: 'Device', render: (s) => '<span class="cell-main">' + esc(s.device) + '</span>' + (s.current ? '<span class="cell-sub"><strong>This session</strong></span>' : '') },
        { key: 'ip', label: 'IP address', render: (s) => '<span class="mono">' + esc(s.ip) + '</span>' },
        { key: 'location', label: 'Location' },
        { key: 'started', label: 'Signed in', render: (s) => fmt.datetime(s.started) },
        { key: 'lastSeen', label: 'Last active', render: (s) => fmt.relative(s.lastSeen) }
      ],
      actions: (s) => [{ action: 'revoke', label: s.current ? 'Current' : 'Revoke', primary: true, disabled: s.current }],
      onAction: async (action, s) => {
        if (!(await UI.confirm({ title: 'Revoke session', message: 'Sign out ' + s.device + ' (' + s.ip + ')?', confirmLabel: 'Revoke', danger: true }))) return;
        Store.remove('sessions', s.id);
        secLog('Session revoked', s.device + ' (' + s.ip + ')');
        UI.toast('Session revoked.');
        onChange();
      }
    });
  }

  /* ---------- Security center ---------- */
  App.page('security.index', (root) => {
    const body = header(root, { title: 'Security Center', crumb: 'Overview', description: 'Account protection status, sign-in activity and active sessions.' });

    function render() {
      const result = Services.securityScore();
      const sec = Store.get('security');
      const passwordAge = -daysUntil(sec.passwordChanged);
      const keys = Store.get('apiKeys').filter((k) => k.status === 'Active');
      const logins = Store.get('loginHistory').slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
      const logs = Store.get('securityLogs').slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
      body.innerHTML =
        '<div class="grid grid-main">' +
          View.panel({ title: 'Security score', body: '<div class="flex" style="gap:24px;align-items:flex-start;flex-wrap:wrap">' +
            '<div class="gauge" style="--pct:' + result.score + '" role="img" aria-label="Security score ' + result.score + ' out of 100"><div class="gauge-inner"><span class="gauge-value">' + result.score + '</span><span class="gauge-label">' + result.rating + '</span></div></div>' +
            '<ul class="list checklist" style="flex:1;min-width:260px">' + result.checks.map((c) =>
              '<li class="list-item" style="padding:7px 0"><span class="check-mark' + (c.ok ? ' ok' : '') + '">' + (c.ok ? icon('check', 11) : '') + '</span><span class="list-item-main">' + esc(c.label) + '</span>' +
              (c.ok ? '<span class="muted small">+' + c.weight + '</span>' : '<a class="btn btn-secondary btn-xs" href="' + App.url(c.href) + '">Fix</a>') + '</li>').join('') + '</ul></div>' }) +
          '<div class="stack">' +
            View.panel({ title: 'Two-factor authentication', actions: View.badge(sec.twoFactor ? 'Enabled' : 'Disabled', sec.twoFactor ? 'ok' : 'danger'), body: '<p>' + (sec.twoFactor ? 'Sign-ins require a code from your authenticator app.' : 'Your account is protected by a password only.') + '</p><a class="btn btn-' + (sec.twoFactor ? 'secondary' : 'primary') + ' btn-sm" href="' + App.url('security/2fa.html') + '">' + (sec.twoFactor ? 'Manage 2FA' : 'Enable 2FA') + '</a>' }) +
            View.panel({ title: 'Password', body: View.kv([['Last changed', fmt.date(sec.passwordChanged) + '<span class="cell-sub">' + passwordAge + ' days ago</span>'], ['Sign-in alerts', sec.loginAlerts ? 'On' : 'Off']]) + '<a class="btn btn-secondary btn-sm mt-8" href="' + App.url('security/login-security.html') + '">Change password</a>' }) +
            View.panel({ title: 'API access', body: View.kv([['Active keys', keys.length], ['Restriction', esc(Store.get('apiSettings').ipRestriction || 'None')]]) + '<a class="btn btn-secondary btn-sm mt-8" href="' + App.url('account/api.html') + '">Manage API keys</a>' }) +
          '</div>' +
        '</div>' +
        '<div class="section" id="sessions">' + View.panel({ title: 'Active sessions', subtitle: 'Devices currently signed in to this account', actions: '<button type="button" class="btn btn-secondary btn-sm" data-revoke-all>Sign out all other sessions</button>', flush: true, body: '<div id="session-table"></div>' }) + '</div>' +
        '<div class="grid grid-2 section">' +
          View.panel({ title: 'Recent login activity', flush: true, actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('security/login-security.html#history') + '">Full history</a>',
            body: '<ul class="list">' + logins.map((l) => '<li class="list-item"><span class="list-item-main"><span class="list-item-title">' + esc(l.device) + '</span><span class="list-item-sub">' + esc(l.ip) + ' - ' + esc(l.location) + ' - ' + fmt.datetime(l.date) + '</span></span>' + View.badge(l.result.split(' - ')[0], l.result === 'Success' ? 'ok' : 'danger') + '</li>').join('') + '</ul>' }) +
          View.panel({ title: 'Security logs', flush: true, actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('security/logs.html') + '">All events</a>',
            body: '<ul class="list">' + logs.map((l) => '<li class="list-item"><span class="list-item-main"><span class="list-item-title">' + esc(l.event) + '</span><span class="list-item-sub">' + esc(l.detail) + '</span></span><span class="list-item-meta">' + View.badge(l.severity, l.severity === 'Critical' ? 'danger' : l.severity === 'Warning' ? 'warn' : 'neutral') + '<br>' + fmt.relative(l.date) + '</span></li>').join('') + '</ul>' }) +
        '</div>';
      sessionsTable(body.querySelector('#session-table'), render);
    }

    body.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-revoke-all]')) return;
      const others = Store.get('sessions').filter((s) => !s.current);
      if (!others.length) { UI.toast('No other sessions are active.', 'info'); return; }
      if (!(await UI.confirm({ title: 'Sign out other sessions', message: 'Sign out ' + others.length + ' other session' + (others.length === 1 ? '' : 's') + '? API keys are not affected.', confirmLabel: 'Sign out all', danger: true }))) return;
      Store.update('sessions', (list) => list.filter((s) => s.current));
      secLog('Sessions revoked', others.length + ' other sessions signed out', 'Warning');
      UI.toast(others.length + ' session' + (others.length === 1 ? '' : 's') + ' signed out.');
      render();
    });
    render();
    if (location.hash === '#sessions') setTimeout(() => document.getElementById('sessions').scrollIntoView(), 50);
  });

  /* ---------- Login security ---------- */
  App.page('security.login', (root) => {
    const body = header(root, { title: 'Login Security', description: 'Password, sign-in alerts, session timeout and IP restrictions.' });

    function render() {
      const sec = Store.get('security');
      const allowed = sec.ipAllowlist.some((c) => ipInRange(CURRENT_IP, c));
      body.innerHTML =
        '<div class="grid grid-2">' +
          View.panel({ title: 'Change password', subtitle: 'Last changed ' + fmt.date(sec.passwordChanged), body:
            '<form id="pw-form" class="form-grid" novalidate>' +
              UI.fieldHTML({ name: 'current', label: 'Current password', type: 'password', required: true, autocomplete: 'current-password' }) +
              UI.fieldHTML({ name: 'next', label: 'New password', type: 'password', required: true, strength: true, autocomplete: 'new-password', hint: 'At least 12 characters with upper and lower case letters, a number and a symbol.' }) +
              UI.fieldHTML({ name: 'confirm', label: 'Confirm new password', type: 'password', required: true, autocomplete: 'new-password' }) +
              UI.fieldHTML({ name: 'signout', label: 'Sign out all other sessions', type: 'checkbox', value: true }) +
              '<div class="form-error" role="alert" hidden></div>' +
              '<div class="form-actions"><button type="submit" class="btn btn-primary">Update password</button></div>' +
            '</form>' + View.demoNote('Demo: the sign-in password for this prototype does not change.') }) +
          '<div class="stack">' +
            View.panel({ title: 'Sign-in preferences', body: '<div class="stack">' +
              '<div class="flex-between"><div><strong>Sign-in alerts</strong><p class="hint">Email me when a new device or location signs in.</p></div>' + View.switchControl({ checked: sec.loginAlerts, data: 'data-pref="loginAlerts"', srLabel: 'Sign-in alerts' }) + '</div>' +
              '<div class="flex-between"><div><strong>Session timeout</strong><p class="hint">Sign out after a period of inactivity.</p></div><select class="select select-sm" data-pref="sessionTimeout" aria-label="Session timeout">' + View.options([{ value: 15, label: '15 minutes' }, { value: 30, label: '30 minutes' }, { value: 60, label: '1 hour' }, { value: 240, label: '4 hours' }, { value: 480, label: '8 hours' }], sec.sessionTimeout) + '</select></div>' +
              '<form id="recovery-form" class="flex-between"><div style="flex:1"><label class="label" for="recovery-email"><strong>Recovery email</strong></label><p class="hint">Used for account recovery if you lose access.</p><input id="recovery-email" class="input mt-8" type="email" value="' + esc(sec.recoveryEmail || '') + '"></div><button type="submit" class="btn btn-secondary btn-sm" style="align-self:flex-end">Save</button></form>' +
            '</div>' }) +
            View.panel({ title: 'IP allowlist', subtitle: 'Only allow sign-in from these addresses or ranges', actions: View.switchControl({ checked: sec.ipAllowlistEnabled, data: 'data-allowlist', srLabel: 'Enable IP allowlist' }),
              body: (sec.ipAllowlistEnabled && !allowed ? View.alert('critical', 'Your current IP (' + CURRENT_IP + ') is not in the allowlist.') + '<div class="mb-8"></div>' : '') +
                '<p class="small muted">Your current IP address: <span class="mono">' + CURRENT_IP + '</span> ' + (allowed ? View.badge('Allowed', 'ok') : View.badge('Not listed', 'neutral')) + '</p>' +
                '<ul class="list">' + (sec.ipAllowlist.length ? sec.ipAllowlist.map((c, i) => '<li class="list-item" style="padding:6px 0"><span class="list-item-main mono">' + esc(c) + '</span><button type="button" class="btn btn-ghost btn-xs" data-ip-remove="' + i + '">Remove</button></li>').join('') : '<li class="muted small">No entries.</li>') + '</ul>' +
                '<form id="ip-form" class="flex mt-8"><label class="sr-only" for="ip-new">IP address or CIDR range</label><input id="ip-new" class="input input-sm mono" placeholder="203.0.113.0/24"><button type="submit" class="btn btn-secondary btn-sm">Add</button></form>' }) +
          '</div>' +
        '</div>' +
        '<div class="section" id="history">' + View.panel({ title: 'Login history', flush: true, body: '<div id="login-table"></div>' }) + '</div>';

      UI.DataTable(body.querySelector('#login-table'), {
        data: () => Store.get('loginHistory'),
        searchKeys: ['ip', 'location', 'device', 'result'],
        filters: [{ key: 'result', label: 'Result', options: ['Success', 'Failed', 'Blocked'], match: (l, v) => l.result.indexOf(v) === 0 }],
        defaultSort: { key: 'date', dir: 'desc' },
        columns: [
          { key: 'date', label: 'Date', render: (l) => '<span class="nowrap">' + fmt.datetime(l.date) + '</span>' },
          { key: 'device', label: 'Device' },
          { key: 'ip', label: 'IP address', render: (l) => '<span class="mono">' + esc(l.ip) + '</span>' },
          { key: 'location', label: 'Location' },
          { key: 'result', label: 'Result', render: (l) => View.badge(l.result.split(' - ')[0], l.result === 'Success' ? 'ok' : 'danger') + (l.result.indexOf(' - ') !== -1 ? '<span class="cell-sub">' + esc(l.result.split(' - ')[1]) + '</span>' : '') }
        ]
      });
    }

    body.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (form.id === 'pw-form') {
        const fields = [
          { name: 'current', label: 'Current password', required: true, validate: (v) => Auth.checkCredentials(Auth.demoEmail, v) ? '' : 'Current password is incorrect.' },
          { name: 'next', label: 'New password', required: true, validate: (v, all) => v === all.current ? 'Choose a password you have not used before.' : UI.passwordStrength(v).score < 4 ? 'Password is too weak.' : '' },
          { name: 'confirm', label: 'Confirm new password', required: true, validate: (v, all) => v !== all.next ? 'Passwords do not match.' : '' },
          { name: 'signout', type: 'checkbox', label: 'Sign out' }
        ];
        const values = UI.readForm(form, fields);
        if (!UI.validateFields(form, fields, values)) return;
        const button = form.querySelector('[type="submit"]');
        UI.setButtonLoading(button, true, 'Updating...');
        await Util.delay(800);
        Store.update('security', (s) => { s.passwordChanged = fmt.isoDate(App.now()); });
        if (values.signout) Store.update('sessions', (list) => list.filter((s) => s.current));
        secLog('Password changed', 'Account password updated' + (values.signout ? '; other sessions signed out' : ''));
        UI.toast('Password updated. Demo action completed successfully.');
        render();
      }
      if (form.id === 'recovery-form') {
        const value = form.querySelector('input').value.trim();
        if (!UI.EMAIL_RE.test(value)) { UI.toast('Enter a valid recovery email address.', 'error'); return; }
        Store.update('security', (s) => { s.recoveryEmail = value; });
        secLog('Recovery email changed', 'Recovery email set to ' + value);
        UI.toast('Recovery email saved.');
      }
      if (form.id === 'ip-form') {
        const value = form.querySelector('input').value.trim();
        if (!/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/([0-9]|[12]\d|3[0-2]))?$/.test(value)) { UI.toast('Enter an IPv4 address or CIDR range, e.g. 203.0.113.0/24.', 'error'); return; }
        if (Store.get('security').ipAllowlist.indexOf(value) !== -1) { UI.toast('That entry already exists.', 'error'); return; }
        Store.update('security', (s) => { s.ipAllowlist.push(value); });
        secLog('IP allowlist updated', 'Added ' + value);
        UI.toast(value + ' added to the allowlist.');
        render();
      }
    });
    body.addEventListener('change', async (e) => {
      const pref = e.target.dataset.pref;
      if (pref) {
        const value = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
        Store.update('security', (s) => { s[pref] = value; });
        secLog(pref === 'loginAlerts' ? 'Sign-in alerts ' + (value ? 'enabled' : 'disabled') : 'Session timeout changed', pref === 'sessionTimeout' ? 'Set to ' + value + ' minutes' : '');
        UI.toast('Preference saved.');
      }
      if (e.target.matches('[data-allowlist]')) {
        const on = e.target.checked;
        const sec = Store.get('security');
        if (on && !sec.ipAllowlist.some((c) => ipInRange(CURRENT_IP, c)) && !(await UI.confirm({ title: 'Enable allowlist', message: 'Your current IP (' + CURRENT_IP + ') is not listed. You would be locked out after signing out. Enable anyway?', confirmLabel: 'Enable', danger: true }))) { e.target.checked = false; return; }
        Store.update('security', (s) => { s.ipAllowlistEnabled = on; });
        secLog('IP allowlist ' + (on ? 'enabled' : 'disabled'), sec.ipAllowlist.join(', '), 'Warning');
        UI.toast('IP allowlist ' + (on ? 'enabled' : 'disabled') + '.');
        render();
      }
    });
    body.addEventListener('click', async (e) => {
      const remove = e.target.closest('[data-ip-remove]');
      if (!remove) return;
      const entry = Store.get('security').ipAllowlist[Number(remove.dataset.ipRemove)];
      if (!(await UI.confirm({ title: 'Remove entry', message: 'Remove ' + entry + ' from the allowlist?', confirmLabel: 'Remove', danger: true }))) return;
      Store.update('security', (s) => { s.ipAllowlist = s.ipAllowlist.filter((c) => c !== entry); });
      secLog('IP allowlist updated', 'Removed ' + entry);
      UI.toast('Entry removed.');
      render();
    });
    render();
  });

  /* ---------- Two-factor ---------- */
  function demoQR(seed) {
    let state = 0;
    for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0;
    const cells = [];
    const finder = (r, c) => {
      const inBox = (r0, c0) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
      const box = inBox(0, 0) ? [0, 0] : inBox(0, 18) ? [0, 18] : inBox(18, 0) ? [18, 0] : null;
      if (!box) return null;
      const rr = r - box[0]; const cc = c - box[1];
      return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
    };
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 25; c++) {
        const f = finder(r, c);
        state = (state * 1664525 + 1013904223) >>> 0;
        cells.push('<span' + ((f === null ? state % 2 === 0 : f) ? ' class="on"' : '') + '></span>');
      }
    }
    return '<div class="qr" role="img" aria-label="Demo QR code, not scannable">' + cells.join('') + '</div>';
  }

  function recoveryCodes() {
    return Array.from({ length: 8 }, () => 'DEMO-' + Util.randomHex(4).toUpperCase() + '-' + Util.randomHex(4).toUpperCase());
  }

  App.page('security.2fa', (root) => {
    const body = header(root, { title: 'Two-Factor Authentication', description: 'Require a one-time code in addition to your password when signing in.' });
    let step = 0;
    let codes = [];

    function render() {
      const sec = Store.get('security');
      const team = Store.get('teamMembers');
      const teamPanel = View.panel({ title: 'Team members', subtitle: 'Two-factor status for users with access to this account', flush: true,
        body: '<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Role</th><th>2FA</th></tr></thead><tbody>' +
          team.map((u) => { const on = u.id === 'u1' ? sec.twoFactor : u.twoFactor; return '<tr><td><span class="cell-main">' + esc(u.name) + '</span><span class="cell-sub">' + esc(u.email) + '</span></td><td>' + esc(u.role) + '</td><td>' + View.badge(on ? 'Enabled' : 'Disabled', on ? 'ok' : 'neutral') + '</td></tr>'; }).join('') + '</tbody></table></div>',
        footer: '<span class="muted">' + team.filter((u) => (u.id === 'u1' ? sec.twoFactor : u.twoFactor)).length + ' of ' + team.length + ' users protected</span><a class="panel-link" href="' + App.url('account/users.html') + '">Manage users</a>' });

      if (sec.twoFactor) {
        body.innerHTML = '<div class="grid grid-main">' + View.panel({
          title: 'Status', actions: View.badge('Enabled', 'ok'),
          body: View.kv([['Method', esc(sec.twoFactorMethod || 'Authenticator app')], ['Enabled on', fmt.date(sec.twoFactorEnabledOn)], ['Recovery codes', (sec.recoveryCodesLeft === undefined ? 8 : sec.recoveryCodesLeft) + ' remaining']]) +
            '<div class="flex flex-wrap mt-16"><button type="button" class="btn btn-secondary btn-sm" data-2fa="regen">Regenerate recovery codes</button><button type="button" class="btn btn-danger btn-sm" data-2fa="disable">Disable 2FA</button></div>'
        }) + teamPanel + '</div>';
        return;
      }

      const steps = ['Choose method', 'Scan QR code', 'Verify code', 'Save recovery codes'];
      let content = '';
      if (step === 0) {
        content = '<div class="stack"><p>Your account is currently protected by a password only. Two-factor authentication blocks sign-ins that do not also provide a code from your device.</p>' +
          '<label class="radio"><input type="radio" name="method" value="Authenticator app" checked><span><strong>Authenticator app</strong><small>Use any TOTP app. Recommended.</small></span></label>' +
          '<label class="radio"><input type="radio" name="method" value="Security key" disabled><span><strong>Security key</strong><small>Not available in the demo environment.</small></span></label>' +
          '<div class="form-actions"><button type="button" class="btn btn-primary" data-2fa="next">Continue</button></div></div>';
      } else if (step === 1) {
        content = '<div class="flex" style="gap:24px;align-items:flex-start;flex-wrap:wrap">' + demoQR(Store.get('profile').email) +
          '<div style="flex:1;min-width:240px"><ol class="article-body" style="padding-left:18px;margin-top:0"><li>Open your authenticator app.</li><li>Scan the QR code, or enter the setup key manually.</li><li>Continue and enter the six-digit code shown in the app.</li></ol>' +
          '<span class="label">Setup key</span><div class="record-box">DEMO-KEY-NOT-A-REAL-SECRET</div>' +
          View.demoNote('This QR code and key are placeholders. No real authentication secret is generated or stored.') +
          '<div class="form-actions"><button type="button" class="btn btn-secondary" data-2fa="back">Back</button><button type="button" class="btn btn-primary" data-2fa="next">Continue</button></div></div></div>';
      } else if (step === 2) {
        content = '<form id="verify-form" novalidate><div class="field" data-field="code"><label class="label" for="f-code">Six-digit code</label><input id="f-code" name="code" class="input code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6"><p class="field-error" role="alert"></p></div>' +
          View.demoNote('Demo: any six digits are accepted.') +
          '<div class="form-actions"><button type="button" class="btn btn-secondary" data-2fa="back">Back</button><button type="submit" class="btn btn-primary">Verify</button></div></form>';
      } else {
        content = '<p>Store these recovery codes somewhere safe. Each code can be used once if you lose access to your authenticator app.</p>' +
          '<div class="recovery-codes">' + codes.map((c) => '<span>' + c + '</span>').join('') + '</div>' +
          '<div class="flex mt-8"><button type="button" class="btn btn-secondary btn-sm" data-copy="' + codes.join('\n') + '">' + icon('copy', 14) + 'Copy</button><button type="button" class="btn btn-secondary btn-sm" data-2fa="download">' + icon('download', 14) + 'Download</button></div>' +
          View.demoNote('Codes are labelled DEMO and are not valid anywhere.') +
          '<label class="checkbox mt-16"><input type="checkbox" id="saved-codes"><span>I have saved my recovery codes</span></label>' +
          '<div class="form-actions"><button type="button" class="btn btn-primary" data-2fa="finish" disabled>Enable two-factor authentication</button></div>';
      }
      body.innerHTML = '<div class="grid grid-main">' + View.panel({
        title: 'Set up two-factor authentication', actions: View.badge('Disabled', 'danger'),
        body: '<div class="steps">' + steps.map((s, i) => '<div class="step' + (i === step ? ' active' : i < step ? ' done' : '') + '"' + (i === step ? ' aria-current="step"' : '') + '><b>' + (i < step ? '&#10003;' : i + 1) + '</b>' + s + '</div>').join('') + '</div>' + content
      }) + teamPanel + '</div>';
      const codeInput = body.querySelector('#f-code');
      if (codeInput) codeInput.focus();
    }

    body.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-2fa]');
      if (!btn || btn.disabled) return;
      const action = btn.dataset['2fa'];
      if (action === 'next') { step++; render(); }
      if (action === 'back') { step--; render(); }
      if (action === 'download') { Util.downloadText('recovery-codes-demo.txt', 'H&R Portal demo recovery codes (not valid anywhere)\n\n' + codes.join('\n') + '\n'); }
      if (action === 'finish') {
        UI.setButtonLoading(btn, true, 'Enabling...');
        await Util.delay(600);
        Store.update('security', (s) => { s.twoFactor = true; s.twoFactorMethod = 'Authenticator app'; s.twoFactorEnabledOn = fmt.isoDate(App.now()); s.recoveryCodesLeft = 8; });
        Store.update('teamMembers', (list) => list.forEach((u) => { if (u.id === 'u1') u.twoFactor = true; }));
        secLog('Two-factor authentication enabled', 'Authenticator app');
        App.notify('Two-factor authentication enabled', 'Your next sign-in will ask for a code.', 'security/2fa.html');
        UI.toast('Two-factor authentication enabled.');
        step = 0; render();
      }
      if (action === 'regen') {
        if (!(await UI.confirm({ title: 'Regenerate recovery codes', message: 'Existing recovery codes stop working immediately.', confirmLabel: 'Regenerate' }))) return;
        codes = recoveryCodes();
        Store.update('security', (s) => { s.recoveryCodesLeft = 8; });
        secLog('Recovery codes regenerated', '8 new codes');
        UI.modal({ title: 'New recovery codes', body: '<div class="recovery-codes">' + codes.map((c) => '<span>' + c + '</span>').join('') + '</div>' + View.demoNote('Codes are labelled DEMO and are not valid anywhere.') });
        render();
      }
      if (action === 'disable') {
        UI.formModal({
          title: 'Disable two-factor authentication', danger: true,
          intro: 'Your account will be protected by a password only.',
          fields: [{ name: 'password', label: 'Confirm with your password', type: 'password', required: true, autocomplete: 'current-password', validate: (v) => Auth.checkCredentials(Auth.demoEmail, v) ? '' : 'Password is incorrect.' }],
          submitLabel: 'Disable 2FA',
          onSubmit: () => {
            Store.update('security', (s) => { s.twoFactor = false; s.twoFactorMethod = null; });
            Store.update('teamMembers', (list) => list.forEach((u) => { if (u.id === 'u1') u.twoFactor = false; }));
            secLog('Two-factor authentication disabled', 'Disabled by account owner', 'Warning');
            UI.toast('Two-factor authentication disabled.');
            render();
          }
        });
      }
    });
    body.addEventListener('change', (e) => {
      if (e.target.id === 'saved-codes') body.querySelector('[data-2fa="finish"]').disabled = !e.target.checked;
    });
    body.addEventListener('input', (e) => { if (e.target.id === 'f-code') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
    body.addEventListener('submit', async (e) => {
      if (e.target.id !== 'verify-form') return;
      e.preventDefault();
      const wrapper = e.target.querySelector('[data-field="code"]');
      const value = e.target.elements.code.value;
      if (!/^\d{6}$/.test(value)) { UI.setFieldError(wrapper, 'Enter the six digits shown in your app.'); e.target.elements.code.focus(); return; }
      const button = e.target.querySelector('[type="submit"]');
      UI.setButtonLoading(button, true, 'Verifying...');
      await Util.delay(600);
      codes = recoveryCodes();
      step = 3; render();
    });
    render();
  });

  /* ---------- Logs ---------- */
  App.page('security.logs', (root) => {
    const body = header(root, { title: 'Security Logs', description: 'Security-relevant events on the account, including sign-ins, permission changes and API usage.' });
    body.innerHTML = '<div class="panel" id="log-table"></div>';
    const table = UI.DataTable(body.querySelector('#log-table'), {
      data: () => Store.get('securityLogs'),
      searchKeys: ['event', 'detail', 'ip', 'user'],
      searchPlaceholder: 'Search events, IPs, users',
      filters: [
        { key: 'severity', label: 'Severity', options: ['Info', 'Notice', 'Warning', 'Critical'] },
        { key: 'user', label: 'User', allLabel: 'All users', options: Array.from(new Set(Store.get('securityLogs').map((l) => l.user))) }
      ],
      defaultSort: { key: 'date', dir: 'desc' },
      pageSize: 15,
      toolbar: '<button type="button" class="btn btn-secondary btn-sm" data-export>' + icon('download', 14) + 'Export CSV</button>',
      columns: [
        { key: 'date', label: 'Date', render: (l) => '<span class="nowrap">' + fmt.datetime(l.date) + '</span>' },
        { key: 'event', label: 'Event', render: (l) => '<span class="cell-main">' + esc(l.event) + '</span><span class="cell-sub">' + esc(l.detail) + '</span>' },
        { key: 'user', label: 'User' },
        { key: 'ip', label: 'IP address', render: (l) => '<span class="mono">' + esc(l.ip) + '</span>' },
        { key: 'severity', label: 'Severity', render: (l) => View.badge(l.severity, l.severity === 'Critical' ? 'danger' : l.severity === 'Warning' ? 'warn' : 'neutral') }
      ],
      onRowClick: (l) => UI.modal({ title: l.event, subtitle: fmt.datetime(l.date), size: 'sm', body: View.kv([['Detail', esc(l.detail)], ['User', esc(l.user)], ['IP address', '<span class="mono">' + esc(l.ip) + '</span>'], ['Severity', esc(l.severity)], ['Event ID', '<span class="mono">' + esc(l.id) + '</span>']]) })
    });
    body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-export]')) return;
      const rows = table.rows();
      Util.downloadText('security-log.csv', Util.toCSV(rows, [{ label: 'Date', key: 'date' }, { label: 'Event', key: 'event' }, { label: 'Detail', key: 'detail' }, { label: 'User', key: 'user' }, { label: 'IP', key: 'ip' }, { label: 'Severity', key: 'severity' }]), 'text/csv');
      UI.toast(rows.length + ' events exported.', 'info');
    });
  });
})();
