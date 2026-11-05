// Scripted suite for Swag Labs (React shop). The checks a scripted QA team writes for a shop:
// sign in, the catalogue, product detail, cart add/remove, sorting, checkout and its arithmetic,
// finish, sign out; plus layout sanity on the catalogue and cart. Actions use data-test selectors.
// Page titles and the order-complete header are asserted as visible copy, as a real suite would
// (deliberately as brittle as one: copy changes trip them).
import type { Page } from 'playwright';
import type { MonitoredPage, SuiteContext } from '../context.ts';
import { reportScan, scanPage, viewportText } from '../context.ts';
import { checkOrderTotals, fieldFault, formatCents, isPriceFormat, parseMoney, sortedBy, toCents, type SortKey } from '../invariants.ts';
import { gridProblems, measureCards, pageLayout, type LayoutProblem } from '../layout.ts';
import { normaliseRoute } from '../route.ts';

export const SEL = {
  username: '[data-test="username"]',
  password: '[data-test="password"]',
  loginButton: '[data-test="login-button"]',
  error: '[data-test="error"]',
  title: '[data-test="title"]',
  list: '[data-test="inventory-list"]',
  item: '[data-test="inventory-item"]',
  name: '[data-test="inventory-item-name"]',
  desc: '[data-test="inventory-item-desc"]',
  price: '[data-test="inventory-item-price"]',
  sort: '[data-test="product-sort-container"]',
  activeOption: '[data-test="active-option"]',
  badge: '[data-test="shopping-cart-badge"]',
  cartLink: '[data-test="shopping-cart-link"]',
  primaryHeader: '[data-test="primary-header"]',
  headerContainer: '[data-test="header-container"]',
  secondaryHeader: '[data-test="secondary-header"]',
  cartList: '[data-test="cart-list"]',
  checkout: '[data-test="checkout"]',
  continueShopping: '[data-test="continue-shopping"]',
  firstName: '[data-test="firstName"]',
  lastName: '[data-test="lastName"]',
  postalCode: '[data-test="postalCode"]',
  continue: '[data-test="continue"]',
  subtotal: '[data-test="subtotal-label"]',
  tax: '[data-test="tax-label"]',
  total: '[data-test="total-label"]',
  finish: '[data-test="finish"]',
  completeHeader: '[data-test="complete-header"]',
  backToProducts: '[data-test="back-to-products"]',
  openMenu: '#react-burger-menu-btn',
  logout: '[data-test="logout-sidebar-link"]',
  reset: '[data-test="reset-sidebar-link"]',
} as const;

export const ROUTES = {
  login: '/',
  inventory: '/inventory.html',
  item: '/inventory-item.html',
  cart: '/cart.html',
  stepOne: '/checkout-step-one.html',
  stepTwo: '/checkout-step-two.html',
  complete: '/checkout-complete.html',
} as const;

/** Visible copy the suite asserts (page titles), as a scripted suite written against the current app would. */
export const EXPECTED_COPY = {
  inventoryTitle: 'Products',
  cartTitle: 'Your Cart',
  stepOneTitle: 'Checkout: Your Information',
  stepTwoTitle: 'Checkout: Overview',
  completeTitle: 'Checkout: Complete!',
  completeHeader: 'Thank you for your order!',
} as const;

export const CATALOGUE_SIZE = 6;
export const LOGIN_BUDGET_MS = 2500;
export const TAX_RATE = 0.08;

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'az', label: 'Name (A to Z)' },
  { key: 'za', label: 'Name (Z to A)' },
  { key: 'lohi', label: 'Price (low to high)' },
  { key: 'hilo', label: 'Price (high to low)' },
];

interface Product {
  index: number;
  id: string | undefined;
  name: string;
  desc: string;
  priceText: string;
  price: number | undefined;
  img: string;
  imgSelector: string;
  linkSelector: string | undefined;
  buttonSelector: string | undefined;
}

