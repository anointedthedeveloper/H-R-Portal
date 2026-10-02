# H&R Portal - Hosting & Registrar Client Portal (Demo)

A frontend-only prototype of a hosting and domain management client portal, built with plain HTML, CSS and JavaScript. There's no framework, build step or backend.

**This is a demo environment.** Every domain, invoice, ticket, IP address and message in it is fictional. Apart from the read-only `.com`/`.net` availability and WHOIS lookups described below, nothing connects to a real registrar, hosting provider, payment gateway, email server or authentication service. IP addresses use the reserved documentation ranges (RFC 5737 / RFC 3849), and external hostnames use the reserved `.invalid` TLD.

## Demo login

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `devswork98@gmail.com` |
| Password | `V7mQ9xL2#pR8!zK4`     |

If you turn on two-factor authentication under Security, sign-in will ask for a code. Any six digits are accepted.

## Running locally

Serving the folder with a basic static server is recommended:

```bash
cd H-R-Portal
python3 -m http.server 8080
# open http://localhost:8080/
```

Any static server works, for example `npx serve .`. You can also open `index.html` directly from disk. Chromium-based browsers share `localStorage` across `file://` pages, but some browsers isolate it per file, which breaks the login session. If you open the files directly and sign-in doesn't stick, use a server.

## Deploying to Vercel

It's a static site, so no build step is needed.

1. Import the repository in Vercel.
2. Set **Framework Preset** to **Other**, leave **Build Command** empty, and set **Output Directory** to `.` (the repo root).
3. Deploy. `vercel.json` turns off clean URLs so pages keep their `.html` paths, and it sends a `noindex` header so the demo isn't indexed.

Each deployed URL has its own `localStorage`, so every visitor gets an independent copy of the demo data in their own browser.

## Project structure

```text
H-R-Portal/
├── index.html                 Entry: redirects to dashboard or login
├── login.html                 Sign in, 2FA step, password reset UI
├── dashboard.html
├── domains/                   index, search, dns, nameservers, transfer, whois
├── hosting/                   index, accounts, resources, file-manager, ssl,
│                              backups, ftp, databases, php, cron
├── email/                     index, mailboxes, forwarders, webmail, authentication
├── billing/                   index, invoices, invoice (detail), payments,
│                              subscriptions, transactions
├── security/                  index, login-security, 2fa, logs
├── support/                   index, tickets, ticket (conversation), knowledge-base, contact
├── account/                   profile, users, notifications, api, activity, settings
└── assets/
    ├── css/
    │   ├── style.css          Design tokens and all components
    │   └── responsive.css     Tablet and mobile adjustments
    └── js/
        ├── data.js            Centralised mock data (single source of seed data)
        ├── app.js             Store (localStorage), formatting, page registry, boot
        ├── components.js      Icons, view helpers, modals, toasts, dropdowns, tabs, DataTable
        ├── shell.js           Sidebar, header, global search, notifications, account menu
        ├── services.js        Business rules that keep related data consistent
        ├── auth.js            Mock authentication and route guard
        └── pages/             One module per section (dashboard, domains, hosting, ...)
```

Each HTML file is a small shell. It sets `data-page` and `data-root` on `<body>` and loads the shared scripts plus its section's page module. `app.js` checks the session, renders the shared shell and calls the registered page renderer.

Compared with the structure in the brief, I added three pages and two scripts:

- `billing/invoice.html` is a full invoice detail page (invoices also open in a modal).
- `support/ticket.html` is the conversation view for a single ticket.
- `account/settings.html` holds display preferences and the demo data reset.
- `shell.js` and `services.js` keep layout code and business rules out of `components.js` and the page modules.

## Implemented pages

- **Dashboard**
  - Alerts: overdue invoice, expiring domain, expired SSL certificate.
  - Six summary cards.
  - Domain overview.
  - Hosting overview with an account switcher and usage bars.
  - Billing summary, recent activity, active tickets, service status and quick actions.
- **Domains**
  - My Domains: sorting, filters, bulk auto-renew, and actions for manage, DNS, renew, transfer, WHOIS, nameservers and lock.
  - Register Domain: mock availability search, cart and checkout, which creates an invoice.
  - DNS Management: A/AAAA/CNAME/MX/TXT/NS/SRV/CAA records with add, edit, duplicate and delete, per-type validation, bulk delete, zone file export, zone reset and a DNSSEC toggle.
  - Nameservers: default or custom nameservers, 2-5 entries, child nameservers (glue records) and a simulated propagation check.
  - Transfers: transfer in (creates a pending domain and an invoice), transfer out (unlock, then a placeholder authorisation code) and history.
  - WHOIS: a mock WHOIS record for any domain.
