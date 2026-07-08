import { expect, test } from '@playwright/test';
import { createTestWorkspace, gotoAndAssertUsable, installGuardrails } from './helpers';

async function openMobileMenu(page: import('@playwright/test').Page) {
  const nav = page.getByRole('navigation').first();
  if (!(await nav.getByText(/^Screening$/).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /toggle navigation/i }).click();
  }
  await expect(nav.getByText(/^Screening$/)).toBeVisible();
  await expect(nav.getByText(/^Commercial$/)).toBeVisible();
  await expect(nav.locator('p').filter({ hasText: /^Trust$/ })).toBeVisible();
}

test('mobile navigation is grouped and reaches key routes', async ({ page }, testInfo) => {
  const assertClean = installGuardrails(page, testInfo);

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/');
  await openMobileMenu(page);
  await expect(page.getByRole('link', { name: /^Run$/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Cockpit$/i })).toBeVisible();
  await expect(page.getByText(/^More$/)).toBeVisible();

  const links = [
    { name: /^Run$/i, url: /\/app\/run/ },
    { name: /^Cockpit$/i, url: /\/app\/cockpit/ },
    { name: /^Compare$/i, url: /\/app\/compare/ },
    { name: /^Origination$/i, url: /\/app\/origination/ },
    { name: /^Request pilot$/i, url: /\/request-pilot/ },
  ];

  for (const link of links) {
    await openMobileMenu(page);
    await page.getByRole('link', { name: link.name }).first().click();
    await expect(page).toHaveURL(link.url);
    await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  await assertClean();
});
