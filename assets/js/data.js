/*
 * Centralised mock data for the demo environment.
 * Everything here is fictional. IP addresses use the RFC 5737 / RFC 3849
 * documentation ranges and no value connects to any real service.
 * The Store (app.js) copies these seeds into localStorage on first use.
 */
window.MockData = {
  version: 3,
  demoDate: '2026-09-30',

  profile: {
    name: 'Jordan Ellis',
    email: 'devswork98@gmail.com',
    phone: '+44 20 7946 0123',
    company: 'Example Client Ltd',
    vatNumber: 'GB 000 1234 56',
    address: '14 Harbour Row',
    city: 'London',
    postcode: 'EC2A 4NE',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    customerId: 'CUS-204817',
    memberSince: '2019-12-18'
  },

  preferences: {
    dateFormat: 'DD MMM YYYY',
    landingPage: 'dashboard.html',
    tableDensity: 'compact',
    rowsPerPage: 10
  },

  domains: [
    { id: 'd1', name: 'exampleclient.com', status: 'Active', registered: '2019-12-18', expires: '2026-12-18', autoRenew: true, privacy: true, locked: true, hostingId: 'h1', registrar: 'Demo Registrar Services', nameservers: ['ns1.examplehost.com', 'ns2.examplehost.com'], customNameservers: false, dnssec: true, renewalPrice: 13.99 },
    { id: 'd2', name: 'exampleclient.ng', status: 'Active', registered: '2022-03-04', expires: '2027-03-04', autoRenew: true, privacy: false, locked: true, hostingId: 'h1', registrar: 'Demo Registrar Services', nameservers: ['ns1.examplehost.com', 'ns2.examplehost.com'], customNameservers: false, dnssec: false, renewalPrice: 17.5 },
    { id: 'd3', name: 'brightlane-studio.com', status: 'Active', registered: '2021-06-11', expires: '2027-06-11', autoRenew: false, privacy: true, locked: true, hostingId: 'h2', registrar: 'Demo Registrar Services', nameservers: ['ns1.examplehost.com', 'ns2.examplehost.com'], customNameservers: false, dnssec: false, renewalPrice: 13.99 },
    { id: 'd4', name: 'kestrel-labs.io', status: 'Expiring Soon', registered: '2023-10-22', expires: '2026-10-22', autoRenew: false, privacy: true, locked: true, hostingId: 'h3', registrar: 'Demo Registrar Services', nameservers: ['ns1.examplehost.com', 'ns2.examplehost.com'], customNameservers: false, dnssec: true, renewalPrice: 49.0 },
    { id: 'd5', name: 'orchardmarket.com.ng', status: 'Active', registered: '2024-01-15', expires: '2027-01-15', autoRenew: true, privacy: false, locked: false, hostingId: 'h4', registrar: 'Demo Registrar Services', nameservers: ['ns1.examplehost.com', 'ns2.examplehost.com'], customNameservers: false, dnssec: false, renewalPrice: 9.5 },
    { id: 'd6', name: 'summit-archive.org', status: 'Expired', registered: '2020-09-12', expires: '2026-09-12', autoRenew: false, privacy: true, locked: false, hostingId: null, registrar: 'Demo Registrar Services', nameservers: ['dns1.parked-demo.net', 'dns2.parked-demo.net'], customNameservers: true, dnssec: false, renewalPrice: 15.99 },
    { id: 'd7', name: 'fieldnotes-journal.net', status: 'Pending Transfer', registered: '2018-04-30', expires: '2027-04-30', autoRenew: true, privacy: true, locked: false, hostingId: null, registrar: 'Previous Registrar (demo)', nameservers: ['ns1.fieldnotes-dns.net', 'ns2.fieldnotes-dns.net'], customNameservers: true, dnssec: false, renewalPrice: 14.99 }
  ],

  childNameservers: [
    { id: 'cn1', domain: 'exampleclient.com', host: 'ns1.exampleclient.com', ip: '203.0.113.10' },
    { id: 'cn2', domain: 'exampleclient.com', host: 'ns2.exampleclient.com', ip: '203.0.113.11' }
  ],

  transfers: [
    { id: 't1', domain: 'fieldnotes-journal.net', direction: 'Inbound', status: 'Awaiting Approval', started: '2026-09-26', eta: '2026-10-03', fromRegistrar: 'Previous Registrar (demo)' },
    { id: 't2', domain: 'harbourline-demo.com', direction: 'Inbound', status: 'Completed', started: '2025-11-02', eta: '2025-11-08', fromRegistrar: 'Previous Registrar (demo)' }
  ],

  dnsRecords: [
    { id: 'r1', domain: 'exampleclient.com', type: 'A', name: '@', value: '203.0.113.24', ttl: 3600, priority: null },
    { id: 'r2', domain: 'exampleclient.com', type: 'A', name: 'mail', value: '203.0.113.24', ttl: 3600, priority: null },
    { id: 'r3', domain: 'exampleclient.com', type: 'AAAA', name: '@', value: '2001:db8:4c1::24', ttl: 3600, priority: null },
    { id: 'r4', domain: 'exampleclient.com', type: 'CNAME', name: 'www', value: 'exampleclient.com', ttl: 3600, priority: null },
    { id: 'r5', domain: 'exampleclient.com', type: 'CNAME', name: 'ftp', value: 'exampleclient.com', ttl: 14400, priority: null },
    { id: 'r6', domain: 'exampleclient.com', type: 'MX', name: '@', value: 'mail.exampleclient.com', ttl: 3600, priority: 10 },
    { id: 'r7', domain: 'exampleclient.com', type: 'MX', name: '@', value: 'mx2.examplehost.com', ttl: 3600, priority: 20 },
    { id: 'r8', domain: 'exampleclient.com', type: 'TXT', name: '@', value: 'v=spf1 a mx include:_spf.examplehost.com ~all', ttl: 3600, priority: null },
    { id: 'r9', domain: 'exampleclient.com', type: 'TXT', name: 'default._domainkey', value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAdemoKeyOnly', ttl: 3600, priority: null },
    { id: 'r10', domain: 'exampleclient.com', type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@exampleclient.com', ttl: 3600, priority: null },
    { id: 'r11', domain: 'exampleclient.com', type: 'NS', name: '@', value: 'ns1.examplehost.com', ttl: 86400, priority: null },
    { id: 'r12', domain: 'exampleclient.com', type: 'NS', name: '@', value: 'ns2.examplehost.com', ttl: 86400, priority: null },
    { id: 'r13', domain: 'exampleclient.com', type: 'SRV', name: '_sip._tls', value: '5 5061 sip.exampleclient.com', ttl: 3600, priority: 10 },
    { id: 'r14', domain: 'exampleclient.com', type: 'CAA', name: '@', value: '0 issue "letsencrypt.org"', ttl: 3600, priority: null },
    { id: 'r15', domain: 'exampleclient.ng', type: 'A', name: '@', value: '203.0.113.24', ttl: 3600, priority: null },
    { id: 'r16', domain: 'exampleclient.ng', type: 'CNAME', name: 'www', value: 'exampleclient.ng', ttl: 3600, priority: null },
    { id: 'r17', domain: 'exampleclient.ng', type: 'NS', name: '@', value: 'ns1.examplehost.com', ttl: 86400, priority: null },
    { id: 'r18', domain: 'exampleclient.ng', type: 'NS', name: '@', value: 'ns2.examplehost.com', ttl: 86400, priority: null },
    { id: 'r19', domain: 'brightlane-studio.com', type: 'A', name: '@', value: '198.51.100.17', ttl: 3600, priority: null },
    { id: 'r20', domain: 'brightlane-studio.com', type: 'CNAME', name: 'www', value: 'brightlane-studio.com', ttl: 3600, priority: null },
    { id: 'r21', domain: 'brightlane-studio.com', type: 'MX', name: '@', value: 'mail.brightlane-studio.com', ttl: 3600, priority: 10 },
    { id: 'r22', domain: 'brightlane-studio.com', type: 'TXT', name: '@', value: 'v=spf1 a mx include:_spf.examplehost.com ~all', ttl: 3600, priority: null },
    { id: 'r23', domain: 'brightlane-studio.com', type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none', ttl: 3600, priority: null },
    { id: 'r24', domain: 'kestrel-labs.io', type: 'A', name: '@', value: '192.0.2.40', ttl: 1800, priority: null },
    { id: 'r25', domain: 'kestrel-labs.io', type: 'AAAA', name: '@', value: '2001:db8:9a0::40', ttl: 1800, priority: null },
    { id: 'r26', domain: 'kestrel-labs.io', type: 'CNAME', name: 'app', value: 'kestrel-labs.io', ttl: 1800, priority: null },
    { id: 'r27', domain: 'kestrel-labs.io', type: 'MX', name: '@', value: 'mail.kestrel-labs.io', ttl: 3600, priority: 10 },
    { id: 'r28', domain: 'kestrel-labs.io', type: 'TXT', name: '@', value: 'v=spf1 a mx include:_spf.examplehost.com -all', ttl: 3600, priority: null },
    { id: 'r29', domain: 'kestrel-labs.io', type: 'TXT', name: 'default._domainkey', value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAdemoKeyOnly', ttl: 3600, priority: null },
    { id: 'r30', domain: 'kestrel-labs.io', type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=reject; rua=mailto:dmarc@kestrel-labs.io', ttl: 3600, priority: null },
    { id: 'r31', domain: 'orchardmarket.com.ng', type: 'A', name: '@', value: '203.0.113.61', ttl: 3600, priority: null },
    { id: 'r32', domain: 'orchardmarket.com.ng', type: 'MX', name: '@', value: 'mail.orchardmarket.com.ng', ttl: 3600, priority: 10 }
  ],

  tldPricing: [
    { tld: '.com', register: 11.99, renew: 13.99, transfer: 11.99 },
    { tld: '.net', register: 13.49, renew: 15.49, transfer: 13.49 },
    { tld: '.org', register: 12.99, renew: 15.99, transfer: 12.99 },
    { tld: '.ng', register: 15.0, renew: 17.5, transfer: 15.0 },
    { tld: '.com.ng', register: 7.5, renew: 9.5, transfer: 7.5 },
    { tld: '.io', register: 39.0, renew: 49.0, transfer: 39.0 },
    { tld: '.co', register: 24.99, renew: 29.99, transfer: 24.99 },
    { tld: '.dev', register: 14.99, renew: 16.99, transfer: 14.99 },
    { tld: '.africa', register: 18.0, renew: 20.0, transfer: 18.0 },
    { tld: '.co.uk', register: 8.99, renew: 10.99, transfer: 0 }
  ],

  cart: [],

  hostingPlans: [
    { id: 'starter', name: 'Starter Hosting', price: 4.99, storageGB: 10, bandwidthGB: 100, websites: 1, databases: 2, emails: 5, ssl: 'Free DV', backups: 'Weekly', cpu: 1, ramGB: 1, inodes: 100000, processes: 20 },
    { id: 'business', name: 'Business Hosting', price: 14.99, storageGB: 50, bandwidthGB: 500, websites: 10, databases: 20, emails: 50, ssl: 'Free DV', backups: 'Daily', cpu: 2, ramGB: 4, inodes: 400000, processes: 60 },
    { id: 'professional', name: 'Professional Hosting', price: 24.99, storageGB: 100, bandwidthGB: 1000, websites: 25, databases: 50, emails: 100, ssl: 'Free DV + Wildcard', backups: 'Daily', cpu: 4, ramGB: 8, inodes: 800000, processes: 100 },
    { id: 'enterprise', name: 'Enterprise Hosting', price: 89.0, storageGB: 250, bandwidthGB: 5000, websites: 100, databases: 200, emails: 500, ssl: 'Free DV + OV support', backups: 'Hourly snapshots', cpu: 8, ramGB: 16, inodes: 2000000, processes: 200 }
  ],

  hostingAccounts: [
    { id: 'h1', ref: 'HST-10421', planId: 'business', primaryDomain: 'exampleclient.com', server: 'web-lon-04', location: 'London, UK', ip: '203.0.113.24', username: 'exmplcli', status: 'Active', created: '2019-12-18', renewal: '2026-12-18', billingCycle: 'Annually', panel: 'Demo Panel 11.4',
      usage: { storageGB: 31.4, bandwidthGB: 212, websites: 4, databases: 6, emails: 6, cpu: 38, ramGB: 1.9, inodes: 188240, processes: 21 } },
    { id: 'h2', ref: 'HST-10588', planId: 'professional', primaryDomain: 'brightlane-studio.com', server: 'web-fra-02', location: 'Frankfurt, DE', ip: '198.51.100.17', username: 'brightln', status: 'Active', created: '2021-06-11', renewal: '2026-10-11', billingCycle: 'Monthly', panel: 'Demo Panel 11.4',
      usage: { storageGB: 64.2, bandwidthGB: 603, websites: 7, databases: 12, emails: 3, cpu: 52, ramGB: 4.6, inodes: 402118, processes: 37 } },
    { id: 'h3', ref: 'HST-11032', planId: 'enterprise', primaryDomain: 'kestrel-labs.io', server: 'web-ams-01', location: 'Amsterdam, NL', ip: '192.0.2.40', username: 'kestrell', status: 'Active', created: '2023-10-22', renewal: '2026-10-22', billingCycle: 'Monthly', panel: 'Demo Panel 11.4',
      usage: { storageGB: 211.7, bandwidthGB: 2890, websites: 18, databases: 41, emails: 2, cpu: 81, ramGB: 12.3, inodes: 1492110, processes: 144 } },
    { id: 'h4', ref: 'HST-11217', planId: 'starter', primaryDomain: 'orchardmarket.com.ng', server: 'web-lon-02', location: 'London, UK', ip: '203.0.113.61', username: 'orchardm', status: 'Suspended', created: '2024-01-15', renewal: '2026-09-15', billingCycle: 'Annually', panel: 'Demo Panel 11.4', suspendReason: 'Overdue invoice INV-2026-0418',
      usage: { storageGB: 6.1, bandwidthGB: 0, websites: 1, databases: 1, emails: 1, cpu: 0, ramGB: 0, inodes: 41020, processes: 0 } }
  ],

  sslCertificates: [
    { id: 's1', domain: 'exampleclient.com', altNames: 'www.exampleclient.com, mail.exampleclient.com', type: 'Domain Validated (DV)', issuer: 'Let\'s Encrypt R11', issued: '2026-08-20', expires: '2026-11-18', status: 'Active', autoRenew: true, hostingId: 'h1', key: 'RSA 2048' },
    { id: 's2', domain: 'exampleclient.ng', altNames: 'www.exampleclient.ng', type: 'Domain Validated (DV)', issuer: 'Let\'s Encrypt R10', issued: '2026-07-30', expires: '2026-10-28', status: 'Active', autoRenew: true, hostingId: 'h1', key: 'ECDSA P-256' },
    { id: 's3', domain: 'brightlane-studio.com', altNames: '*.brightlane-studio.com', type: 'Wildcard DV', issuer: 'Let\'s Encrypt R11', issued: '2026-09-02', expires: '2026-12-01', status: 'Active', autoRenew: true, hostingId: 'h2', key: 'RSA 2048' },
    { id: 's4', domain: 'kestrel-labs.io', altNames: 'www.kestrel-labs.io, app.kestrel-labs.io', type: 'Organization Validated (OV)', issuer: 'Demo Trust CA OV G2', issued: '2026-02-03', expires: '2027-02-03', status: 'Active', autoRenew: false, hostingId: 'h3', key: 'RSA 3072' },
    { id: 's5', domain: 'orchardmarket.com.ng', altNames: 'www.orchardmarket.com.ng', type: 'Domain Validated (DV)', issuer: 'Let\'s Encrypt R10', issued: '2026-06-10', expires: '2026-09-08', status: 'Expired', autoRenew: true, hostingId: 'h4', key: 'RSA 2048' },
    { id: 's6', domain: 'staging.kestrel-labs.io', altNames: '', type: 'Domain Validated (DV)', issuer: 'Let\'s Encrypt R11', issued: '2026-09-25', expires: '2026-12-24', status: 'Active', autoRenew: true, hostingId: 'h3', key: 'ECDSA P-256' }
  ],

  backups: [
    { id: 'b1', hostingId: 'h1', date: '2026-09-30T02:00:00', type: 'Full', size: 8.42e9, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b2', hostingId: 'h1', date: '2026-09-29T02:00:00', type: 'Full', size: 8.39e9, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b3', hostingId: 'h1', date: '2026-09-28T14:12:00', type: 'Databases', size: 3.1e8, status: 'Completed', trigger: 'Manual' },
    { id: 'b4', hostingId: 'h1', date: '2026-09-28T02:00:00', type: 'Full', size: 8.35e9, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b5', hostingId: 'h1', date: '2026-09-27T02:00:00', type: 'Full', size: 8.31e9, status: 'Failed', trigger: 'Scheduled', note: 'Quota check timed out' },
    { id: 'b6', hostingId: 'h2', date: '2026-09-30T03:00:00', type: 'Full', size: 1.71e10, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b7', hostingId: 'h2', date: '2026-09-29T03:00:00', type: 'Full', size: 1.7e10, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b8', hostingId: 'h3', date: '2026-09-30T11:00:00', type: 'Snapshot', size: 5.62e10, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b9', hostingId: 'h3', date: '2026-09-30T10:00:00', type: 'Snapshot', size: 5.61e10, status: 'Completed', trigger: 'Scheduled' },
    { id: 'b10', hostingId: 'h3', date: '2026-09-29T18:40:00', type: 'Files', size: 4.12e10, status: 'Completed', trigger: 'Manual' },
    { id: 'b11', hostingId: 'h4', date: '2026-09-07T02:00:00', type: 'Full', size: 1.9e9, status: 'Completed', trigger: 'Scheduled' }
  ],

  backupSchedules: {
    h1: { frequency: 'Daily', time: '02:00', retention: 14, include: 'Files and databases' },
    h2: { frequency: 'Daily', time: '03:00', retention: 14, include: 'Files and databases' },
    h3: { frequency: 'Hourly', time: '00:00', retention: 30, include: 'Files and databases' },
    h4: { frequency: 'Weekly', time: '02:00', retention: 4, include: 'Files and databases' }
  },

  ftpAccounts: [
    { id: 'f1', hostingId: 'h1', username: 'exmplcli', directory: '/home/exmplcli', quotaMB: 0, status: 'Active', created: '2019-12-18', primary: true },
    { id: 'f2', hostingId: 'h1', username: 'deploy@exampleclient.com', directory: '/home/exmplcli/public_html', quotaMB: 5120, status: 'Active', created: '2024-05-02' },
    { id: 'f3', hostingId: 'h1', username: 'agency@exampleclient.com', directory: '/home/exmplcli/public_html/assets', quotaMB: 1024, status: 'Disabled', created: '2025-02-19' },
    { id: 'f4', hostingId: 'h2', username: 'brightln', directory: '/home/brightln', quotaMB: 0, status: 'Active', created: '2021-06-11', primary: true },
    { id: 'f5', hostingId: 'h3', username: 'ci@kestrel-labs.io', directory: '/home/kestrell/releases', quotaMB: 20480, status: 'Active', created: '2024-08-14' }
  ],

  databases: [
    { id: 'db1', hostingId: 'h1', name: 'exmplcli_wp', engine: 'MariaDB 10.11', sizeMB: 412.6, user: 'exmplcli_wpuser', status: 'Active', tables: 48 },
    { id: 'db2', hostingId: 'h1', name: 'exmplcli_shop', engine: 'MariaDB 10.11', sizeMB: 1288.1, user: 'exmplcli_shop', status: 'Active', tables: 112 },
    { id: 'db3', hostingId: 'h1', name: 'exmplcli_staging', engine: 'MariaDB 10.11', sizeMB: 96.4, user: 'exmplcli_wpuser', status: 'Active', tables: 48 },
    { id: 'db4', hostingId: 'h1', name: 'exmplcli_analytics', engine: 'PostgreSQL 16', sizeMB: 2210.9, user: 'exmplcli_report', status: 'Active', tables: 23 },
    { id: 'db5', hostingId: 'h2', name: 'brightln_portfolio', engine: 'MariaDB 10.11', sizeMB: 188.2, user: 'brightln_web', status: 'Active', tables: 31 },
    { id: 'db6', hostingId: 'h3', name: 'kestrell_app', engine: 'PostgreSQL 16', sizeMB: 18644.0, user: 'kestrell_app', status: 'Active', tables: 204 },
    { id: 'db7', hostingId: 'h4', name: 'orchardm_store', engine: 'MariaDB 10.11', sizeMB: 342.7, user: 'orchardm_store', status: 'Locked', tables: 64 }
  ],

  phpSettings: {
    h1: { version: '8.3', memory_limit: '256M', upload_max_filesize: '64M', post_max_size: '64M', max_execution_time: '60', max_input_vars: '3000', display_errors: 'Off', extensions: ['curl', 'gd', 'intl', 'mbstring', 'mysqli', 'opcache', 'pdo_mysql', 'zip'] },
    h2: { version: '8.2', memory_limit: '512M', upload_max_filesize: '128M', post_max_size: '128M', max_execution_time: '120', max_input_vars: '5000', display_errors: 'Off', extensions: ['curl', 'gd', 'imagick', 'intl', 'mbstring', 'mysqli', 'opcache', 'pdo_mysql', 'zip'] },
    h3: { version: '8.3', memory_limit: '1024M', upload_max_filesize: '256M', post_max_size: '256M', max_execution_time: '300', max_input_vars: '10000', display_errors: 'Off', extensions: ['curl', 'gd', 'intl', 'mbstring', 'opcache', 'pdo_pgsql', 'redis', 'sodium', 'zip'] },
    h4: { version: '8.1', memory_limit: '128M', upload_max_filesize: '32M', post_max_size: '32M', max_execution_time: '30', max_input_vars: '1000', display_errors: 'Off', extensions: ['curl', 'gd', 'mbstring', 'mysqli', 'pdo_mysql'] }
  },

  cronJobs: [
    { id: 'c1', hostingId: 'h1', command: '/usr/local/bin/php /home/exmplcli/public_html/wp-cron.php', schedule: '*/15 * * * *', lastRun: '2026-09-30T09:45:00', lastResult: 'Success', status: 'Enabled' },
    { id: 'c2', hostingId: 'h1', command: '/home/exmplcli/scripts/export-orders.sh > /dev/null 2>&1', schedule: '0 2 * * *', lastRun: '2026-09-30T02:00:00', lastResult: 'Success', status: 'Enabled' },
    { id: 'c3', hostingId: 'h1', command: '/usr/local/bin/php /home/exmplcli/public_html/shop/artisan schedule:run', schedule: '* * * * *', lastRun: '2026-09-30T09:59:00', lastResult: 'Success', status: 'Enabled' },
    { id: 'c4', hostingId: 'h1', command: '/home/exmplcli/scripts/rotate-logs.sh', schedule: '30 3 * * 0', lastRun: '2026-09-27T03:30:00', lastResult: 'Failed (exit 1)', status: 'Enabled' },
    { id: 'c5', hostingId: 'h1', command: '/usr/local/bin/php /home/exmplcli/scripts/sitemap.php', schedule: '0 4 1 * *', lastRun: '2026-09-01T04:00:00', lastResult: 'Success', status: 'Disabled' },
    { id: 'c6', hostingId: 'h3', command: '/home/kestrell/bin/queue-worker --once', schedule: '*/5 * * * *', lastRun: '2026-09-30T09:55:00', lastResult: 'Success', status: 'Enabled' }
  ],

  files: {
    h1: { name: '', type: 'dir', modified: '2026-09-30T02:00:00', perms: '0750', children: [
      { name: 'public_html', type: 'dir', modified: '2026-09-29T16:22:00', perms: '0750', children: [
        { name: 'wp-content', type: 'dir', modified: '2026-09-29T16:22:00', perms: '0755', children: [
          { name: 'themes', type: 'dir', modified: '2026-08-11T10:05:00', perms: '0755', children: [] },
          { name: 'plugins', type: 'dir', modified: '2026-09-18T12:40:00', perms: '0755', children: [] },
          { name: 'uploads', type: 'dir', modified: '2026-09-29T16:22:00', perms: '0755', children: [] }
        ] },
        { name: 'shop', type: 'dir', modified: '2026-09-22T09:14:00', perms: '0755', children: [] },
        { name: 'assets', type: 'dir', modified: '2026-09-02T11:30:00', perms: '0755', children: [] },
        { name: 'index.html', type: 'file', size: 18244, modified: '2026-09-21T14:03:00', perms: '0644', content: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Example Client Ltd</title>\n</head>\n<body>\n  <h1>Example Client Ltd</h1>\n</body>\n</html>\n' },
        { name: '.htaccess', type: 'file', size: 1207, modified: '2026-07-14T08:51:00', perms: '0644', content: 'RewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\n# BEGIN WordPress\nRewriteBase /\nRewriteRule ^index\\.php$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.php [L]\n# END WordPress\n' },
        { name: 'robots.txt', type: 'file', size: 112, modified: '2026-03-02T10:00:00', perms: '0644', content: 'User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\nSitemap: https://exampleclient.com/sitemap.xml\n' },
        { name: 'sitemap.xml', type: 'file', size: 6480, modified: '2026-09-01T04:00:00', perms: '0644', content: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://exampleclient.com/</loc></url>\n  <url><loc>https://exampleclient.com/services/</loc></url>\n  <url><loc>https://exampleclient.com/contact/</loc></url>\n</urlset>\n' },
        { name: 'wp-config.php', type: 'file', size: 3354, modified: '2026-05-19T13:27:00', perms: '0600', content: '<?php\n// Demo file. Credentials below are placeholders.\ndefine( \'DB_NAME\', \'exmplcli_wp\' );\ndefine( \'DB_USER\', \'exmplcli_wpuser\' );\ndefine( \'DB_PASSWORD\', \'********\' );\ndefine( \'DB_HOST\', \'localhost\' );\n$table_prefix = \'wp_\';\n' },
        { name: 'favicon.ico', type: 'file', size: 15086, modified: '2025-11-03T09:00:00', perms: '0644' }
      ] },
      { name: 'backups', type: 'dir', modified: '2026-09-30T02:00:00', perms: '0700', children: [
        { name: 'backup-2026-09-30.tar.gz', type: 'file', size: 842000000, modified: '2026-09-30T02:00:00', perms: '0600' },
        { name: 'backup-2026-09-29.tar.gz', type: 'file', size: 839000000, modified: '2026-09-29T02:00:00', perms: '0600' }
      ] },
      { name: 'logs', type: 'dir', modified: '2026-09-30T09:00:00', perms: '0750', children: [
        { name: 'access.log', type: 'file', size: 48211904, modified: '2026-09-30T09:58:00', perms: '0640' },
        { name: 'error.log', type: 'file', size: 214880, modified: '2026-09-30T08:12:00', perms: '0640', content: '[30-Sep-2026 08:12:44 UTC] PHP Warning:  Undefined array key "ref" in /home/exmplcli/public_html/shop/cart.php on line 88\n[29-Sep-2026 22:03:10 UTC] PHP Notice:  Function wp_enqueue_script was called incorrectly.\n' }
      ] },
      { name: 'tmp', type: 'dir', modified: '2026-09-30T07:40:00', perms: '0755', children: [] },
      { name: 'ssl', type: 'dir', modified: '2026-08-20T00:10:00', perms: '0700', children: [
        { name: 'exampleclient.com.crt', type: 'file', size: 3894, modified: '2026-08-20T00:10:00', perms: '0644' },
        { name: 'exampleclient.com.key', type: 'file', size: 1704, modified: '2026-08-20T00:10:00', perms: '0600' }
      ] },
      { name: 'mail', type: 'dir', modified: '2026-09-30T09:31:00', perms: '0750', children: [] }
    ] }
  },

  mailboxes: [
    { id: 'm1', address: 'admin@exampleclient.com', quotaMB: 10240, usedMB: 6420, status: 'Active', created: '2019-12-19', lastLogin: '2026-09-30T08:40:00' },
    { id: 'm2', address: 'support@exampleclient.com', quotaMB: 10240, usedMB: 8870, status: 'Active', created: '2020-02-03', lastLogin: '2026-09-30T09:12:00' },
    { id: 'm3', address: 'info@exampleclient.com', quotaMB: 5120, usedMB: 1210, status: 'Active', created: '2019-12-19', lastLogin: '2026-09-28T17:02:00' },
    { id: 'm4', address: 'billing@exampleclient.com', quotaMB: 5120, usedMB: 4990, status: 'Active', created: '2020-06-15', lastLogin: '2026-09-29T11:20:00' },
    { id: 'm5', address: 'hello@brightlane-studio.com', quotaMB: 5120, usedMB: 740, status: 'Active', created: '2021-06-12', lastLogin: '2026-09-27T09:45:00' },
    { id: 'm6', address: 'ops@kestrel-labs.io', quotaMB: 20480, usedMB: 3380, status: 'Active', created: '2023-10-23', lastLogin: '2026-09-30T07:05:00' },
    { id: 'm7', address: 'orders@orchardmarket.com.ng', quotaMB: 2048, usedMB: 1422, status: 'Suspended', created: '2024-01-16', lastLogin: '2026-09-14T19:30:00' }
  ],

  forwarders: [
    { id: 'fw1', source: 'sales@exampleclient.com', destination: 'admin@exampleclient.com', created: '2021-03-11' },
    { id: 'fw2', source: 'careers@exampleclient.com', destination: 'info@exampleclient.com', created: '2022-09-01' },
    { id: 'fw3', source: 'accounts@exampleclient.com', destination: 'billing@exampleclient.com', created: '2023-01-20' },
    { id: 'fw4', source: 'studio@brightlane-studio.com', destination: 'hello@brightlane-studio.com', created: '2021-07-04' },
    { id: 'fw5', source: 'alerts@kestrel-labs.io', destination: 'ops@kestrel-labs.io', created: '2024-02-12' }
  ],

  catchAll: { 'exampleclient.com': 'reject', 'brightlane-studio.com': 'hello@brightlane-studio.com', 'kestrel-labs.io': 'reject', 'orchardmarket.com.ng': 'reject', 'exampleclient.ng': 'reject' },

  messages: [
    { id: 'msg1', mailbox: 'admin@exampleclient.com', folder: 'Inbox', fromName: 'Billing Department (Demo)', from: 'billing@portal.invalid', to: 'admin@exampleclient.com', subject: 'Invoice INV-2026-0452 generated', date: '2026-09-30T08:02:00', read: false, starred: true, body: 'Hello Jordan,\n\nInvoice INV-2026-0452 for $138.00 has been generated for the renewal of kestrel-labs.io and Enterprise Hosting (HST-11032).\n\nDue date: 15 Oct 2026\n\nYou can view and pay this invoice from the Billing section of the client portal.\n\nRegards,\nBilling Department' },
    { id: 'msg2', mailbox: 'admin@exampleclient.com', folder: 'Inbox', fromName: 'Backup Service', from: 'backups@portal.invalid', to: 'admin@exampleclient.com', subject: 'Backup completed: HST-10421 (8.42 GB)', date: '2026-09-30T02:19:00', read: false, starred: false, body: 'The scheduled full backup of HST-10421 completed successfully.\n\nSize: 8.42 GB\nDuration: 18 minutes\nRetention: 14 days\n\nNo action is required.' },
    { id: 'msg3', mailbox: 'admin@exampleclient.com', folder: 'Inbox', fromName: 'Priya Raman', from: 'priya@exampleclient.com', to: 'admin@exampleclient.com', subject: 'Re: Staging site DNS', date: '2026-09-29T16:48:00', read: true, starred: false, body: 'Hi Jordan,\n\nI have added the staging CNAME. It should resolve within the hour. Can you check that the SSL certificate picks it up on the next renewal?\n\nThanks,\nPriya' },
    { id: 'msg4', mailbox: 'admin@exampleclient.com', folder: 'Inbox', fromName: 'SSL Monitor', from: 'ssl@portal.invalid', to: 'admin@exampleclient.com', subject: 'SSL certificate for orchardmarket.com.ng has expired', date: '2026-09-08T00:05:00', read: true, starred: false, body: 'The certificate for orchardmarket.com.ng expired on 08 Sep 2026 and could not be renewed automatically because the hosting account HST-11217 is suspended.\n\nSettle invoice INV-2026-0418 to restore the account. Renewal will run automatically afterwards.' },
    { id: 'msg5', mailbox: 'admin@exampleclient.com', folder: 'Inbox', fromName: 'Website Contact Form', from: 'noreply@exampleclient.com', to: 'admin@exampleclient.com', subject: 'New enquiry: Quote request for annual maintenance', date: '2026-09-28T13:22:00', read: true, starred: false, body: 'Name: Sam Whitfield\nCompany: Whitfield Logistics (fictional)\n\nMessage:\nWe would like a quote for annual website maintenance, including monthly reporting.' },
    { id: 'msg6', mailbox: 'admin@exampleclient.com', folder: 'Inbox', fromName: 'Domain Services', from: 'domains@portal.invalid', to: 'admin@exampleclient.com', subject: 'kestrel-labs.io expires in 22 days', date: '2026-09-30T06:00:00', read: false, starred: false, body: 'The domain kestrel-labs.io expires on 22 Oct 2026. Auto-renewal is disabled for this domain.\n\nRenew it from the Domains section to avoid service interruption.' },
    { id: 'msg7', mailbox: 'admin@exampleclient.com', folder: 'Sent', fromName: 'Jordan Ellis', from: 'admin@exampleclient.com', to: 'priya@exampleclient.com', subject: 'Staging site DNS', date: '2026-09-29T15:10:00', read: true, starred: false, body: 'Hi Priya,\n\nCould you add a CNAME for staging pointing at the main site? We need it for the review on Thursday.\n\nJordan' },
    { id: 'msg8', mailbox: 'admin@exampleclient.com', folder: 'Sent', fromName: 'Jordan Ellis', from: 'admin@exampleclient.com', to: 'tomasz@exampleclient.com', subject: 'Cron failure on rotate-logs.sh', date: '2026-09-27T09:02:00', read: true, starred: false, body: 'Tomasz, the weekly log rotation job exited with status 1 on Sunday. Can you take a look?' },
    { id: 'msg9', mailbox: 'admin@exampleclient.com', folder: 'Drafts', fromName: 'Jordan Ellis', from: 'admin@exampleclient.com', to: 'amara@exampleclient.com', subject: 'Q4 hosting budget', date: '2026-09-26T18:30:00', read: true, starred: false, body: 'Amara,\n\nDraft figures for Q4 hosting spend:\n- Enterprise Hosting: $267.00\n- Professional Hosting: $74.97\n' },
    { id: 'msg10', mailbox: 'admin@exampleclient.com', folder: 'Spam', fromName: 'Prize Desk', from: 'winner@spam.invalid', to: 'admin@exampleclient.com', subject: 'You have been selected', date: '2026-09-25T04:11:00', read: false, starred: false, body: 'This message was classified as spam by the demo filter.' },
    { id: 'msg11', mailbox: 'admin@exampleclient.com', folder: 'Trash', fromName: 'Newsletter', from: 'news@newsletter.invalid', to: 'admin@exampleclient.com', subject: 'September product digest', date: '2026-09-15T10:00:00', read: true, starred: false, body: 'Monthly digest (demo content).' }
  ],

  subscriptions: [
    { id: 'sub1', service: 'HST-10421 exampleclient.com', category: 'Hosting', plan: 'Business Hosting', price: 179.88, cycle: 'Annually', nextRenewal: '2026-12-18', status: 'Active', autoRenew: true, relatedId: 'h1' },
    { id: 'sub2', service: 'HST-10588 brightlane-studio.com', category: 'Hosting', plan: 'Professional Hosting', price: 24.99, cycle: 'Monthly', nextRenewal: '2026-10-11', status: 'Active', autoRenew: true, relatedId: 'h2' },
    { id: 'sub3', service: 'HST-11032 kestrel-labs.io', category: 'Hosting', plan: 'Enterprise Hosting', price: 89.0, cycle: 'Monthly', nextRenewal: '2026-10-22', status: 'Active', autoRenew: true, relatedId: 'h3' },
    { id: 'sub4', service: 'HST-11217 orchardmarket.com.ng', category: 'Hosting', plan: 'Starter Hosting', price: 59.88, cycle: 'Annually', nextRenewal: '2026-09-15', status: 'Suspended', autoRenew: true, relatedId: 'h4' },
    { id: 'sub5', service: 'exampleclient.com', category: 'Domain', plan: 'Domain registration (.com)', price: 13.99, cycle: 'Annually', nextRenewal: '2026-12-18', status: 'Active', autoRenew: true, relatedId: 'd1' },
    { id: 'sub6', service: 'exampleclient.ng', category: 'Domain', plan: 'Domain registration (.ng)', price: 17.5, cycle: 'Annually', nextRenewal: '2027-03-04', status: 'Active', autoRenew: true, relatedId: 'd2' },
    { id: 'sub7', service: 'brightlane-studio.com', category: 'Domain', plan: 'Domain registration (.com)', price: 13.99, cycle: 'Annually', nextRenewal: '2027-06-11', status: 'Active', autoRenew: false, relatedId: 'd3' },
    { id: 'sub8', service: 'kestrel-labs.io', category: 'Domain', plan: 'Domain registration (.io)', price: 49.0, cycle: 'Annually', nextRenewal: '2026-10-22', status: 'Active', autoRenew: false, relatedId: 'd4' },
    { id: 'sub9', service: 'orchardmarket.com.ng', category: 'Domain', plan: 'Domain registration (.com.ng)', price: 9.5, cycle: 'Annually', nextRenewal: '2027-01-15', status: 'Active', autoRenew: true, relatedId: 'd5' },
    { id: 'sub10', service: 'kestrel-labs.io OV certificate', category: 'SSL', plan: 'Organization Validated SSL', price: 129.0, cycle: 'Annually', nextRenewal: '2027-02-03', status: 'Active', autoRenew: false, relatedId: 's4' }
  ],

  invoices: [
    { id: 'INV-2026-0452', date: '2026-09-30', due: '2026-10-15', status: 'Unpaid', items: [ { description: 'Domain renewal - kestrel-labs.io (1 year) 22 Oct 2026 - 22 Oct 2027', amount: 49.0, relatedId: 'd4' }, { description: 'Enterprise Hosting HST-11032 (22 Oct 2026 - 21 Nov 2026)', amount: 89.0, relatedId: 'h3' } ] },
    { id: 'INV-2026-0447', date: '2026-09-27', due: '2026-10-11', status: 'Unpaid', items: [ { description: 'Professional Hosting HST-10588 (11 Oct 2026 - 10 Nov 2026)', amount: 24.99, relatedId: 'h2' } ] },
    { id: 'INV-2026-0440', date: '2026-09-08', due: '2026-09-22', status: 'Paid', paidOn: '2026-09-21', method: 'Visa ending 4242', items: [ { description: 'Enterprise Hosting HST-11032 (22 Sep 2026 - 21 Oct 2026)', amount: 89.0, relatedId: 'h3' } ] },
    { id: 'INV-2026-0436', date: '2026-08-28', due: '2026-09-11', status: 'Paid', paidOn: '2026-09-11', method: 'Visa ending 4242', items: [ { description: 'Professional Hosting HST-10588 (11 Sep 2026 - 10 Oct 2026)', amount: 24.99, relatedId: 'h2' } ] },
    { id: 'INV-2026-0433', date: '2026-08-13', due: '2026-09-12', status: 'Cancelled', items: [ { description: 'Domain renewal - summit-archive.org (1 year)', amount: 15.99, relatedId: 'd6' } ] },
    { id: 'INV-2026-0428', date: '2026-08-08', due: '2026-08-22', status: 'Paid', paidOn: '2026-08-22', method: 'Visa ending 4242', items: [ { description: 'Enterprise Hosting HST-11032 (22 Aug 2026 - 21 Sep 2026)', amount: 89.0, relatedId: 'h3' } ] },
    { id: 'INV-2026-0421', date: '2026-07-28', due: '2026-08-11', status: 'Paid', paidOn: '2026-08-10', method: 'Mastercard ending 5100', items: [ { description: 'Professional Hosting HST-10588 (11 Aug 2026 - 10 Sep 2026)', amount: 24.99, relatedId: 'h2' } ] },
    { id: 'INV-2026-0418', date: '2026-08-15', due: '2026-09-01', status: 'Overdue', items: [ { description: 'Starter Hosting HST-11217 (15 Sep 2026 - 14 Sep 2027)', amount: 59.88, relatedId: 'h4' } ] },
    { id: 'INV-2026-0409', date: '2026-07-08', due: '2026-07-22', status: 'Paid', paidOn: '2026-07-22', method: 'Visa ending 4242', items: [ { description: 'Enterprise Hosting HST-11032 (22 Jul 2026 - 21 Aug 2026)', amount: 89.0, relatedId: 'h3' } ] },
    { id: 'INV-2026-0395', date: '2026-05-28', due: '2026-06-11', status: 'Paid', paidOn: '2026-06-09', method: 'Bank transfer', items: [ { description: 'Domain renewal - brightlane-studio.com (1 year)', amount: 13.99, relatedId: 'd3' }, { description: 'Professional Hosting HST-10588 (11 Jun 2026 - 10 Jul 2026)', amount: 24.99, relatedId: 'h2' } ] },
    { id: 'INV-2026-0371', date: '2026-01-20', due: '2026-02-03', status: 'Paid', paidOn: '2026-02-02', method: 'Visa ending 4242', items: [ { description: 'Organization Validated SSL - kestrel-labs.io (1 year)', amount: 129.0, relatedId: 's4' } ] },
    { id: 'INV-2025-1187', date: '2025-12-04', due: '2025-12-18', status: 'Refunded', paidOn: '2025-12-16', method: 'Visa ending 4242', items: [ { description: 'Business Hosting HST-10421 (18 Dec 2025 - 17 Dec 2026)', amount: 179.88, relatedId: 'h1' }, { description: 'Domain renewal - exampleclient.com (1 year)', amount: 13.99, relatedId: 'd1' } ] }
  ],

  transactions: [
    { id: 'TXN-884120', date: '2026-09-21T10:14:00', description: 'Payment for INV-2026-0440', type: 'Payment', method: 'Visa ending 4242', amount: 89.0, status: 'Completed', invoiceId: 'INV-2026-0440' },
    { id: 'TXN-883702', date: '2026-09-11T08:02:00', description: 'Payment for INV-2026-0436', type: 'Payment', method: 'Visa ending 4242', amount: 24.99, status: 'Completed', invoiceId: 'INV-2026-0436' },
    { id: 'TXN-883655', date: '2026-09-02T02:10:00', description: 'Automatic charge for INV-2026-0418', type: 'Payment', method: 'Mastercard ending 5100', amount: 59.88, status: 'Failed', invoiceId: 'INV-2026-0418', note: 'Card declined by issuer (demo)' },
    { id: 'TXN-882903', date: '2026-08-22T09:41:00', description: 'Payment for INV-2026-0428', type: 'Payment', method: 'Visa ending 4242', amount: 89.0, status: 'Completed', invoiceId: 'INV-2026-0428' },
    { id: 'TXN-882410', date: '2026-08-10T17:20:00', description: 'Payment for INV-2026-0421', type: 'Payment', method: 'Mastercard ending 5100', amount: 24.99, status: 'Completed', invoiceId: 'INV-2026-0421' },
    { id: 'TXN-881877', date: '2026-07-22T07:55:00', description: 'Payment for INV-2026-0409', type: 'Payment', method: 'Visa ending 4242', amount: 89.0, status: 'Completed', invoiceId: 'INV-2026-0409' },
    { id: 'TXN-881240', date: '2026-07-01T00:00:00', description: 'Service credit - network incident 24 Jun 2026', type: 'Credit', method: 'Account credit', amount: 12.5, status: 'Completed' },
    { id: 'TXN-880918', date: '2026-06-09T12:30:00', description: 'Payment for INV-2026-0395', type: 'Payment', method: 'Bank transfer', amount: 38.98, status: 'Completed', invoiceId: 'INV-2026-0395' },
    { id: 'TXN-878302', date: '2026-02-02T15:05:00', description: 'Payment for INV-2026-0371', type: 'Payment', method: 'Visa ending 4242', amount: 129.0, status: 'Completed', invoiceId: 'INV-2026-0371' },
    { id: 'TXN-876011', date: '2025-12-20T11:45:00', description: 'Refund for INV-2025-1187 (duplicate charge)', type: 'Refund', method: 'Visa ending 4242', amount: 193.87, status: 'Completed', invoiceId: 'INV-2025-1187' },
    { id: 'TXN-875990', date: '2025-12-16T09:12:00', description: 'Payment for INV-2025-1187', type: 'Payment', method: 'Visa ending 4242', amount: 193.87, status: 'Completed', invoiceId: 'INV-2025-1187' },
    { id: 'TXN-875991', date: '2025-12-16T09:13:00', description: 'Payment for INV-2025-1187', type: 'Payment', method: 'Visa ending 4242', amount: 193.87, status: 'Completed', invoiceId: 'INV-2025-1187', note: 'Duplicate authorisation' }
  ],

  paymentMethods: [
    { id: 'pm1', type: 'Visa', last4: '4242', expiry: '08/28', holder: 'Jordan Ellis', isDefault: true },
    { id: 'pm2', type: 'Mastercard', last4: '5100', expiry: '01/27', holder: 'Example Client Ltd', isDefault: false },
    { id: 'pm3', type: 'Bank transfer', last4: '', expiry: '', holder: 'Example Client Ltd', isDefault: false }
  ],

  accountCredit: 12.5,

  tickets: [
    { id: 'TKT-58231', subject: 'Hosting account HST-11217 suspended after failed card payment', department: 'Billing', priority: 'High', status: 'Open', created: '2026-09-29T10:02:00', updated: '2026-09-30T08:15:00', service: 'HST-11217', messages: [
      { author: 'Jordan Ellis', role: 'client', date: '2026-09-29T10:02:00', body: 'The automatic charge for INV-2026-0418 failed and the Starter Hosting account for orchardmarket.com.ng was suspended. I have updated the card on file. Can you retry the charge and unsuspend the account?' },
      { author: 'R. Adeyemi', role: 'staff', date: '2026-09-29T11:40:00', body: 'Thanks Jordan. I can see the declined authorisation on 02 Sep. Once INV-2026-0418 is paid from the Billing section, the account is reactivated automatically within a few minutes. The expired SSL certificate for orchardmarket.com.ng will be reissued at the same time.' },
      { author: 'Jordan Ellis', role: 'client', date: '2026-09-30T08:15:00', body: 'Understood. I will pay it manually today.' }
    ] },
    { id: 'TKT-58190', subject: 'DKIM record missing for brightlane-studio.com', department: 'Technical Support', priority: 'Medium', status: 'Pending', created: '2026-09-26T14:11:00', updated: '2026-09-28T09:30:00', service: 'brightlane-studio.com', messages: [
      { author: 'Priya Raman', role: 'client', date: '2026-09-26T14:11:00', body: 'Messages from hello@brightlane-studio.com are landing in spam at some recipients. The email authentication page shows DKIM as missing.' },
      { author: 'M. Kowalczyk', role: 'staff', date: '2026-09-28T09:30:00', body: 'DKIM signing is enabled on the server, but the public key has not been published in DNS. Use "Publish DKIM record" on the Email Authentication page, or add the TXT record at default._domainkey manually. We will keep this ticket pending until you confirm.' }
    ] },
    { id: 'TKT-58144', subject: 'CPU usage consistently above 80% on Enterprise plan', department: 'Technical Support', priority: 'High', status: 'Open', created: '2026-09-24T09:20:00', updated: '2026-09-29T17:05:00', service: 'HST-11032', messages: [
      { author: 'Tomasz Nowak', role: 'client', date: '2026-09-24T09:20:00', body: 'Since last week the kestrel-labs.io account sits at 80% CPU during business hours. We have not changed the application. Is there anything on the server side?' },
      { author: 'A. Lindqvist', role: 'staff', date: '2026-09-25T10:12:00', body: 'The processes list shows the queue worker cron (every 5 minutes) overlapping with itself. Consider adding a lock or switching to a supervised worker. Server-side metrics look normal.' },
      { author: 'Tomasz Nowak', role: 'client', date: '2026-09-29T17:05:00', body: 'We added a lock file. Can you check whether overlapping runs have stopped?' }
    ] },
    { id: 'TKT-58102', subject: 'Transfer of fieldnotes-journal.net', department: 'Domains', priority: 'Low', status: 'Pending', created: '2026-09-26T08:45:00', updated: '2026-09-27T12:00:00', service: 'fieldnotes-journal.net', messages: [
      { author: 'Jordan Ellis', role: 'client', date: '2026-09-26T08:45:00', body: 'I have started an inbound transfer for fieldnotes-journal.net. How long does it usually take?' },
      { author: 'K. Mensah', role: 'staff', date: '2026-09-27T12:00:00', body: 'Transfers complete within 5 days unless the previous registrar approves earlier. Please approve the confirmation email sent to the registrant contact.' }
    ] },
    { id: 'TKT-57988', subject: 'Request: increase PHP memory_limit to 512M', department: 'Technical Support', priority: 'Low', status: 'Resolved', created: '2026-09-15T13:30:00', updated: '2026-09-16T08:20:00', service: 'HST-10421', messages: [
      { author: 'Tomasz Nowak', role: 'client', date: '2026-09-15T13:30:00', body: 'WooCommerce exports fail with memory exhaustion. Can the limit be raised?' },
      { author: 'A. Lindqvist', role: 'staff', date: '2026-09-16T08:20:00', body: 'You can change memory_limit yourself under Hosting > PHP Settings, up to 1024M on the Business plan. Marking as resolved.' }
    ] },
    { id: 'TKT-57812', subject: 'Invoice address update for VAT', department: 'Billing', priority: 'Low', status: 'Closed', created: '2026-09-02T09:00:00', updated: '2026-09-04T10:10:00', service: 'Account', messages: [
      { author: 'Amara Chukwu', role: 'client', date: '2026-09-02T09:00:00', body: 'Please show our VAT number on future invoices.' },
      { author: 'R. Adeyemi', role: 'staff', date: '2026-09-04T10:10:00', body: 'The VAT number now appears on invoices issued after 04 Sep 2026. Closing this ticket.' }
    ] },
    { id: 'TKT-57640', subject: 'Restore of public_html from 18 Aug backup', department: 'Technical Support', priority: 'Urgent', status: 'Closed', created: '2026-08-19T07:12:00', updated: '2026-08-19T09:02:00', service: 'HST-10421', messages: [
      { author: 'Jordan Ellis', role: 'client', date: '2026-08-19T07:12:00', body: 'A plugin update broke the site. Please restore public_html from last night.' },
      { author: 'A. Lindqvist', role: 'staff', date: '2026-08-19T09:02:00', body: 'Restore completed from the 18 Aug 02:00 snapshot. Databases were not touched.' }
    ] },
    { id: 'TKT-57511', subject: 'Question about wildcard SSL on Professional plan', department: 'Sales', priority: 'Low', status: 'Resolved', created: '2026-08-05T15:20:00', updated: '2026-08-06T09:15:00', service: 'HST-10588', messages: [
      { author: 'Priya Raman', role: 'client', date: '2026-08-05T15:20:00', body: 'Does the Professional plan include wildcard certificates?' },
      { author: 'S. Okoro', role: 'staff', date: '2026-08-06T09:15:00', body: 'Yes. Wildcard DV certificates are included. Issue one from Hosting > SSL Certificates.' }
    ] }
  ],

  kbArticles: [
    { id: 'connect-domain', title: 'Connecting a domain to your hosting account', category: 'Domains', updated: '2026-08-14', views: 4120,
      body: '<p>A domain registered with us can be attached to any hosting account in the same client profile. Domains registered elsewhere can be connected by changing their DNS.</p><h3>Domains registered here</h3><ol><li>Open <strong>Domains &gt; My Domains</strong> and choose <em>Manage</em>.</li><li>Confirm the nameservers are set to the defaults (<code>ns1.examplehost.com</code>, <code>ns2.examplehost.com</code>).</li><li>Add the domain as an addon domain in the hosting control panel.</li></ol><h3>Domains registered elsewhere</h3><p>Either point the nameservers to the defaults above, or keep your current DNS provider and create an <code>A</code> record for <code>@</code> pointing to the server IP shown on the hosting account page.</p><p>DNS changes can take up to 24 hours to propagate, although most resolvers update within an hour.</p>' },
    { id: 'update-nameservers', title: 'Updating nameservers', category: 'Domains', updated: '2026-07-02', views: 3388,
      body: '<p>Nameservers decide which DNS provider answers queries for your domain.</p><ol><li>Go to <strong>Domains &gt; Nameservers</strong>.</li><li>Select the domain.</li><li>Choose <em>Use default nameservers</em> or <em>Use custom nameservers</em>.</li><li>Enter between two and five nameservers and save.</li></ol><p>Changing nameservers moves DNS management away from this portal. Records in <strong>DNS Management</strong> only take effect while default nameservers are in use.</p><h3>Child nameservers</h3><p>If you run your own nameservers under the same domain (for example <code>ns1.yourdomain.com</code>), register them as child nameservers with their IP addresses first.</p>' },
    { id: 'manage-dns', title: 'Managing DNS records', category: 'Domains', updated: '2026-09-10', views: 5210,
      body: '<p>The DNS editor supports <code>A</code>, <code>AAAA</code>, <code>CNAME</code>, <code>MX</code>, <code>TXT</code>, <code>NS</code>, <code>SRV</code> and <code>CAA</code> records.</p><h3>Common records</h3><ul><li><strong>A / AAAA</strong> - point a hostname to an IPv4 or IPv6 address.</li><li><strong>CNAME</strong> - alias one hostname to another. A CNAME cannot coexist with other records on the same name.</li><li><strong>MX</strong> - route incoming mail. Lower priority values are tried first.</li><li><strong>TXT</strong> - verification strings, SPF, DKIM and DMARC policies.</li></ul><h3>TTL</h3><p>TTL is the number of seconds resolvers cache a record. Lower the TTL to 300 a day before a planned change, then raise it again afterwards.</p><pre>@    3600  IN  A     203.0.113.24\nwww  3600  IN  CNAME exampleclient.com.</pre>' },
    { id: 'create-email', title: 'Creating an email account', category: 'Email', updated: '2026-06-21', views: 2975,
      body: '<ol><li>Open <strong>Email &gt; Mailboxes</strong> and select <em>Create mailbox</em>.</li><li>Choose the domain and enter the local part (the text before @).</li><li>Set a password of at least 12 characters and a storage quota.</li></ol><p>Connection settings:</p><pre>IMAP  mail.yourdomain.com  993 (SSL/TLS)\nPOP3  mail.yourdomain.com  995 (SSL/TLS)\nSMTP  mail.yourdomain.com  465 (SSL/TLS) or 587 (STARTTLS)</pre><p>After creating the first mailbox for a domain, check <strong>Email Authentication</strong> to make sure SPF, DKIM and DMARC are published.</p>' },
    { id: 'ssl-certificates', title: 'SSL certificates: issuing, renewing and forcing HTTPS', category: 'Hosting', updated: '2026-08-30', views: 3802,
      body: '<p>Every hosting plan includes free domain-validated certificates that renew automatically 30 days before expiry.</p><h3>Issuing a certificate</h3><ol><li>Go to <strong>Hosting &gt; SSL Certificates</strong>.</li><li>Select <em>Issue certificate</em>, choose the domain and certificate type.</li><li>Validation completes automatically when the domain resolves to the hosting server.</li></ol><h3>Why renewals fail</h3><ul><li>The domain no longer points to the server.</li><li>A <code>CAA</code> record does not authorise the issuing authority.</li><li>The hosting account is suspended.</li></ul>' },
    { id: 'backups', title: 'How backups work and how to restore', category: 'Hosting', updated: '2026-09-05', views: 2450,
      body: '<p>Backups run on the schedule shown on <strong>Hosting &gt; Backups</strong>. Retention depends on the plan.</p><h3>Restoring</h3><ol><li>Choose the backup point.</li><li>Select <em>Restore</em> and confirm. Files are restored in place; databases are restored only for full or database backups.</li></ol><p>A restore overwrites current data. Create a manual backup first if you may need the current state.</p>' },
    { id: 'hosting-resources', title: 'Understanding hosting resource limits', category: 'Hosting', updated: '2026-07-19', views: 1904,
      body: '<p>Each plan enforces limits on CPU, memory, entry processes, inodes, disk and bandwidth.</p><ul><li><strong>CPU</strong> is measured as a percentage of the cores allocated to the plan.</li><li><strong>Memory</strong> is the physical memory used by all your processes combined.</li><li><strong>Entry processes</strong> are concurrent PHP or CGI processes serving requests.</li><li><strong>Inodes</strong> are the number of files and directories stored.</li></ul><p>Reaching a limit throttles the account rather than suspending it. Consistently high usage is a sign to optimise or upgrade.</p>' },
    { id: 'billing-cycle', title: 'Billing cycles, invoices and failed payments', category: 'Billing', updated: '2026-09-01', views: 2210,
      body: '<p>Invoices are generated 14 days before a service renews. If a saved payment method is set to automatic charging, the charge is attempted on the due date.</p><h3>Failed payments</h3><p>If a charge fails, the invoice becomes <em>Overdue</em> after the due date. Hosting services are suspended 14 days after the due date and reactivated automatically once the invoice is paid.</p><h3>Account credit</h3><p>Service credits are applied to the next invoice automatically.</p>' },
    { id: 'transfer-domain', title: 'Transferring a domain to us', category: 'Domains', updated: '2026-05-11', views: 1540,
      body: '<ol><li>Unlock the domain at the current registrar and request the authorisation (EPP) code.</li><li>Open <strong>Domains &gt; Transfers</strong> and start an inbound transfer.</li><li>Approve the confirmation email sent to the registrant contact.</li></ol><p>Most transfers complete within five days and add one year to the registration.</p>' },
    { id: 'two-factor', title: 'Enabling two-factor authentication', category: 'Security', updated: '2026-08-02', views: 1320,
      body: '<p>Two-factor authentication adds a one-time code to the sign-in process.</p><ol><li>Open <strong>Security &gt; Two-Factor Authentication</strong>.</li><li>Scan the QR code with an authenticator app.</li><li>Enter the six-digit code to confirm, then store your recovery codes somewhere safe.</li></ol>' }
  ],

  teamMembers: [
    { id: 'u1', name: 'Jordan Ellis', email: 'devswork98@gmail.com', role: 'Owner', status: 'Active', lastActive: '2026-09-30T09:58:00', twoFactor: false },
    { id: 'u2', name: 'Priya Raman', email: 'priya@exampleclient.com', role: 'Administrator', status: 'Active', lastActive: '2026-09-29T16:50:00', twoFactor: true },
    { id: 'u3', name: 'Tomasz Nowak', email: 'tomasz@exampleclient.com', role: 'Developer', status: 'Active', lastActive: '2026-09-29T17:05:00', twoFactor: true },
    { id: 'u4', name: 'Amara Chukwu', email: 'amara@exampleclient.com', role: 'Billing', status: 'Active', lastActive: '2026-09-26T12:31:00', twoFactor: false },
    { id: 'u5', name: 'Lucas Ferreira', email: 'lucas@exampleclient.com', role: 'Support', status: 'Active', lastActive: '2026-09-22T10:10:00', twoFactor: true },
    { id: 'u6', name: 'Mei Tanaka', email: 'mei@exampleclient.com', role: 'Viewer', status: 'Invited', lastActive: null, twoFactor: false }
  ],

  apiKeys: [
    { id: 'k1', name: 'CI deployment', prefix: 'demo_4f1a', created: '2025-04-11', lastUsed: '2026-09-30T07:41:00', scopes: ['dns:write', 'hosting:read'], status: 'Active' },
    { id: 'k2', name: 'Monitoring dashboard', prefix: 'demo_9c2e', created: '2024-11-02', lastUsed: '2026-09-30T09:55:00', scopes: ['hosting:read', 'domains:read'], status: 'Active' },
    { id: 'k3', name: 'Old accounting export', prefix: 'demo_12bd', created: '2023-06-19', lastUsed: '2025-01-08T14:12:00', scopes: ['billing:read'], status: 'Revoked' }
  ],

  apiSettings: { ipRestriction: '198.51.100.0/24', rateLimit: '600 requests / minute' },

  security: {
    twoFactor: false,
    twoFactorMethod: null,
    loginAlerts: true,
    passwordChanged: '2026-06-02',
    sessionTimeout: 60,
    recoveryEmail: 'admin@exampleclient.com',
    ipAllowlist: ['198.51.100.0/24'],
    ipAllowlistEnabled: false
  },

  sessions: [
    { id: 'se1', device: 'Chrome on macOS', ip: '198.51.100.42', location: 'London, UK', started: '2026-09-30T08:31:00', lastSeen: '2026-09-30T09:58:00', current: true },
    { id: 'se2', device: 'Safari on iOS', ip: '198.51.100.77', location: 'London, UK', started: '2026-09-29T19:12:00', lastSeen: '2026-09-30T07:02:00', current: false },
    { id: 'se3', device: 'Firefox on Windows', ip: '203.0.113.150', location: 'Manchester, UK', started: '2026-09-27T10:05:00', lastSeen: '2026-09-28T16:40:00', current: false },
    { id: 'se4', device: 'API client (CI deployment)', ip: '192.0.2.201', location: 'Amsterdam, NL', started: '2026-09-30T07:41:00', lastSeen: '2026-09-30T07:41:00', current: false }
  ],

  loginHistory: [
    { id: 'l1', date: '2026-09-30T08:31:00', ip: '198.51.100.42', location: 'London, UK', device: 'Chrome on macOS', result: 'Success' },
    { id: 'l2', date: '2026-09-29T19:12:00', ip: '198.51.100.77', location: 'London, UK', device: 'Safari on iOS', result: 'Success' },
    { id: 'l3', date: '2026-09-29T03:44:00', ip: '192.0.2.98', location: 'Unknown', device: 'curl/8.4', result: 'Failed - wrong password' },
    { id: 'l4', date: '2026-09-29T03:43:00', ip: '192.0.2.98', location: 'Unknown', device: 'curl/8.4', result: 'Failed - wrong password' },
    { id: 'l5', date: '2026-09-27T10:05:00', ip: '203.0.113.150', location: 'Manchester, UK', device: 'Firefox on Windows', result: 'Success' },
    { id: 'l6', date: '2026-09-25T08:58:00', ip: '198.51.100.42', location: 'London, UK', device: 'Chrome on macOS', result: 'Success' },
    { id: 'l7', date: '2026-09-22T09:10:00', ip: '198.51.100.42', location: 'London, UK', device: 'Chrome on macOS', result: 'Success' },
    { id: 'l8', date: '2026-09-18T22:17:00', ip: '203.0.113.201', location: 'Lagos, NG', device: 'Chrome on Android', result: 'Blocked - new location' },
    { id: 'l9', date: '2026-09-15T08:40:00', ip: '198.51.100.42', location: 'London, UK', device: 'Chrome on macOS', result: 'Success' },
    { id: 'l10', date: '2026-09-11T14:02:00', ip: '198.51.100.77', location: 'London, UK', device: 'Safari on iOS', result: 'Success' }
  ],

  securityLogs: [
    { id: 'sl1', date: '2026-09-30T08:31:00', event: 'Sign-in', detail: 'Successful sign-in from Chrome on macOS', ip: '198.51.100.42', severity: 'Info', user: 'Jordan Ellis' },
    { id: 'sl2', date: '2026-09-30T07:41:00', event: 'API key used', detail: 'Key "CI deployment" updated DNS for exampleclient.com', ip: '192.0.2.201', severity: 'Info', user: 'API' },
    { id: 'sl3', date: '2026-09-29T03:44:00', event: 'Failed sign-in', detail: 'Two consecutive failed attempts; source rate-limited', ip: '192.0.2.98', severity: 'Warning', user: 'Unknown' },
    { id: 'sl4', date: '2026-09-28T16:41:00', event: 'Session ended', detail: 'Session on Firefox on Windows expired after inactivity', ip: '203.0.113.150', severity: 'Info', user: 'Jordan Ellis' },
    { id: 'sl5', date: '2026-09-26T12:31:00', event: 'Permission change', detail: 'Amara Chukwu granted Billing role', ip: '198.51.100.42', severity: 'Notice', user: 'Jordan Ellis' },
    { id: 'sl6', date: '2026-09-24T11:05:00', event: 'Team invitation', detail: 'Invitation sent to mei@exampleclient.com (Viewer)', ip: '198.51.100.42', severity: 'Notice', user: 'Priya Raman' },
    { id: 'sl7', date: '2026-09-18T22:17:00', event: 'Sign-in blocked', detail: 'Sign-in from new location Lagos, NG blocked pending confirmation', ip: '203.0.113.201', severity: 'Critical', user: 'Jordan Ellis' },
    { id: 'sl8', date: '2026-09-18T22:25:00', event: 'Location confirmed', detail: 'Owner declined the sign-in from Lagos, NG', ip: '198.51.100.77', severity: 'Notice', user: 'Jordan Ellis' },
    { id: 'sl9', date: '2026-09-10T09:30:00', event: 'Domain lock', detail: 'Transfer lock disabled for orchardmarket.com.ng', ip: '198.51.100.42', severity: 'Warning', user: 'Priya Raman' },
    { id: 'sl10', date: '2026-08-02T15:00:00', event: 'API key revoked', detail: 'Key "Old accounting export" revoked', ip: '198.51.100.42', severity: 'Notice', user: 'Jordan Ellis' },
    { id: 'sl11', date: '2026-06-02T10:18:00', event: 'Password changed', detail: 'Account password updated', ip: '198.51.100.42', severity: 'Notice', user: 'Jordan Ellis' },
    { id: 'sl12', date: '2026-05-14T08:00:00', event: 'Recovery email changed', detail: 'Recovery email set to admin@exampleclient.com', ip: '198.51.100.42', severity: 'Notice', user: 'Jordan Ellis' }
  ],

  activity: [
    { id: 'a1', date: '2026-09-30T08:02:00', category: 'Billing', action: 'Invoice generated', target: 'INV-2026-0452 ($138.00)', user: 'System', ip: '-' },
    { id: 'a2', date: '2026-09-30T07:41:00', category: 'DNS', action: 'DNS record updated', target: 'TXT _dmarc.exampleclient.com', user: 'API: CI deployment', ip: '192.0.2.201' },
    { id: 'a3', date: '2026-09-30T02:19:00', category: 'Hosting', action: 'Backup completed', target: 'HST-10421 full backup (8.42 GB)', user: 'System', ip: '-' },
    { id: 'a4', date: '2026-09-30T08:31:00', category: 'Security', action: 'Login detected', target: 'Chrome on macOS, London, UK', user: 'Jordan Ellis', ip: '198.51.100.42' },
    { id: 'a5', date: '2026-09-29T16:40:00', category: 'DNS', action: 'DNS record added', target: 'CNAME staging.exampleclient.com', user: 'Priya Raman', ip: '198.51.100.63' },
    { id: 'a6', date: '2026-09-25T00:04:00', category: 'SSL', action: 'SSL certificate issued', target: 'staging.kestrel-labs.io', user: 'System', ip: '-' },
    { id: 'a7', date: '2026-09-21T10:14:00', category: 'Billing', action: 'Payment received', target: 'INV-2026-0440 ($89.00)', user: 'Jordan Ellis', ip: '198.51.100.42' },
    { id: 'a8', date: '2026-09-16T00:00:00', category: 'Hosting', action: 'Hosting account suspended', target: 'HST-11217 (overdue INV-2026-0418)', user: 'System', ip: '-' },
    { id: 'a9', date: '2026-09-12T00:00:00', category: 'Domains', action: 'Domain expired', target: 'summit-archive.org', user: 'System', ip: '-' },
    { id: 'a10', date: '2026-09-02T02:10:00', category: 'Billing', action: 'Payment failed', target: 'INV-2026-0418 (Mastercard ending 5100)', user: 'System', ip: '-' },
    { id: 'a11', date: '2026-08-20T00:10:00', category: 'SSL', action: 'SSL certificate renewed', target: 'exampleclient.com', user: 'System', ip: '-' },
    { id: 'a12', date: '2026-06-09T12:30:00', category: 'Domains', action: 'Domain renewed', target: 'brightlane-studio.com until 11 Jun 2027', user: 'Amara Chukwu', ip: '198.51.100.88' }
  ],

  notifications: [
    { id: 'n1', title: 'kestrel-labs.io expires in 22 days', text: 'Auto-renewal is off. Renew before 22 Oct 2026.', date: '2026-09-30T06:00:00', read: false, link: 'domains/index.html' },
    { id: 'n2', title: 'Invoice INV-2026-0452 generated', text: '$138.00 due 15 Oct 2026.', date: '2026-09-30T08:02:00', read: false, link: 'billing/invoices.html?id=INV-2026-0452' },
    { id: 'n3', title: 'HST-11217 is suspended', text: 'Pay overdue invoice INV-2026-0418 to reactivate.', date: '2026-09-16T00:00:00', read: false, link: 'billing/invoices.html?id=INV-2026-0418' },
    { id: 'n4', title: 'New reply on TKT-58231', text: 'Billing replied to your ticket.', date: '2026-09-29T11:40:00', read: true, link: 'support/ticket.html?id=TKT-58231' },
    { id: 'n5', title: 'Backup completed', text: 'HST-10421 full backup, 8.42 GB.', date: '2026-09-30T02:19:00', read: true, link: 'hosting/backups.html' },
    { id: 'n6', title: 'SSL certificate expired', text: 'orchardmarket.com.ng could not be renewed.', date: '2026-09-08T00:05:00', read: true, link: 'hosting/ssl.html' }
  ],

  notificationPrefs: [
    { id: 'billing', label: 'Invoices and payments', description: 'New invoices, receipts, failed payments and refunds.', email: true, sms: false, portal: true },
    { id: 'renewals', label: 'Renewal reminders', description: 'Domain, hosting and SSL renewals 30, 14 and 3 days before expiry.', email: true, sms: true, portal: true },
    { id: 'security', label: 'Security alerts', description: 'New sign-ins, password changes, 2FA and API key events.', email: true, sms: true, portal: true },
    { id: 'support', label: 'Support ticket updates', description: 'Replies and status changes on your tickets.', email: true, sms: false, portal: true },
    { id: 'backups', label: 'Backup reports', description: 'Completed and failed backup jobs.', email: false, sms: false, portal: true },
    { id: 'resources', label: 'Resource usage warnings', description: 'CPU, memory, disk and bandwidth above 80% of plan limits.', email: true, sms: false, portal: true },
    { id: 'maintenance', label: 'Scheduled maintenance', description: 'Planned work affecting servers you use.', email: true, sms: false, portal: true },
    { id: 'product', label: 'Product announcements', description: 'New features and plan changes.', email: false, sms: false, portal: false }
  ],

  serviceStatus: [
    { name: 'Web hosting - London (web-lon-*)', status: 'Operational' },
    { name: 'Web hosting - Frankfurt (web-fra-*)', status: 'Operational' },
    { name: 'Web hosting - Amsterdam (web-ams-*)', status: 'Degraded', note: 'Elevated I/O latency under investigation' },
    { name: 'DNS (ns1/ns2.examplehost.com)', status: 'Operational' },
    { name: 'Email delivery', status: 'Operational' },
    { name: 'Client portal & API', status: 'Operational' }
  ],

  departments: [
    { name: 'Technical Support', email: 'support@portal.invalid', hours: '24/7', response: 'Within 2 hours' },
    { name: 'Billing', email: 'billing@portal.invalid', hours: 'Mon-Fri 08:00-18:00 GMT', response: 'Within 1 business day' },
    { name: 'Domains', email: 'domains@portal.invalid', hours: 'Mon-Fri 08:00-20:00 GMT', response: 'Within 4 hours' },
    { name: 'Sales', email: 'sales@portal.invalid', hours: 'Mon-Fri 09:00-17:00 GMT', response: 'Within 1 business day' },
    { name: 'Abuse', email: 'abuse@portal.invalid', hours: '24/7', response: 'Within 24 hours' }
  ]
};
