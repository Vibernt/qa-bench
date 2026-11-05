import { describe, expect, it } from 'vitest';
import { LoadGate, methodAllowed, parseRobots, robotsAllows } from '../src/rules.ts';

const ROBOTS = `
# comment
User-agent: *
Disallow: /admin
Disallow: /private/
Allow: /private/public
Disallow: /*.pdf$
Disallow:

User-agent: qa-bench
User-agent: other-bot
Disallow: /no-bench
`;

describe('robots.txt', () => {
  const groups = parseRobots(ROBOTS);
  it('groups consecutive user-agent lines', () => {
    expect(groups).toHaveLength(2);
    expect(groups[1]?.agents).toEqual(['qa-bench', 'other-bot']);
  });
  it('uses the most specific group for our agent', () => {
    // qa-bench has its own group, so the * rules do not apply to it.
    expect(robotsAllows(groups, '/admin', 'qa-bench')).toBe(true);
    expect(robotsAllows(groups, '/no-bench', 'qa-bench')).toBe(false);
    expect(robotsAllows(groups, '/admin', 'some-crawler')).toBe(false);
  });
  it('applies longest match, Allow on ties, wildcards and $', () => {
    expect(robotsAllows(groups, '/private/x', 'crawler')).toBe(false);
    expect(robotsAllows(groups, '/private/public/page', 'crawler')).toBe(true);
    expect(robotsAllows(groups, '/files/a.pdf', 'crawler')).toBe(false);
    expect(robotsAllows(groups, '/files/a.pdf?x=1', 'crawler')).toBe(true);
    expect(robotsAllows(groups, '/', 'crawler')).toBe(true);
    expect(robotsAllows(parseRobots('User-agent: *\nAllow: /a\nDisallow: /a'), '/a', 'x')).toBe(true);
  });
  it('allows everything without rules', () => {
    expect(robotsAllows([], '/anything')).toBe(true);
    expect(robotsAllows(parseRobots('User-agent: *\nDisallow:'), '/x')).toBe(true);
  });
});

describe('methods', () => {
  it('honours the method list', () => {
    expect(methodAllowed(undefined, 'POST')).toBe(true);
    expect(methodAllowed({ methods: ['GET'] }, 'get')).toBe(true);
    expect(methodAllowed({ methods: ['GET'] }, 'POST')).toBe(false);
    expect(methodAllowed({ methods: [] }, 'POST')).toBe(true);
  });
});

function fakeClock(): { now: () => number; sleep: (ms: number) => Promise<void>; slept: number[] } {
  let t = 1_000_000;
  const slept: number[] = [];
  return { now: () => t, sleep: async (ms) => { slept.push(ms); t += ms; }, slept };
}

describe('LoadGate', () => {
  it('waits out min_interval_ms between loads', async () => {
    const clock = fakeClock();
    const gate = new LoadGate({ min_interval_ms: 1000 }, clock);
    expect((await gate.beforeLoad('https://site.example/a')).ok).toBe(true);
    expect((await gate.beforeLoad('https://site.example/b')).waited_ms).toBe(1000);
    expect(clock.slept).toEqual([1000]);
    expect(gate.pagesLoaded).toBe(2);
  });
  it('serialises concurrent loads so the interval still holds', async () => {
    const clock = fakeClock();
    const gate = new LoadGate({ min_interval_ms: 500 }, clock);
    const decisions = await Promise.all([gate.beforeLoad('https://s.example/1'), gate.beforeLoad('https://s.example/2'), gate.beforeLoad('https://s.example/3')]);
    expect(decisions.every((d) => d.ok)).toBe(true);
    expect(clock.slept).toEqual([500, 500]);
  });
  it('stops at max_pages', async () => {
    const gate = new LoadGate({ max_pages: 2 }, fakeClock());
    await gate.beforeLoad('https://s.example/1');
    await gate.beforeLoad('https://s.example/2');
    const third = await gate.beforeLoad('https://s.example/3');
    expect(third.ok).toBe(false);
    expect(third.reason).toContain('max_pages');
  });
  it('honours robots.txt, fetched once per origin and paced like a load', async () => {
    const clock = fakeClock();
    const fetched: string[] = [];
    const gate = new LoadGate({ robots_txt: 'honour', min_interval_ms: 1000 }, {
      ...clock,
      fetchText: async (url) => { fetched.push(url); return { status: 200, text: 'User-agent: *\nDisallow: /private' }; },
    });
    expect((await gate.beforeLoad('https://s.example/')).ok).toBe(true);
    const refused = await gate.beforeLoad('https://s.example/private/page');
    expect(refused.ok).toBe(false);
    expect(refused.reason).toContain('robots.txt');
    expect((await gate.beforeLoad('https://s.example/about')).ok).toBe(true);
    expect(fetched).toEqual(['https://s.example/robots.txt']);
    expect(gate.pagesLoaded).toBe(2);
    // robots fetch, then the first page 1 s later, then the third 1 s after that.
    expect(clock.slept).toEqual([1000, 1000]);
  });
  it('treats a missing robots.txt as allow-all and a failing one as disallow-all', async () => {
    const missing = new LoadGate({ robots_txt: 'honour' }, { ...fakeClock(), fetchText: async () => ({ status: 404, text: '' }) });
    expect((await missing.beforeLoad('https://s.example/x')).ok).toBe(true);
    const broken = new LoadGate({ robots_txt: 'honour' }, { ...fakeClock(), fetchText: async () => ({ status: 503, text: '' }) });
    expect((await broken.beforeLoad('https://s.example/x')).ok).toBe(false);
    const offline = new LoadGate({ robots_txt: 'honour' }, { ...fakeClock(), fetchText: async () => { throw new Error('offline'); } });
    expect((await offline.beforeLoad('https://s.example/x')).ok).toBe(false);
  });
  it('ignores robots.txt when the rules say so', async () => {
    const gate = new LoadGate({ robots_txt: 'ignore' }, { ...fakeClock(), fetchText: async () => { throw new Error('must not fetch'); } });
    expect((await gate.beforeLoad('https://s.example/private')).ok).toBe(true);
  });
});
