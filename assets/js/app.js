/*
 * Core runtime: persistent store, formatting helpers, page registry and boot.
 */
(function () {
  'use strict';

  const PREFIX = 'hrp:';
  const cache = {};

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }

  /* Store: collections seeded from MockData, persisted in localStorage. */
  const Store = {
    ensureVersion() {
      const stored = storageGet(PREFIX + 'version');
      if (stored !== String(MockData.version)) {
        this.clearData();
        storageSet(PREFIX + 'version', String(MockData.version));
      }
    },
    get(name) {
      if (cache[name] !== undefined) return cache[name];
      const raw = storageGet(PREFIX + 'data:' + name);
      let value;
      if (raw !== null) {
        try { value = JSON.parse(raw); } catch (e) { value = undefined; }
      }
      if (value === undefined) value = clone(MockData[name]);
      cache[name] = value;
      return value;
    },
    set(name, value) {
      cache[name] = value;
      storageSet(PREFIX + 'data:' + name, JSON.stringify(value));
      return value;
    },
    update(name, mutator) {
      const value = this.get(name);
      const result = mutator(value);
      return this.set(name, result === undefined ? value : result);
    },
    find(name, id, key) {
      return (this.get(name) || []).find((item) => item[key || 'id'] === id) || null;
    },
    patch(name, id, changes, key) {
      let updated = null;
      this.update(name, (list) => {
        const item = list.find((entry) => entry[key || 'id'] === id);
        if (item) { Object.assign(item, changes); updated = item; }
      });
      return updated;
    },
    remove(name, id, key) {
      this.update(name, (list) => list.filter((item) => item[key || 'id'] !== id));
    },
    prepend(name, item) {
      this.update(name, (list) => { list.unshift(item); });
      return item;
    },
    ui(key, value) {
      const full = PREFIX + 'ui:' + key;
      if (value === undefined) {
        const raw = storageGet(full);
        try { return raw === null ? null : JSON.parse(raw); } catch (e) { return null; }
      }
      storageSet(full, JSON.stringify(value));
      return value;
    },
    clearData() {
      Object.keys(cache).forEach((key) => delete cache[key]);
      try {
        Object.keys(localStorage)
          .filter((key) => key.indexOf(PREFIX + 'data:') === 0)
          .forEach(storageRemove);
      } catch (e) { /* storage unavailable */ }
    },
    raw: { get: storageGet, set: storageSet, remove: storageRemove }
  };

  /* Demo clock: the fixed demo date combined with the real time of day,
     so relationships between seeded dates stay stable. */
  function now() {
    const real = new Date();
    const [y, m, d] = MockData.demoDate.split('-').map(Number);
    return new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds());
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function parseDate(value) {
    if (value instanceof Date) return value;
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const date = new Date(value);
    return isNaN(date) ? null : date;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fmt = {
    date(value) {
      const d = parseDate(value);
      if (!d) return '-';
      const format = (Store.get('preferences') || {}).dateFormat;
      if (format === 'YYYY-MM-DD') return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      if (format === 'MM/DD/YYYY') return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear();
      return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    },
    datetime(value) {
      const d = parseDate(value);
      if (!d) return '-';
      return fmt.date(d) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    time(value) {
      const d = parseDate(value);
      return d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : '-';
    },
    isoDate(d) {
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    isoDateTime(d) {
      return fmt.isoDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    },
    relative(value) {
      const d = parseDate(value);
      if (!d) return '-';
      const diff = (now() - d) / 1000;
      const future = diff < 0;
      const abs = Math.abs(diff);
      let text;
      if (abs < 60) return 'just now';
      if (abs < 3600) text = Math.round(abs / 60) + ' min';
      else if (abs < 86400) text = Math.round(abs / 3600) + ' h';
      else if (abs < 86400 * 30) { const n = Math.round(abs / 86400); text = n + (n === 1 ? ' day' : ' days'); }
      else return fmt.date(d);
      return future ? 'in ' + text : text + ' ago';
    },
    money(amount) {
      const n = Number(amount) || 0;
      return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    bytes(bytes) {
      const n = Number(bytes) || 0;
      if (n < 1024) return n + ' B';
      const units = ['KB', 'MB', 'GB', 'TB'];
      let value = n / 1024;
      let i = 0;
      while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
      return value.toFixed(value < 10 ? 2 : 1) + ' ' + units[i];
    },
    mb(mb) { return mb >= 1024 ? (mb / 1024).toFixed(mb >= 10240 ? 0 : 1) + ' GB' : Math.round(mb) + ' MB'; },
    number(n) { return Number(n || 0).toLocaleString('en-US'); },
    percent(used, total) { return total ? Math.min(100, Math.round((used / total) * 100)) : 0; }
  };

  function daysUntil(value) {
    const d = parseDate(value);
    if (!d) return null;
    const today = now();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function addDays(value, days) {
    const d = new Date(parseDate(value));
    d.setDate(d.getDate() + days);
    return d;
  }

  function addYears(value, years) {
    const d = new Date(parseDate(value));
    d.setFullYear(d.getFullYear() + years);
    return fmt.isoDate(d);
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function randomHex(length) {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }

  function debounce(fn, wait) {
    let timer;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }

  function toCSV(rows, columns) {
    const quote = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
    return [columns.map((c) => quote(c.label)).join(',')]
      .concat(rows.map((row) => columns.map((c) => quote(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(',')))
      .join('\n');
  }

  const pages = {};

  const App = {
    root: '',
    pageName: '',
    url(path) { return App.root + (path || ''); },
    param(name) { return new URLSearchParams(location.search).get(name); },
    setParam(name, value) {
      const params = new URLSearchParams(location.search);
      if (value === null || value === undefined || value === '') params.delete(name); else params.set(name, value);
      const query = params.toString();
      history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
    },
    go(path) { location.href = App.url(path); },
    page(name, render) { pages[name] = render; },
    now,
    log(category, action, target) {
      const session = window.Auth ? Auth.session() : null;
      Store.prepend('activity', {
        id: uid('a'), date: fmt.isoDateTime(now()), category, action, target,
        user: session ? Store.get('profile').name : 'System', ip: '198.51.100.42'
      });
    },
    notify(title, text, link) {
      Store.prepend('notifications', { id: uid('n'), title, text, date: fmt.isoDateTime(now()), read: false, link: link || '' });
      if (window.Shell) Shell.refreshNotifications();
    },
    boot() {
      Store.ensureVersion();
      const body = document.body;
      App.root = body.dataset.root || '';
      App.pageName = body.dataset.page || '';
      if (body.dataset.public === 'true') {
        if (pages[App.pageName]) pages[App.pageName](document.getElementById('app'));
        return;
      }
      if (!Auth.guard()) return;
      const content = Shell.render();
      const render = pages[App.pageName];
      if (!render) {
        content.innerHTML = View.errorState('Page not available', 'This page has no view registered.');
        return;
      }
      try {
        render(content);
      } catch (error) {
        console.error(error);
        content.innerHTML = View.errorState('Something went wrong', 'The page failed to render. Reset data from Settings if the problem persists.');
      }
    }
  };

  window.Store = Store;
  window.App = App;
  window.fmt = fmt;
  window.Util = { clone, esc, uid, randomHex, debounce, delay, daysUntil, addDays, addYears, parseDate, downloadText, toCSV, pad };

  document.addEventListener('DOMContentLoaded', App.boot);
})();
