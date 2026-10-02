/* Support: overview, tickets, ticket conversation, knowledge base, contact. */
(function () {
  'use strict';
  const { esc } = Util;
  const icon = Icons.icon;
  const DEPARTMENTS = ['Technical Support', 'Billing', 'Domains', 'Sales', 'Abuse'];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

  function header(root, opts) {
    root.innerHTML = View.pageHeader({ title: opts.title, description: opts.description, crumbs: [['Support', 'support/index.html']].concat(opts.crumbs || [[opts.crumb || opts.title]]), actions: opts.actions }) + '<div id="page-body"></div>';
    return root.querySelector('#page-body');
  }

  function priorityBadge(p) {
    return View.badge(p, p === 'Urgent' ? 'danger' : p === 'High' ? 'warn' : 'neutral');
  }

  function serviceOptions() {
    return [{ value: 'Account', label: 'Account / general' }]
      .concat(Services.accounts().map((a) => ({ value: a.ref, label: a.ref + ' - ' + a.primaryDomain })))
      .concat(Services.domains().map((d) => ({ value: d.name, label: d.name })));
  }

  function nextTicketId() {
    const max = Store.get('tickets').reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, '')) || 0), 58000);
    return 'TKT-' + (max + 1);
  }

  function createTicket(values) {
    const stamp = fmt.isoDateTime(App.now());
    const ticket = {
      id: nextTicketId(), subject: values.subject, department: values.department, priority: values.priority || 'Medium', status: 'Open',
      created: stamp, updated: stamp, service: values.service || 'Account',
      messages: [{ author: Store.get('profile').name, role: 'client', date: stamp, body: values.message, attachments: values.attachments || [] }]
    };
    Store.prepend('tickets', ticket);
    App.log('Support', 'Support ticket opened', ticket.id + ' ' + ticket.subject);
    return ticket;
  }

  function newTicketModal(prefill) {
    const p = prefill || {};
    UI.formModal({
      title: 'Open a support ticket', size: 'lg',
      fields: [
        { name: 'department', label: 'Department', type: 'select', options: DEPARTMENTS, value: p.department || 'Technical Support', half: true },
        { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, value: 'Medium', half: true, hint: 'Urgent is for outages affecting production.' },
        { name: 'service', label: 'Related service', type: 'select', options: serviceOptions(), value: p.service || 'Account' },
        { name: 'subject', label: 'Subject', required: true, value: p.subject || '', maxlength: 140, validate: (v) => v.length < 6 ? 'Please describe the issue in a few words.' : '' },
        { name: 'message', label: 'Message', type: 'textarea', rows: 7, required: true, validate: (v) => v.length < 20 ? 'Please include more detail (at least 20 characters).' : '', hint: 'Include URLs, error messages and steps to reproduce. Never include passwords.' }
      ],
      after: '<div class="field mt-16"><label class="label" for="ticket-files">Attachments</label><input type="file" id="ticket-files" multiple class="input" style="padding:4px"></div>',
      submitLabel: 'Submit ticket',
      loadingText: 'Submitting...',
      onSubmit: (values, dialog) => {
        const files = Array.from(dialog.el.querySelector('#ticket-files').files || []).map((f) => f.name + ' (' + fmt.bytes(f.size) + ')');
        values.attachments = files;
        const ticket = createTicket(values);
        UI.toast('Ticket ' + ticket.id + ' submitted.');
        setTimeout(() => { location.href = App.url('support/ticket.html?id=' + ticket.id); }, 250);
      }
    });
  }

  /* ---------- Overview ---------- */
  App.page('support.index', (root) => {
    const body = header(root, { title: 'Support', crumb: 'Overview', description: 'Tickets, service status and self-help resources.', actions: '<a class="btn btn-secondary" href="' + App.url('support/knowledge-base.html') + '">' + icon('book', 14) + 'Knowledge base</a><button type="button" class="btn btn-primary" data-new>' + icon('plus', 14) + 'New ticket</button>' });
    const counts = Services.ticketCounts();
    const tickets = Store.get('tickets').slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);
    const popular = Store.get('kbArticles').slice().sort((a, b) => b.views - a.views).slice(0, 5);
    const degraded = Store.get('serviceStatus').filter((s) => s.status !== 'Operational');
    body.innerHTML =
      '<div class="grid grid-4 stats-grid">' +
        ['Open', 'Pending', 'Resolved', 'Closed'].map((s) => View.stat({ label: s, value: counts[s] || 0, href: 'support/tickets.html?status=' + s, meta: { Open: 'Awaiting our reply', Pending: 'Awaiting your reply', Resolved: 'Solved, not yet closed', Closed: 'Archived' }[s] })).join('') +
      '</div>' +
      '<div class="grid grid-main section">' +
        View.panel({ title: 'Recent tickets', flush: true, actions: '<a class="btn btn-secondary btn-sm" href="' + App.url('support/tickets.html') + '">All tickets</a>', body: '<ul class="list">' + tickets.map((t) =>
          '<li><a class="list-item" href="' + App.url('support/ticket.html?id=' + t.id) + '"><span class="list-item-main"><span class="list-item-title">' + esc(t.subject) + '</span><span class="list-item-sub">' + t.id + ' - ' + esc(t.department) + ' - ' + esc(t.service) + ' - updated ' + fmt.relative(t.updated) + '</span></span>' + View.badge(t.status) + '</a></li>').join('') + '</ul>' }) +
        '<div class="stack">' +
          View.panel({ title: 'Search help articles', body: '<form id="kb-search" class="flex"><label class="sr-only" for="kb-q">Search articles</label><input id="kb-q" class="input" placeholder="e.g. nameservers"><button class="btn btn-primary" type="submit">Search</button></form>' }) +
          View.panel({ title: 'Popular articles', flush: true, body: popular.map((a) => '<a class="kb-item" href="' + App.url('support/knowledge-base.html?article=' + a.id) + '"><strong>' + esc(a.title) + '</strong><small>' + esc(a.category) + ' - ' + fmt.number(a.views) + ' views</small></a>').join('') }) +
        '</div>' +
      '</div>' +
      '<div class="grid grid-2 section" id="status">' +
        View.panel({ title: 'Service status', subtitle: degraded.length ? degraded.length + ' service' + (degraded.length === 1 ? '' : 's') + ' degraded' : 'All systems operational', flush: true,
          body: Store.get('serviceStatus').map((s) => '<div class="status-row"><span>' + esc(s.name) + (s.note ? '<small>' + esc(s.note) + '</small>' : '') + '</span>' + View.badge(s.status) + '</div>').join('') }) +
        View.panel({ title: 'Scheduled maintenance', flush: true, body: '<ul class="list">' +
          '<li class="list-item"><span class="list-icon">' + icon('clock', 14) + '</span><span class="list-item-main"><span class="list-item-title">web-ams-01 storage firmware update</span><span class="list-item-sub">07 Oct 2026, 02:00-03:00 UTC - up to 5 minutes of I/O pauses. Affects HST-11032.</span></span></li>' +
          '<li class="list-item"><span class="list-icon">' + icon('clock', 14) + '</span><span class="list-item-main"><span class="list-item-title">Webmail upgrade</span><span class="list-item-sub">14 Oct 2026, 22:00-22:30 UTC - webmail unavailable; IMAP/SMTP unaffected.</span></span></li>' +
          '</ul>' }) +
      '</div>';
    body.addEventListener('submit', (e) => {
      if (e.target.id !== 'kb-search') return;
      e.preventDefault();
      location.href = App.url('support/knowledge-base.html?q=' + encodeURIComponent(body.querySelector('#kb-q').value.trim()));
    });
    root.addEventListener('click', (e) => { if (e.target.closest('[data-new]')) newTicketModal(); });
    if (location.hash === '#status') setTimeout(() => document.getElementById('status').scrollIntoView(), 50);
  });

  /* ---------- Tickets ---------- */
  App.page('support.tickets', (root) => {
    const body = header(root, { title: 'Support Tickets', description: 'Conversations with our support departments.', actions: '<button type="button" class="btn btn-primary" data-new>' + icon('plus', 14) + 'New ticket</button>' });
    body.innerHTML = '<div class="panel" id="ticket-table"></div>';
    UI.DataTable(body.querySelector('#ticket-table'), {
      data: () => Store.get('tickets'),
      searchKeys: ['id', 'subject', 'service', 'department'],
      searchPlaceholder: 'Search tickets',
      filters: [
        { key: 'status', label: 'Status', options: ['Open', 'Pending', 'Resolved', 'Closed'], value: App.param('status') || '' },
        { key: 'department', label: 'Department', allLabel: 'All departments', options: DEPARTMENTS },
        { key: 'priority', label: 'Priority', allLabel: 'All priorities', options: PRIORITIES }
      ],
      defaultSort: { key: 'updated', dir: 'desc' },
      onRowClick: (t) => { location.href = App.url('support/ticket.html?id=' + t.id); },
      emptyTitle: 'No tickets',
      emptyText: 'Open a ticket when you need help from our team.',
      columns: [
        { key: 'id', label: 'Ticket ID', render: (t) => '<a class="cell-link mono" href="' + App.url('support/ticket.html?id=' + t.id) + '">' + t.id + '</a>' },
        { key: 'subject', label: 'Subject', render: (t) => '<span class="cell-main">' + esc(t.subject) + '</span><span class="cell-sub">' + esc(t.service) + ' - ' + t.messages.length + ' message' + (t.messages.length === 1 ? '' : 's') + '</span>' },
        { key: 'department', label: 'Department' },
        { key: 'priority', label: 'Priority', sortValue: (t) => PRIORITIES.indexOf(t.priority), render: (t) => priorityBadge(t.priority) },
        { key: 'status', label: 'Status', render: (t) => View.badge(t.status) },
        { key: 'created', label: 'Created', render: (t) => '<span class="nowrap">' + fmt.date(t.created) + '</span>' },
        { key: 'updated', label: 'Last Update', render: (t) => '<span class="nowrap">' + fmt.relative(t.updated) + '</span>' }
      ]
    });
    root.addEventListener('click', (e) => { if (e.target.closest('[data-new]')) newTicketModal(); });
    if (App.param('new')) newTicketModal({ department: App.param('department'), subject: App.param('subject'), service: App.param('service') });
  });

  /* ---------- Ticket conversation ---------- */
  App.page('support.ticket', (root) => {
    const id = App.param('id');

    function render() {
      const t = Store.find('tickets', id);
      if (!t) {
        root.innerHTML = View.pageHeader({ title: 'Ticket not found', crumbs: [['Support', 'support/index.html'], ['Tickets', 'support/tickets.html'], ['Not found']] }) +
          View.panel({ body: View.errorState('Ticket not found', 'No ticket with ID "' + (id || '') + '" exists in this account.') });
        return;
      }
      const closed = t.status === 'Closed';
      root.innerHTML = View.pageHeader({
        title: t.subject,
        description: t.id + ' - ' + t.department + ' - opened ' + fmt.datetime(t.created),
        crumbs: [['Support', 'support/index.html'], ['Tickets', 'support/tickets.html'], [t.id]],
        actions: '<a class="btn btn-secondary" href="' + App.url('support/tickets.html') + '">' + icon('arrowLeft', 14) + 'All tickets</a>' +
          (closed ? '<button type="button" class="btn btn-primary" data-t="reopen">Reopen ticket</button>' : '<button type="button" class="btn btn-secondary" data-t="close">Close ticket</button>')
      }) +
      '<div class="grid grid-main"><div class="stack">' +
        '<div class="thread">' + t.messages.map((m) =>
          '<article class="message ' + m.role + '"><header class="message-head"><span class="avatar avatar-sm">' + esc(Shell.initials(m.author)) + '</span><strong>' + esc(m.author) + '</strong><span class="role-tag">' + (m.role === 'staff' ? 'Support staff' : m.role === 'system' ? 'System' : 'Client') + '</span><span class="muted">' + fmt.datetime(m.date) + '</span></header>' +
          '<div class="message-body">' + esc(m.body) + '</div>' +
          ((m.attachments || []).length ? '<div class="panel-footer">' + m.attachments.map((a) => '<span class="tag">' + icon('file', 12) + ' ' + esc(a) + '</span>').join(' ') + '</div>' : '') + '</article>').join('') + '</div>' +
        (closed ? View.alert('info', 'This ticket is closed. Reopen it to add a reply.') :
          View.panel({ title: 'Reply', body: '<form id="reply-form" novalidate><div class="field" data-field="reply"><label class="sr-only" for="reply">Reply</label><textarea id="reply" name="reply" class="textarea" rows="6" placeholder="Write your reply..."></textarea><p class="field-error" role="alert"></p></div>' +
            '<div class="flex-between mt-8 flex-wrap"><label class="checkbox"><input type="checkbox" name="resolve"><span>Mark as resolved after sending</span></label><div class="flex"><input type="file" id="reply-files" multiple class="sr-only"><label for="reply-files" class="btn btn-secondary btn-sm" tabindex="0" role="button">' + icon('upload', 14) + 'Attach</label><span id="reply-file-names" class="small muted"></span><button type="submit" class="btn btn-primary">' + icon('send', 14) + 'Send reply</button></div></div></form>' })) +
      '</div>' +
      '<div class="stack">' +
        View.panel({ title: 'Details', body: View.kv([
          ['Status', View.badge(t.status)],
          ['Department', esc(t.department)],
          ['Priority', '<select class="select select-sm" data-priority aria-label="Priority"' + (closed ? ' disabled' : '') + '>' + View.options(PRIORITIES, t.priority) + '</select>'],
          ['Related service', esc(t.service)],
          ['Created', fmt.datetime(t.created)],
          ['Last update', fmt.datetime(t.updated)],
          ['Messages', t.messages.length]
        ]) }) +
        View.panel({ title: 'Related articles', flush: true, body: Store.get('kbArticles').filter((a) => a.category === ({ Billing: 'Billing', Domains: 'Domains' }[t.department] || 'Hosting')).slice(0, 3).map((a) =>
          '<a class="kb-item" href="' + App.url('support/knowledge-base.html?article=' + a.id) + '"><strong>' + esc(a.title) + '</strong><small>' + esc(a.category) + '</small></a>').join('') }) +
      '</div></div>';
    }

    root.addEventListener('submit', async (e) => {
      if (e.target.id !== 'reply-form') return;
      e.preventDefault();
      const form = e.target;
      const text = form.elements.reply.value.trim();
      const wrapper = form.querySelector('[data-field="reply"]');
      if (text.length < 2) { UI.setFieldError(wrapper, 'Enter a reply.'); form.elements.reply.focus(); return; }
      const button = form.querySelector('[type="submit"]');
      UI.setButtonLoading(button, true, 'Sending...');
      await Util.delay(600);
      const stamp = fmt.isoDateTime(App.now());
      const files = Array.from(root.querySelector('#reply-files').files || []).map((f) => f.name + ' (' + fmt.bytes(f.size) + ')');
      const resolve = form.elements.resolve.checked;
      Store.update('tickets', (list) => {
        const t = list.find((x) => x.id === id);
        t.messages.push({ author: Store.get('profile').name, role: 'client', date: stamp, body: text, attachments: files });
        if (resolve) t.messages.push({ author: 'System', role: 'system', date: stamp, body: 'Ticket marked as resolved by the client.' });
        t.status = resolve ? 'Resolved' : 'Open';
        t.updated = stamp;
      });
      App.log('Support', 'Ticket reply sent', id);
      UI.toast('Reply sent.' + (resolve ? ' Ticket marked as resolved.' : ''));
      render();
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'reply-files') root.querySelector('#reply-file-names').textContent = Array.from(e.target.files).map((f) => f.name).join(', ');
      if (e.target.matches('[data-priority]')) {
        Store.patch('tickets', id, { priority: e.target.value, updated: fmt.isoDateTime(App.now()) });
        App.log('Support', 'Ticket priority changed', id + ' to ' + e.target.value);
        UI.toast('Priority changed to ' + e.target.value + '.');
        render();
      }
    });
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('label[for="reply-files"]')) { e.preventDefault(); root.querySelector('#reply-files').click(); }
    });
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-t]');
      if (!btn) return;
      const stamp = fmt.isoDateTime(App.now());
      if (btn.dataset.t === 'close') {
        if (!(await UI.confirm({ title: 'Close ticket', message: 'Close ' + id + '? You can reopen it later if needed.', confirmLabel: 'Close ticket' }))) return;
        Store.update('tickets', (list) => { const t = list.find((x) => x.id === id); t.status = 'Closed'; t.updated = stamp; t.messages.push({ author: 'System', role: 'system', date: stamp, body: 'Ticket closed by the client.' }); });
        App.log('Support', 'Ticket closed', id);
        UI.toast('Ticket closed.');
      } else {
        Store.update('tickets', (list) => { const t = list.find((x) => x.id === id); t.status = 'Open'; t.updated = stamp; t.messages.push({ author: 'System', role: 'system', date: stamp, body: 'Ticket reopened by the client.' }); });
        App.log('Support', 'Ticket reopened', id);
        UI.toast('Ticket reopened.');
      }
      render();
    });
    render();
  });

  /* ---------- Knowledge base ---------- */
  App.page('support.kb', (root) => {
    const articles = Store.get('kbArticles');
    const categories = Array.from(new Set(articles.map((a) => a.category)));
    let query = App.param('q') || '';
    let category = '';
    root.innerHTML = View.pageHeader({ title: 'Knowledge Base', description: 'Guides for domains, hosting, email, billing and security.', crumbs: [['Support', 'support/index.html'], ['Knowledge Base']] }) + '<div id="kb-body"></div>';
    const body = root.querySelector('#kb-body');

    function renderList() {
      const q = query.toLowerCase();
      const strip = (html) => html.replace(/<[^>]+>/g, ' ');
      const matches = articles.filter((a) => (!category || a.category === category) && (!q || (a.title + ' ' + a.category + ' ' + strip(a.body)).toLowerCase().indexOf(q) !== -1));
      body.innerHTML = '<div class="grid grid-side">' +
        View.panel({ title: 'Categories', flush: true, body: '<nav aria-label="Categories">' + [''].concat(categories).map((c) =>
          '<button type="button" class="wm-folder' + (c === category ? ' active' : '') + '" data-cat="' + esc(c) + '"><span>' + (c || 'All articles') + '</span><small>' + articles.filter((a) => !c || a.category === c).length + '</small></button>').join('') + '</nav>' }) +
        '<div class="stack">' +
          View.panel({ body: '<form id="kb-form" class="search-hero" role="search"><label class="sr-only" for="kb-query">Search articles</label><input id="kb-query" class="input" placeholder="Search the knowledge base" value="' + esc(query) + '"><button class="btn btn-primary btn-lg" type="submit">' + icon('search', 15) + 'Search</button></form>' }) +
          View.panel({ title: (query ? 'Results for "' + query + '"' : category || 'All articles'), subtitle: matches.length + ' article' + (matches.length === 1 ? '' : 's'), flush: true,
            body: matches.length ? matches.map((a) => '<a class="kb-item" href="?article=' + a.id + '" data-article="' + a.id + '"><strong>' + esc(a.title) + '</strong><small>' + esc(a.category) + ' - updated ' + fmt.date(a.updated) + ' - ' + fmt.number(a.views) + ' views</small></a>').join('')
              : View.empty({ icon: 'search', title: 'No articles found', text: 'Try different keywords, or ask our team directly.', action: '<a class="btn btn-primary btn-sm" href="' + App.url('support/tickets.html?new=1&subject=' + encodeURIComponent(query)) + '">Open a ticket</a>' }) }) +
        '</div></div>';
    }

    function renderArticle(article) {
      const related = articles.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 4);
      const voted = Store.ui('kbVote:' + article.id);
      body.innerHTML = '<div class="grid grid-main">' +
        View.panel({ title: article.title, subtitle: article.category + ' - updated ' + fmt.date(article.updated), actions: '<button type="button" class="btn btn-secondary btn-sm" data-back>' + icon('arrowLeft', 14) + 'All articles</button>',
          body: '<div class="article-body">' + article.body + '</div>',
          footer: '<span id="kb-vote">' + (voted ? 'Thanks for your feedback.' : 'Was this article helpful? <button type="button" class="btn btn-secondary btn-xs" data-vote="yes">Yes</button> <button type="button" class="btn btn-secondary btn-xs" data-vote="no">No</button>') + '</span><a class="panel-link" href="' + App.url('support/tickets.html?new=1&subject=' + encodeURIComponent('Question about: ' + article.title)) + '">Still need help?</a>' }) +
        View.panel({ title: 'Related articles', flush: true, body: related.length ? related.map((a) => '<a class="kb-item" href="?article=' + a.id + '" data-article="' + a.id + '"><strong>' + esc(a.title) + '</strong><small>' + esc(a.category) + '</small></a>').join('') : View.empty({ title: 'No related articles' }) }) +
        '</div>';
      document.title = article.title + ' | H&R Portal';
    }

    function route() {
      const id = App.param('article');
      const article = id && articles.find((a) => a.id === id);
      if (id && !article) { body.innerHTML = View.panel({ body: View.errorState('Article not found', 'The article you requested does not exist.') }); return; }
      if (article) renderArticle(article); else renderList();
      window.scrollTo(0, 0);
    }

    body.addEventListener('click', (e) => {
      const link = e.target.closest('[data-article]');
      if (link) { e.preventDefault(); App.setParam('article', link.dataset.article); route(); return; }
      const cat = e.target.closest('[data-cat]');
      if (cat) { category = cat.dataset.cat; renderList(); return; }
      if (e.target.closest('[data-back]')) { App.setParam('article', null); route(); return; }
      const vote = e.target.closest('[data-vote]');
      if (vote) {
        Store.ui('kbVote:' + App.param('article'), vote.dataset.vote);
        body.querySelector('#kb-vote').textContent = vote.dataset.vote === 'yes' ? 'Thanks for your feedback.' : 'Thanks. We will review this article.';
      }
    });
    body.addEventListener('submit', (e) => {
      if (e.target.id !== 'kb-form') return;
      e.preventDefault();
      query = body.querySelector('#kb-query').value.trim();
      App.setParam('q', query);
      renderList();
      const input = body.querySelector('#kb-query');
      input.focus();
    });
    window.addEventListener('popstate', route);
    route();
  });

  /* ---------- Contact ---------- */
  App.page('support.contact', (root) => {
    const body = header(root, { title: 'Contact Support', description: 'Reach the right department. Ticket responses are faster than email for account-specific issues.' });
    const profile = Store.get('profile');
    body.innerHTML = '<div class="grid grid-main">' +
      View.panel({ title: 'Send a message', subtitle: 'Creates a support ticket in your account', body:
        '<form id="contact-form" class="form-grid" novalidate>' +
          UI.fieldHTML({ name: 'department', label: 'Department', type: 'select', options: DEPARTMENTS, half: true }) +
          UI.fieldHTML({ name: 'service', label: 'Related service', type: 'select', options: serviceOptions(), half: true }) +
          UI.fieldHTML({ name: 'subject', label: 'Subject', required: true }) +
          UI.fieldHTML({ name: 'message', label: 'Message', type: 'textarea', rows: 6, required: true }) +
          UI.fieldHTML({ name: 'contactMethod', label: 'Preferred reply channel', type: 'select', options: ['Ticket and email', 'Ticket only', 'Phone call'], half: true }) +
          UI.fieldHTML({ name: 'phone', label: 'Phone', value: profile.phone, half: true }) +
          '<div class="form-error" role="alert" hidden></div>' +
          '<div class="form-actions"><button type="submit" class="btn btn-primary">' + icon('send', 14) + 'Send message</button></div>' +
        '</form>' }) +
      '<div class="stack">' +
        View.panel({ title: 'Departments', flush: true, body: Store.get('departments').map((d) => '<div class="status-row"><span><strong>' + esc(d.name) + '</strong><small>' + esc(d.hours) + ' - ' + esc(d.response) + '</small><small class="mono">' + esc(d.email) + '</small></span></div>').join('') }) +
        View.panel({ title: 'Request a callback', body: '<form id="callback-form" class="stack" novalidate>' +
          UI.fieldHTML({ name: 'cbPhone', label: 'Phone number', value: profile.phone, required: true }) +
          UI.fieldHTML({ name: 'window', label: 'Preferred time', type: 'select', options: ['As soon as possible', 'Today 12:00-14:00', 'Today 14:00-17:00', 'Tomorrow morning'] }) +
          '<button type="submit" class="btn btn-secondary">' + icon('phone', 14) + 'Request callback</button></form>' }) +
        View.alert('info', '<strong>Account PIN:</strong> <span class="mono">4821</span> - quote this when calling so we can verify you.') +
      '</div></div>';

    body.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (form.id === 'contact-form') {
        const fields = [
          { name: 'department', label: 'Department' }, { name: 'service', label: 'Service' },
          { name: 'subject', label: 'Subject', required: true, validate: (v) => v.length < 6 ? 'Please describe the issue in a few words.' : '' },
          { name: 'message', label: 'Message', required: true, validate: (v) => v.length < 20 ? 'Please include more detail (at least 20 characters).' : '' },
          { name: 'contactMethod', label: 'Channel' },
          { name: 'phone', label: 'Phone', validate: (v, all) => all.contactMethod === 'Phone call' && !/^\+?[\d\s()-]{7,}$/.test(v) ? 'Enter a phone number for a call back.' : '' }
        ];
        const values = UI.readForm(form, fields);
        if (!UI.validateFields(form, fields, values)) return;
        const button = form.querySelector('[type="submit"]');
        UI.setButtonLoading(button, true, 'Sending...');
        await Util.delay(700);
        UI.setButtonLoading(button, false);
        const ticket = createTicket({ department: values.department, service: values.service, subject: values.subject, message: values.message + '\n\nPreferred reply channel: ' + values.contactMethod + (values.contactMethod === 'Phone call' ? ' (' + values.phone + ')' : ''), priority: 'Medium' });
        form.reset();
        UI.modal({ title: 'Message sent', size: 'sm', body: '<p>Your message was logged as ticket <strong>' + ticket.id + '</strong>. Expected response: ' + esc((Store.get('departments').find((d) => d.name === values.department) || {}).response || 'soon') + '.</p>',
          actions: [{ label: 'Close', variant: 'secondary' }, { label: 'View ticket', variant: 'primary', onClick: () => { location.href = App.url('support/ticket.html?id=' + ticket.id); } }] });
      }
      if (form.id === 'callback-form') {
        const fields = [{ name: 'cbPhone', label: 'Phone number', required: true, validate: (v) => /^\+?[\d\s()-]{7,}$/.test(v) ? '' : 'Enter a valid phone number.' }, { name: 'window', label: 'Time' }];
        const values = UI.readForm(form, fields);
        if (!UI.validateFields(form, fields, values)) return;
        const button = form.querySelector('[type="submit"]');
        UI.setButtonLoading(button, true, 'Requesting...');
        await Util.delay(600);
        UI.setButtonLoading(button, false);
        App.log('Support', 'Callback requested', values.cbPhone + ' (' + values.window + ')');
        UI.toast('Callback requested for ' + values.window.toLowerCase() + '.');
      }
    });
  });
})();
