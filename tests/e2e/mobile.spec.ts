import { expect, test } from '@playwright/test';
import { createTestWorkspace, gotoAndAssertUsable, installGuardrails, mockWorkspaceApis } from './helpers';

async function openMobileMenu(page: import('@playwright/test').Page) {
  const nav = page.getByRole('navigation').first();
  if (!(await nav.getByText(/^Workflow$/).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /toggle navigation/i }).click();
  }
  await expect(nav.getByText(/^Workflow$/)).toBeVisible();
  await expect(nav.getByText(/^Commercial$/)).toBeVisible();
  await expect(nav.getByText(/^Support$/)).toBeVisible();
}

test('mobile navigation is grouped and reaches key routes', async ({ page }, testInfo) => {
  const assertClean = installGuardrails(page, testInfo);

  await mockWorkspaceApis(page);
  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/');
  await openMobileMenu(page);
  await expect(page.getByRole('link', { name: /^Review$/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Pipeline$/i })).toBeVisible();
  await expect(page.getByText(/^More$/)).toBeVisible();

  const links = [
    { name: /^Review$/i, url: /\/app\/run/ },
    { name: /^Pipeline$/i, url: /\/app\/cockpit/ },
    { name: /^Compare$/i, url: /\/app\/compare/ },
    { name: /^Discover$/i, url: /\/app\/origination/ },
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
