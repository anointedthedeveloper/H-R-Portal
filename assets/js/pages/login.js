/* Login and entry redirect (public pages). */
(function () {
  'use strict';
  const { esc } = Util;
  const icon = Icons.icon;
  const LOCK_KEY = 'hrp:login-lock';

  function landingPage() {
    return (Store.get('preferences') || {}).landingPage || 'dashboard.html';
  }

  App.page('index', () => {
    location.replace(App.url(Auth.session() ? landingPage() : 'login.html'));
  });

  App.page('login', (root) => {
    if (Auth.session()) {
      location.replace(App.url(Auth.safeNext(App.param('next')) || landingPage()));
      return;
    }
    const failures = { count: 0 };

    root.innerHTML =
      '<div class="auth-layout">' +
        '<aside class="auth-aside">' +
          '<div class="brand">' + '<span class="brand-mark" aria-hidden="true">' + icon('server', 18) + '</span><span class="brand-text"><strong>H&amp;R Portal</strong><small>Hosting &amp; Registrar</small></span></div>' +
          '<div><h2>Domains, hosting, email and billing in one console.</h2>' +
          '<p class="mt-16">A client portal prototype. Every record you see is fictional and stored only in this browser. No registrar, hosting provider or payment gateway is contacted.</p></div>' +
          '<div class="auth-status-list" aria-label="Environment details">' +
            '<div><span>Environment</span><span>DEMO</span></div>' +
            '<div><span>Data storage</span><span>browser localStorage</span></div>' +
            '<div><span>External connections</span><span>none</span></div>' +
            '<div><span>Portal build</span><span>2026.09</span></div>' +
          '</div>' +
        '</aside>' +
        '<main class="auth-main">' +
          '<span class="env-tag env-tag-header auth-env">Demo Environment</span>' +
          '<div class="auth-card" id="auth-card"></div>' +
        '</main>' +
      '</div>';

    const card = root.querySelector('#auth-card');
    showSignIn();

    function lockRemaining() {
      const until = Number(Store.raw.get(LOCK_KEY) || 0);
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    }

    function showSignIn(message) {
      const remembered = Auth.rememberedEmail();
      const signedOut = App.param('signed_out');
      const next = App.param('next');
      card.innerHTML =
        '<h1>Sign in</h1><p class="lead">Access your client account.</p>' +
        (message ? View.alert('info', esc(message)) : signedOut ? View.alert('info', 'You have been signed out.') : next ? View.alert('info', 'Sign in to continue to the requested page.') : '') +
        '<div id="login-error" class="alert alert-critical" role="alert" hidden></div>' +
        '<form id="login-form" novalidate>' +
          UI.fieldHTML({ name: 'email', label: 'Email address', type: 'email', value: remembered, autocomplete: 'username', required: true }) +
          UI.fieldHTML({ name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password', required: true }) +
          '<div class="auth-row"><label class="checkbox"><input type="checkbox" name="remember"' + (remembered ? ' checked' : '') + '><span>Remember me for 30 days</span></label>' +
          '<button type="button" class="link-btn" id="forgot-link">Forgot password?</button></div>' +
          '<button type="submit" class="btn btn-primary btn-lg btn-block" id="login-submit">Sign in</button>' +
        '</form>' +
        '<p class="auth-foot">This is a demo environment. It is not a real registrar or hosting provider, and signing in does not contact any authentication service.</p>';

      const form = card.querySelector('#login-form');
      const errorBox = card.querySelector('#login-error');
      const submit = card.querySelector('#login-submit');
      const fields = [
        { name: 'email', label: 'Email address', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true, validate: (v) => v.length < 8 ? 'Password must be at least 8 characters.' : '' }
      ];
      (remembered ? form.elements.password : form.elements.email).focus();

      card.querySelector('#forgot-link').addEventListener('click', () => showForgot(form.elements.email.value));

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        const locked = lockRemaining();
        if (locked) {
          errorBox.innerHTML = icon('alert') + '<div class="alert-text">Too many failed attempts. Try again in ' + locked + ' seconds.</div>';
          errorBox.hidden = false;
          return;
        }
        const values = UI.readForm(form, fields);
        if (!UI.validateFields(form, fields, values)) return;
        UI.setButtonLoading(submit, true, 'Signing in...');
        const result = await Auth.login(values.email, values.password);
        UI.setButtonLoading(submit, false);
        if (!result.ok) {
          failures.count++;
          let text = result.error;
          if (failures.count >= 5) {
            Store.raw.set(LOCK_KEY, String(Date.now() + 30000));
            failures.count = 0;
            text = 'Too many failed attempts. Sign-in is paused for 30 seconds.';
          } else if (failures.count >= 3) {
            text += ' ' + (5 - failures.count) + ' attempts remaining before a temporary lock.';
          }
          errorBox.innerHTML = icon('alert') + '<div class="alert-text">' + esc(text) + '</div>';
          errorBox.hidden = false;
          form.elements.password.value = '';
          form.elements.password.focus();
          return;
        }
        const remember = form.elements.remember.checked;
        if (result.requiresTwoFactor) showTwoFactor(values.email, remember);
        else complete(values.email, remember);
      });
    }

    function showTwoFactor(email, remember) {
      card.innerHTML =
        '<h1>Two-factor authentication</h1><p class="lead">Enter the six-digit code from your authenticator app.</p>' +
        '<div id="tfa-error" class="alert alert-critical" role="alert" hidden></div>' +
        '<form id="tfa-form" novalidate><div class="field"><label class="label" for="tfa-code">Authentication code</label>' +
        '<input id="tfa-code" class="input code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*"></div>' +
        '<button type="submit" class="btn btn-primary btn-lg btn-block">Verify</button>' +
        '<button type="button" class="btn btn-ghost btn-block" id="tfa-back">Back to sign in</button></form>' +
        View.demoNote('Demo: any six-digit code is accepted. No real one-time codes are generated or verified.');
      const input = card.querySelector('#tfa-code');
      input.focus();
      card.querySelector('#tfa-back').addEventListener('click', () => showSignIn());
      card.querySelector('#tfa-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = card.querySelector('#tfa-error');
        if (!/^\d{6}$/.test(input.value)) {
          errorBox.innerHTML = icon('alert') + '<div class="alert-text">Enter the six digits shown in your app.</div>';
          errorBox.hidden = false;
          input.focus();
          return;
        }
        const button = e.target.querySelector('[type="submit"]');
        UI.setButtonLoading(button, true, 'Verifying...');
        await Util.delay(500);
        complete(email, remember);
      });
    }

    function showForgot(email) {
      card.innerHTML =
        '<h1>Reset password</h1><p class="lead">Enter the email address on your account and we will send reset instructions.</p>' +
        '<div id="reset-result"></div>' +
        '<form id="reset-form" novalidate>' + UI.fieldHTML({ name: 'email', label: 'Email address', type: 'email', value: email, required: true, autocomplete: 'username' }) +
        '<button type="submit" class="btn btn-primary btn-lg btn-block">Send reset link</button>' +
        '<button type="button" class="btn btn-ghost btn-block" id="reset-back">Back to sign in</button></form>';
      const form = card.querySelector('#reset-form');
      form.elements.email.focus();
      card.querySelector('#reset-back').addEventListener('click', () => showSignIn());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fields = [{ name: 'email', label: 'Email address', type: 'email', required: true }];
        const values = UI.readForm(form, fields);
        if (!UI.validateFields(form, fields, values)) return;
        const button = form.querySelector('[type="submit"]');
        UI.setButtonLoading(button, true, 'Sending...');
        await Util.delay(800);
        UI.setButtonLoading(button, false);
        card.querySelector('#reset-result').innerHTML = View.alert('info', 'If an account exists for <strong>' + esc(values.email) + '</strong>, a reset link has been sent. Demo environment: no email was actually sent.');
        form.querySelector('[type="submit"]').disabled = true;
      });
    }

    function complete(email, remember) {
      Auth.startSession(email, remember);
      card.innerHTML = '<div class="empty-state"><span class="spinner" aria-hidden="true"></span><h3>Signed in</h3><p>Loading your dashboard...</p></div>';
      const next = App.param('next');
      setTimeout(() => location.replace(App.url(next ? Auth.safeNext(next) : landingPage())), 300);
    }
  });
})();