- **Hosting**
  - Overview and Accounts: plan changes with prorated invoices, renewal, control panel sign-in (simulated), cancellation request and a plan comparison table.
  - Resource Usage: CPU, RAM, disk, bandwidth, inodes and processes, with CSS charts for 24h / 7d / 30d.
  - File Manager: folder tree, breadcrumbs, upload (including drag and drop), new folder or file, rename, permissions, text editor, search, sorting, multi-select delete and a right-click context menu.
  - SSL, Backups (create, restore with progress, schedule), FTP, Databases, PHP Settings (validated against plan limits) and Cron Jobs (next run is calculated from the cron expression).
- **Email**
  - Overview and Mailboxes: create, quota, reset password, suspend and delete.
  - Forwarders, including catch-all settings.
  - Webmail: folders, read, compose, reply, forward, drafts, spam and trash.
  - Authentication: SPF, DKIM and DMARC status is read from the DNS records, and missing records can be published with one click.
- **Billing**
  - Overview, and invoices in both modal and full-page views.
  - Payment flow that can apply account credit.
  - Payment methods: add (Luhn-validated), set default, remove.
  - Subscriptions: auto-renew, billing cycle, cancel.
  - Transactions with CSV export.
- **Security**
  - Security score and checklist.
  - Sessions with revoke, and login history.
  - Password change, sign-in alerts, session timeout, recovery email and IP allowlist.
  - 2FA setup flow and security logs.
- **Support**
  - Overview with status counts, service status and maintenance.
  - Tickets: create, filter, conversation view, reply, close and reopen, priority.
  - Searchable knowledge base, and a contact form plus callback request.
- **Account**
  - Profile: editing, with unsaved-change detection.
  - Users & Permissions: invite, change role, remove, and a role matrix.
  - Notifications: inbox and per-channel preferences.
  - API keys: create (shown once), rename and revoke.
  - Activity Log with filters and export.
  - Settings: date format, rows per page, landing page, and data export or reset.

## How the mock data stays consistent

`assets/js/data.js` is the only place seed data is defined. On first use, `Store` in `app.js` copies each collection into `localStorage` under the `hrp:` prefix. Every change after that persists across refreshes.

`services.js` links related records. For example:

- **Paying an overdue hosting invoice** reactivates the suspended account, its mailboxes and databases, and reissues its expired certificate.
- **Paying a renewal invoice** extends the domain's expiry and the matching subscription.
- **Email authentication status** is worked out from the DNS zone, so publishing a DKIM record changes both pages.
- **Most actions** write to the Activity Log, and many also raise notifications.

The demo uses a fixed "today" of **30 Sep 2026** combined with your real time of day. That keeps relative dates such as "expires in 22 days" consistent with the seeded data whenever you open it.

To start over, go to **Settings > Reset demo data**. Bumping `MockData.version` also clears stored data.

## Known limitations (no backend)

- **Local to one browser.** All data is stored in this browser's `localStorage`. It isn't shared between browsers or devices, and clearing site data resets everything.
- **Authentication is mock only.** The credentials are in client-side JavaScript. Changing the password in Login Security doesn't change the demo sign-in, and 2FA accepts any six-digit code.
- **Simulated actions.** Payments, domain registration and transfers, SSL issuance, backups and restores, email sending, callback requests, API keys and control panel sign-in are all simulated with short delays. No external system is contacted, and generated keys, codes and QR images are placeholders.
- **Uploads and downloads.** The File Manager records only the name and size of uploaded files, plus the text of small text files. Downloads of backups and files are simulated. Zone files, CSV exports, the demo data JSON export and placeholder files are generated locally.
- **Lookups.** For `.com` and `.net`, domain search and WHOIS query the public Verisign RDAP registry live from the browser (results are marked **Live**). If that request fails or times out, the page falls back to simulated results. Other extensions and your own (fictional) domains always use deterministic mock data. Nothing is ever registered. Resource charts use generated series.
- **Staff replies aren't simulated.** Tickets only change when you act on them.
- **Invoice PDFs** are produced with the browser's print dialog.
