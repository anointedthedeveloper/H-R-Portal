/*
 * Application shell: sidebar navigation, top header, global search,
 * notifications, help and account menus.
 */
(function () {
  'use strict';
  const { esc } = Util;
  const icon = Icons.icon;

  const NAV = [
    { label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html' },
    { label: 'Domains', icon: 'globe', children: [
      ['My Domains', 'domains/index.html'], ['Register Domain', 'domains/search.html'], ['DNS Management', 'domains/dns.html'],
      ['Nameservers', 'domains/nameservers.html'], ['Transfers', 'domains/transfer.html'], ['WHOIS', 'domains/whois.html']
    ] },
    { label: 'Hosting', icon: 'server', children: [
      ['Overview', 'hosting/index.html'], ['Hosting Accounts', 'hosting/accounts.html'], ['Resource Usage', 'hosting/resources.html'],
      ['File Manager', 'hosting/file-manager.html'], ['SSL Certificates', 'hosting/ssl.html'], ['Backups', 'hosting/backups.html'],
      ['FTP Accounts', 'hosting/ftp.html'], ['Databases', 'hosting/databases.html'], ['PHP Settings', 'hosting/php.html'], ['Cron Jobs', 'hosting/cron.html']
    ] },
    { label: 'Email', icon: 'mail', children: [
      ['Overview', 'email/index.html'], ['Mailboxes', 'email/mailboxes.html'], ['Forwarders', 'email/forwarders.html'],
      ['Webmail', 'email/webmail.html'], ['Authentication', 'email/authentication.html']
    ] },
    { label: 'Billing', icon: 'card', children: [
      ['Overview', 'billing/index.html'], ['Invoices', 'billing/invoices.html', ['billing/invoice.html']], ['Payments', 'billing/payments.html'],
      ['Subscriptions', 'billing/subscriptions.html'], ['Transactions', 'billing/transactions.html']
    ] },
    { label: 'Security', icon: 'shield', children: [
      ['Overview', 'security/index.html'], ['Login Security', 'security/login-security.html'], ['Two-Factor Auth', 'security/2fa.html'], ['Security Logs', 'security/logs.html']
    ] },
    { label: 'Support', icon: 'lifebuoy', children: [
      ['Overview', 'support/index.html'], ['Tickets', 'support/tickets.html', ['support/ticket.html']], ['Knowledge Base', 'support/knowledge-base.html'], ['Contact', 'support/contact.html']
    ] },
    { divider: true },
    { label: 'Account', icon: 'user', children: [
      ['Profile', 'account/profile.html'], ['Users & Permissions', 'account/users.html'], ['Notifications', 'account/notifications.html'],
      ['API Access', 'account/api.html'], ['Activity Log', 'account/activity.html']
    ] },
    { label: 'Settings', icon: 'settings', href: 'account/settings.html' }
  ];

  function currentPath() {
    const parts = location.pathname.split('/').filter(Boolean);
    const depth = (App.root.match(/\.\.\//g) || []).length;
    return parts.slice(-(depth + 1)).join('/') || 'dashboard.html';
  }

  function isActive(href, aliases, path) {
    return href === path || (aliases || []).indexOf(path) !== -1;
  }

  function sidebarHTML() {
    const path = currentPath();
    const expanded = Store.ui('nav') || {};
    const items = NAV.map((item, index) => {
      if (item.divider) return '<li class="nav-divider" role="separator"></li>';
      if (!item.children) {
        const active = isActive(item.href, null, path);
        return '<li><a class="nav-link' + (active ? ' active' : '') + '" href="' + App.url(item.href) + '"' + (active ? ' aria-current="page"' : '') + '>' + icon(item.icon) + '<span>' + esc(item.label) + '</span></a></li>';
      }
      const sectionActive = item.children.some((c) => isActive(c[1], c[2], path));
      const open = sectionActive || expanded[item.label];
      const id = 'nav-group-' + index;
      return '<li class="nav-group' + (open ? ' open' : '') + (sectionActive ? ' section-active' : '') + '">' +
        '<button type="button" class="nav-link nav-toggle" aria-expanded="' + !!open + '" aria-controls="' + id + '" data-nav-section="' + esc(item.label) + '">' +
        icon(item.icon) + '<span>' + esc(item.label) + '</span>' + icon('chevronDown', 14) + '</button>' +
        '<ul class="nav-sub" id="' + id + '">' + item.children.map((c) => {
          const active = isActive(c[1], c[2], path);
          return '<li><a class="nav-sublink' + (active ? ' active' : '') + '" href="' + App.url(c[1]) + '"' + (active ? ' aria-current="page"' : '') + '>' + esc(c[0]) + '</a></li>';
        }).join('') + '</ul></li>';
    }).join('');

    return '<div class="sidebar-brand"><a href="' + App.url('dashboard.html') + '" class="brand">' + brandMark() + '<span class="brand-text"><strong>H&amp;R Portal</strong><small>Hosting &amp; Registrar</small></span></a>' +
      '<button type="button" class="icon-btn sidebar-close" data-sidebar-close aria-label="Close navigation">' + icon('x') + '</button></div>' +
      '<nav class="sidebar-nav" aria-label="Main navigation"><ul>' + items + '</ul></nav>' +
      '<div class="sidebar-footer"><span class="env-tag">Demo Environment</span><span class="sidebar-version">Portal build 2026.09</span></div>';
  }

  function brandMark() {
    return '<span class="brand-mark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="7"/><rect x="3" y="14" width="18" height="7"/><line x1="7" y1="6.5" x2="7.01" y2="6.5"/><line x1="7" y1="17.5" x2="7.01" y2="17.5"/></svg></span>';
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  function headerHTML() {
    const profile = Store.get('profile');
    return '<button type="button" class="icon-btn menu-btn" data-sidebar-open aria-label="Open navigation" aria-controls="sidebar">' + icon('menu', 20) + '</button>' +
      '<div class="global-search search-dropdown" id="global-search">' +
        '<div class="search-input search-lg">' + icon('search', 15) +
        '<input type="search" class="input" id="global-search-input" placeholder="Search domains, services, invoices, tickets..." aria-label="Search the portal" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="global-search-results">' +
        '<kbd class="kbd" aria-hidden="true">/</kbd></div>' +
        '<div class="dropdown-menu search-results" id="global-search-results" role="listbox"></div>' +
      '</div>' +
      '<div class="header-actions">' +
        '<span class="env-tag env-tag-header" data-tooltip="All data is fictional and stored in this browser">Demo Environment</span>' +
        '<div class="dropdown" id="help-menu"><button type="button" class="icon-btn" data-dropdown-toggle aria-haspopup="true" aria-expanded="false" aria-label="Help">' + icon('help', 18) + '</button>' +
          '<div class="dropdown-menu dropdown-right" role="menu">' +
            '<div class="menu-heading">Help</div>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('support/knowledge-base.html') + '">' + icon('book', 14) + '<span>Knowledge base</span></a>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('support/tickets.html?new=1') + '">' + icon('plus', 14) + '<span>Open a ticket</span></a>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('support/contact.html') + '">' + icon('phone', 14) + '<span>Contact support</span></a>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('support/index.html#status') + '">' + icon('activity', 14) + '<span>Service status</span></a>' +
            '<div class="menu-divider"></div>' +
            '<button type="button" class="menu-item" role="menuitem" data-shortcuts>' + icon('terminal', 14) + '<span>Keyboard shortcuts</span></button>' +
          '</div></div>' +
        '<div class="dropdown" id="notif-menu"><button type="button" class="icon-btn notif-btn" data-dropdown-toggle aria-haspopup="true" aria-expanded="false" aria-label="Notifications">' + icon('bell', 18) + '<span class="notif-count" hidden></span></button>' +
          '<div class="dropdown-menu dropdown-right notif-panel" role="menu"></div></div>' +
        '<div class="dropdown" id="account-menu"><button type="button" class="account-btn" data-dropdown-toggle aria-haspopup="true" aria-expanded="false" aria-label="Account menu">' +
          '<span class="avatar" data-profile-initials>' + esc(initials(profile.name)) + '</span><span class="account-name"><strong data-profile-name>' + esc(profile.name) + '</strong><small>' + esc(profile.customerId) + '</small></span>' + icon('chevronDown', 14) + '</button>' +
          '<div class="dropdown-menu dropdown-right" role="menu">' +
            '<div class="menu-heading"><strong data-profile-name>' + esc(profile.name) + '</strong><small>' + esc(profile.email) + '</small></div>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('account/profile.html') + '">' + icon('user', 14) + '<span>Profile</span></a>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('account/settings.html') + '">' + icon('settings', 14) + '<span>Account Settings</span></a>' +
            '<a class="menu-item" role="menuitem" href="' + App.url('security/index.html') + '">' + icon('shield', 14) + '<span>Security</span></a>' +
            '<div class="menu-divider"></div>' +
            '<button type="button" class="menu-item" role="menuitem" data-logout>' + icon('logout', 14) + '<span>Logout</span></button>' +
          '</div></div>' +
      '</div>';
  }

  function notificationsHTML() {
    const list = Store.get('notifications').slice().sort((a, b) => b.date.localeCompare(a.date));
    const unread = list.filter((n) => !n.read).length;
    return '<div class="notif-head"><strong>Notifications</strong>' +
      (unread ? '<button type="button" class="link-btn" data-notif-read-all>Mark all as read</button>' : '<span class="muted">All caught up</span>') + '</div>' +
      (list.length ? '<div class="notif-list">' + list.slice(0, 6).map((n) =>
        '<a class="menu-item notif-item' + (n.read ? '' : ' unread') + '" role="menuitem" href="' + (n.link ? App.url(n.link) : '#') + '" data-notif="' + n.id + '">' +
        '<span class="notif-dot" aria-hidden="true"></span><span class="notif-text"><strong>' + esc(n.title) + '</strong><small>' + esc(n.text) + '</small><small class="muted">' + fmt.relative(n.date) + '</small></span></a>'
      ).join('') + '</div>' : '<div class="notif-empty">No notifications</div>') +
      '<a class="notif-foot" href="' + App.url('account/notifications.html') + '">View all and manage preferences</a>';
  }

  /* ---------- Global search ---------- */
  function searchIndex() {
    const entries = [];
    NAV.forEach((item) => {
      if (item.href) entries.push({ group: 'Pages', label: item.label, meta: 'Page', href: item.href });
      (item.children || []).forEach((c) => entries.push({ group: 'Pages', label: c[0] === 'Overview' ? item.label + ' overview' : c[0], meta: item.label, href: c[1] }));
    });
    Store.get('domains').forEach((d) => entries.push({ group: 'Domains', label: d.name, meta: Services.domainStatus(d) + ' - expires ' + fmt.date(d.expires), href: 'domains/index.html?manage=' + encodeURIComponent(d.name) }));
    Store.get('hostingAccounts').forEach((h) => entries.push({ group: 'Hosting', label: h.ref + ' ' + h.primaryDomain, meta: Services.plan(h.planId).name + ' - ' + h.status, href: 'hosting/accounts.html#' + h.id }));
    Store.get('invoices').forEach((inv) => entries.push({ group: 'Invoices', label: inv.id, meta: fmt.money(Services.invoiceTotal(inv)) + ' - ' + Services.invoiceStatus(inv), href: 'billing/invoice.html?id=' + inv.id }));
    Store.get('tickets').forEach((t) => entries.push({ group: 'Tickets', label: t.id + ' ' + t.subject, meta: t.status + ' - ' + t.department, href: 'support/ticket.html?id=' + t.id }));
    Store.get('mailboxes').forEach((m) => entries.push({ group: 'Mailboxes', label: m.address, meta: m.status, href: 'email/mailboxes.html?q=' + encodeURIComponent(m.address) }));
    Store.get('kbArticles').forEach((a) => entries.push({ group: 'Knowledge base', label: a.title, meta: a.category, href: 'support/knowledge-base.html?article=' + a.id }));
    return entries;
  }

  function bindSearch() {
    const wrapper = document.getElementById('global-search');
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('global-search-results');
    let matches = [];
    let cursor = -1;

    function render() {
      const query = input.value.trim().toLowerCase();
      if (!query) { close(); return; }
      const terms = query.split(/\s+/);
      matches = searchIndex().filter((e) => terms.every((t) => (e.label + ' ' + e.meta).toLowerCase().indexOf(t) !== -1)).slice(0, 12);
      cursor = matches.length ? 0 : -1;
      let lastGroup = '';
      results.innerHTML = matches.length ? matches.map((m, i) => {
        const heading = m.group !== lastGroup ? '<div class="menu-heading">' + esc(m.group) + '</div>' : '';
        lastGroup = m.group;
        return heading + '<a class="menu-item search-item' + (i === cursor ? ' focused' : '') + '" role="option" id="gs-' + i + '" aria-selected="' + (i === cursor) + '" href="' + App.url(m.href) + '"><span>' + esc(m.label) + '</span><small>' + esc(m.meta) + '</small></a>';
      }).join('') : '<div class="notif-empty">No results for "' + esc(input.value.trim()) + '"</div>';
      wrapper.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
      input.setAttribute('aria-activedescendant', cursor >= 0 ? 'gs-' + cursor : '');
    }
    function close() {
      wrapper.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
    }
    function highlight() {
      results.querySelectorAll('.search-item').forEach((el, i) => {
        el.classList.toggle('focused', i === cursor);
        el.setAttribute('aria-selected', String(i === cursor));
        if (i === cursor) el.scrollIntoView({ block: 'nearest' });
      });
      input.setAttribute('aria-activedescendant', cursor >= 0 ? 'gs-' + cursor : '');
    }

    input.addEventListener('input', Util.debounce(render, 80));
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && matches.length) { e.preventDefault(); cursor = (cursor + 1) % matches.length; highlight(); }
      else if (e.key === 'ArrowUp' && matches.length) { e.preventDefault(); cursor = (cursor - 1 + matches.length) % matches.length; highlight(); }
      else if (e.key === 'Enter' && cursor >= 0 && matches[cursor]) { e.preventDefault(); location.href = App.url(matches[cursor].href); }
      else if (e.key === 'Escape') { close(); input.blur(); }
    });
    document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (e.key === '/' && !typing && !document.body.classList.contains('modal-open')) { e.preventDefault(); input.focus(); }
    });
  }

  function showShortcuts() {
    UI.modal({
      title: 'Keyboard shortcuts',
      size: 'sm',
      body: '<table class="table table-plain"><tbody>' +
        [['/', 'Focus global search'], ['Arrow Up / Down', 'Move through search results and menus'], ['Enter', 'Open selected result or table row'],
          ['Esc', 'Close dialogs, menus and search'], ['Arrow Left / Right', 'Switch tabs'], ['Tab', 'Move between controls']]
          .map((r) => '<tr><td><kbd class="kbd">' + esc(r[0]) + '</kbd></td><td>' + esc(r[1]) + '</td></tr>').join('') + '</tbody></table>'
    });
  }

  const Shell = {
    nav: NAV,
    render() {
      document.body.classList.add('has-shell');
      const pageContent = document.createElement('main');
      pageContent.id = 'content';
      pageContent.className = 'content';
      pageContent.tabIndex = -1;

      const layout = document.createElement('div');
      layout.className = 'layout';
      layout.innerHTML =
        '<a class="skip-link" href="#content">Skip to content</a>' +
        '<aside class="sidebar" id="sidebar" aria-label="Sidebar">' + sidebarHTML() + '</aside>' +
        '<div class="sidebar-backdrop" data-sidebar-close></div>' +
        '<div class="main"><header class="topbar">' + headerHTML() + '</header></div>';
      layout.querySelector('.main').appendChild(pageContent);
      const mount = document.getElementById('app') || document.body;
      mount.innerHTML = '';
      mount.appendChild(layout);

      layout.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-nav-section]');
        if (toggle) {
          const group = toggle.parentElement;
          const open = !group.classList.contains('open');
          group.classList.toggle('open', open);
          toggle.setAttribute('aria-expanded', String(open));
          const state = Store.ui('nav') || {};
          state[toggle.dataset.navSection] = open;
          Store.ui('nav', state);
        }
        if (e.target.closest('[data-sidebar-open]')) {
          document.body.classList.add('sidebar-open');
          const first = layout.querySelector('.sidebar a, .sidebar button');
          if (first) first.focus();
        }
        if (e.target.closest('[data-sidebar-close]')) document.body.classList.remove('sidebar-open');
        if (e.target.closest('[data-logout]')) {
          UI.confirm({ title: 'Log out', message: 'End your session on this device?', confirmLabel: 'Logout' }).then((ok) => { if (ok) Auth.logout(); });
        }
        if (e.target.closest('[data-shortcuts]')) showShortcuts();
        if (e.target.closest('[data-notif-read-all]')) {
          Store.update('notifications', (list) => list.forEach((n) => { n.read = true; }));
          Shell.refreshNotifications();
          UI.toast('All notifications marked as read.', 'info');
        }
        const notif = e.target.closest('[data-notif]');
        if (notif) {
          Store.patch('notifications', notif.dataset.notif, { read: true });
          if (notif.getAttribute('href') === '#') { e.preventDefault(); Shell.refreshNotifications(); }
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
          document.body.classList.remove('sidebar-open');
          layout.querySelector('[data-sidebar-open]').focus();
        }
      });
      const activeLink = layout.querySelector('.sidebar .active');
      if (activeLink && activeLink.scrollIntoView) activeLink.scrollIntoView({ block: 'nearest' });

      bindSearch();
      Shell.refreshNotifications();
      return pageContent;
    },
    refreshNotifications() {
      const panel = document.querySelector('.notif-panel');
      if (!panel) return;
      panel.innerHTML = notificationsHTML();
      const count = Services.unreadNotifications();
      const badge = document.querySelector('.notif-count');
      badge.hidden = !count;
      badge.textContent = count > 9 ? '9+' : String(count);
      document.querySelector('.notif-btn').setAttribute('aria-label', 'Notifications' + (count ? ' (' + count + ' unread)' : ''));
    },
    refreshProfile() {
      const profile = Store.get('profile');
      document.querySelectorAll('[data-profile-name]').forEach((el) => { el.textContent = profile.name; });
      document.querySelectorAll('[data-profile-initials]').forEach((el) => { el.textContent = initials(profile.name); });
    },
    initials
  };

  window.Shell = Shell;
})();
