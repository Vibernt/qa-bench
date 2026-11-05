# Survey site

A small deterministic public site: global navigation, an article collection with 12 known URLs and two landmark
variants, volatile banner names, contact and search forms, and robots-denied private paths. `truth.json` labels only
each page's template and is never read by the site.

`sitePages('cosmetic')` changes editorial text; `sitePages('structural')` adds a Phone field and a "Request callback"
action to the contact page. Run the site with `node app/server.mjs`; it binds a random loopback port and prints its
origin. Every non-GET request returns 405.