async function readProducts(page: Page): Promise<Product[]> {
  const raw = await page.$$eval(SEL.item, (cards) => cards.map((card, index) => {
    const text = (sel: string): string => (card.querySelector(sel)?.textContent ?? '').trim();
    const img = card.querySelector('img');
    const link = card.querySelector('a[data-test$="-title-link"]');
    const button = card.querySelector('button');
    const dt = (el: Element | null): string | undefined => el?.getAttribute('data-test') ?? undefined;
    return {
      index,
      id: /item-(\d+)-title-link/.exec(dt(link) ?? '')?.[1],
      name: text('[data-test="inventory-item-name"]'),
      desc: text('[data-test="inventory-item-desc"]'),
      priceText: text('[data-test="inventory-item-price"]'),
      img: img ? (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src : '',
      imgSelector: dt(img) ? `[data-test="${dt(img)}"]` : 'img',
      linkSelector: dt(link) ? `[data-test="${dt(link)}"]` : undefined,
      buttonSelector: dt(button) ? `[data-test="${dt(button)}"]` : undefined,
    };
  }));
  return raw.map((p) => ({ ...p, price: parseMoney(p.priceText) }));
}

async function badgeCount(page: Page): Promise<number> {
  const badge = page.locator(SEL.badge);
  if ((await badge.count()) === 0) return 0;
  const n = Number(((await badge.first().textContent()) ?? '').trim());
  return Number.isFinite(n) ? n : NaN;
}

async function boxOf(page: Page, selector: string): Promise<{ x: number; y: number; w: number; h: number; viewport: string } | undefined> {
  const box = await page.locator(selector).first().boundingBox({ timeout: 1000 }).catch(() => null);
  return box ? { x: box.x, y: box.y, w: box.width, h: box.height, viewport: viewportText(page) } : undefined;
}

export async function swagSuite(ctx: SuiteContext): Promise<void> {
  const role = ctx.brief.roles.find((r) => r.accounts.length);
  const account = role?.accounts[0];
  if (!role || !account) {
    ctx.collector.note('no account in the brief: swag-labs suite skipped');
    return;
  }
  const C = ctx.collector;
  const mp = await ctx.newPage(role.role);
  const page = mp.page;
  page.setDefaultTimeout(12_000);
  const R = role.role;
  const url = (path: string): string => new URL(path, ctx.base).toString();
  const at = (): string => normaliseRoute(page.url());
  const scan = async (step: string): Promise<void> => reportScan(ctx, mp, await scanPage(page, 2000), step);
  const copy = async (step: string, selector: string, expected: string): Promise<void> => {
    let actual = '';
    await waitFor(async () => (actual = ((await page.locator(selector).first().textContent({ timeout: 500 }).catch(() => null)) ?? '').trim()) === expected, 3000);
    if (actual === expected) return;
    await C.add({
      check: 'swag.page-copy', category: 'copy', route: page.url(), role: R, step, selector,
      description: actual ? `${selector} reads "${actual}", expected "${expected}"` : `${selector} is missing (expected "${expected}")`,
      confidence: 0.5, page, ...(await boxOf(page, selector).then((region) => (region ? { region } : {}))),
    });
  };
  /**
   * One report per element: several layout problems of one element (outside its container, overlapping,
   * rotated) are one visual bug. Header chrome repeats on every page, so `once` reports it on the first only.
   */
  const layout = async (step: string, problems: LayoutProblem[], opts: { once?: boolean } = {}): Promise<void> => {
    const bySelector = new Map<string, LayoutProblem[]>();
    for (const p of problems) bySelector.set(p.selector, [...(bySelector.get(p.selector) ?? []), p]);
    for (const [selector, group] of [...bySelector].slice(0, 6)) {
      const first = group[0]!;
      await C.add({
        check: `swag.layout-${first.kind}`, category: 'visual', route: page.url(), role: R, step, selector,
        key: `swag.layout|${opts.once ? '*' : at()}|${selector}`,
        ...(first.box ? { region: { ...first.box, viewport: viewportText(page) } } : {}),
        description: `Layout: ${group.map((p) => p.message).join('; ')}`, confidence: first.kind === 'grid' || first.kind === 'container' ? 0.7 : 0.6, page,
      });
    }
  };
  const login = async (): Promise<boolean> => {
    await ctx.goto(mp, url(ROUTES.login));
    await page.fill(SEL.username, account.username);
    await page.fill(SEL.password, account.password);
    const t0 = Date.now();
    await page.click(SEL.loginButton);
    const outcome = await Promise.race([
      page.locator(SEL.item).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'inventory' as const),
      page.locator(SEL.error).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'error' as const),
    ]).catch(() => 'timeout' as const);
    const ms = Date.now() - t0;
    if (outcome !== 'inventory') {
      const message = outcome === 'error' ? ((await page.locator(SEL.error).first().textContent()) ?? '').trim() : 'no catalogue after 20 s';
      await C.add({
        check: 'swag.sign-in', category: 'functional', route: page.url(), role: R, step: 'login', selector: outcome === 'error' ? SEL.error : SEL.loginButton,
        description: `The account from the brief cannot sign in: ${message}`, confidence: 0.85, page,
        repro: ['Open /', `Sign in as ${account.username} with the brief's password`],
      });
      return false;
    }
    if (ms > LOGIN_BUDGET_MS) {
      await C.add({
        check: 'swag.sign-in-time', category: 'perf', route: ROUTES.inventory, role: R, step: 'login', selector: SEL.list,
        description: `The catalogue took ${(ms / 1000).toFixed(1)} s to appear after signing in (budget ${(LOGIN_BUDGET_MS / 1000).toFixed(1)} s)`,
        evidence: [{ kind: 'timing', excerpt: `login click -> first product visible: ${ms} ms` }], confidence: 0.8,
        repro: ['Open /', 'Sign in', 'Time until the products show'],
      });
    }
    return true;
  };

  // 1. Sign in.
  const signedIn = (await ctx.step('swag.sign-in', login)) === true;
  if (!signedIn) {
    await scan('login');
    await mp.context.close();
    return;
  }

  // 2. Catalogue.
  let products: Product[] = [];
  let imagesShared = false;
  await ctx.step('swag.inventory', async () => {
    await copy('inventory', SEL.title, EXPECTED_COPY.inventoryTitle);
    products = await readProducts(page);
    await scan('inventory');
    if (products.length !== CATALOGUE_SIZE) {
      await C.add({
        check: 'swag.inventory-count', category: 'functional', route: ROUTES.inventory, role: R, step: 'inventory', selector: SEL.list,
        description: `The catalogue lists ${products.length} products, expected ${CATALOGUE_SIZE}`, confidence: 0.6, page,
      });
    }
    for (const p of products) {
      for (const [field, value, selector] of [['name', p.name, SEL.name], ['description', p.desc, SEL.desc]] as const) {
        const fault = fieldFault(value);
        if (fault) {
          await C.add({
            check: `swag.product-${field}`, category: 'copy', route: ROUTES.inventory, role: R, step: 'inventory', selector,
            description: `Product ${p.index + 1}${p.name ? ` ("${p.name}")` : ''} has a bad ${field}: ${fault}`, confidence: 0.7, page,
          });
        }
      }
      if (!isPriceFormat(p.priceText) || p.price === undefined || p.price <= 0) {
        await C.add({
          check: 'swag.product-price-format', category: 'copy', route: ROUTES.inventory, role: R, step: 'inventory', selector: SEL.price,
          description: `"${p.name}" shows the price "${p.priceText}" (expected a positive amount like $9.99)`, confidence: 0.6, page,
        });
      }
    }
    // Every product has its own picture.
    const bySrc = new Map<string, Product[]>();
    for (const p of products) bySrc.set(p.img, [...(bySrc.get(p.img) ?? []), p]);
    const shared = [...bySrc.values()].filter((group) => group.length > 1);
    if (shared.length) {
      imagesShared = true;
      const group = shared[0]!;
      await C.add({
        check: 'swag.product-images-distinct', category: 'visual', route: ROUTES.inventory, role: R, step: 'inventory', selector: group[0]!.imgSelector,
        ...(await boxOf(page, group[0]!.imgSelector).then((region) => (region ? { region } : {}))),
        description: `${group.length} different products show the same image (${group.map((p) => p.name).join(', ')})`,
        evidence: [{ kind: 'dom', excerpt: group.map((p) => `${p.name}: ${p.img}`).join('\n') }], confidence: 0.85, page,
      });
    }
    await layout('inventory', gridProblems(await measureCards(page, SEL.item, {
      image: 'img', nameText: SEL.name, priceText: SEL.price, button: 'button',
    })));
    await layout('inventory', await pageLayout(page, {
      containers: [[SEL.cartLink, SEL.primaryHeader], [SEL.openMenu, SEL.primaryHeader], [SEL.title, SEL.secondaryHeader], [SEL.sort, SEL.secondaryHeader]],
      rotationScope: SEL.headerContainer,
    }), { once: true });
  });
  if (products.length === 0) {
    C.note('no products read: the rest of the swag-labs suite needs the catalogue');
    await mp.context.close();
    return;
  }

  // 3. Sorting: every option actually sorts.
  await ctx.step('swag.sort', async () => {
    const failed: string[] = [];
    const dialogsBefore = mp.monitor.dialogs.length;
    for (const option of [...SORTS.slice(1), SORTS[0]!]) {
      ctx.ensureTime(10_000);
      await page.selectOption(SEL.sort, option.key);
      await page.waitForTimeout(200);
      const listed = await readProducts(page);
      const items = listed.map((p) => ({ name: p.name, price: p.price ?? NaN }));
      const active = ((await page.locator(SEL.activeOption).first().textContent().catch(() => '')) ?? '').trim();
      if (!sortedBy(option.key, items) || items.some((i) => Number.isNaN(i.price))) failed.push(`${option.label}: ${listed.map((p) => `${p.name} ${p.priceText}`).join(', ')}`);
      else if (active && active !== option.label) failed.push(`${option.label}: the control shows "${active}"`);
    }
    if (failed.length) {
      const dialogs = mp.monitor.dialogs.slice(dialogsBefore);
      await C.add({
        check: 'swag.sort', category: 'functional', route: ROUTES.inventory, role: R, step: 'sort', selector: SEL.sort,
        description: `Sorting does not sort for ${failed.length} of ${SORTS.length} options: ${failed.map((f) => f.split(':')[0]).join(', ')}${dialogs.length ? ` (the page showed: ${dialogs[0]})` : ''}`,
        evidence: [{ kind: 'dom', excerpt: failed.join('\n') }, ...(dialogs.length ? [{ kind: 'text' as const, excerpt: dialogs.join('\n') }] : [])],
        confidence: 0.85, page, repro: ['Sign in', 'Open the sort menu', 'Choose each option in turn and read the order of the products'],
      });
    }
  });

  // 4. Product detail matches the product clicked.
  const detail = new Map<string, { name: string; desc: string; priceText: string; price: number | undefined; img: string }>();
  await ctx.step('swag.detail', async () => {
    await ctx.goto(mp, url(ROUTES.inventory));
    await arrive(page, ROUTES.inventory);
    // When every product already shares one picture, list-vs-detail pictures say nothing new.
    let imageMismatchReported = imagesShared;
    for (const p of products) {
      ctx.ensureTime(15_000);
      if (!p.linkSelector) continue;
      if (at() !== ROUTES.inventory || !(await arrive(page, ROUTES.inventory, 2000))) {
        await ctx.goto(mp, url(ROUTES.inventory));
        await arrive(page, ROUTES.inventory);
      }
      await page.click(p.linkSelector);
      if (!(await arrive(page, ROUTES.item))) {
        await C.add({
          check: 'swag.detail-opens', category: 'functional', route: ROUTES.inventory, role: R, step: 'detail', selector: p.linkSelector,
          description: `Clicking "${p.name}" does not open its product page`, confidence: 0.7, page,
        });
        continue;
      }
      const d = await page.evaluate(() => {
        const text = (s: string): string => (document.querySelector(s)?.textContent ?? '').trim();
        const img = document.querySelector('.inventory_details_img, [data-test="inventory-container"] img') as HTMLImageElement | null;
        return {
          name: text('[data-test="inventory-item-name"]'), desc: text('[data-test="inventory-item-desc"]'),
          priceText: text('[data-test="inventory-item-price"]'), img: img ? img.currentSrc || img.src : '',
        };
      });
      const shown = { ...d, price: parseMoney(d.priceText) };
      if (detail.size === 0) await scan('detail');
      if (shown.name !== p.name) {
        await C.add({
          check: 'swag.detail-matches', category: 'functional', route: ROUTES.inventory, role: R, step: 'detail', selector: p.linkSelector,
          description: `Clicking "${p.name}" opens the page of "${shown.name || '(no name)'}"`,
          evidence: [{ kind: 'text', excerpt: `clicked: ${p.name}\nopened: ${shown.name} ${shown.priceText}\nurl: ${page.url()}` }],
          confidence: 0.9, page, key: 'swag.detail-matches', repro: ['Sign in', `Click "${p.name}" in the catalogue`, 'Read the product name on the page that opens'],
        });
      } else {
        const firstMatch = detail.size === 0;
        detail.set(p.name, shown);
        await scan('detail');
        if (firstMatch) await detailCartButtons(ctx, mp, p.name);
        if (shown.price === undefined || p.price === undefined || toCents(shown.price) !== toCents(p.price)) {
          await C.add({
            check: 'swag.detail-price', category: 'consistency', route: ROUTES.inventory, role: R, step: 'detail', selector: SEL.price,
            description: `"${p.name}" costs ${p.priceText} in the catalogue but ${shown.priceText} on its product page`,
            confidence: 0.85, page, key: 'swag.detail-price', repro: ['Sign in', `Note the price of "${p.name}"`, 'Open the product', 'Compare the prices'],
          });
        }
        if (shown.desc !== p.desc) {
          await C.add({
            check: 'swag.detail-description', category: 'consistency', route: ROUTES.item, role: R, step: 'detail', selector: SEL.desc,
            description: `The product page of "${p.name}" shows a different description: "${shown.desc.slice(0, 120)}"`,
            confidence: 0.7, page, key: 'swag.detail-description',
          });
        }
        if (!imageMismatchReported && shown.img && p.img && shown.img !== p.img) {
          imageMismatchReported = true;
          const sentence = `"${p.name}" shows a different picture in the catalogue than on its product page`;
          const imgEvidence = [{ kind: 'dom' as const, excerpt: `catalogue: ${p.img}\nproduct page: ${shown.img}` }];
          // The grid check may already have flagged this picture (its size): same bug, one report.
          if (C.amend(`swag.layout|${ROUTES.inventory}|${p.imgSelector}`, sentence, imgEvidence)) continue;
          await ctx.goto(mp, url(ROUTES.inventory));
          await arrive(page, ROUTES.inventory);
          await C.add({
            check: 'swag.detail-image', category: 'visual', route: ROUTES.inventory, role: R, step: 'detail', selector: p.imgSelector,
            ...(await boxOf(page, p.imgSelector).then((region) => (region ? { region } : {}))),
            description: sentence, evidence: imgEvidence, confidence: 0.8, page,
          });
          continue;
        }
      }
      if ((await page.locator(SEL.backToProducts).count()) > 0) {
        await page.click(SEL.backToProducts);
        await arrive(page, ROUTES.inventory);
      }
    }
  });

  // 5. Add and remove every product from the catalogue: button state and badge follow.
  await ctx.step('swag.cart-buttons', async () => {
    await ctx.goto(mp, url(ROUTES.inventory));
    await arrive(page, ROUTES.inventory);
    const addFailed: { p: Product; why: string }[] = [];
    const removeFailed: { p: Product; why: string }[] = [];
    for (const p of products) {
      ctx.ensureTime(10_000);
      const button = page.locator(SEL.item).nth(p.index).locator('button');
      const before = await badgeCount(page);
      const label = (await button.getAttribute('data-test')) ?? '';
      if (!label.startsWith('add-to-cart')) continue;
      await button.click();
      const added = await waitFor(async () => ((await button.getAttribute('data-test')) ?? '').startsWith('remove') && (await badgeCount(page)) === before + 1, 1500);
      if (!added) {
        addFailed.push({ p, why: `button ${(await button.getAttribute('data-test')) ?? '?'}, badge ${await badgeCount(page)} (was ${before})` });
        continue;
      }
      await button.click();
      const removed = await waitFor(async () => ((await button.getAttribute('data-test')) ?? '').startsWith('add-to-cart') && (await badgeCount(page)) === before, 1500);
      if (!removed) removeFailed.push({ p, why: `button ${(await button.getAttribute('data-test')) ?? '?'}, badge ${await badgeCount(page)} (was ${before})` });
    }
    for (const [what, list] of [['Add to cart', addFailed], ['Remove', removeFailed]] as const) {
      const first = list[0];
      if (!first) continue;
      const selector = what === 'Add to cart' ? (first.p.buttonSelector ?? SEL.item) : (first.p.buttonSelector?.replace('add-to-cart-', 'remove-') ?? SEL.item);
      await C.add({
        check: what === 'Add to cart' ? 'swag.cart-add' : 'swag.cart-remove', category: 'functional', route: ROUTES.inventory, role: R, step: 'cart', selector,
        description: `"${what}" does not work for ${list.length} of ${products.length} products (${list.map((f) => f.p.name).join(', ')})`,
        evidence: [{ kind: 'dom', excerpt: list.map((f) => `${f.p.name}: ${f.why}`).join('\n') }], confidence: 0.85, page,
        repro: ['Sign in', `Click "${what}" on "${first.p.name}"`, 'Watch the button label and the cart badge'],
      });
    }
    await resetCart(ctx, mp);
  });

  // 6. Cart holds exactly what was added.
  let inCart: { name: string; price: number | undefined; priceText: string }[] = [];
  await ctx.step('swag.cart', async () => {
    await ctx.goto(mp, url(ROUTES.inventory));
    await arrive(page, ROUTES.inventory);
    const added: Product[] = [];
    for (const p of products) {
      const button = page.locator(SEL.item).nth(p.index).locator('button');
      if (!((await button.getAttribute('data-test')) ?? '').startsWith('add-to-cart')) continue;
      await button.click();
      if (await waitFor(async () => ((await button.getAttribute('data-test')) ?? '').startsWith('remove'), 1000)) added.push(p);
    }
    const badge = await badgeCount(page);
    if (badge !== added.length) {
      await C.add({
        check: 'swag.cart-badge', category: 'consistency', route: ROUTES.inventory, role: R, step: 'cart', selector: SEL.badge,
        description: `The cart badge shows ${badge} after adding ${added.length} products`, confidence: 0.8, page,
      });
    }
    await page.click(SEL.cartLink);
    if (!(await arrive(page, ROUTES.cart))) throw new Error('the cart page did not open');
    await copy('cart', SEL.title, EXPECTED_COPY.cartTitle);
    await scan('cart');
    inCart = (await page.$$eval(`${SEL.cartList} ${SEL.item}`, (rows) => rows.map((row) => ({
      name: (row.querySelector('[data-test="inventory-item-name"]')?.textContent ?? '').trim(),
      priceText: (row.querySelector('[data-test="inventory-item-price"]')?.textContent ?? '').trim(),
    })))).map((r) => ({ ...r, price: parseMoney(r.priceText) }));
    const want = added.map((p) => p.name).sort();
    const got = inCart.map((r) => r.name).sort();
    if (want.join('|') !== got.join('|')) {
      await C.add({
        check: 'swag.cart-contents', category: 'functional', route: ROUTES.cart, role: R, step: 'cart', selector: SEL.cartList,
        description: `The cart does not hold what was added: added ${want.length} (${want.join(', ')}), cart shows ${got.length} (${got.join(', ')})`,
        confidence: 0.85, page,
      });
    }
    for (const row of inCart) {
      const reference = detail.get(row.name)?.priceText ?? products.find((p) => p.name === row.name)?.priceText;
      if (reference && parseMoney(reference) !== undefined && (row.price === undefined || toCents(row.price) !== toCents(parseMoney(reference)!))) {
        await C.add({
          check: 'swag.cart-price', category: 'consistency', route: ROUTES.cart, role: R, step: 'cart', selector: SEL.price,
          description: `"${row.name}" costs ${row.priceText} in the cart but ${reference} on its product page`, confidence: 0.8, page, key: 'swag.cart-price',
        });
      }
    }
    await layout('cart', await pageLayout(page, {
      containers: [[SEL.cartLink, SEL.primaryHeader], [SEL.title, SEL.secondaryHeader]],
      rotationScope: SEL.headerContainer,
    }), { once: true });
    await layout('cart', await footerProblems(page));
    // Remove one product in the cart, then Continue Shopping returns to the list.
    if (inCart.length >= 2) {
      const last = inCart[inCart.length - 1]!;
      const removeSel = `[data-test="remove-${last.name.replace(/\s+/g, '-').toLowerCase()}"]`;
      const before = await badgeCount(page);
      if ((await page.locator(removeSel).count()) > 0) {
        await page.click(removeSel);
        const gone = await waitFor(async () => (await page.locator(`${SEL.cartList} ${SEL.item}`).count()) === inCart.length - 1 && (await badgeCount(page)) === before - 1, 1500);
        if (!gone) {
          await C.add({
            check: 'swag.cart-remove-in-cart', category: 'functional', route: ROUTES.cart, role: R, step: 'cart', selector: removeSel,
            description: `Remove in the cart does not take "${last.name}" out (badge ${await badgeCount(page)}, was ${before})`, confidence: 0.8, page,
          });
        } else {
          inCart = inCart.slice(0, -1);
        }
      }
      await page.click(SEL.continueShopping);
      if (!(await arrive(page, ROUTES.inventory, 8000))) {
        await C.add({
          check: 'swag.continue-shopping', category: 'functional', route: ROUTES.cart, role: R, step: 'cart', selector: SEL.continueShopping,
          description: `Continue Shopping does not return to the product list (on ${at()})`, confidence: 0.8, page,
        });
        await ctx.goto(mp, url(ROUTES.inventory));
      }
      await page.click(SEL.cartLink);
      await arrive(page, ROUTES.cart);
    }
  });

  // 7. Checkout, step one: every typed value is kept, and Continue proceeds.
  let reachedStepTwo = false;
  await ctx.step('swag.checkout-info', async () => {
    if (at() !== ROUTES.cart) await ctx.goto(mp, url(ROUTES.cart));
    await page.click(SEL.checkout, { timeout: 5000 }).catch(async () => page.click(SEL.checkout, { force: true }));
    if (!(await arrive(page, ROUTES.stepOne))) throw new Error('checkout step one did not open');
    await copy('checkout-info', SEL.title, EXPECTED_COPY.stepOneTitle);
    await scan('checkout-info');
    const typed: [string, string, string][] = [[SEL.firstName, 'First Name', 'Ada'], [SEL.lastName, 'Last Name', 'Lovelace'], [SEL.postalCode, 'Zip/Postal Code', '10115']];
    for (const [selector, , value] of typed) {
      await page.locator(selector).click();
      await page.locator(selector).pressSequentially(value, { delay: 10 });
    }
    const lost: { selector: string; label: string; typed: string; shown: string }[] = [];
    for (const [selector, label, value] of typed) {
      const shown = await page.inputValue(selector);
      if (shown !== value) lost.push({ selector, label, typed: value, shown });
    }
    if (lost.length) {
      const primary = lost.find((l) => l.shown === '') ?? lost[0]!;
      await C.add({
        check: 'swag.checkout-fields-kept', category: 'functional', route: ROUTES.stepOne, role: R, step: 'checkout-info', selector: primary.selector,
        ...(await boxOf(page, primary.selector).then((region) => (region ? { region } : {}))),
        description: `The checkout form does not keep what was typed: ${lost.map((l) => `${l.label} shows "${l.shown}" instead of "${l.typed}"`).join('; ')}`,
        confidence: 0.9, page, repro: ['Sign in, add a product, open the cart, Checkout', 'Type Ada, Lovelace, 10115 into First Name, Last Name, Zip', 'Read the three fields'],
      });
    }
    await page.click(SEL.continue);
    reachedStepTwo = await arrive(page, ROUTES.stepTwo, 5000);
    if (!reachedStepTwo) {
      const error = ((await page.locator(SEL.error).first().textContent({ timeout: 500 }).catch(() => null)) ?? '').trim();
      // When the fields were already reported as lost, the refusal is the same bug: no second report.
      if (!lost.length) {
        await C.add({
          check: 'swag.checkout-continue', category: 'functional', route: ROUTES.stepOne, role: R, step: 'checkout-info', selector: SEL.continue,
          description: `Continue with every field filled does not reach the overview${error ? ` (shows "${error}")` : ''}`, confidence: 0.8, page,
        });
      }
      C.note(`checkout step one did not proceed${error ? ` (${error})` : ''}; opening the overview by URL to keep checking`);
      await ctx.goto(mp, url(ROUTES.stepTwo));
      reachedStepTwo = await arrive(page, ROUTES.stepTwo, 5000);
    }
  });

  // 8. Overview arithmetic: item total = sum of prices, tax 8%, total = item total + tax.
  await ctx.step('swag.overview', async () => {
    if (!reachedStepTwo) return;
    await page.locator(SEL.subtotal).waitFor({ timeout: 5000 });
    await copy('overview', SEL.title, EXPECTED_COPY.stepTwoTitle);
    await scan('overview');
    const rows = (await page.$$eval(`${SEL.cartList} ${SEL.item}`, (els) => els.map((row) => ({
      name: (row.querySelector('[data-test="inventory-item-name"]')?.textContent ?? '').trim(),
      priceText: (row.querySelector('[data-test="inventory-item-price"]')?.textContent ?? '').trim(),
    })))).map((r) => ({ ...r, price: parseMoney(r.priceText) }));
    const want = inCart.map((r) => r.name).sort().join('|');
    if (inCart.length && rows.map((r) => r.name).sort().join('|') !== want) {
      await C.add({
        check: 'swag.overview-items', category: 'consistency', route: ROUTES.stepTwo, role: R, step: 'overview', selector: SEL.cartList,
        description: `The overview lists ${rows.length} products (${rows.map((r) => r.name).join(', ')}) but the cart held ${inCart.length}`, confidence: 0.8, page,
      });
    }
    const read = async (s: string): Promise<{ text: string; value: number | undefined }> => {
      const text = ((await page.locator(s).first().textContent().catch(() => null)) ?? '').trim();
      return { text, value: parseMoney(text) };
    };
    const [sub, tax, total] = [await read(SEL.subtotal), await read(SEL.tax), await read(SEL.total)];
    const problems = checkOrderTotals({
      prices: rows.map((r) => r.price ?? NaN).filter((v) => Number.isFinite(v)), itemTotal: sub.value, tax: tax.value, total: total.value, taxRate: TAX_RATE,
    });
    for (const problem of problems) {
      const selector = problem.field === 'item_total' ? SEL.subtotal : problem.field === 'tax' ? SEL.tax : SEL.total;
      await C.add({
        check: `swag.overview-${problem.field.replace('_', '-')}`, category: 'consistency', route: ROUTES.stepTwo, role: R, step: 'overview', selector,
        ...(await boxOf(page, selector).then((region) => (region ? { region } : {}))),
        description: `Checkout overview: ${problem.message}`,
        evidence: [{ kind: 'dom', excerpt: `${rows.map((r) => `${r.name} ${r.priceText}`).join('\n')}\n${sub.text}\n${tax.text}\n${total.text}\nexpected ${formatCents(problem.expected)}` }],
        confidence: 0.9, page, repro: ['Add products to the cart', 'Check out to the overview', 'Add up the item prices and compare with Item total, Tax and Total'],
      });
      if (problem.field === 'item_total') break; // tax and total follow from a wrong item total
    }
  });

  // 9. Finish reaches the confirmation and empties the cart.
  await ctx.step('swag.finish', async () => {
    if (!reachedStepTwo) return;
    await page.click(SEL.finish);
    if (!(await arrive(page, ROUTES.complete, 5000))) {
      await C.add({
        check: 'swag.finish', category: 'functional', route: ROUTES.stepTwo, role: R, step: 'finish', selector: SEL.finish,
        description: `Finish does not complete the order (still on ${at()})`, confidence: 0.85, page,
        repro: ['Add a product, check out, fill in the form', 'Click Finish'],
      });
      return;
    }
    await copy('finish', SEL.title, EXPECTED_COPY.completeTitle);
    await copy('finish', SEL.completeHeader, EXPECTED_COPY.completeHeader);
    await scan('finish');
    const left = await badgeCount(page);
    if (left !== 0) {
      await C.add({
        check: 'swag.finish-empties-cart', category: 'functional', route: ROUTES.complete, role: R, step: 'finish', selector: SEL.badge,
        description: `After the order is complete the cart still holds ${left} product(s)`, confidence: 0.8, page,
      });
    }
    await page.click(SEL.backToProducts);
    if (!(await arrive(page, ROUTES.inventory, 8000))) {
      await C.add({
        check: 'swag.back-home', category: 'functional', route: ROUTES.complete, role: R, step: 'finish', selector: SEL.backToProducts,
        description: `Back Home does not return to the product list (on ${at()})`, confidence: 0.75, page,
      });
    }
  });

  // 10. Sign out, and the catalogue is no longer reachable.
  await ctx.step('swag.sign-out', async () => {
    if (at() === ROUTES.login) {
      await ctx.goto(mp, url(ROUTES.inventory));
      await arrive(page, ROUTES.inventory);
    }
    await page.click(SEL.openMenu);
    await page.locator(SEL.logout).waitFor({ state: 'visible' });
    await page.click(SEL.logout);
    if (!(await arrive(page, ROUTES.login, 5000))) {
      await C.add({
        check: 'swag.sign-out', category: 'functional', route: page.url(), role: R, step: 'sign-out', selector: SEL.logout,
        description: `Logout does not return to the sign-in page (on ${at()})`, confidence: 0.8, page,
      });
      return;
    }
    await ctx.goto(mp, url(ROUTES.inventory));
    if (await arrive(page, ROUTES.inventory, 3000)) {
      await C.add({
        check: 'swag.signed-out-access', category: 'permission', route: ROUTES.inventory, role: R, step: 'sign-out', selector: SEL.list,
        description: 'After logout the catalogue is still shown at /inventory.html', confidence: 0.8, page,
      });
    }
  });
  await mp.context.close();
}

