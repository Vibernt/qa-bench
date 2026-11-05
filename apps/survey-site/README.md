# Survey site

Ours (MIT). A public site with global navigation, 12 blog articles, contact and search forms, two landmark variants,
volatile banner names and robots-denied private paths. Every non-GET request returns 405. `app/truth.json` labels each
page's template (the answer key: never read by the site). Run with `node app/server.mjs` (Node 26+); it prints its
loopback origin. `sitePages('cosmetic')` is the deliberate-change control (editorial text only);
`sitePages('structural')` adds a Phone field and a "Request callback" action to the contact page.

Copied from the Touchstone fixture on 5 Nov 2026.
