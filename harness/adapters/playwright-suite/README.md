# playwright-suite adapter

A fixed, scripted Playwright suite per app: the floor a scripted QA team would reach (BRIEF.md §6.4). No
model calls. Given the same build, it gives the same findings. It is cheap, so it also tests the runner and
the scorer.

- **In:** `/bench/brief/brief.json` (schema `brief`).
- **Out:** `/bench/out/findings.json` (schema `findings`), with screenshots in `/bench/out/evidence/`.
- **Image:** `mcr.microsoft.com/playwright:v1.63.0-noble` (Chromium for Playwright 1.63.0, Node 24), plus
  `playwright@1.63.0` (Apache-2.0) from `package-lock.json`. Node runs the TypeScript in `src/` directly, so
  there is no build step. The image is self-contained and imports nothing from `../../lib` at run time.
  `src/types.ts` holds copies of the contract types the adapter needs.
- **Exit code:** 0 whenever `findings.json` was written, even if checks crashed (a crash is recorded in
  `notes`); 2 when the brief cannot be read.
- **Budget:** each check stops when less than 3 s of the budget is left. The run keeps a reserve at the end
  (10% of `wall_time_s`, between 2 s and 20 s). A hard timer writes the findings so far just before the budget
  runs out, even if a check hangs.
- **Cost:** `{ compute_usd: 0, model_usd: 0 }`. Local compute is not metered.

## Findings

| Field | Value |
|---|---|
| `where.route` | URL pathname only, with no host, query or hash, and no trailing slash |
| `where.role` | The brief role used. Signed-out checks have no role |
| `where.selector` | A `data-test` or `data-testid` attribute selector when the problem is in one element. Otherwise a stable attribute selector (`table[aria-label="Expenses"]`, `[role="status"]`) |
| `where.selector` (none) | Problems with a URL rather than an element, such as a direct request to an endpoint, have no selector, so they match at route level |
| `where.region` | Added for visual findings (page coordinates, viewport `1280x720`) |

De-duplication: there is one finding per check, route and selector. Role is not part of this key, so a
wrong total seen by both roles is reported once, under the first role. Several symptoms of one problem are
merged into one finding:
- the layout problems of one element;
- a picture that is the wrong size and also differs from its product page;
- a checkout refusal caused by fields that were lost.

## Suites (chosen by `brief.app`)

### expense-app
Checks run in this order (the order matters for telling a stale list from lost data).