/** Add and remove from a product's own page: the button turns into Remove and back, the badge follows. */
async function detailCartButtons(ctx: SuiteContext, mp: MonitoredPage, name: string): Promise<void> {
  const page = mp.page;
  const add = '[data-test="add-to-cart"]';
  const remove = '[data-test="remove"]';
  if ((await page.locator(add).count()) === 0) return;
  const before = await badgeCount(page);
  await page.click(add);
  const added = await waitFor(async () => (await page.locator(remove).count()) > 0 && (await badgeCount(page)) === before + 1, 1500);
  const report = async (selector: string, what: string): Promise<void> => {
    await ctx.collector.add({
      check: 'swag.detail-cart', category: 'functional', route: ROUTES.item, ...(mp.role ? { role: mp.role } : {}), step: 'detail', selector,
      description: `On the product page of "${name}", ${what} (badge ${await badgeCount(page)}, was ${before})`, confidence: 0.8, page,
      repro: ['Sign in', `Open "${name}"`, 'Click Add to cart, then Remove; watch the button and the cart badge'],
    });
  };
  if (!added) return report(add, '"Add to cart" does not add it');
  await page.click(remove);
  const removed = await waitFor(async () => (await page.locator(add).count()) > 0 && (await badgeCount(page)) === before, 1500);
  if (!removed) await report(remove, '"Remove" does not take it out');
  await page.evaluate(() => { try { localStorage.removeItem('cart-contents'); } catch { /* ignore */ } });
}

