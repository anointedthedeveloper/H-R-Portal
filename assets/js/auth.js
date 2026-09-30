/*
 * Mock authentication for the demo environment. Credentials are checked
 * locally and the session is kept in localStorage. Nothing is sent anywhere.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'hrp:session';
  const REMEMBER_KEY = 'hrp:remembered-email';
  const DEMO_ACCOUNT = { email: 'devswork98@gmail.com', password: 'V7mQ9xL2#pR8!zK4' };
  const HOUR = 3600 * 1000;

  const Auth = {
    demoEmail: DEMO_ACCOUNT.email,
    session() {
      const raw = Store.raw.get(SESSION_KEY);
      if (!raw) return null;
      try {
        const session = JSON.parse(raw);
        if (!session.expiresAt || session.expiresAt < Date.now()) {
          Store.raw.remove(SESSION_KEY);
          return null;
        }
        return session;
      } catch (e) {
        return null;
      }
    },
    checkCredentials(email, password) {
      return email.trim().toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
    },
    async login(email, password, remember) {
      await Util.delay(700);
      if (!Auth.checkCredentials(email, password)) {
        Store.update('loginHistory', (list) => {
          list.unshift({ id: Util.uid('l'), date: fmt.isoDateTime(App.now()), ip: '198.51.100.42', location: 'London, UK', device: Auth.device(), result: 'Failed - wrong password' });
        });
        return { ok: false, error: 'The email address or password is incorrect.' };
      }
      return { ok: true, requiresTwoFactor: !!Store.get('security').twoFactor };
    },
    startSession(email, remember) {
      const session = {
        email: email.trim().toLowerCase(),
        createdAt: Date.now(),
        expiresAt: Date.now() + (remember ? 30 * 24 * HOUR : 8 * HOUR),
        remember: !!remember
      };
      Store.raw.set(SESSION_KEY, JSON.stringify(session));
      if (remember) Store.raw.set(REMEMBER_KEY, session.email); else Store.raw.remove(REMEMBER_KEY);
      const stamp = fmt.isoDateTime(App.now());
      Store.update('loginHistory', (list) => {
        list.unshift({ id: Util.uid('l'), date: stamp, ip: '198.51.100.42', location: 'London, UK', device: Auth.device(), result: 'Success' });
      });
      Store.update('sessions', (list) => {
        list.forEach((s) => { if (s.current) { s.current = false; } });
        list.unshift({ id: Util.uid('se'), device: Auth.device(), ip: '198.51.100.42', location: 'London, UK', started: stamp, lastSeen: stamp, current: true });
      });
      App.log('Security', 'Login detected', Auth.device() + ', London, UK');
    },
    rememberedEmail() {
      return Store.raw.get(REMEMBER_KEY) || '';
    },
    logout() {
      Store.update('sessions', (list) => list.filter((s) => !s.current));
      App.log('Security', 'Signed out', Auth.device());
      Store.raw.remove(SESSION_KEY);
      location.href = App.url('login.html?signed_out=1');
    },
    guard() {
      if (Auth.session()) return true;
      const here = location.pathname.split('/').slice(App.root ? -2 : -1).join('/') + location.search;
      location.replace(App.url('login.html?next=' + encodeURIComponent(here)));
      return false;
    },
    device() {
      const ua = navigator.userAgent;
      const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
      const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
      return browser + ' on ' + os;
    },
    safeNext(next) {
      if (!next || /^[a-z]+:|^\/\/|\.\./i.test(next) || !/^[\w\-/]+\.html(\?[\w\-=&%.@]*)?$/.test(next)) return 'dashboard.html';
      return next;
    }
  };

  window.Auth = Auth;
})();