| Check | Category | What it asserts |
|---|---|---|
| `expense.signed-out-redirect` | permission | Signed out, `/expenses` redirects to `/login` |
| `expense.wrong-password` / `-message` | permission / error-handling | A wrong password is refused with a `[role=alert]` message |
| `expense.sign-in` | functional | Each brief account reaches `/expenses` |
| `expense.total-equals-sum` | consistency | `[data-testid=total]` = Σ Amount column. Checked on every list view, reported once |
| `expense.list-empty` | functional | The seeded list is not empty |
| `expense.viewer-no-edit-controls` | permission | The viewer sees no Add link, Edit links or Delete buttons |
| `expense.viewer-endpoints-refused` | permission | As the viewer, `GET /expenses/:id/edit` and `POST /expenses/:id` (with the row's current values, so a wrong accept changes nothing) get 401, 403 or 404, or a redirect to `/login`. One finding, at the first route that leaked |
| `expense.add-control-label` | copy | The add link reads as the add journey quotes it (`"Add expense"`). A deliberately brittle copy assertion |
| `expense.add-message` | functional / copy | After saving, `[role=status]` reads `Expense saved` |
| `expense.add-one-row` | functional | Saving once adds exactly one row |
| `expense.add-shows-now` | consistency | The new row shows straight away. If it is missing even after a reload but a not-yet-viewed filtered list shows it, the list is stale |
| `expense.add-persists` | functional | The new row survives a reload, and exists in some view at all |
| `expense.edit-prefill` | consistency | The edit form shows the row as listed |
| `expense.edit-message` | functional / copy | After saving, `[role=status]` reads `Expense updated` |
| `expense.edit-shows-now` | consistency | The list shows the new amount straight away. If it does not but the edit form holds it, the list is stale |
| `expense.edit-message-matches` | functional | The app said "updated" but the record still has the old amount |
| `expense.edit-persists` | functional | The edit survives a reload |
| `expense.filter-only-chosen` | functional | Each category option lists only that category, and not nothing when rows exist |
| `expense.sign-out` | permission | After signing out, `/expenses` goes to `/login` |

### swag-labs
Actions use `data-test` selectors.

| Check | Category | What it asserts |
|---|---|---|
| `swag.sign-in` | functional | The brief account reaches the catalogue (else reports the `[data-test=error]` text) |
| `swag.sign-in-time` | perf | Login click to first product visible takes ≤ 2.5 s |
| `swag.inventory-count` | functional | 6 products (the journey says six) |
| `swag.product-name` / `-description` | copy | Non-empty, with no `undefined`, `NaN`, `null`, template placeholder or raw key |
| `swag.product-price-format` | copy | Prices look like `$9.99` |
| `swag.product-images-distinct` | visual | No two products share a picture |
| `swag.layout-grid` / `-overflow` | visual | Image, name text, price and button sit at the same place in every card (majority vote, 3 px), and inside the card |
| `swag.layout-container` / `-overlap` / `-rotated` / `-offscreen` | visual | Cart icon and menu are inside the primary header, and title and sort inside the secondary header. Visible interactive elements don't overlap. Nothing in the header is rotated. Reported once for the whole run, not per page |
| `swag.sort` | functional | All 4 options sort (names by `localeCompare`, prices numerically) and the control shows the choice. Alerts the page raises go into the evidence |
| `swag.detail-matches` | functional | Clicking a product opens that product |
| `swag.detail-price` | consistency | The list price equals the detail price |
| `swag.detail-description` | consistency | The list description equals the detail description |
| `swag.detail-image` | visual | The list picture equals the detail picture |
| `swag.detail-cart` | functional | On the first product page, Add and Remove work (button and badge) |
| `swag.cart-add` / `swag.cart-remove` | functional | Add and Remove for every product from the list: the button changes and the badge counts. One finding each, naming every failing product |
| `swag.cart-badge` | consistency | Badge = number added |
| `swag.cart-contents` | functional | The cart holds exactly the products added |
| `swag.cart-price` | consistency | Cart price = product-page price |
| `swag.cart-remove-in-cart` / `swag.continue-shopping` | functional | Remove in the cart works, and Continue Shopping returns to the list |
| `swag.layout-container` (cart) | visual | Checkout sits in the footer row with Continue Shopping |
| `swag.checkout-fields-kept` | functional | First name, last name and zip keep what was typed key by key. The selector is the field that ended up empty |
| `swag.checkout-continue` | functional | Continue proceeds. Not reported separately when fields were lost. The overview is then opened by URL so checking can go on |
| `swag.overview-items` | consistency | The overview lists the cart |
| `swag.overview-item-total` / `-tax` / `-total` | consistency | Item total = Σ prices; tax = 8% rounded (±1 cent); total = item total + tax. Only the first broken figure is reported |
| `swag.finish` | functional | Finish reaches `/checkout-complete.html` |
| `swag.finish-empties-cart` | functional | No badge after the order |
| `swag.back-home` | functional | Back Home returns to the list |
| `swag.sign-out` / `swag.signed-out-access` | functional / permission | Logout returns to `/`, and `/inventory.html` is then refused |
| `swag.page-copy` | copy | Page titles (`Products`, `Your Cart`, `Checkout: Your Information`, `Checkout: Overview`, `Checkout: Complete!`) and the header `Thank you for your order!` |

`swag.page-copy` is deliberately as brittle as a real suite. A deliberate copy change trips it, and that is
what the change-twin track measures. The catalogue count of 6 is also asserted. Prices are never hard-coded;
they are only compared across pages.

### the-internet and generic
These run on the noise track and for unknown apps. The suite visits each `brief.pages` entry, resolved
against the first target. Without pages, it visits the targets. It never leaves the targets' origins.

| Check | Category | What it reports |
|---|---|---|
| `page.document-status` | functional | The page itself returns HTTP ≥ 400 |
| `page.resource-status` / `page.request-failed` | functional | Same-origin resources return HTTP ≥ 400 or fail. `favicon.ico` is ignored, and images are left to `page.broken-image` |
| `page.console` / `page.pageerror` | error-handling | Same-origin console errors and uncaught exceptions |
| `page.broken-image` | visual | A loaded `<img>` with no pixels (lazy images are skipped). One finding per page, listing every broken image |
| `copy.undefined` / `nan` / `object` / `template` / `lorem` | copy | Visible text containing `undefined`, `NaN`, `[object Object]`, `{{…}}` or `${…}`, or lorem ipsum |

The noise suites run no accessibility checks. On a noise site they would only measure the site, not how
often our detectors fire wrongly.

### Rules (live sites), enforced in code
- **One gate:** every page load goes through the `LoadGate` in `src/rules.ts`.
  - `max_pages` caps loads.
  - `min_interval_ms` spaces them, across tabs. The `robots.txt` fetch counts as a load.
  - `robots_txt: honour` fetches `/robots.txt` once per origin and applies RFC 9309: most specific group,
    longest match, Allow on ties, `*` and `$`.
  - A 4xx `robots.txt` allows everything. A 5xx or network failure allows nothing.
- **Methods:** `methods` and `forms: false` install a browser-level route that aborts any request with a
  disallowed method, including requests from page scripts.
- **Forms:** the generic suite never fills or submits a form.

## Checks on every page (app suites)
- **Monitor:** each page records console errors, uncaught exceptions, same-origin HTTP ≥ 400 and failed
  requests as they happen. There is one finding per kind and route, and later events are added to its
  evidence. Expected refusals are excluded: the monitor pauses for the deliberate 401 and 403 probes.
- **Scans:** after key steps the suite checks for broken images, text faults, `<img>` with no `alt`
  (`a11y.img-alt`) and buttons with no accessible name (`a11y.button-name`).

Third-party requests are ignored, for example Swag Labs' Backtrace reporting, which cannot reach the internet
on the episode network.

## Known blind spots
- **Selectors:** they come from the app's public source and the brief's journeys, not from labels. A label
  that names a different element than the one the suite blames matches only at route level, or not at all.
- **Granularity:** one finding per check and route. A second, unrelated bug caught by the same check on the
  same route is folded into the first finding.
- **Expense filter:** a defect that hides a category's rows only when other filters are set is not tried.
  Delete is never exercised.
- **Stale list:** a stale list whose cache never expires looks like lost data unless a not-yet-viewed filtered
  view is fresh.
- **Layout:** geometry is checked only on the Swag Labs catalogue, header and cart footer. Colours, fonts,
  z-index and clipping are not checked, and no visual diff is made.
- **Perf:** only time to the catalogue after login is measured. Other slow routes go unnoticed, but
  generous per-action timeouts (12–20 s) keep the suite working on a slow build.
- **Accessibility:** only `alt` and button names are checked. There are no contrast, focus, keyboard or
  ARIA-validity checks.
- **Copy:** only regex faults and the fixed titles above are checked. Typos and tone are not.
- **Brittleness:**
  - The page titles, the "Add expense" label, the success messages and the catalogue size of 6 are exact
    copy assertions on purpose, and they will fire on deliberate copy changes.
  - Anything else that renames a `data-test` makes the step crash. That is recorded in `notes`, not as a
    finding.
- **Generic suite:** it doesn't crawl beyond `brief.pages`, and it doesn't sign in.

## Verify
- **Unit tests** (no browser):
  ```
  npx vitest run harness/adapters/playwright-suite
  ```
- **Integration** (docker + native Chromium; never in CI). Run it with plain `node`, not `tsx`, because
  tsx rewrites functions passed to `page.evaluate`:
  ```
  QAB_EXTRA_CA=<ca.pem, only behind a TLS proxy> SWAG_UPSTREAM_BUILD=<static build of sample-app-web> \
    node harness/adapters/playwright-suite/it.ts [--native-only|--docker-only] [--only expense,swag,internet]
  ```
  - It runs:
    - the expense app clean, with each `DEFECT`, and with `VARIANT=relabel` (count reported);
    - the bench Swag Labs image clean, plus upstream `standard_user` and each faulty user when
      `SWAG_UPSTREAM_BUILD` is set;
    - every page of the-internet.
  - It then builds the image and runs it the way the runner does: an app container with alias `app` on
    network `qab-pw-net`, and
    `docker run --rm --network qab-pw-net -v <brief>:/bench/brief:ro -v <out>:/bench/out qa-bench-adapter-playwright-suite:0.1.0`.
  - Results go to `$QAB_PW_IT_DIR/summary.md`.
