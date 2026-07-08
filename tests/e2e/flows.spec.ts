import { expect, test } from '@playwright/test';
import { assertNoBadPageText, createTestWorkspace, fillRunScreen, gotoAndAssertUsable, installGuardrails } from './helpers';

test('run URL screen accepts website without protocol and returns a result', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const assertClean = installGuardrails(page, testInfo);

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/app/run');
  await fillRunScreen(page, 'Cerillion', 'www.cerillion.com');
  await page.getByRole('button', { name: /run public-source screen/i }).click();

  await expect(page.locator('body')).not.toContainText('Backend returned 422', { timeout: 180_000 });
  await expect(page.locator('body')).toContainText(/evidence|acquisition|screen|recommendation|IC readiness/i, { timeout: 180_000 });
  await assertClean();
});

test('compare flow accepts websites without protocol and avoids raw backend 422s', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const assertClean = installGuardrails(page, testInfo, { allowApi422: true });

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/app/compare');
  await page.getByLabel(/company name/i).nth(0).fill('Cerillion');
  await page.getByLabel(/website url/i).nth(0).fill('www.cerillion.com');
  await page.getByLabel(/company name/i).nth(1).fill('Hire Digital');
  await page.getByLabel(/website url/i).nth(1).fill('hiredigital.com');
  await page.getByRole('button', { name: /compare companies/i }).click();

  const body = page.locator('body');
  await expect(body).not.toContainText('Backend returned 422', { timeout: 120_000 });
  await expect(body).toContainText(/please check the target names and website urls|comparison verdict|ranking complete|ranked targets|compare request could not complete/i, { timeout: 120_000 });
  const validation = body.getByText(/please check the target names and website urls/i).first();
  if (await validation.isVisible().catch(() => false)) {
    await expect(validation).toContainText(/website URLs/i);
  }
  await assertNoBadPageText(page);
  await assertClean();
});

test('origination known targets rank candidates and preserve Add to Compare handoff', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const assertClean = installGuardrails(page, testInfo);

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/app/origination');
  await page.getByPlaceholder(/founder-owned uk vertical software/i).fill('UK software roll-up focused on vertical B2B SaaS with recurring revenue and AI-enabled productivity improvement.');
  await page.getByPlaceholder(/uk vertical saas/i).fill('Software');
  await page.getByPlaceholder(/uk, dach, nordic/i).fill('UK');
  await page.getByPlaceholder(/paste known targets/i).fill([
    'Cerillion, https://www.cerillion.com, UK, Telecoms BSS/OSS software',
    'Checkit, https://www.checkit.net, UK, Connected workflow management software',
    'TriloDocs, https://www.trilodocs.com, UK, Document automation / insurance technology',
  ].join('\n'));
  await page.getByRole('button', { name: /preview origination workflow/i }).click();

  await expect(page.locator('body')).not.toContainText(/No source-backed targets are available/i, { timeout: 120_000 });
  await expect(page.locator('body')).toContainText(/candidate summary|screenable product candidates|rank|fit score|known target universe/i, { timeout: 120_000 });
  await expect(page.locator('body')).not.toContainText(/Backend returned|Application error/i);

  const firstAdd = page.getByRole('button', { name: /add to compare/i }).first();
  await expect(firstAdd).toBeVisible({ timeout: 30_000 });
  const candidateText = await firstAdd.locator('xpath=ancestor::*[self::div][1]').textContent().catch(() => '');
  await firstAdd.click();
  await expect(page.getByText(/Added to Compare|Already in Compare/i)).toBeVisible({ timeout: 5_000 });
  await expect(page).toHaveURL(/\/app\/compare/, { timeout: 15_000 });
  await expect(page.getByLabel(/company name/i).first()).not.toHaveValue('', { timeout: 15_000 });
  await expect(page.locator('body')).toContainText(/Origination|Website required before this target can be compared/i);

  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Restored last origination run|candidate summary|screenable product candidates/i, { timeout: 15_000 });
  if (candidateText) {
    const candidateName = /Cerillion|Checkit|TriloDocs/.exec(candidateText)?.[0];
    if (candidateName) await expect(page.locator('body')).toContainText(candidateName);
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
