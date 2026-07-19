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
