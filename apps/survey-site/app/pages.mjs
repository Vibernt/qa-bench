// Survey site pages: global navigation, collection variants, volatile controls and a form change.
// Small deterministic fixture: global navigation, collection variants, volatile controls and a form change.
export function sitePages(variant = 'baseline') {
  if (!['baseline','cosmetic','structural'].includes(variant)) throw new Error('Unknown site variant');
  const siblings = {
    '/about': '<section><article>About</article></section>',
    '/team': '<section><article>About</article></section><aside>Team</aside>',
    '/pricing': '<table><tr><td>Price</td></tr></table>',
    '/help': '<dialog open>Help</dialog>',
    '/terms': '<section>Terms</section>',
    '/news': '<article>News</article>',
  };
  const paths = ['/', '/contact', '/search', ...Object.keys(siblings), ...Array.from({length:12},(_,i)=>`/blog/post-${i}`)];
  const nav = '<header><nav><a href="/">Home</a><a href="/contact">Contact</a><a href="/search">Search</a></nav></header>';
  let visit = 0;
  const page = content => `${nav}<main><h1>${variant==='cosmetic'?'Revised editorial title':'Page title'}</h1>${content}</main><footer><a href="/private">Private</a></footer>`;
  const body = path => {
    visit++;
    if (path === '/robots.txt') return 'User-agent: *\nDisallow: /private\nSitemap: /sitemap.xml';
    if (path === '/sitemap.xml') return `<urlset>${paths.map(p=>`<url><loc>${p}</loc></url>`).join('')}</urlset>`;
    if (path === '/') return page('<section><h2>Welcome</h2><a href="/blog/post-0">Read stories</a></section>');
    if (path === '/contact') return page(`<form method="post"><label>Email<input type="email" name="email"></label><label>Message<textarea name="message"></textarea></label>${variant==='structural'?'<label>Phone<input type="tel" name="phone"></label><button type="button">Request callback</button>':''}<button>Send</button></form>`);
    if (path === '/search') return page('<search><form method="get"><label>Query<input type="search" name="q"></label><button>Search</button></form></search>');
    if (siblings[path]) return page(siblings[path]);
    const i = paths.filter(p=>p.startsWith('/blog/')).indexOf(path);
    if (i >= 0) return page(`${i%2?'<article><h2>Chapter</h2><p>Story</p></article>':'<article><h2>Chapter</h2><aside>Related</aside></article>'}<button type="button">Banner ${visit%2?'Alpha':'Beta'}</button>`);
    return null;
  };
  return { paths, body };
}
