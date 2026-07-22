import { expect, test } from '@playwright/test';
import { assertNoBadPageText, createTestWorkspace, fillRunScreen, gotoAndAssertUsable, installGuardrails } from './helpers';

test('run URL screen accepts website without protocol and returns a result', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const assertClean = installGuardrails(page, testInfo);

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/app/run');
  await fillRunScreen(page, 'Cerillion', 'www.cerillion.com');
  await page.getByRole('button', { name: /^start screen$/i }).click();

  await expect(page.locator('body')).not.toContainText('Backend returned 422', { timeout: 180_000 });
  await expect(page.locator('body')).toContainText(/evidence|acquisition|screen|recommendation|IC readiness/i, { timeout: 180_000 });
  await assertClean();
});

test('compare requires screened targets and does not expose an empty manual preview', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const assertClean = installGuardrails(page, testInfo, { allowApi422: true });

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/app/compare');
  const body = page.locator('body');
  await expect(body).toContainText(/screened targets|screen companies|no screened targets|select targets/i);
  await expect(page.getByLabel(/company name/i).first()).toBeHidden();
  await assertNoBadPageText(page);
  await assertClean();
});

test('origination known targets rank candidates and preserve Add to Compare handoff', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const assertClean = installGuardrails(page, testInfo);

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/app/origination');
  await page.getByLabel(/describe the companies you want to find/i).fill('UK software roll-up focused on vertical B2B SaaS with recurring revenue and AI-enabled productivity improvement.');
  await page.getByText(/^refine criteria$/i).click();
  await page.getByPlaceholder(/software utility/i).fill('Software');
  await page.getByPlaceholder(/e.g. uk/i).fill('UK');
  await page.getByText(/^rank known targets$/i).click();
  await page.getByPlaceholder(/company name, website, jurisdiction/i).fill([
    'Cerillion, https://www.cerillion.com, UK, Telecoms BSS/OSS software',
    'Checkit, https://www.checkit.net, UK, Connected workflow management software',
    'TriloDocs, https://www.trilodocs.com, UK, Document automation / insurance technology',
  ].join('\n'));
  await page.getByRole('button', { name: /find companies/i }).click();

  await expect(page.locator('body')).not.toContainText(/No source-backed targets are available/i, { timeout: 120_000 });
  await expect(page.locator('body')).toContainText(/candidate summary|screenable product candidates|rank|fit score|known target universe/i, { timeout: 120_000 });
  await expect(page.locator('body')).not.toContainText(/Backend returned|Application error/i);

  const firstAdd = page.getByRole('button', { name: /add to compare/i }).first();
  if (await firstAdd.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const candidateText = await firstAdd.locator('xpath=ancestor::*[self::div][1]').textContent().catch(() => '');
    await firstAdd.click();
    await expect(page.getByText(/Added to Compare|Already in Compare/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/app\/compare/, { timeout: 15_000 });
    await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
    if (candidateText) {
      const candidateName = /Cerillion|Checkit|TriloDocs/.exec(candidateText)?.[0];
      if (candidateName) await expect(page.locator('body')).toContainText(candidateName);
    }
  } else {
    await expect(page.locator('body')).toContainText(/try again|could not|unavailable|backend|source-backed/i);
  }

  await assertClean();
});

test('origination preserves backend JSON errors and exposes development diagnostics', async ({ page }) => {
  const backendError = {
    status: 'quota_exceeded',
    quota_type: 'origination_runs',
    error_code: 'ORIGINATION_MONTHLY_LIMIT',
    message: 'Your origination allowance is exhausted for this workspace.',
    screens_used: 10,
    screen_limit: 10,
    screens_remaining: 0,
  };
  const consoleMessages: string[] = [];
  page.on('console', message => consoleMessages.push(message.text()));
  await page.route('**/api/origination/jobs', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/origination/run', route => route.fulfill({
    status: 429,
    contentType: 'application/json',
    headers: { 'x-request-id': 'origination-regression-test' },
    body: JSON.stringify(backendError),
  }));

  await createTestWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/describe the companies you want to find/i).fill('UK vertical software targets');
  await page.getByRole('button', { name: /find companies/i }).click();

  await expect(page.locator('span').getByText(backendError.message, { exact: true })).toBeVisible();
  await page.getByText('Developer diagnostics', { exact: true }).click();
  await expect(page.getByText('origination_runs', { exact: true })).toBeVisible();
  await expect(page.getByText('ORIGINATION_MONTHLY_LIMIT', { exact: true })).toBeVisible();
  await expect(page.getByText(JSON.stringify(backendError), { exact: true })).toBeVisible();
  expect(consoleMessages.some(message => message.includes('QuotaExceededError'))).toBe(false);
});

test('origination keeps a backend result when local storage quota is exceeded', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', message => consoleMessages.push(message.text()));
  await page.route('**/api/origination/jobs', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/origination/run', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'ok',
      summary: 'Backend result survived local storage failure.',
      targets: [],
    }),
  }));

  await createTestWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key.startsWith('frontier_last_origination_') || key === 'frontier_origination_runs') {
        throw new DOMException('Storage capacity exceeded.', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await page.getByLabel(/describe the companies you want to find/i).fill('UK vertical software targets');
  await page.getByRole('button', { name: /find companies/i }).click();

  await expect(page.getByText('Backend result survived local storage failure.', { exact: true })).toBeVisible();
  expect(consoleMessages.some(message => message.includes('[origination] run failed'))).toBe(false);
  expect(consoleMessages.some(message => message.includes('QuotaExceededError') && !message.includes('could not be persisted'))).toBe(false);
});

test('request pilot form submits to a user-facing success or fallback state', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const assertClean = installGuardrails(page, testInfo);

  await gotoAndAssertUsable(page, '/request-pilot');
  await page.getByLabel(/^Name$/i).fill('Test User');
  await page.getByLabel(/work email/i).fill('test@example.com');
  await page.getByLabel(/organisation/i).fill('E2E Test');
  await page.getByLabel(/^Role$/i).fill('Tester');
  await page.getByLabel(/anything else/i).fill('Playwright smoke test');
  await page.getByRole('button', { name: /request pilot/i }).click();

  await expect(page.locator('body')).toContainText(/request received|stored your request|email notification|please email/i, { timeout: 60_000 });
  await assertClean();
});
