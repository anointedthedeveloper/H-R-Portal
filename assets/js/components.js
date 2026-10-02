/*
 * Reusable UI: icons, view helpers, modals, toasts, dropdowns, tabs,
 * data tables and the application shell (sidebar + header).
 */
(function () {
  'use strict';
  const { esc } = Util;

  /* ---------- Icons ---------- */
  const ICON_PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="1"/><rect x="2" y="14" width="20" height="8" rx="1"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="1"/><line x1="1" y1="10" x2="23" y2="10"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lifebuoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="1"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="1"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="1"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'
  };

  function icon(name, size) {
    const s = size || 16;
    return '<svg class="icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICON_PATHS[name] || '') + '</svg>';
  }

  /* ---------- View helpers (return HTML strings) ---------- */
  const BADGE_TONES = {
    ok: ['active', 'paid', 'completed', 'success', 'configured', 'operational', 'enabled', 'resolved', 'issued', 'valid', 'verified', 'available', 'online', 'connected', 'running'],
    warn: ['pending', 'pending transfer', 'expiring soon', 'unpaid', 'warning', 'degraded', 'awaiting approval', 'in progress', 'invited', 'processing', 'notice', 'open', 'medium', 'high', 'pending registration', 'restoring', 'queued', 'expiring'],
    danger: ['expired', 'overdue', 'failed', 'suspended', 'missing', 'critical', 'blocked', 'locked', 'urgent', 'unavailable', 'rejected', 'outage'],
    neutral: ['closed', 'cancelled', 'refunded', 'disabled', 'draft', 'revoked', 'low', 'info', 'inactive', 'off', 'owner', 'administrator', 'billing', 'support', 'developer', 'viewer', 'premium']
  };

  function badgeTone(status) {
    const key = String(status || '').toLowerCase();
    if (key.indexOf('failed') === 0 || key.indexOf('blocked') === 0) return 'danger';
    for (const tone of Object.keys(BADGE_TONES)) {
      if (BADGE_TONES[tone].indexOf(key) !== -1) return tone;
    }
    return 'neutral';
  }

  const View = {
    icon,
    badge(status, tone) {
      return '<span class="badge badge-' + (tone || badgeTone(status)) + '">' + esc(status) + '</span>';
    },
    pageHeader(opts) {
      const crumbs = [['Home', 'dashboard.html']].concat(opts.crumbs || []);
      const trail = crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        if (last || !crumb[1]) return '<li' + (last ? ' aria-current="page"' : '') + '>' + esc(crumb[0]) + '</li>';
        return '<li><a href="' + App.url(crumb[1]) + '">' + esc(crumb[0]) + '</a></li>';
      }).join('');
      return '<div class="page-header">' +
        '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>' + trail + '</ol></nav>' +
        '<div class="page-header-row"><div><h1 class="page-title">' + esc(opts.title) + '</h1>' +
        (opts.description ? '<p class="page-description">' + esc(opts.description) + '</p>' : '') + '</div>' +
        (opts.actions ? '<div class="page-actions">' + opts.actions + '</div>' : '') +
        '</div></div>';
    },
    panel(opts) {
      return '<section class="panel' + (opts.className ? ' ' + opts.className : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
        (opts.title ? '<header class="panel-header"><div><h2 class="panel-title">' + esc(opts.title) + '</h2>' +
          (opts.subtitle ? '<p class="panel-subtitle">' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
          (opts.actions ? '<div class="panel-actions">' + opts.actions + '</div>' : '') + '</header>' : '') +
        '<div class="panel-body' + (opts.flush ? ' flush' : '') + '">' + (opts.body || '') + '</div>' +
        (opts.footer ? '<footer class="panel-footer">' + opts.footer + '</footer>' : '') +
        '</section>';
    },
    stat(opts) {
      const tag = opts.href ? 'a' : 'div';
      return '<' + tag + ' class="stat"' + (opts.href ? ' href="' + App.url(opts.href) + '"' : '') + '>' +
        '<div class="stat-top"><span class="stat-label">' + esc(opts.label) + '</span>' + (opts.icon ? icon(opts.icon) : '') + '</div>' +
        '<div class="stat-value">' + esc(opts.value) + '</div>' +
        (opts.meta ? '<div class="stat-meta">' + opts.meta + '</div>' : '') +
        '</' + tag + '>';
    },
    meter(opts) {
      const pct = opts.percent !== undefined ? opts.percent : fmt.percent(opts.used, opts.total);
      const level = pct >= 90 ? 'critical' : pct >= 75 ? 'high' : 'normal';
      return '<div class="meter meter-' + level + '">' +
        '<div class="meter-head"><span class="meter-label">' + esc(opts.label) + '</span>' +
        '<span class="meter-value">' + esc(opts.text || '') + ' <strong>' + pct + '%</strong></span></div>' +
        '<div class="meter-track" role="progressbar" aria-label="' + esc(opts.label) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="meter-fill" style="width:' + pct + '%"></div></div>' +
        (level !== 'normal' ? '<div class="meter-note">' + (level === 'critical' ? 'Near limit' : 'High usage') + '</div>' : '') +
        '</div>';
    },
    kv(rows) {
      return '<dl class="kv">' + rows.filter(Boolean).map((row) =>
        '<div class="kv-row"><dt>' + esc(row[0]) + '</dt><dd>' + (row[1] === undefined || row[1] === null || row[1] === '' ? '-' : row[1]) + '</dd></div>'
      ).join('') + '</dl>';
    },
    empty(opts) {
      return '<div class="empty-state">' + icon(opts.icon || 'inbox', 28) +
        '<h3>' + esc(opts.title) + '</h3>' + (opts.text ? '<p>' + esc(opts.text) + '</p>' : '') +
        (opts.action || '') + '</div>';
    },
    errorState(title, text) {
      return '<div class="empty-state error-state" role="alert">' + icon('alert', 28) + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
        '<a class="btn btn-secondary" href="' + App.url('dashboard.html') + '">Back to dashboard</a></div>';
    },
    alert(tone, text, action) {
      return '<div class="alert alert-' + tone + '" role="' + (tone === 'critical' ? 'alert' : 'status') + '">' +
        icon(tone === 'info' ? 'info' : 'alert') + '<div class="alert-text">' + text + '</div>' + (action || '') + '</div>';
    },
    skeleton(lines) {
      let html = '<div class="skeleton-block" aria-hidden="true">';
      for (let i = 0; i < (lines || 4); i++) html += '<div class="skeleton-line" style="width:' + (60 + ((i * 17) % 40)) + '%"></div>';
      return html + '</div>';
    },
    switchControl(opts) {
      return '<label class="switch"><input type="checkbox" role="switch"' + (opts.checked ? ' checked' : '') +
        (opts.name ? ' name="' + opts.name + '"' : '') + (opts.data ? ' ' + opts.data : '') + (opts.disabled ? ' disabled' : '') + '>' +
        '<span class="switch-track" aria-hidden="true"></span>' + (opts.label ? '<span class="switch-label">' + esc(opts.label) + '</span>' : '<span class="sr-only">' + esc(opts.srLabel || 'Toggle') + '</span>') + '</label>';
    },
    options(list, selected) {
      return list.map((option) => {
        const value = typeof option === 'object' ? option.value : option;
        const label = typeof option === 'object' ? option.label : option;
        return '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('');
    },
    tabs(group, tabs, active) {
      return '<div class="tabs" role="tablist" data-tabs="' + group + '">' + tabs.map((tab) =>
        '<button type="button" class="tab' + (tab.id === active ? ' active' : '') + '" role="tab" data-tab="' + tab.id + '" aria-selected="' + (tab.id === active) + '">' +
        esc(tab.label) + (tab.count !== undefined ? '<span class="tab-count">' + tab.count + '</span>' : '') + '</button>'
      ).join('') + '</div>';
    },
    tabPanel(group, id, active, html) {
      return '<div class="tab-panel" role="tabpanel" data-panel="' + group + ':' + id + '"' + (id === active ? '' : ' hidden') + '>' + html + '</div>';
    },
    copyable(text) {
      return '<span class="copyable"><code>' + esc(text) + '</code><button type="button" class="icon-btn icon-btn-sm" data-copy="' + esc(text) + '" aria-label="Copy" data-tooltip="Copy">' + icon('copy', 14) + '</button></span>';
    },
    infoNote(text) {
      return '<p class="demo-note">' + icon('info', 14) + '<span>' + esc(text) + '</span></p>';
    }
  };

  /* ---------- Toasts ---------- */
  function toast(message, opts) {
    const options = typeof opts === 'string' ? { type: opts } : (opts || {});
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const type = options.type || 'success';
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check') +
      '<div class="toast-body">' + (options.title ? '<strong>' + esc(options.title) + '</strong>' : '') + '<span>' + esc(message) + '</span></div>' +
      '<button type="button" class="icon-btn icon-btn-sm" aria-label="Dismiss">' + icon('x', 14) + '</button>';
    region.appendChild(el);
    const remove = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 180); };
    el.querySelector('button').addEventListener('click', remove);
    setTimeout(remove, options.duration || 4200);
  }

  /* ---------- Modals ---------- */
  const modalStack = [];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function setButtonLoading(button, loading, text) {
    if (!button) return;
    if (loading) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.classList.add('is-loading');
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(text || 'Working...');
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (button.dataset.label) button.innerHTML = button.dataset.label;
    }
  }

  function modal(opts) {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const titleId = Util.uid('modal-title');
    const actions = opts.actions || [{ label: 'Close', variant: 'secondary' }];
    overlay.innerHTML =
      '<div class="modal modal-' + (opts.size || 'md') + '" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">' +
      '<header class="modal-header"><div><h2 id="' + titleId + '" class="modal-title">' + esc(opts.title) + '</h2>' +
      (opts.subtitle ? '<p class="modal-subtitle">' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
      '<button type="button" class="icon-btn" data-modal-close aria-label="Close dialog">' + icon('x') + '</button></header>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (actions.length ? '<footer class="modal-footer">' + (opts.footerNote ? '<div class="modal-footer-note">' + opts.footerNote + '</div>' : '') +
        actions.map((a, i) => '<button type="' + (a.submit ? 'submit' : 'button') + '" class="btn btn-' + (a.variant || 'secondary') + '" data-modal-action="' + i + '"' + (a.form ? ' form="' + a.form + '"' : '') + '>' + (a.icon ? icon(a.icon) : '') + esc(a.label) + '</button>').join('') +
        '</footer>' : '') +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    const dialog = overlay.querySelector('.modal');

    const api = {
      el: dialog,
      overlay,
      close(result) {
        const index = modalStack.indexOf(api);
        if (index !== -1) modalStack.splice(index, 1);
        overlay.remove();
        if (!modalStack.length) document.body.classList.remove('modal-open');
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        if (opts.onClose) opts.onClose(result);
      },
      button(index) { return dialog.querySelector('[data-modal-action="' + index + '"]'); }
    };
    modalStack.push(api);

    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && opts.dismissible !== false) api.close(); });
    dialog.querySelector('[data-modal-close]').addEventListener('click', () => api.close());
    actions.forEach((action, i) => {
      if (action.submit) return;
      api.button(i).addEventListener('click', async (e) => {
        if (!action.onClick) { api.close(); return; }
        const button = e.currentTarget;
        const result = action.onClick(api, button);
        if (result && typeof result.then === 'function') {
          setButtonLoading(button, true, action.loadingText);
          const value = await result;
          if (document.body.contains(button)) setButtonLoading(button, false);
          if (value !== false) api.close(value);
        } else if (result !== false) {
          api.close(result);
        }
      });
    });

    if (opts.onOpen) opts.onOpen(api);
    const first = dialog.querySelector('[autofocus]') || dialog.querySelector('.modal-body ' + FOCUSABLE) || dialog.querySelector(FOCUSABLE);
    if (first) first.focus();
    return api;
  }

  document.addEventListener('keydown', (e) => {
    const top = modalStack[modalStack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); top.close(); return; }
    if (e.key === 'Tab') {
      const items = Array.from(top.el.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let confirmed = false;
      const requireText = opts.requireText;
      const body = '<p class="confirm-message">' + esc(opts.message) + '</p>' +
        (opts.detail ? '<div class="confirm-detail">' + opts.detail + '</div>' : '') +
        (requireText ? '<div class="field"><label class="label" for="confirm-text">Type <strong>' + esc(requireText) + '</strong> to confirm</label><input id="confirm-text" class="input" autocomplete="off"></div>' : '');
      const dialog = modal({
        title: opts.title || 'Are you sure?',
        size: 'sm',
        body,
        actions: [
          { label: 'Cancel', variant: 'secondary' },
          { label: opts.confirmLabel || 'Confirm', variant: opts.danger ? 'danger' : 'primary', onClick: () => { confirmed = true; } }
        ],
        onClose: () => resolve(confirmed)
      });
      if (requireText) {
        const input = dialog.el.querySelector('#confirm-text');
        const button = dialog.button(1);
        button.disabled = true;
        input.addEventListener('input', () => { button.disabled = input.value.trim() !== requireText; });
      } else {
        dialog.button(1).focus();
      }
    });
  }

  /* ---------- Forms ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    return { score, label: labels[score] };
  }

  function fieldHTML(field) {
    const id = 'f-' + field.name;
    const value = field.value === undefined || field.value === null ? '' : field.value;
    const attrs = (field.required ? ' required aria-required="true"' : '') + (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') +
      (field.min !== undefined ? ' min="' + field.min + '"' : '') + (field.max !== undefined ? ' max="' + field.max + '"' : '') +
      (field.disabled ? ' disabled' : '') + (field.autocomplete ? ' autocomplete="' + field.autocomplete + '"' : '') +
      (field.maxlength ? ' maxlength="' + field.maxlength + '"' : '') + ' aria-describedby="' + id + '-hint ' + id + '-error"';
    let control;
    switch (field.type) {
      case 'select':
        control = '<select class="select" id="' + id + '" name="' + field.name + '"' + attrs + '>' + View.options(field.options || [], value) + '</select>';
        break;
      case 'textarea':
        control = '<textarea class="textarea' + (field.mono ? ' mono' : '') + '" id="' + id + '" name="' + field.name + '" rows="' + (field.rows || 4) + '"' + attrs + '>' + esc(value) + '</textarea>';
        break;
      case 'checkbox':
        return '<div class="field field-check' + (field.half ? ' half' : '') + '"><label class="checkbox"><input type="checkbox" id="' + id + '" name="' + field.name + '"' + (value ? ' checked' : '') + '><span>' + esc(field.label) + '</span></label>' +
          (field.hint ? '<p class="hint" id="' + id + '-hint">' + esc(field.hint) + '</p>' : '') + '</div>';
      case 'static':
        return '<div class="field' + (field.half ? ' half' : '') + '">' + (field.label ? '<span class="label">' + esc(field.label) + '</span>' : '') + '<div class="static-value">' + field.html + '</div></div>';
      case 'password':
        control = '<div class="input-group"><input class="input" type="password" id="' + id + '" name="' + field.name + '" value="' + esc(value) + '"' + attrs + '>' +
          '<button type="button" class="input-addon" data-toggle-password="' + id + '" aria-label="Show password">' + icon('eye') + '</button></div>' +
          (field.strength ? '<div class="strength" data-strength-for="' + id + '"><div class="strength-bar"><span></span></div><span class="strength-label">Enter a password</span></div>' : '');
        break;
      default:
        control = (field.prefix || field.suffix ? '<div class="input-group">' : '') +
          (field.prefix ? '<span class="input-affix">' + esc(field.prefix) + '</span>' : '') +
          '<input class="input' + (field.mono ? ' mono' : '') + '" type="' + (field.type || 'text') + '" id="' + id + '" name="' + field.name + '" value="' + esc(value) + '"' + attrs + '>' +
          (field.suffix ? '<span class="input-affix">' + esc(field.suffix) + '</span>' : '') +
          (field.prefix || field.suffix ? '</div>' : '');
    }
    return '<div class="field' + (field.half ? ' half' : '') + '" data-field="' + field.name + '"' + (field.hidden ? ' hidden' : '') + '>' +
      '<label class="label" for="' + id + '">' + esc(field.label) + (field.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
      control + '<p class="hint" id="' + id + '-hint">' + esc(field.hint || '') + '</p><p class="field-error" id="' + id + '-error" role="alert"></p></div>';
  }

  function readForm(form, fields) {
    const values = {};
    fields.forEach((field) => {
      if (field.type === 'static') return;
      const input = form.elements[field.name];
      if (!input) return;
      if (field.type === 'checkbox') values[field.name] = input.checked;
      else if (field.type === 'number') values[field.name] = input.value === '' ? '' : Number(input.value);
      else values[field.name] = input.value.trim();
    });
    return values;
  }

  function validateFields(form, fields, values) {
    let firstInvalid = null;
    fields.forEach((field) => {
      const wrapper = form.querySelector('[data-field="' + field.name + '"]');
      if (!wrapper || wrapper.hidden) return;
      const value = values[field.name];
      let error = '';
      if (field.required && (value === '' || value === undefined)) error = field.label + ' is required.';
      else if (field.type === 'email' && value && !EMAIL_RE.test(value)) error = 'Enter a valid email address.';
      else if (field.type === 'number' && value !== '' && ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))) error = 'Enter a value between ' + field.min + ' and ' + field.max + '.';
      else if (field.pattern && value && !field.pattern.test(value)) error = field.patternMessage || 'Invalid format.';
      else if (field.validate) error = field.validate(value, values) || '';
      setFieldError(wrapper, error);
      if (error && !firstInvalid) firstInvalid = wrapper.querySelector('input, select, textarea');
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function setFieldError(wrapper, message) {
    const errorEl = wrapper.querySelector('.field-error');
    const input = wrapper.querySelector('input, select, textarea');
    if (errorEl) errorEl.textContent = message || '';
    wrapper.classList.toggle('has-error', !!message);
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function formModal(opts) {
    const formId = Util.uid('form');
    const body = (opts.intro ? '<p class="modal-intro">' + opts.intro + '</p>' : '') +
      '<form id="' + formId + '" class="form-grid" novalidate>' + opts.fields.map(fieldHTML).join('') +
      '<div class="form-error" role="alert" hidden></div></form>' + (opts.after || '');
    const dialog = modal({
      title: opts.title,
      subtitle: opts.subtitle,
      size: opts.size || 'md',
      body,
      footerNote: opts.footerNote,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: opts.submitLabel || 'Save', variant: opts.danger ? 'danger' : 'primary', submit: true, form: formId }
      ]
    });
    const form = dialog.el.querySelector('form');
    const submit = dialog.button(1);
    const formError = form.querySelector('.form-error');
    bindFormEnhancements(form);
    if (opts.onChange) {
      form.addEventListener('input', () => opts.onChange(readForm(form, opts.fields), form));
      form.addEventListener('change', () => opts.onChange(readForm(form, opts.fields), form));
      opts.onChange(readForm(form, opts.fields), form);
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      formError.hidden = true;
      const values = readForm(form, opts.fields);
      if (!validateFields(form, opts.fields, values)) return;
      setButtonLoading(submit, true, opts.loadingText || 'Saving...');
      await Util.delay(opts.delay === undefined ? 450 : opts.delay);
      let result;
      try { result = await opts.onSubmit(values, dialog); } catch (err) { console.error(err); result = 'The action could not be completed.'; }
      if (!document.body.contains(submit)) return;
      setButtonLoading(submit, false);
      if (typeof result === 'string') {
        formError.textContent = result;
        formError.hidden = false;
        return;
      }
      if (result && result.field) {
        setFieldError(form.querySelector('[data-field="' + result.field + '"]'), result.message);
        return;
      }
      if (result !== false) {
        dialog.close(values);
        if (opts.successMessage) toast(opts.successMessage);
      }
    });
    return dialog;
  }

  function bindFormEnhancements(root) {
    root.querySelectorAll('[data-strength-for]').forEach((meter) => {
      const input = root.querySelector('#' + meter.dataset.strengthFor);
      const update = () => {
        const { score, label } = passwordStrength(input.value);
        meter.dataset.score = input.value ? score : '';
        meter.querySelector('span:last-child').textContent = input.value ? label : 'Enter a password';
        meter.querySelector('.strength-bar span').style.width = (input.value ? (score / 5) * 100 : 0) + '%';
      };
      input.addEventListener('input', update);
      update();
    });
  }

  /* ---------- Global delegated behaviours ---------- */
  function closeDropdowns(except) {
    document.querySelectorAll('.dropdown.open').forEach((dd) => {
      if (dd !== except) {
        dd.classList.remove('open');
        const toggle = dd.querySelector('[data-dropdown-toggle]');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function positionMenu(dropdown) {
    const menu = dropdown.querySelector('.dropdown-menu');
    const toggle = dropdown.querySelector('[data-dropdown-toggle]');
    if (!menu || !toggle || !dropdown.classList.contains('dropdown-float')) return;
    const rect = toggle.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.minWidth = Math.max(160, rect.width) + 'px';
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - 8) top = Math.max(8, rect.top - menuHeight - 4);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-dropdown-toggle]');
    if (toggle) {
      const dropdown = toggle.closest('.dropdown');
      const open = !dropdown.classList.contains('open');
      closeDropdowns(dropdown);
      dropdown.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        positionMenu(dropdown);
        if (dropdown.onOpen) dropdown.onOpen();
      }
      return;
    }
    if (!e.target.closest('.dropdown-menu') || e.target.closest('[data-close-menu], .menu-item')) closeDropdowns();

    const tab = e.target.closest('[data-tabs] [data-tab]');
    if (tab) activateTab(tab);

    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const text = copy.dataset.copy;
      const done = () => toast('Copied to clipboard.', 'info');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, done);
      else {
        const area = document.createElement('textarea');
        area.value = text; document.body.appendChild(area); area.select();
        try { document.execCommand('copy'); } catch (err) { /* ignore */ }
        area.remove(); done();
      }
    }

    const reveal = e.target.closest('[data-toggle-password]');
    if (reveal) {
      const input = document.getElementById(reveal.dataset.togglePassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      reveal.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      reveal.innerHTML = icon(show ? 'eyeOff' : 'eye');
    }
  });

  document.addEventListener('keydown', (e) => {
    const openDropdown = document.querySelector('.dropdown.open');
    if (openDropdown && e.key === 'Escape' && !modalStack.length) {
      const toggle = openDropdown.querySelector('[data-dropdown-toggle]');
      closeDropdowns();
      if (toggle) toggle.focus();
    }
    if (openDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const items = Array.from(openDropdown.querySelectorAll('.dropdown-menu .menu-item:not([disabled])'));
      if (!items.length) return;
      e.preventDefault();
      const index = items.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next].focus();
    }
    const tab = e.target.closest && e.target.closest('[data-tabs] [data-tab]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const tabs = Array.from(tab.parentElement.querySelectorAll('[data-tab]'));
      const next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      activateTab(next);
    }
  });

  window.addEventListener('resize', () => closeDropdowns());
  document.addEventListener('scroll', (e) => {
    if (e.target.closest && e.target.closest('.dropdown-menu')) return;
    document.querySelectorAll('.dropdown.dropdown-float.open').forEach((dd) => { dd.classList.remove('open'); });
  }, true);

  function activateTab(tab) {
    const list = tab.closest('[data-tabs]');
    const group = list.dataset.tabs;
    list.querySelectorAll('[data-tab]').forEach((t) => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-panel^="' + group + ':"]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== group + ':' + tab.dataset.tab;
    });
    list.dispatchEvent(new CustomEvent('tabchange', { detail: tab.dataset.tab, bubbles: true }));
  }

  function menu(items, opts) {
    const options = opts || {};
    return '<div class="dropdown dropdown-float' + (options.className ? ' ' + options.className : '') + '">' +
      '<button type="button" class="' + (options.buttonClass || 'icon-btn') + '" data-dropdown-toggle aria-haspopup="true" aria-expanded="false" aria-label="' + esc(options.label || 'More actions') + '">' +
      (options.buttonHTML || icon('more')) + '</button>' +
      '<div class="dropdown-menu" role="menu">' + items.filter(Boolean).map((item) => {
        if (item.divider) return '<div class="menu-divider" role="separator"></div>';
        const attrs = ' class="menu-item' + (item.danger ? ' danger' : '') + '" role="menuitem"' + (item.disabled ? ' disabled aria-disabled="true"' : '') +
          (item.action ? ' data-action="' + item.action + '"' : '') + (item.data || '');
        const inner = (item.icon ? icon(item.icon, 14) : '') + '<span>' + esc(item.label) + '</span>';
        return item.href && !item.disabled ? '<a href="' + item.href + '"' + attrs + '>' + inner + '</a>' : '<button type="button"' + attrs + '>' + inner + '</button>';
      }).join('') + '</div></div>';
  }

  /* ---------- Data table ---------- */
  function DataTable(container, opts) {
    const prefs = Store.get('preferences') || {};
    const state = {
      query: '',
      filters: {},
      sort: opts.defaultSort ? Object.assign({}, opts.defaultSort) : null,
      page: 1,
      pageSize: opts.pageSize || Number(prefs.rowsPerPage) || 10,
      selected: new Set(),
      loading: opts.loading !== false
    };
    (opts.filters || []).forEach((f) => { state.filters[f.key] = f.value || ''; });
    const rowId = opts.rowId || ((row) => row.id);
    const columns = opts.columns.slice();
    if (opts.actions) columns.push({ key: '__actions', label: 'Actions', sortable: false, className: 'col-actions', render: renderActions });

    const toolbar = opts.search !== false || (opts.filters && opts.filters.length) || opts.toolbar;
    container.innerHTML =
      '<div class="dt">' +
      (toolbar ? '<div class="dt-toolbar">' +
        (opts.search !== false ? '<div class="search-input">' + icon('search', 14) + '<input type="search" class="input input-sm" placeholder="' + esc(opts.searchPlaceholder || 'Search...') + '" aria-label="' + esc(opts.searchPlaceholder || 'Search table') + '" data-dt-search></div>' : '') +
        (opts.filters || []).map((f) =>
          '<select class="select select-sm" data-dt-filter="' + f.key + '" aria-label="' + esc(f.label) + '"><option value="">' + esc(f.allLabel || 'All ' + f.label.toLowerCase()) + '</option>' + View.options(f.options, f.value || '') + '</select>'
        ).join('') +
        '<div class="dt-bulk" hidden></div><div class="dt-spacer"></div>' + (opts.toolbar || '') + '</div>' : '') +
      '<div class="table-wrap"><table class="table dt-table' + (opts.compact ? ' table-compact' : '') + '">' +
      (opts.caption ? '<caption class="sr-only">' + esc(opts.caption) + '</caption>' : '') +
      '<thead></thead><tbody></tbody></table></div><div class="dt-footer"></div></div>';

    const root = container.querySelector('.dt');
    const thead = root.querySelector('thead');
    const tbody = root.querySelector('tbody');
    const footer = root.querySelector('.dt-footer');
    const bulk = root.querySelector('.dt-bulk');

    function renderActions(row) {
      const actions = opts.actions(row).filter(Boolean);
      const primary = actions.filter((a) => a.primary);
      const rest = actions.filter((a) => !a.primary);
      return '<div class="row-actions">' + primary.map((a) =>
        a.href ? '<a class="btn btn-secondary btn-xs" href="' + a.href + '">' + esc(a.label) + '</a>'
          : '<button type="button" class="btn btn-secondary btn-xs" data-action="' + a.action + '"' + (a.disabled ? ' disabled' : '') + '>' + esc(a.label) + '</button>'
      ).join('') + (rest.length ? menu(rest, { label: 'More actions for this row' }) : '') + '</div>';
    }

    function rows() {
      let list = (typeof opts.data === 'function' ? opts.data() : opts.data).slice();
      const query = state.query.toLowerCase();
      if (query) {
        const keys = opts.searchKeys || columns.map((c) => c.key);
        list = list.filter((row) => keys.some((key) => String(typeof key === 'function' ? key(row) : row[key] === undefined ? '' : row[key]).toLowerCase().indexOf(query) !== -1));
      }
      (opts.filters || []).forEach((f) => {
        const value = state.filters[f.key];
        if (!value) return;
        list = list.filter((row) => (f.match ? f.match(row, value) : String(row[f.key]) === value));
      });
      if (state.sort) {
        const column = columns.find((c) => c.key === state.sort.key);
        const getter = column && column.sortValue ? column.sortValue : (row) => row[state.sort.key];
        const dir = state.sort.dir === 'desc' ? -1 : 1;
        list.sort((a, b) => {
          const va = getter(a); const vb = getter(b);
          if (va === vb) return 0;
          if (va === null || va === undefined || va === '') return 1;
          if (vb === null || vb === undefined || vb === '') return -1;
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
        });
      }
      return list;
    }

    function renderHead() {
      thead.innerHTML = '<tr>' + (opts.selectable ? '<th class="col-check"><input type="checkbox" data-dt-all aria-label="Select all rows"></th>' : '') +
        columns.map((c) => {
          const sortable = c.sortable !== false && c.key.indexOf('__') !== 0;
          const active = state.sort && state.sort.key === c.key;
          const ariaSort = active ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
          return '<th scope="col" class="' + (c.className || '') + (c.align === 'right' ? ' align-right' : '') + '"' + (sortable ? ' aria-sort="' + ariaSort + '"' : '') + (c.width ? ' style="width:' + c.width + '"' : '') + '>' +
            (sortable ? '<button type="button" class="th-sort' + (active ? ' active' : '') + '" data-dt-sort="' + c.key + '">' + esc(c.label) +
              '<span class="sort-indicator" aria-hidden="true">' + (active ? (state.sort.dir === 'asc' ? '&#9650;' : '&#9660;') : '&#8693;') + '</span></button>' : esc(c.label)) + '</th>';
        }).join('') + '</tr>';
    }

    function render() {
      renderHead();
      const colCount = columns.length + (opts.selectable ? 1 : 0);
      if (state.loading) {
        let skeleton = '';
        for (let i = 0; i < Math.min(state.pageSize, 5); i++) {
          skeleton += '<tr class="skeleton-row">' + Array.from({ length: colCount }, () => '<td><div class="skeleton-line"></div></td>').join('') + '</tr>';
        }
        tbody.innerHTML = skeleton;
        footer.innerHTML = '<span class="muted">Loading...</span>';
        return;
      }
      const list = rows();
      const pages = Math.max(1, Math.ceil(list.length / state.pageSize));
      if (state.page > pages) state.page = pages;
      const start = (state.page - 1) * state.pageSize;
      const pageRows = list.slice(start, start + state.pageSize);
      if (!pageRows.length) {
        const filtered = state.query || Object.values(state.filters).some(Boolean);
        tbody.innerHTML = '<tr class="empty-row"><td colspan="' + colCount + '">' + View.empty({
          icon: opts.emptyIcon,
          title: filtered ? 'No matching results' : (opts.emptyTitle || 'Nothing here yet'),
          text: filtered ? 'Try a different search term or clear the filters.' : (opts.emptyText || ''),
          action: filtered ? '<button type="button" class="btn btn-secondary btn-sm" data-dt-clear>Clear filters</button>' : (opts.emptyAction || '')
        }) + '</td></tr>';
      } else {
        tbody.innerHTML = pageRows.map((row) => {
          const id = rowId(row);
          return '<tr data-id="' + esc(id) + '"' + (opts.onRowClick ? ' class="row-link" tabindex="0"' : '') + (opts.rowClass ? ' class="' + opts.rowClass(row) + '"' : '') + '>' +
            (opts.selectable ? '<td class="col-check"><input type="checkbox" data-dt-select aria-label="Select row"' + (state.selected.has(id) ? ' checked' : '') + '></td>' : '') +
            columns.map((c) => '<td data-label="' + esc(c.label) + '" class="' + (c.className || '') + (c.align === 'right' ? ' align-right' : '') + '">' +
              (c.render ? c.render(row) : esc(row[c.key] === undefined || row[c.key] === null ? '-' : row[c.key])) + '</td>').join('') + '</tr>';
        }).join('');
      }
      const end = Math.min(start + state.pageSize, list.length);
      footer.innerHTML = '<span class="muted">' + (list.length ? 'Showing ' + (start + 1) + '-' + end + ' of ' + list.length : '0 results') + '</span>' + pagination(state.page, pages);
      renderBulk();
      const all = thead.querySelector('[data-dt-all]');
      if (all) {
        const ids = pageRows.map(rowId);
        all.checked = ids.length > 0 && ids.every((id) => state.selected.has(id));
      }
      if (opts.onRender) opts.onRender(list);
    }

    function renderBulk() {
      if (!bulk || !opts.bulkActions) return;
      bulk.hidden = state.selected.size === 0;
      bulk.innerHTML = '<span class="muted">' + state.selected.size + ' selected</span>' + opts.bulkActions.map((a) =>
        '<button type="button" class="btn btn-' + (a.danger ? 'danger' : 'secondary') + ' btn-xs" data-dt-bulk="' + a.action + '">' + esc(a.label) + '</button>').join('');
    }

    function pagination(page, pages) {
      if (pages <= 1) return '';
      const items = [];
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i);
        else if (items[items.length - 1] !== '...') items.push('...');
      }
      return '<nav class="pagination" aria-label="Pagination">' +
        '<button type="button" class="page-btn" data-dt-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + icon('chevronLeft', 14) + '</button>' +
        items.map((i) => i === '...' ? '<span class="page-gap">...</span>' : '<button type="button" class="page-btn' + (i === page ? ' active' : '') + '" data-dt-page="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>').join('') +
        '<button type="button" class="page-btn" data-dt-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="Next page">' + icon('chevronRight', 14) + '</button></nav>';
    }

    function findRow(el) {
      const tr = el.closest('tr[data-id]');
      if (!tr) return null;
      const list = typeof opts.data === 'function' ? opts.data() : opts.data;
      return list.find((row) => String(rowId(row)) === tr.dataset.id) || null;
    }

    const search = root.querySelector('[data-dt-search]');
    if (search) {
      search.addEventListener('input', Util.debounce(() => { state.query = search.value.trim(); state.page = 1; render(); }, 150));
    }
    root.querySelectorAll('[data-dt-filter]').forEach((select) => {
      select.addEventListener('change', () => { state.filters[select.dataset.dtFilter] = select.value; state.page = 1; render(); });
    });

    root.addEventListener('click', (e) => {
      const sort = e.target.closest('[data-dt-sort]');
      if (sort) {
        const key = sort.dataset.dtSort;
        state.sort = state.sort && state.sort.key === key ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
        render();
        const again = thead.querySelector('[data-dt-sort="' + key + '"]');
        if (again) again.focus();
        return;
      }
      const pageBtn = e.target.closest('[data-dt-page]');
      if (pageBtn) { state.page = Number(pageBtn.dataset.dtPage); render(); return; }
      if (e.target.closest('[data-dt-clear]')) {
        state.query = ''; if (search) search.value = '';
        Object.keys(state.filters).forEach((k) => { state.filters[k] = ''; });
        root.querySelectorAll('[data-dt-filter]').forEach((s) => { s.value = ''; });
        render(); return;
      }
      const bulkBtn = e.target.closest('[data-dt-bulk]');
      if (bulkBtn && opts.onBulk) {
        const list = typeof opts.data === 'function' ? opts.data() : opts.data;
        opts.onBulk(bulkBtn.dataset.dtBulk, list.filter((row) => state.selected.has(rowId(row))));
        return;
      }
      const actionEl = e.target.closest('[data-action]');
      if (actionEl && opts.onAction && !actionEl.disabled) {
        const menuEl = actionEl.closest('.dropdown-menu');
        const row = findRow(menuEl ? menuEl.closest('.dropdown') : actionEl);
        if (row) { e.preventDefault(); opts.onAction(actionEl.dataset.action, row, actionEl); }
        return;
      }
      if (opts.onRowClick && !e.target.closest('a, button, input, select, label, .dropdown')) {
        const row = findRow(e.target);
        if (row) opts.onRowClick(row);
      }
    });

    root.addEventListener('change', (e) => {
      if (e.target.matches('[data-dt-select]')) {
        const id = e.target.closest('tr').dataset.id;
        const list = typeof opts.data === 'function' ? opts.data() : opts.data;
        const row = list.find((r) => String(rowId(r)) === id);
        if (e.target.checked) state.selected.add(rowId(row)); else state.selected.delete(rowId(row));
        render();
      }
      if (e.target.matches('[data-dt-all]')) {
        tbody.querySelectorAll('tr[data-id]').forEach((tr) => {
          const list = typeof opts.data === 'function' ? opts.data() : opts.data;
          const row = list.find((r) => String(rowId(r)) === tr.dataset.id);
          if (!row) return;
          if (e.target.checked) state.selected.add(rowId(row)); else state.selected.delete(rowId(row));
        });
        render();
      }
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && opts.onRowClick && e.target.matches('tr.row-link')) {
        const row = findRow(e.target);
        if (row) opts.onRowClick(row);
      }
    });

    render();
    if (state.loading) setTimeout(() => { state.loading = false; render(); }, opts.loadingDelay || 280);

    return {
      refresh() { render(); },
      clearSelection() { state.selected.clear(); render(); },
      setFilter(key, value) {
        state.filters[key] = value;
        const select = root.querySelector('[data-dt-filter="' + key + '"]');
        if (select) select.value = value;
        state.page = 1; render();
      },
      setQuery(value) { state.query = value; if (search) search.value = value; state.page = 1; render(); },
      rows,
      el: root
    };
  }

  window.Icons = { icon };
  window.View = View;
  window.UI = { toast, modal, confirm: confirmDialog, formModal, menu, setButtonLoading, passwordStrength, bindFormEnhancements, fieldHTML, readForm, validateFields, setFieldError, closeDropdowns, EMAIL_RE, DataTable };
})();
