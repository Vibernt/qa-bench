/* global document, getComputedStyle, innerWidth */
/** Generator-side assertions justify these labels; none of these diagnostics is sent to a judge. */
export async function checkState(page, recipe, baseline) {
  const expected = !baseline && recipe.label === 'problem';
  const observed = await page.evaluate(group => {
    const first = document.querySelector('tbody tr');
    const last = document.querySelector('tbody tr:last-child');
    const total = document.querySelector('[data-testid=total]');
    const box = el => el.getBoundingClientRect();
    if (group.endsWith('phone-layout-overflow')) return box(document.querySelector('table')).width > innerWidth;
    if (group.endsWith('total-covers-last-row')) return box(total).top < box(last).bottom;
    if (group.endsWith('login-error-invisible')) {
      const css = getComputedStyle(document.querySelector('[role=alert]'));
      return css.color === css.backgroundColor;
    }
    if (group.endsWith('long-title-overflows')) {
      const range = document.createRange(); range.selectNodeContents(first.cells[0]);
      return range.getBoundingClientRect().right > box(first.cells[1]).left;
    }
    if (group.endsWith('low-contrast-text')) return getComputedStyle(first.cells[1]).color === 'rgb(195, 200, 205)';
    if (group.endsWith('focus-ring-removed')) {
      if (document.activeElement?.tagName !== 'INPUT') throw new Error('Keyboard focus was not reached');
      return getComputedStyle(document.activeElement).outlineStyle === 'none';
    }
    if (group.endsWith('amounts-misaligned')) return getComputedStyle(first.cells[2]).textAlign !== getComputedStyle(document.querySelector('th:nth-child(3)')).textAlign;
    if (group === 'swag.visual-user') return !!document.querySelector('.visual_failure');
    return false;
  }, recipe.group);
  if (observed !== expected) throw new Error(`Capture state does not support ${recipe.id}: ${recipe.group}, expected problem=${expected}, observed=${observed}`);
}
