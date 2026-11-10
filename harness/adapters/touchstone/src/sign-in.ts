import type { Page } from 'playwright';
import type { StepFinding } from './map.ts';
import { redact } from './redact.ts';
import type { Brief } from '../../../../lib/contracts.ts';

const PASSWORD = 'input[type=password]';
const USERNAME = 'input[name=username],input[data-test=username]';
const SUBMIT = 'button[type=submit],input[type=submit]';
const ERRORS = '[role=alert], [aria-live=assertive], [data-test=error], .error-message, .error';

/** Only observed credential controls are supported. Automation errors still propagate. */
export async function signIn(page: Pick<Page, 'locator' | 'waitForLoadState'>,
  account: { username: string; password: string } | undefined, brief: Brief,
  viewport: StepFinding['viewport']): Promise<StepFinding | undefined> {
  const passwords = page.locator(PASSWORD);
  if (!await passwords.count()) return;
  if (!account) throw new Error('Credential form observed without a brief account');
  const user = page.locator(USERNAME);
  const submit = page.locator(SUBMIT);
  if (await passwords.count() !== 1 || await user.count() !== 1 || await submit.count() !== 1) {
    throw new Error('Unsupported sign-in form shape; requires an explicit sign-in integration');
  }
  await user.fill(account.username);
  await passwords.fill(account.password);
  await submit.click();
  await page.waitForLoadState('load');
  if (!await passwords.count()) return;
  const errors = page.locator(ERRORS);
  const visible: string[] = [];
  for (let i = 0; i < await errors.count(); i++) {
    const error = errors.nth(i);
    if (await error.isVisible()) {
      const text = (await error.innerText()).trim();
      if (text) visible.push(text);
    }
  }
  const evidence = [...new Set(visible)].join('\n');
  return { step: 0, kind: 'functional', rule: 'sign-in-incomplete', severity: 'critical',
    message: redact(`Sign-in did not complete; the credential form remains visible.${evidence ? ` Visible error: ${evidence}` : ' No visible error text was observed.'}`, brief),
    target: PASSWORD, evidenceRefs: [], viewport };
}
