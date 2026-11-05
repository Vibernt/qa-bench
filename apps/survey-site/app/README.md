# Survey site fixture

Minimal port of SP30's site: global navigation, article collection with 12 known URLs and two landmark variants, volatile banner names, contact/search forms, and robots-denied private paths. `truth.json` labels only template identity and is never read by the site or survey traversal. The package test passes it only to the final identity evaluator.

`sitePages('cosmetic')` changes editorial text; `sitePages('structural')` adds the Phone field and Request callback action to contact. The local HTTP integration uses the baseline and asserts zero false merges. No native browser is used in that integration. Run the site manually with `node fixtures/survey-site/server.mjs`; it prints its loopback origin and binds a random port. All non-GET methods return 405.