/** The cart footer: Continue Shopping and Checkout sit side by side below the list. */
async function footerProblems(page: Page): Promise<LayoutProblem[]> {
  const [list, cont, checkout] = await Promise.all([SEL.cartList, SEL.continueShopping, SEL.checkout].map((s) => page.locator(s).first().boundingBox().catch(() => null)));
  if (!list || !cont || !checkout) return [];
  const problems: LayoutProblem[] = [];
  const box = { x: checkout.x, y: checkout.y, w: checkout.width, h: checkout.height };
  if (Math.abs(checkout.y - cont.y) > 4 || checkout.y < list.y + list.height - 2) {
    problems.push({ kind: 'container', selector: SEL.checkout, box, message: `${SEL.checkout} is not in the cart footer (at ${Math.round(checkout.x)},${Math.round(checkout.y)}; Continue Shopping at ${Math.round(cont.x)},${Math.round(cont.y)})` });
  }
  return problems;
}

async function resetCart(ctx: SuiteContext, mp: MonitoredPage): Promise<void> {
  const page = mp.page;
  try {
    await page.click(SEL.openMenu, { timeout: 3000 });
    await page.locator(SEL.reset).waitFor({ state: 'visible', timeout: 3000 });
    await page.click(SEL.reset);
  } catch {
    // Fall back to clearing the app's storage directly.
  }
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* ignore */ } });
  await ctx.goto(mp, new URL(ROUTES.inventory, ctx.base).toString());
  await arrive(page, ROUTES.inventory);
}

/** An element only that page has: the URL alone changes before React has rendered the page. */
const MARKERS: Record<string, string> = {
  [ROUTES.login]: SEL.loginButton,
  [ROUTES.inventory]: SEL.list,
  [ROUTES.item]: SEL.backToProducts,
  [ROUTES.cart]: SEL.checkout,
  [ROUTES.stepOne]: SEL.firstName,
  [ROUTES.stepTwo]: SEL.subtotal,
  [ROUTES.complete]: SEL.completeHeader,
};

/** Wait until the page at `route` has rendered (URL and its marker element); false on timeout. */
export async function arrive(page: Page, route: string, timeoutMs = 15_000): Promise<boolean> {
  const marker = MARKERS[route];
  try {
    await page.waitForURL((u) => normaliseRoute(u.toString()) === route, { timeout: timeoutMs });
    if (marker) await page.locator(marker).first().waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (await condition().catch(() => false)) return true;
    if (Date.now() > end) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
